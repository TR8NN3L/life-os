# Life OS — Handoff Dokument
**Stand: 14.05.2026 (Session 2 — abends)**

---

## Was ist das Projekt

**Life OS** — eine React Web-App (PWA) für persönliches Produktivitätsmanagement. Verkauft als SaaS mit Freemium-Modell.

**Live URL:** `https://life-os-wine-eight.vercel.app`
**GitHub:** `github.com/TR8NN3L/life-os`
**Stack:** React 18 via CDN + Babel Standalone (kein Build-Step), Supabase (Auth + DB), Vercel (Hosting + Serverless APIs), Stripe (Payments), PostHog (Analytics)

---

## KRITISCHE Regeln — niemals brechen

1. **Cache-Busting Pflicht:** Bei JEDEM Commit `?v=YYYYMMDD[buchstabe]` in `index.html` bei ALLEN Script-Tags hochzählen. Aktuell: `?v=20260514w`. Sonst Black Screen.

2. **Keine nested React Components:** NIEMALS `const X = () =>` innerhalb einer anderen Funktion definieren. Nur Top-Level Functions. Verursacht Black Screen sobald Komponente mit Daten rendert.

3. **Icon-System:** Inline SVG via `Icon`-Komponente in `src/primitives.jsx`. Kein CDN für Icons.

4. **`window.LS`** = localStorage-Wrapper mit Supabase-Sync. Immer `LS.getItem/setItem` statt `localStorage` direkt (außer für Auth/Access-Keys wie `lifeos_guest`, `lifeos_last_uid`).

---

## Dateistruktur

```
Life OS/
├── index.html                    ← Script-Tags + Cache-Bust-Versionen + PostHog Snippet
├── tweaks-panel.jsx              ← Settings/Tweaks UI
├── src/
│   ├── app.jsx                   ← Root: Auth, Routing, Timer, Access Gate, Upgrade Modal
│   ├── primitives.jsx            ← Icon, LS, gemeinsame UI-Komponenten
│   ├── sidebar.jsx               ← Nav + SettingsModal (6 Tabs)
│   ├── dashboard.jsx             ← Übersicht, War Room Ringe, Truth Loop
│   ├── focus.jsx                 ← Focus Mode, Task Timer, Free Flow Timer
│   ├── mission-control.jsx       ← Projekte, OKRs (Projekt-Limit: 2 Free)
│   ├── okr-wizard.jsx            ← OKR-Generierung via AI (1x Free)
│   ├── planner.jsx               ← Wochenplaner, Missions-Generator (1x Free)
│   ├── insights.jsx              ← Statistiken + Promised vs. Delivered
│   ├── data.jsx                  ← POV_DATA, hardcoded Tasks
│   ├── onboarding.jsx            ← Onboarding Wizard
│   ├── tutorial.jsx              ← Tutorial (window.TutorialManager, window.injectTutorialSeedData)
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

**Beta-Code:** `LifeOS BETA 2026` — unbegrenzt verwendbar, für alle Beta-Tester.

---

## Settings Modal (in `src/sidebar.jsx`)

6 Tabs: **Profil · Abo & Zugang · KI · Push · Kalender · System**

- `window.__lifeos_openSettings(tab)` — globale Funktion, öffnet Modal direkt auf Tab (z.B. `"abo"`)
- Tab "Abo & Zugang": Beta-Code einlösen + Stripe Checkout (Sub-Tabs: "code" / "pay")
- Tab "System": Tutorial neu starten, Daten zurücksetzen, Account (Abmelden)
- Abmelden-Button: loading state `signingOut`, 4s Timeout-Fallback, kein `onClose()` — Page-Reload handled alles

---

## Supabase Setup — erledigt ✅

**Tabellen:**
- `public.user_data` — Key-Value Store pro User (localStorage-Sync via `window.LS`)
- `public.subscriptions` — Subscription Status pro User

**Supabase URL:** `https://sogifllxeanbvazfzlbf.supabase.co`

**Lennarts Account:** `user_id: 5e2f904e-9b36-4e55-8573-3a9083f4fe35` → status: active, plan: pro ✅

**Sync-Logik (`src/supabase.js`):**
- `LS.setItem` → debounced Write (300ms) → Supabase upsert
- `syncDown(uid)` → lädt alle cloud-rows in localStorage (Array-Merge bei Listen)
- `pushLocal(uid)` → pusht alle lokalen `lifeos_*` keys nach Supabase (Ersteinrichtung)
- `beforeunload` → flusht dirty keys via `keepalive: true` fetch
- `LOCAL_ONLY` Keys (nie in Cloud): `lifeos_openai_key`, `lifeos_guest`, `lifeos_active`

---

## Data Isolation — aktualisiert ✅

**SIGNED_OUT:** Alle `lifeos_*` + `lifeos_last_uid` werden gelöscht.

**SIGNED_IN:** Nur löschen wenn ANDERER User einloggt (Vergleich via `lifeos_last_uid`).
- Gleicher User re-authenticates → kein Wipe, nur `syncDown` + `reloadPovsFromLS()`
- Verhindert, dass eigene POV-Daten beim Re-Login verloren gehen

**`lifeos_user_povs` Write-Guard:** Schreibt nicht leeres `[]` nach Supabase beim initialen Mount bevor syncDown fertig ist.

---

## Vercel Env Vars — eingetragen ✅ / offen ⚠️

| Variable | Status | Wert |
|---|---|---|
| `SUPABASE_URL` | ✅ eingetragen | `https://sogifllxeanbvazfzlbf.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ eingetragen | Supabase → Settings → API → service_role |
| `BETA_CODES` | ✅ eingetragen | `LifeOS BETA 2026` |
| `APP_URL` | ✅ eingetragen | `https://life-os-wine-eight.vercel.app` |
| `STRIPE_SECRET_KEY` | ⚠️ später | Stripe Dashboard → Developers → API Keys |
| `STRIPE_PRICE_MONTHLY` | ⚠️ später | Stripe → Products → Price ID |
| `STRIPE_PRICE_YEARLY` | ⚠️ später | Stripe → Products → Price ID |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ später | Stripe → Webhooks → Signing secret |

**Stripe Webhook URL:** `https://life-os-wine-eight.vercel.app/api/stripe-webhook`
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

## Planner — Promised vs. Delivered

Rechtes Panel im Planner (wenn kein Block ausgewählt) zeigt **Wochenstatistik**:
- Datenquelle: `blockSelections` (Tasks → Blöcke zugewiesen) + `lifeos_done_${pov}` (abgehakt)
- Gruppiert nach POV, Balken, Gesamtzeile
- Berechnet in `weekPvdStats` useMemo in `planner.jsx`
- Leer-State: "Keine zugeteilten Tasks · Block auswählen → Tasks anhaken"

Das gleiche Widget existiert auch in `insights.jsx` (dort über alle Zeit, nicht nur aktuelle Woche).

---

## Aktuelle Cache-Bust-Version

`?v=20260514w` — alle 14 Script-Tags in `index.html` auf diesem Stand.
Nächste Version wäre: `?v=20260514x`

---

## Was noch zu tun ist

**Prio 1 — Stripe einrichten** (wenn bereit zum Verkaufen)
- Produkt + 2 Preise anlegen (9,99€/Monat + 79,99€/Jahr)
- Webhook Endpoint anlegen
- Env Vars eintragen

**Prio 2 — Testen nach den Fixes**
- Lennart: eigene POVs neu anlegen (gingen bei Re-Login verloren, jetzt gefixt)
- Test: Re-Login → POVs noch da?
- Test: Anderer Account → Datentrennung OK?
- Test: Beta-Code "LifeOS BETA 2026" auf neuem Account → Zugang?

**Prio 3 — Optional / Nice-to-have**
- Insights: Daten älter als 7 Tage für Free-User ausblenden
- Dashboard: "Trial läuft ab in X Tagen" Banner
- Mehr PostHog Events (z.B. `project_created`, `okr_completed`)

---

## Feature Ideas — Backlog

### 1. Punch Card (Warren Buffett Commitment System)
4 System-Karten pro Quartal. Eine Karte = eine strukturelle Veränderung. Karte verbraucht → Entscheidung locked.
- Logik: `lifeos_punch_cards_Q[quarter]`, max 4 Einträge
- UI: 4 Slots in Mission Control oder Dashboard

### 2. Failure Resume
Insights-Sektion für absichtlich gescheiterte Versuche. Gamifiziert Lerneffekte aus Fehlern.
- Logik: Manueller Eintrag oder automatisch bei OKR-Reset
- UI: Timeline in Insights → "Meine Niederlagen"

### 3. 12x30 Sprint Mode
30-Tage-Modus, 12h Output/Tag. Kein Pause. Rotes Banner in der App.
- Logik: `lifeos_sprint_active`, Tages-Timer-Ziel, tägliche Abrechnung

### 4. Say-Do Metric ⭐ (Stärkster Kandidat — nächstes Feature)
% Übereinstimmung zwischen Planner (gesagt) und Focus Timer (getan). Ehrlichste Produktivitätszahl.
- Datenquellen: bereits vorhanden — Planner-Blöcke + Timer Sessions
- UI-Optionen: Dashboard War Room Ring #5 ODER eigene Insights-Sektion
- Nächster Schritt: `insights.jsx` oder `dashboard.jsx` erweitern

---

## Letzte Commits (diese Session)

| Commit | Was |
|---|---|
| `87ceb3a` | fix: POVs nach Re-Login nicht mehr verloren (lifeos_last_uid Guard) |
| `0f3b721` | feat: Promised vs Delivered im Planner, Abmelden-Fix, System-Tab bereinigt |
| `6867215` | feat: Abo & Zugang als Tab in Einstellungen eingebettet |
| `1ed666d` | feat: Paywall-Button in Einstellungen → System → Abo & Zugang |
