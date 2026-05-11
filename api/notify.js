// Vercel Serverless Function — Web Push via VAPID
// POST /api/notify  { subscription, title, message, tag }

import webpush from "web-push";

const VAPID_PUBLIC  = "BMxK6OBVWwEa3sErwXZNFHsWSb3VknIiWm47HhoCO1sb8UZT0IFxWaLNUbSs2WZzoWs5YSywCtBB9ix26f--uxw";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL   = process.env.VAPID_EMAIL || "mailto:lifeos@noreply.app";

if (VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  if (!VAPID_PRIVATE) {
    return res.status(500).json({ error: "VAPID_PRIVATE_KEY env var not set" });
  }

  const { subscription, title, message, tag } = req.body || {};

  if (!subscription?.endpoint) {
    return res.status(400).json({ error: "Missing subscription.endpoint" });
  }
  if (!message && !title) {
    return res.status(400).json({ error: "Missing title or message" });
  }

  const payload = JSON.stringify({
    title:   title   || "Life OS",
    body:    message || "",
    tag:     tag     || "lifeos",
  });

  try {
    await webpush.sendNotification(subscription, payload);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[notify]", err.statusCode, err.body);
    return res.status(err.statusCode || 500).json({ error: err.body || err.message });
  }
}
