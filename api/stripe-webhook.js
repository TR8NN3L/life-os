// POST /api/stripe-webhook
// Handles Stripe events → writes subscription status to Supabase.
// Requires raw body for signature verification — bodyParser disabled below.

import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

const SUPA_URL = process.env.SUPABASE_URL || "https://sogifllxeanbvazfzlbf.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function upsertSubscription(data) {
  await fetch(`${SUPA_URL}/rest/v1/subscriptions`, {
    method: "POST",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: "Stripe env vars missing" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("[stripe-webhook] signature verification failed:", e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  const obj = event.data.object;

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const userId = obj.metadata?.user_id;
        if (!userId) break;
        const status = ["active", "trialing"].includes(obj.status) ? "active" : obj.status;
        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: obj.customer,
          stripe_subscription_id: obj.id,
          status,
          plan: "pro",
        });
        break;
      }
      case "customer.subscription.deleted": {
        const userId = obj.metadata?.user_id;
        if (!userId || !SUPA_KEY) break;
        await fetch(
          `${SUPA_URL}/rest/v1/subscriptions?user_id=eq.${userId}`,
          {
            method: "PATCH",
            headers: {
              apikey: SUPA_KEY,
              Authorization: `Bearer ${SUPA_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ status: "canceled", updated_at: new Date().toISOString() }),
          }
        );
        break;
      }
      case "checkout.session.completed": {
        // Fallback: handle if subscription metadata wasn't set
        const userId = obj.metadata?.user_id;
        const customerId = obj.customer;
        if (userId && customerId && obj.mode === "subscription") {
          await upsertSubscription({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: obj.subscription,
            status: "active",
            plan: "pro",
          });
        }
        break;
      }
    }
  } catch (e) {
    console.error("[stripe-webhook] handler error:", e.message);
  }

  return res.json({ received: true });
}
