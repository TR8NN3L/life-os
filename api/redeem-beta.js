// POST /api/redeem-beta  { user_id, email, code }
// Validates code against BETA_CODES env var (comma-separated list).
// On success: inserts subscription row with status="beta".

const SUPA_URL = process.env.SUPABASE_URL || "https://sogifllxeanbvazfzlbf.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { user_id, email, code } = req.body || {};
  if (!user_id || !code) {
    return res.status(400).json({ error: "Fehlende Parameter." });
  }

  // Validate code
  const raw = (process.env.BETA_CODES || "BETA100").split(",").map(c => c.trim().toUpperCase());
  const inputCode = code.trim().toUpperCase();
  if (!raw.includes(inputCode)) {
    return res.status(400).json({ error: "Ungültiger Code. Bitte prüfe die Eingabe." });
  }

  if (!SUPA_KEY) {
    // Dev mode — no DB, just return success
    return res.json({ success: true });
  }

  try {
    // Check if subscription already exists for this user
    const checkR = await fetch(
      `${SUPA_URL}/rest/v1/subscriptions?user_id=eq.${user_id}&limit=1&select=id,status`,
      {
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
        },
      }
    );
    const existing = await checkR.json();
    if (Array.isArray(existing) && existing.length > 0) {
      // Already has a subscription — activate if not already active
      if (existing[0].status !== "active" && existing[0].status !== "beta") {
        await fetch(`${SUPA_URL}/rest/v1/subscriptions?id=eq.${existing[0].id}`, {
          method: "PATCH",
          headers: {
            apikey: SUPA_KEY,
            Authorization: `Bearer ${SUPA_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ status: "beta", promo_code: inputCode, updated_at: new Date().toISOString() }),
        });
      }
      return res.json({ success: true, already: true });
    }

    // Insert new subscription
    const insertR = await fetch(`${SUPA_URL}/rest/v1/subscriptions`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id,
        email: email || null,
        status: "beta",
        plan: "beta",
        promo_code: inputCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!insertR.ok) {
      const errText = await insertR.text();
      console.error("[redeem-beta] insert error:", errText);
      return res.status(500).json({ error: "Datenbankfehler. Bitte erneut versuchen." });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error("[redeem-beta]", e.message);
    return res.status(500).json({ error: "Serverfehler. Bitte erneut versuchen." });
  }
}
