import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const safeId = (name) =>
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

const parseProjectMonth = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

function generateCircleAttributes(projects) {
  const maxSize = 80;
  const minSize = 30;

  const newestDate = new Date(
    Math.max(...projects.map((p) => parseProjectMonth(p.dateCompleted)))
  );
  const oldestDate = new Date(
    Math.min(...projects.map((p) => parseProjectMonth(p.dateCompleted)))
  );
  const dateRange = newestDate - oldestDate || 1;

  projects.forEach((p) => {
    const d = parseProjectMonth(p.dateCompleted);
    const size =
      ((d - oldestDate) / dateRange) * (maxSize - minSize) + minSize;
    p.size = size;
  });
}

function getCategoryCounts(projects) {
  const counts = { data: 0, design: 0, allCategories: 0 };
  projects.forEach((p) => {
    const categories = (p.categories || "").toLowerCase();
    const isData = categories.includes("data");
    const isDesign = categories.includes("design");
    if (isData) counts.data++;
    if (isDesign) counts.design++;
    if (isData && isDesign) counts.allCategories++;
  });
  return counts;
}

function determineVennCirclePositions(svgWidth, svgHeight, circleRadius) {
  const overlapX = svgWidth / 2.05;
  const overlapY = svgHeight / 4;
  const overlapBetweenCircles = 100;

  return [
    {
      id: "data",
      cx: overlapX - circleRadius / 2 + overlapBetweenCircles / 2,
      cy: overlapY + circleRadius / 2,
      radius: circleRadius,
    },
    {
      id: "design",
      cx: overlapX + circleRadius / 2 - overlapBetweenCircles / 2,
      cy: overlapY + circleRadius / 2,
      radius: circleRadius,
    },
  ];
}

function getClientName(project) {
  return String(project.client || "").trim();
}

function getClientLabel(project) {
  return getClientName(project).toUpperCase();
}

function getMonthsSinceProject(project) {
  const projectDate = parseProjectMonth(project.dateCompleted);
  const today = new Date();
  const months =
    (today.getFullYear() - projectDate.getFullYear()) * 12 +
    (today.getMonth() - projectDate.getMonth());
  return Math.max(0, months);
}

function getRecentLabel(project) {
  const months = getMonthsSinceProject(project);
  return `${months} ${months === 1 ? "MONTH" : "MONTHS"} AGO`;
}

function getPreviewMedia(project) {
  if (project.previewVideo || project.hoverVideo) {
    return { type: "video", src: project.previewVideo || project.hoverVideo };
  }
  if (safeId(project.projectName).includes("jurisee")) {
    return { type: "video", src: "/assets/jurisee/loop.mp4" };
  }
  return { type: "video", src: `/assets/${safeId(project.projectName)}/loop.mp4` };
}

function getProjectLabel(project, activeFilter) {
  if (activeFilter === "client") return getClientLabel(project);
  if (activeFilter === "recent") return getRecentLabel(project);
  return "";
}

function estimateLabelWidth(label) {
  return Math.min(260, Math.max(72, label.length * 8.2));
}

function circleOpacityForProjects(circleId, projects) {
  const hasCategory = projects.some((project) =>
    (project.categories || "").toLowerCase().includes(circleId)
  );
  return hasCategory ? 1 : 0.3;
}

function assignProjectPositions(projects, vennCircles, svgWidth, svgHeight) {
  const [cData, cDesign] = vennCircles;

  projects.forEach((p) => {
    const categories = (p.categories || "").toLowerCase();
    const isData = categories.includes("data");
    const isDesign = categories.includes("design");

    if (isData && isDesign) {
      p.targetX = (cData.cx + 10 + cDesign.cx) / 2;
      p.targetY = (cData.cy + 20 + cDesign.cy) / 2;
    } else if (isData) {
      p.targetX = cData.cx - 150;
      p.targetY = cData.cy;
    } else if (isDesign) {
      p.targetX = cDesign.cx + 250;
      p.targetY = cDesign.cy;
    } else {
      p.targetX = svgWidth / 2;
      p.targetY = svgHeight / 2;
    }
  });
}

// keep nodes inside a circle “wall”
function forceContainInCircle(cx, cy, r, testFn) {
  let nodes;
  function force(alpha) {
    for (const d of nodes) {
      if (!testFn(d)) continue;
      const dx = d.x - cx,
        dy = d.y - cy;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const overflow = dist + d.size - r;
      if (overflow > 0) {
        d.x -= (dx / dist) * overflow * alpha;
        d.y -= (dy / dist) * overflow * alpha;
      }
    }
  }
  force.initialize = (_) => (nodes = _);
  return force;
}

function showHoverCard(event, project) {
  const offsetX = 100;
  const cardWidth = 480;
  const cardPadding = 14;
  const mediaWidth = cardWidth - cardPadding * 2;
  const viewportPadding = 16;
  const categoryText = project.categories || "";
  const isData = categoryText.includes("Data") || categoryText.includes("data");

  const rawCardLeft = isData
    ? event.pageX + offsetX
    : event.pageX - offsetX - cardWidth;
  const cardLeft = Math.max(
    viewportPadding,
    Math.min(
      rawCardLeft,
      window.scrollX + window.innerWidth - cardWidth - viewportPadding
    )
  );
  const cardTop = event.pageY - 250;
  const media = getPreviewMedia(project);

  d3.select("#hoverPreviewCard").remove();

  const card = d3
    .select("body")
    .append("div")
    .attr("id", "hoverPreviewCard")
    .style("position", "absolute")
    .style("left", `${event.pageX}px`)
    .style("top", `${event.pageY}px`)
    .style("width", `${cardWidth}px`)
    .style("padding", `${cardPadding}px`)
    .style("background", "rgba(0,0,0,0.92)")
    .style("color", "white")
    .style("border-radius", "18px")
    .style("pointer-events", "none")
    .style("font-family", "bricolage-grotesque, sans-serif")
    .style("overflow", "hidden")
    .style("z-index", "1000")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "10px")
    .style("opacity", 0)
    .style("transform", "scale(0.08)")
    .style("transform-origin", "0 0");

  card
    .append("div")
    .style("font-weight", "700")
    .style("font-size", "18px")
    .style("line-height", "1.15")
    .text(project.projectName);

  const mediaWrap = card
    .append("div")
    .style("width", "100%")
    .style("height", `${mediaWidth / (16 / 9)}px`)
    .style("border-radius", "12px")
    .style("overflow", "hidden")
    .style("background", "#111");

  if (media.type === "youtube") {
    mediaWrap
      .append("iframe")
      .attr("src", media.src)
      .attr("allow", "autoplay; encrypted-media; picture-in-picture")
      .attr("allowfullscreen", true)
      .style("border", "0")
      .style("width", "100%")
      .style("height", "100%");
  } else {
    const video = mediaWrap
      .append("video")
      .attr("src", media.src)
      .attr("autoplay", true)
      .attr("loop", true)
      .attr("muted", true)
      .attr("playsinline", true)
      .style("width", "100%")
      .style("height", "100%")
      .style("object-fit", "cover");

    video.on("loadedmetadata", function () {
      const aspectRatio = this.videoWidth && this.videoHeight
        ? this.videoWidth / this.videoHeight
        : 16 / 9;
      mediaWrap
        .transition()
        .duration(180)
        .style("height", `${mediaWidth / aspectRatio}px`);
    });
  }

  card
    .append("div")
    .style("font-size", "13px")
    .style("font-weight", "300")
    .style("line-height", "1.35")
    .text(project.line || "");

  card
    .transition()
    .duration(240)
    .ease(d3.easeCubicOut)
    .style("left", `${cardLeft}px`)
    .style("top", `${cardTop}px`)
    .style("opacity", 1)
    .style("transform", "scale(1)");
}

export default function VennDiagram({ projects, activeFilter, onProjectClick }) {
  const containerRef = useRef(null);
  const simRef = useRef(null);
  const [viewportKey, setViewportKey] = useState(0);

  useEffect(() => {
    let resizeTimer;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => setViewportKey((key) => key + 1), 180);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!projects || !projects.length) return;

    // clone so D3 can mutate positions without mutating React state
    const data = projects.map((p) => ({ ...p }));

    generateCircleAttributes(data);

    // clear previous render
    if (simRef.current) simRef.current.stop();
    d3.select(containerRef.current).selectAll("*").remove();

    if (window.matchMedia("(max-width: 900px)").matches) return;

    const svgWidth = containerRef.current.clientWidth || window.innerWidth;
    const circleRadius = Math.max(260, Math.min(430, (svgWidth - 140) / 3));
    const svgHeight = Math.max(window.innerHeight * 1.1, circleRadius * 2 + 180);

    const svg = d3
      .select(containerRef.current)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight);

    // defs patterns
    const defs = svg.append("defs");
    data.forEach((p) => {
      const safe = safeId(p.projectName);
      defs
        .append("pattern")
        .attr("id", `thumb-${safe}`)
        .attr("patternUnits", "objectBoundingBox")
        .attr("width", 1)
        .attr("height", 1)
        .append("image")
        .attr("href", `/assets/thumbnails/${safe}.png`)
        .attr("xlink:href", `/assets/thumbnails/${safe}.png`)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .attr("width", p.size * 2)
        .attr("height", p.size * 2);
    });

    // venn circles
    getCategoryCounts(data); // (kept in case you’ll scale radius later)
    const vennCircles = determineVennCirclePositions(svgWidth, svgHeight, circleRadius);
    const [cData, cDesign] = vennCircles;

    svg
      .selectAll(".venn-circle")
      .data(vennCircles)
      .enter()
      .append("circle")
      .attr("class", "venn-circle")
      .attr("id", (d) => d.id)
      .attr("cx", (d) => d.cx)
      .attr("cy", (d) => d.cy)
      .attr("r", (d) => d.radius)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .style("opacity", (d) => circleOpacityForProjects(d.id, data));

    svg
      .selectAll(".venn-circle-text")
      .data(vennCircles)
      .enter()
      .append("text")
      .attr("class", "venn-circle-text")
      .attr("x", (d) => d.cx)
      .attr("y", (d) => d.cy - circleRadius - 10)
      .text((d) => d.id.charAt(0).toUpperCase() + d.id.slice(1))
      .attr("text-anchor", "middle")
      .style("font-family", "'bricolage-grotesque', sans-serif")
      .style("font-weight", "300")
      .style("font-size", "16px")
      .attr("fill", "black")
      .style("opacity", (d) => circleOpacityForProjects(d.id, data));

    // targets
    assignProjectPositions(data, vennCircles, svgWidth, svgHeight);
    data.forEach((d) => {
      d.x = svgWidth / 2;
      d.y = svgHeight / 2;
      d.vx = 0;
      d.vy = 0;
    });
    if (activeFilter === "client" || activeFilter === "recent") {
      data.forEach((d) => {
        d.projectLabel = getProjectLabel(d, activeFilter);
        d.projectLabelWidth = estimateLabelWidth(d.projectLabel);
        d.collisionSize = Math.max(d.size + 30, d.projectLabelWidth / 2 + 14);
      });
    }

    // draw nodes once
    const nodes = svg
      .selectAll(".project-circle")
      .data(data, (d) => d.projectName)
      .enter()
      .append("circle")
      .attr("class", "project-circle")
      .attr("r", (d) => d.size)
      .attr("fill", (d) => `url(#thumb-${safeId(d.projectName)}) #f8f7fc`)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5 5")
      .style("cursor", "pointer")
      .on("mouseenter", (e, d) => {
        nodes
          .transition()
          .duration(120)
          .style("opacity", (node) => (node.projectName === d.projectName ? 1 : 0.3));
        if (projectLabels) {
          projectLabels
            .transition()
            .duration(120)
            .style("opacity", (node) => (node.projectName === d.projectName ? 1 : 0.3));
        }
        showHoverCard(e, d);
      })
      .on("mouseleave", () => {
        nodes.transition().duration(120).style("opacity", 1);
        if (projectLabels) projectLabels.transition().duration(120).style("opacity", 1);
        d3.select("#hoverPreviewCard").remove();
      })
      .on("click", (_, d) => {
        if (onProjectClick) onProjectClick(d);
      });

    let projectLabels = null;
    if (activeFilter === "client" || activeFilter === "recent") {
      projectLabels = svg
        .selectAll(".project-label")
        .data(data, (d) => d.projectName)
        .enter()
        .append("g")
        .attr("class", "project-label")
        .style("pointer-events", "none");

      projectLabels
        .append("rect")
        .attr("x", (d) => -d.projectLabelWidth / 2 - 5)
        .attr("y", -2)
        .attr("width", (d) => d.projectLabelWidth + 10)
        .attr("height", 21)
        .attr("fill", "#fff");

      projectLabels
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "hanging")
        .attr("fill", "#000")
        .style("font-family", "'bricolage-grotesque', sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "700")
        .style("letter-spacing", "0")
        .text((d) => d.projectLabel);
    }

    // simulation
    const simulation = d3
      .forceSimulation(data)
      .force("x", d3.forceX((d) => d.targetX).strength(0.6))
      .force("y", d3.forceY((d) => d.targetY).strength(0.3))
      .force("collision", d3.forceCollide((d) => d.collisionSize || d.size + 10).iterations(2))
      .force(
        "containData",
        forceContainInCircle(cData.cx, cData.cy, circleRadius, (d) =>
          (d.categories || "").toLowerCase().includes("data")
        )
      )
      .force(
        "containDesign",
        forceContainInCircle(cDesign.cx, cDesign.cy, circleRadius, (d) =>
          (d.categories || "").toLowerCase().includes("design")
        )
      )
      .on("tick", () => {
        nodes.attr("cx", (d) => d.x - 20).attr("cy", (d) => d.y - 20);
        if (projectLabels) {
          projectLabels
            .attr("transform", (d) => `translate(${d.x - 20}, ${d.y - 20 + d.size + 18})`);
        }
      });

    simRef.current = simulation;
    simulation.alpha(1).restart();

    // cleanup
    return () => {
      simulation.stop();
      d3.select("#hoverPreviewCard").remove();
    };
  }, [projects, activeFilter, onProjectClick, viewportKey]);

  // (optional) on resize: re-render by triggering effect (simple version)
  // You can add a window resize listener later.

  return <div id="vennDiagram" ref={containerRef} />;
}
