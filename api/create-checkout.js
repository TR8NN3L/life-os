// POST /api/create-checkout  { user_id, email, plan, promo_code }
// Creates a Stripe Checkout session and returns { url }.

import Stripe from "stripe";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Stripe nicht konfiguriert. STRIPE_SECRET_KEY fehlt." });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { user_id, email, plan = "monthly", promo_code } = req.body || {};

  if (!user_id || !email) {
    return res.status(400).json({ error: "Fehlende Parameter (user_id, email)." });
  }

  const priceId =
    plan === "yearly"
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;

  if (!priceId) {
    return res.status(500).json({ error: `Price ID für Plan "${plan}" nicht konfiguriert.` });
  }

  const appUrl = process.env.APP_URL || "https://life-os-nu.vercel.app";

  const sessionParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?checkout=success`,
    cancel_url: `${appUrl}/?checkout=cancelled`,
    metadata: { user_id },
    subscription_data: { metadata: { user_id } },
    allow_promotion_codes: true,
  };

  // Pre-apply promo code if provided
  if (promo_code) {
    try {
      const codes = await stripe.promotionCodes.list({
        code: promo_code.trim().toUpperCase(),
        active: true,
        limit: 1,
      });
      if (codes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: codes.data[0].id }];
        delete sessionParams.allow_promotion_codes;
      }
    } catch (e) {
      console.warn("[create-checkout] promo lookup failed:", e.message);
    }
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url });
  } catch (e) {
    console.error("[create-checkout]", e.message);
    return res.status(500).json({ error: e.message });
  }
}
