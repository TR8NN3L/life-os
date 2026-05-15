// ical-proxy.js — fetches an iCal URL server-side to bypass CORS
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing ?url= parameter");

  let target;
  try { target = new URL(url); } catch {
    return res.status(400).send("Invalid URL");
  }
  // Only allow http/https
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return res.status(400).send("Only http/https allowed");
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { "User-Agent": "LifeOS-Calendar/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return res.status(502).send(`Upstream returned ${upstream.status}`);
    }
    const text = await upstream.text();
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(text);
  } catch (e) {
    res.status(502).send("Fetch failed: " + (e.message || "unknown"));
  }
}
