// GET /api/check-access?user_id=xxx
// Returns { access: bool, plan, status }
// Uses Supabase REST API directly (no extra package).

const SUPA_URL = process.env.SUPABASE_URL || "https://sogifllxeanbvazfzlbf.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ access: false, reason: "Missing user_id" });

  if (!SUPA_KEY) {
    // No service key configured → fail open during development
    return res.json({ access: true, plan: "dev", status: "dev" });
  }

  try {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/subscriptions?user_id=eq.${user_id}&status=in.(active,beta,trialing)&limit=1&select=status,plan,promo_code`,
      {
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
        },
      }
    );
    const rows = await r.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return res.json({ access: true, plan: rows[0].plan, status: rows[0].status });
    }
    return res.json({ access: false });
  } catch (e) {
    console.error("[check-access]", e.message);
    // Fail open — don't lock out users due to DB issues
    return res.json({ access: true, plan: "unknown", status: "error" });
  }
}
