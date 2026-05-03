const fallback = {
  weather: {
    label: "NEW YORK",
    detail: "New York",
  },
  listening: {
    label: "LISTENING",
    detail: "Spotify ready to connect",
  },
  building: {
    label: "BUILDING",
    repo: "portfolio",
    repoUrl: "https://github.com/hushbrush/portfolio",
    detail: "meow meow",
  },
  moving: {
    label: "MOVING",
    detail: "Long walks around NYC / Hoboken",
  },
};

const miles = (meters) => `${(meters / 1609.344).toFixed(1)} mi`;

function newYorkTime(value = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(value);
}

async function getWeather() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m&temperature_unit=fahrenheit&timezone=America%2FNew_York";
  const response = await fetch(url);
  if (!response.ok) return { label: "NEW YORK", detail: `New York · ${newYorkTime()}` };
  const data = await response.json();
  const temp = data.current?.temperature_2m;
  const time = data.current?.time ? newYorkTime(new Date(data.current.time)) : newYorkTime();
  const tempText = Number.isFinite(temp) ? `${Math.round(temp)}°F` : "Weather";
  return {
    label: "NEW YORK",
    detail: `New York · ${tempText} · ${time}`,
  };
}

function isUsableSecret(value) {
  return Boolean(value) && !/your_|xxx|TODO|paste|placeholder/i.test(value);
}

function stravaStatsDetail(stats) {
  const totals = [
    ["Run", stats.recent_run_totals],
    ["Ride", stats.recent_ride_totals],
    ["Swim", stats.recent_swim_totals],
  ]
    .filter(([, total]) => total?.distance > 0)
    .sort(([, a], [, b]) => b.distance - a.distance);
  const [type, total] = totals[0] || ["Activity", stats.all_run_totals || stats.all_ride_totals];
  if (!total?.distance) return fallback.moving.detail;
  return `${type} · ${miles(total.distance)}`;
}

async function getSpotify() {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
  if (
    !isUsableSecret(SPOTIFY_CLIENT_ID) ||
    !isUsableSecret(SPOTIFY_CLIENT_SECRET) ||
    !isUsableSecret(SPOTIFY_REFRESH_TOKEN)
  ) {
    return fallback.listening;
  }

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN,
    }),
  });
  if (!tokenResponse.ok) return fallback.listening;
  const token = await tokenResponse.json();

  const playedResponse = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!playedResponse.ok) return fallback.listening;
  const played = await playedResponse.json();
  const track = played.items?.[0]?.track;
  if (!track) return fallback.listening;

  return {
    label: "LISTENING",
    detail: `${track.artists?.[0]?.name || "Unknown"} — ${track.name}`,
  };
}

async function getStrava() {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
  if (
    !isUsableSecret(STRAVA_CLIENT_ID) ||
    !isUsableSecret(STRAVA_CLIENT_SECRET) ||
    !isUsableSecret(STRAVA_REFRESH_TOKEN)
  ) {
    return fallback.moving;
  }

  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: STRAVA_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenResponse.ok) return fallback.moving;
  const token = await tokenResponse.json();

  const activityResponse = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=1", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (activityResponse.ok) {
    const activities = await activityResponse.json();
    const activity = activities?.[0];
    if (activity) {
      const type = activity.sport_type || activity.type || "Activity";
      const distance = activity.distance ? ` · ${miles(activity.distance)}` : "";
      return {
        label: "MOVING",
        detail: `${type}${distance}`,
      };
    }
  }

  const athleteResponse = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!athleteResponse.ok) return fallback.moving;
  const athlete = await athleteResponse.json();
  if (!athlete.id) return fallback.moving;

  const statsResponse = await fetch(`https://www.strava.com/api/v3/athletes/${athlete.id}/stats`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!statsResponse.ok) return fallback.moving;
  const stats = await statsResponse.json();
  return {
    label: "MOVING",
    detail: stravaStatsDetail(stats),
  };
}

async function getGitHub() {
  const username = process.env.GITHUB_USERNAME || "hushbrush";
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-about-lately",
  };
  if (isUsableSecret(process.env.GITHUB_TOKEN)) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(`https://api.github.com/users/${username}/events/public`, { headers });
  if (!response.ok) return fallback.building;
  const events = await response.json();
  const push = events.find((event) => event.type === "PushEvent");
  if (!push) return fallback.building;
  const repo = push.repo?.name?.split("/").pop() || "a repo";
  const repoUrl = push.repo?.name ? `https://github.com/${push.repo.name}` : "https://github.com/hushbrush/portfolio";
  let message = push.payload?.commits?.[0]?.message;
  if (push.repo?.name) {
    const commitResponse = await fetch(`https://api.github.com/repos/${push.repo.name}/commits?per_page=1`, { headers });
    if (commitResponse.ok) {
      const commits = await commitResponse.json();
      message = commits?.[0]?.commit?.message || message;
    }
  }
  return {
    label: "BUILDING",
    repo,
    repoUrl,
    detail: (message || "Latest commit").split("\n")[0],
  };
}

export default async function handler(req, res) {
  const [weather, listening, building, moving] = await Promise.all([
    getWeather().catch(() => fallback.weather),
    getSpotify().catch(() => fallback.listening),
    getGitHub().catch(() => fallback.building),
    getStrava().catch(() => fallback.moving),
  ]);

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
  res.status(200).json({ weather, listening, building, moving });
}
