# Life OS — Handoff Dokument
**Stand: 14.05.2026**

---

## Was ist das Projekt

**Life OS** — eine React Web-App (PWA) für persönliches Produktivitätsmanagement. Verkauft als SaaS mit Freemium-Modell.

**Live URL:** Vercel (Repo: `github.com/TR8NN3L/life-os`)
**Stack:** React 18 via CDN + Babel Standalone (kein Build-Step), Supabase (Auth + DB), Vercel (Hosting + Serverless APIs), Stripe (Payments), PostHog (Analytics)

---

## KRITISCHE Regeln — niemals brechen

1. **Cache-Busting Pflicht:** Bei JEDEM Commit `?v=YYYYMMDD[buchstabe]` in `index.html` bei ALLEN Script-Tags hochzählen. Aktuell: `?v=20260514p`. Sonst Black Screen.

2. **Keine nested React Components:** NIEMALS `const X = () =>` innerhalb einer anderen Funktion definieren. Nur Top-Level Functions. Verursacht Black Screen sobald Komponente mit Daten rendert.

3. **Icon-System:** Inline SVG via `Icon`-Komponente in `src/primitives.jsx`. Kein CDN für Icons.

4. **`window.LS`** = localStorage-Wrapper mit Supabase-Sync. Immer `LS.getItem/setItem` statt `localStorage` direkt (außer für Auth/Access-Keys).

---

## Dateistruktur

```
Life OS/
├── index.html                    ← Script-Tags + Cache-Bust-Versionen + PostHog Snippet
├── tweaks-panel.jsx              ← Settings/Tweaks UI
├── src/
│   ├── app.jsx                   ← Root: Auth, Routing, Timer, Access Gate, Upgrade Modal
│   ├── primitives.jsx            ← Icon, LS, gemeinsame UI-Komponenten
│   ├── sidebar.jsx               ← Nav
│   ├── dashboard.jsx             ← Übersicht, War Room Ringe, Truth Loop
│   ├── focus.jsx                 ← Focus Mode, Task Timer, Free Flow Timer
│   ├── mission-control.jsx       ← Projekte, OKRs (Projekt-Limit: 2 Free)
│   ├── okr-wizard.jsx            ← OKR-Generierung via AI (1x Free)
│   ├── planner.jsx               ← Wochenplaner, Missions-Generator (1x Free)
│   ├── insights.jsx              ← Statistiken
│   ├── data.jsx                  ← POV_DATA, hardcoded Tasks
│   ├── onboarding.jsx            ← Onboarding Wizard
│   ├── tutorial.jsx              ← Tutorial
│   └── paywall.jsx               ← PaywallScreen + UpgradeModal + checkFreeLimit
├── api/
│   ├── check-access.js           ← GET ?user_id= → prüft subscriptions Tabelle
│   ├── redeem-beta.js            ← POST {user_id, email, code} → Beta-Code einlösen
│   ├── create-checkout.js        ← POST {user_id, email, plan} → Stripe Checkout URL
│   └── stripe-webhook.js         ← Stripe Events → subscriptions Tabelle
└── package.json                  ← stripe: ^16.0.0
```

---

## Access / Paywall Logik (in `src/app.jsx`)

```
User öffnet App
  → Supabase Auth Check
  → checkAccess(userId, createdAt) wird aufgerufen

checkAccess Reihenfolge:
  1. lifeos_guest === "1"           → Zugang (Gast)
  2. created_at < "2026-05-14"     → Zugang (Bestandsnutzer, grandfathered)
  3. lifeos_trial_start existiert
     + jünger als 7 Tage            → Zugang (Trial)
  4. lifeos_access === "1"
     + Cache < 6h                   → Zugang (gecacht)
  5. /api/check-access aufrufen
     + status in (active,beta,trialing) → Zugang
  6. Netzwerkfehler                 → Zugang (fail open)
  7. Sonst                          → PaywallScreen
```

**Beim ersten "ready"-State:** `lifeos_trial_start` wird gesetzt (startet 7-Tage-Trial).

**Freemium Limits** (in `localStorage` als `lifeos_free_usage`):
- `okr_gen`: 1 freie OKR-Generierung
- `mission_gen`: 1 freier Missions-Generator
- `projects`: max 2 Projekte

Bei Limit → `window.triggerUpgrade(feature)` → `UpgradeModal` öffnet sich.
Pro-User: `window.__lifeos_hasAccess = true` → `checkFreeLimit()` gibt immer `true` zurück.

---

## Supabase Setup — erledigt ✅

**Tabellen:**
- `public.user_data` — Key-Value Store pro User (localStorage-Sync)
- `public.subscriptions` — Subscription Status pro User

**Supabase URL:** `https://sogifllxeanbvazfzlbf.supabase.co`

**Lennarts Account:** `user_id: 5e2f904e-9b36-4e55-8573-3a9083f4fe35` → status: active, plan: pro ✅

---

## Vercel Env Vars — NOCH OFFEN ⚠️

| Variable | Status | Wert |
|---|---|---|
| `SUPABASE_URL` | ⚠️ eintragen | `https://sogifllxeanbvazfzlbf.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ eintragen | Supabase → Settings → API → service_role |
| `BETA_CODES` | ⚠️ eintragen | Selbst definieren, z.B. `TOBI2026,BETA100` |
| `APP_URL` | ⚠️ eintragen | Vercel-URL der App |
| `STRIPE_SECRET_KEY` | später | Stripe Dashboard → Developers → API Keys |
| `STRIPE_PRICE_MONTHLY` | später | Stripe → Products → Price ID |
| `STRIPE_PRICE_YEARLY` | später | Stripe → Products → Price ID |
| `STRIPE_WEBHOOK_SECRET` | später | Stripe → Webhooks → Signing secret |

**Nach Eintragen:** Vercel neu deployen.

**Stripe Webhook URL:** `https://[deine-app].vercel.app/api/stripe-webhook`
**Stripe Webhook Events:** `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`

---

## PostHog Analytics — erledigt ✅

EU-Host, Session Recording an, `maskAllInputs: true`.
Key im Code gesplittet (GitHub Secret Scanner Bypass).

**Getrackte Events:** `$pageview`, `user_logged_in`, `timer_started`, `timer_stopped`, `free_flow_started`, `free_flow_stopped`, `paywall_viewed`, `paywall_code_redeemed`, `paywall_checkout_started`, `upgrade_modal_shown`.

---

## Timer — Wall-Clock Implementierung

Beide Timer (Task + Free Flow) nutzen `Date.now()`-Anker — immun gegen Browser-Tab-Throttling:
```js
const startedAt = Date.now();
const baseTime = bisherGelaufeneSeconds;
// Jede 500ms:
const nowElapsed = baseTime + Math.floor((Date.now() - startedAt) / 1000);
```

---

## Data Isolation — erledigt ✅

Bei `SIGNED_OUT` und `SIGNED_IN` werden alle `lifeos_*` localStorage-Keys gelöscht bevor neue User-Daten geladen werden. Verhindert dass User A die Daten von User B sieht.

---

## Was noch zu tun ist

**Prio 1 — Vercel Env Vars eintragen**
Beta-Code-Einlösung und Access-Check funktionieren erst dann korrekt.

**Prio 2 — Testen**
- Haupt-Account einloggen → Projekte noch da? (Supabase-Sync prüfen)
- Neuen Test-Account → kein Paywall während Trial, Upgrade-Modal bei Limit

**Prio 3 — Stripe einrichten** (wenn bereit zum Verkaufen)
- Produkt + 2 Preise anlegen (9,99€/Monat + 79,99€/Jahr)
- Webhook Endpoint anlegen
- Env Vars eintragen

**Prio 4 — Optional / Nice-to-have**
- Insights: Daten älter als 7 Tage für Free-User ausblenden
- Dashboard: "Trial läuft ab in X Tagen" Banner
- Mehr PostHog Events (z.B. `project_created`, `okr_completed`)

---

## Aktuelle Cache-Bust-Version

`?v=20260514p` — alle Script-Tags in `index.html` auf diesem Stand.
Nächste Version wäre: `?v=20260514q`
