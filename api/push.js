// Vercel Serverless Function — Pushover Proxy
// POST /api/push  { token, user, title, message, priority, sound }

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, user, title, message, priority = 0, sound } = req.body || {};

  if (!token || !user || !message) {
    return res.status(400).json({ error: "Missing: token, user or message" });
  }

  try {
    const r = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        user,
        title: title || "Life OS",
        message,
        priority,
        ...(sound ? { sound } : {}),
      }),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
