import { createAboutLatelyData, setNoStoreHeaders } from "../lib/about-lately-data.js";

export default async function handler(req, res) {
  setNoStoreHeaders(res);
  res.status(200).json(await createAboutLatelyData());
}
