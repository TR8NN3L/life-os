# Life OS — Handoff Dokument
**Stand: 16.05.2026 (Session 13)**

---

## Was ist das Projekt

**Life OS (Hormetic)** — React Web-App (PWA) für persönliches Produktivitätsmanagement. Verkauft als SaaS mit Freemium-Modell.

**Live URL:** `https://life-os-wine-eight.vercel.app`
**GitHub:** `github.com/TR8NN3L/life-os`
**Stack:** React 18 via CDN + Babel Standalone (kein Build-Step), Supabase (Auth + DB), Vercel (Hosting + Serverless APIs), Stripe (Payments, Stub), PostHog (Analytics, EU)

---

## KRITISCHE Regeln — niemals brechen

1. **Cache-Busting Pflicht:** Bei JEDEM Commit `?v=YYYYMMDD[buchstabe]` in `index.html` bei ALLEN Script-Tags hochzählen. **Aktuell: `?v=20260516ab`**. Nächste Version: `?v=20260516ac`. Sonst Black Screen.

2. **Keine nested React Components:** NIEMALS `const X = () =>` innerhalb einer anderen Funktion definieren. Nur Top-Level Functions. Verursacht Black Screen sobald Komponente mit Daten rendert.

3. **Kein Unicode in JSX-Text:** `→ — ✓ ✕ ℹ` direkt in JSX-Text → Black Screen. Fix: JS-String `{"→"}` oder HTML-Entity `&#x2192;`. ABER: HTML-Entities IN JS-Strings (`"&#9650;"`) rendern als Rohtext → Unicodezeichen `"▲"` nutzen.

4. **State-Scope:** `SettingsModal` und `Sidebar` sind **separate Top-Level-Funktionen**. State für SettingsModal MUSS in SettingsModal deklariert sein, nicht in Sidebar.

5. **`renderSection(title, children)`** — genau 2 Argumente. Nie 3+, 3. Argument wird ignoriert.

6. **`window.LS`** = localStorage-Wrapper mit Supabase-Sync. Immer `LS.getItem/setItem` statt `localStorage` direkt (außer für Auth/Access-Keys wie `lifeos_guest`, `lifeos_last_uid`, `lifeos_analytics_consent`, `lifeos_openai_key`).

7. **Icon-System:** Inline SVG via `Icon`-Komponente in `src/primitives.jsx`. Kein CDN für Icons.

8. **allPovs-Pattern (überall gleich!):** `userPovs` überschreiben hardcodierte POVS bei gleicher ID:
   ```js
   const allPovs = React.useMemo(() => {
     const userIds = new Set(userPovs.map(p => p.id));
     return [...POVS.filter(p => !userIds.has(p.id)), ...userPovs];
   }, [userPovs]);
   ```
   **Dieses Pattern ist in sidebar, mission-control, planner, inbox, insights implementiert.** Niemals `POVS.map()` direkt für UI verwenden — immer `allPovs`.

---

## Dateistruktur

```
Life OS/
├── index.html                    ← Script-Tags + Cache-Bust-Versionen (?v=20260516aa) + PostHog
├── HANDOFF.md                    ← dieses Dokument
├── tweaks-panel.jsx              ← Settings/Tweaks UI
├── tests/                        ← Stagehand UX-Audit (Playwright + Anthropic Vision)
│   ├── run-tests.mjs             ← Haupttest (--smoke / default=full)
│   ├── package.json              ← playwright + @anthropic-ai/sdk
│   ├── .env                      ← ANTHROPIC_API_KEY (nicht in git)
│   └── README.md                 ← Setup-Anleitung
├── src/
│   ├── app.jsx                   ← Root: Auth, Routing, Timer, Access Gate, Cookie-Banner
│   ├── primitives.jsx            ← Icon, LS, gemeinsame UI-Komponenten
│   ├── sidebar.jsx               ← Nav + SettingsModal (6 Tabs)
│   ├── dashboard.jsx             ← Übersicht, War Room Ringe, Truth Loop
│   ├── focus.jsx                 ← Focus Mode, Task Timer, Free Flow Timer
│   ├── mission-control.jsx       ← Projekte, OKRs (Projekt-Limit: 2 Free)
│   ├── okr-wizard.jsx            ← OKR-Generierung via AI (1x Free)
│   ├── planner.jsx               ← Wochenplaner + iCal-Overlays (multi-feed)
│   ├── insights.jsx              ← Weekly Breakdown + KR-Zeitverteilung + Habits
│   ├── inbox.jsx                 ← "Heute"-View: Quick Capture + Task-Liste + Zuteilen
│   ├── data.jsx                  ← POV_DATA, hardcoded POVS Array
│   ├── onboarding.jsx            ← Onboarding Wizard (Name → POVs → Push)
│   ├── tutorial.jsx              ← Tutorial (window.TutorialManager)
│   ├── paywall.jsx               ← PaywallScreen + UpgradeModal + checkFreeLimit
│   ├── ai.js                     ← Anthropic API Wrapper (model: claude-haiku-4-5-20251001)
│   ├── supabase.js               ← Supabase Client + LS-Sync
│   └── push.js                   ← Push Notifications
├── api/
│   ├── ical-proxy.js             ← GET ?url= → CORS-Proxy für iCal-Feeds
│   ├── check-access.js           ← GET ?user_id= → prüft subscriptions Tabelle
│   ├── redeem-beta.js            ← POST {user_id, email, code} → Beta-Code einlösen
│   ├── create-checkout.js        ← POST {user_id, email, plan} → Stripe Checkout URL
│   └── stripe-webhook.js         ← Stripe Events → subscriptions Tabelle
└── package.json
```

---

## Session 11 — Was wurde gemacht (16.05.2026)

### UX-Audit Fixes (alle committed + deployed)

| Commit | Datei | Was |
|---|---|---|
| `a510373` | `focus.jsx` | Breadcrumb KR-Label: löst aus `POV_DATA[pov].objective.keyResults` auf wenn `_krLabel` fehlt |
| `ef8fcb4` | `inbox.jsx` | Header "INBOX" → **"HEUTE"** + Sun-Icon; `allPovs` fix (alle 4 hardcodierten POVs inklusive) |
| `ef8fcb4` | `planner.jsx` | `allPovs` fix — war nur `[personal, ...userPovs]`, jetzt alle 4 POVs mit override-Pattern |
| `a927afb` | `insights.jsx` | `allPovsMeta` prop von `app.jsx` übergeben; `POVS.map()` → `allPovsMeta.map()` (korrekte Labels wie "Business" statt "Professional") |
| `a927afb` | `app.jsx` | `userPovs` prop an `<Insights>` übergeben |
| `bc5b49f` | `HANDOFF.md` | Session 11 update, Sprint 4 Features eingetragen |
| `c229d0e` | `tests/` | Stagehand UX-Audit Setup (Playwright lokal + Anthropic Vision) |

### allPovs Bug — war in 4 Dateien kaputt
**Problem:** `planner.jsx`, `inbox.jsx`, `insights.jsx` zeigten nur `[personal, ...userPovs]` oder `POVS.map()` — fehlten `founder/student/athlete` oder zeigten falsche Labels.
**Fix:** Überall auf das gleiche Override-Pattern gebracht (siehe Regel 8 oben).

### Focus Breadcrumb Bug
**Problem:** Zeigte `EDUCATION → OBJ1_KR1` (rohe ID) wenn Task nicht vom Dashboard gestartet wurde.
**Fix:** `focus.jsx` sucht jetzt in `window.POV_DATA[pov].objective.keyResults` nach dem Label.

---

## Was jetzt zu tun ist (priorisiert)

### 🔴 Prio 1 — Stagehand UX-Audit fertigstellen

**Status:** Fix implementiert (Session 12), noch nicht vollständig getestet.

**Root Cause (jetzt verstanden):**
- Nach "Ohne Account fortfahren" setzt `app.jsx` `lifeos_guest=1` und entfernt `lifeos_onboarding_done` → zeigt Onboarding
- Nach Onboarding-Abschluss triggert `tutorial.jsx` (da `lifeos_tutorial_done` nicht gesetzt) → "Main Quest"-Modal
- Kein X-Button war zuverlässig findbar, ESC wurde ignoriert

**Implementierter Fix (`tests/run-tests.mjs` Session 12):**
Nach dem Klick auf "Ohne Account fortfahren" setzt der Test direkt via `page.evaluate()`:
```js
localStorage.setItem("lifeos_guest", "1");
localStorage.setItem("lifeos_onboarding_done", "1");
localStorage.setItem("lifeos_tutorial_done", "1");  // ← KEY — Tutorial-Modal skippen
```
Dann `page.reload()` → App startet direkt im Haupt-Modus, kein Onboarding, kein Tutorial.

**Test ausführen:**
```bash
cd "Life OS/tests"
export $(cat .env | xargs)
node run-tests.mjs --smoke    # nur Views erreichbar?
node run-tests.mjs            # vollständiger Audit
```

**Letzter Testlauf (Session 12):** Absturz mit `Target page, context or browser has been closed` → vermutlich Browser-Popup (Notification-Permission-Dialog) hat das Fenster geschlossen. Fix: `--no-sandbox` Flag oder Permission-Handling in `browser.newContext()` ergänzen.

---

### 🟡 Prio 2 — Stripe fertigstellen (vor Beta-Launch)
- Produkt + 2 Preise anlegen (9,99€/Monat + 79,99€/Jahr)
- `startAboCheckout()` in `sidebar.jsx` — Stub vorhanden, braucht echte Stripe Keys
- Webhook Endpoint + Env Vars eintragen
- Stripe Webhook URL: `https://life-os-wine-eight.vercel.app/api/stripe-webhook`

### 🟡 Prio 3 — DSGVO (vor Public Launch Pflicht)
- Datenschutzerklärung schreiben (datenschutz-generator.de) → auf `/datenschutz` hosten
- Anthropic DPA abschließen (anthropic.com/legal)
- Supabase-Region prüfen: Settings → Infrastructure → muss EU Frankfurt sein

### 🔵 Prio 4 — Sprint 4 Features
- **Morning Check-in** — tägliche Ritual-Abfrage beim App-Start (optional, komplementär zu Evening)
- **OKR-Review-Trigger** — nach erster Woche ≥70% Say-Do: "Bereit für OKR-Review? Wizard freischalten."
- **App Store Review Trigger** — nach erstem 70%+-Score in Insights

### 🔵 Prio 5 — UX Kleinigkeiten
- **Task-Reordering** (Drag & Drop in POV-Listen in Mission Control)
- **Daily Timer-Logs** auf lokales Datum umstellen (aktuell UTC, Randfall nach Mitternacht)

---

## Navigation — aktueller Stand

```
Sidebar (oben nach unten):
  1. Dashboard        (layout-dashboard icon)
  2. Heute            (sun icon, Badge = Inbox-Count) ← ehemals "Inbox"
  3. Focus            (zap icon)
  4. Mission Control  (crosshair icon)
  5. Planner          (calendar icon)
  6. Insights         (bar-chart-2 icon)
```

---

## POV-System — aktueller Stand

**Hardcodierte POVs (POVS Array in data.jsx):**
```js
[
  { id: "personal", label: "Personal",     color: "var(--personal)" },
  { id: "founder",  label: "Professional", color: "var(--founder)"  },
  { id: "student",  label: "Education",    color: "var(--student)"  },
  { id: "athlete",  label: "Health",       color: "var(--athlete)"  },
]
```

**User-POVs (`lifeos_user_povs`):** Überschreiben hardcodierte POVs bei gleicher ID. Lennarts Config hat z.B. `{id: "founder", label: "Business"}`.

**Regel:** Überall `allPovs` mit Override-Pattern verwenden (Regel 8). NICHT `POVS.map()` direkt.

---

## Access / Paywall Logik (in `src/app.jsx`)

```
checkAccess Reihenfolge:
  1. lifeos_guest === "1"           → Zugang (Gast)
  2. created_at < "2026-05-14"     → Zugang (Bestandsnutzer, grandfathered)
  3. lifeos_trial_start existiert + < 7 Tage → Zugang (Trial)
  4. lifeos_access === "1" + Cache < 6h → Zugang (gecacht)
  5. /api/check-access aufrufen + status in (active,beta,trialing) → Zugang
  6. Netzwerkfehler                 → Zugang (fail open)
  7. Sonst                          → PaywallScreen
```

**Beta-Code:** `LifeOS BETA 2026`
**Lennarts Account:** `user_id: 5e2f904e-9b36-4e55-8573-3a9083f4fe35` → status: active, plan: pro ✅

**Freemium Limits:** `okr_gen`: 1x, `mission_gen`: 1x, `projects`: max 2

---

## AI Model

**App nutzt:** `claude-haiku-4-5-20251001` (in `src/ai.js`)
**Tests nutzen:** `claude-haiku-4-5-20251001` (in `tests/run-tests.mjs`, Anthropic SDK direkt)
**Stagehand-Modelle die NICHT funktionieren:** `claude-3-5-sonnet-latest`, `claude-3-5-sonnet-20241022`, `claude-3-haiku-20240307` — 404 mit diesem API-Key

---

## Settings Modal (in `src/sidebar.jsx`)

6 Tabs: **Profil · Abo & Zugang · KI · Push · Kalender · System**
- `window.__lifeos_openSettings(tab)` — öffnet Modal direkt auf Tab
- Tab "KI": API Key (`lifeos_openai_key`) + Langfuse Keys + DSGVO-Hinweis
- Tab "Kalender": multi-feed UI (`lifeos_ical_feeds` Array) + webcal:// Support

---

## iCal / Kalender-Integration

- Storage: `lifeos_ical_feeds` = `[{id, url, label}]`
- CORS-Proxy: `api/ical-proxy.js` (Vercel), `webcal://` → `https://` auto-konvertiert
- `parseDt()` in `planner.jsx`: UTC-Events → lokale Zeit, lokales Datum (kein +1-Tag-Bug mehr)
- `FEED_COLORS`: 4 Farben (blau/lila/grün/amber), cycling per Feed-Index

---

## Supabase Setup

**URL:** `https://sogifllxeanbvazfzlbf.supabase.co`
**Tabellen:** `public.user_data` (Key-Value, LS-Sync), `public.subscriptions`

**LOCAL_ONLY Keys (nie nach Supabase):**
`lifeos_openai_key`, `lifeos_guest`, `lifeos_active`, `lifeos_langfuse_pk`, `lifeos_langfuse_sk`, `lifeos_analytics_consent`, `lifeos_ical_feeds`

**syncDown:** filtert explizit `.eq("user_id", uid)` (seit Session 10 gefixt)

---

## Vercel Env Vars

| Variable | Status |
|---|---|
| `SUPABASE_URL` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `BETA_CODES` | ✅ `LifeOS BETA 2026` |
| `APP_URL` | ✅ `https://life-os-wine-eight.vercel.app` |
| `STRIPE_SECRET_KEY` | ⚠️ fehlt |
| `STRIPE_PRICE_MONTHLY` | ⚠️ fehlt |
| `STRIPE_PRICE_YEARLY` | ⚠️ fehlt |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ fehlt |

---

## localStorage Keys (Referenz)

| Key | Format | Beschreibung |
|---|---|---|
| `lifeos_daily_YYYY-MM-DD` | `{taskId: seconds}` | Timer-Logs pro Tag (UTC!) |
| `lifeos_timeblocks_v2` | `[{id, name, start, end, type, recurrence, ...}]` | Planner-Blöcke |
| `lifeos_recurring_blocks` | `[{id, recurrence, intervalDays, dayIndex, ...}]` | Wiederkehrende Blöcke |
| `lifeos_block_selections` | `{YYYY-MM-DD_blockId: [taskId,...]}` | Task-Zuteilung in Blöcken |
| `lifeos_skips_YYYY-MM-DD` | `["taskId1",...]` | Heute übersprungene Tasks (auto-reset täglich) |
| `lifeos_tasks_${povId}` | `[{id, title, krId, elapsed, done}]` | Tasks pro POV |
| `lifeos_done_${povId}` | `{taskId: true}` | Erledigte Tasks |
| `lifeos_inbox` | `[{id, text, ts, done, doneTs}]` | Inbox/Heute-Tasks |
| `lifeos_user_povs` | `[{id, label, color, ...}]` | User-POVs (überschreiben hardcodierte) |
| `lifeos_pov_data` | `{povId: {mainQuest, objective, tasksToday}}` | OKR-Daten pro POV |

---

## Timer — Wall-Clock Implementierung

```js
const startedAt = Date.now();
const baseTime = bisherGelaufeneSeconds;
// Jede 500ms:
const nowElapsed = baseTime + Math.floor((Date.now() - startedAt) / 1000);
// Daily log (UTC-Datum — Randfall nach Mitternacht!):
const dk = `lifeos_daily_${new Date().toISOString().slice(0, 10)}`;
```

---

## Sprint-Status Übersicht

| Sprint | Status |
|---|---|
| Sprint 1 — Say-Do Score, Streak, War Room Farben | ✅ DONE (Session 8) |
| Sprint 2 — Evening Push, Skip-Status | ✅ DONE (Session 9) |
| Sprint 3 — Wiederkehrende Tasks, Gantt, Weekly Report | ✅ DONE (Session 9) |
| Sprint 3 Extras — Maker/Manager Badge, Inbox klickbar | ✅ DONE (Session 9) |
| Session 10/11 UX-Audit — Nav, Breadcrumb, allPovs, Insights | ✅ DONE |
| Sprint 4 — Morning Check-in, OKR-Review, App-Review-Trigger | ✅ DONE (Session 13) |
| Stripe | ⬜ Offen (nach Beta) |
| DSGVO | ⬜ Offen (vor Public) |
| Stagehand Audit | 🔄 permissions:["notifications"] fix (Session 13), Test-Run nötig |

---

## Competitor Analysis (Kurzfassung)

**Kern-Insight:** Kein Wettbewerber misst Say-Do Correspondence. Life OS hat diese Position exklusiv.

**Copy-Würdig:** Streak Counter ✅, Skip-Status ✅, Morning/Evening Check-in (Sprint 4), Lifetime Pricing (nach Beta)

**Preismodell:** Free / €9,99 Monat / €79,99 Jahr / €79 Lifetime (Conversion-Treiber)

**Brand-Name:** Suche offen — Englische Tool-Wörter, deutsch aussprechbar, Präzision-Ästhetik. "Hormetic" als aktueller Platzhalter.

---

## Feature Backlog

- Punch Card (Warren Buffett) — 4 strukturelle Entscheidungen/Quartal
- Failure Resume — Insights-Sektion für gescheiterte Versuche
- 12x30 Sprint Mode — 30-Tage rotes Banner
- Insights Free-User — Daten > 7 Tage ausblenden
- Trial-Banner — "Trial läuft ab in X Tagen"
- Task-Reordering (Drag & Drop)
- Vite-Migration (CDN Babel → Build-Step)

---

## Session 12 — Was wurde gemacht (16.05.2026)

### Playwright UX-Audit Fix
- **Root Cause Main Quest Modal:** `lifeos_tutorial_done` war der fehlende Schlüssel — Tutorial-Modal blockierte nach Onboarding
- **Fix in `tests/run-tests.mjs`:** Nach Guest-Login sofort `lifeos_onboarding_done + lifeos_tutorial_done + lifeos_guest = "1"` via `page.evaluate()` setzen → `page.reload()` → App startet direkt ohne Onboarding/Tutorial
- Letzter Testlauf: Browser-Crash (`Target page closed`) — vermutlich Permission-Dialog; nächste Session: `permissions: ["notifications"]` in `browser.newContext()` ergänzen

---

## Letzte Commits (Session 13 — 16.05.2026)

| Commit | Was |
|---|---|
| `6d9681c` | feat(sprint4): Morning Check-in + OKR-Review-Trigger + App-Review-Banner |

**Cache-Bust aktuell: `?v=20260516ab`** — nächste Version: `?v=20260516ac`

## Letzte Commits (Session 11 — 16.05.2026)

| Commit | Was |
|---|---|
| `a510373` | fix(focus): KR-Label aus POV_DATA wenn _krLabel fehlt |
| `ef8fcb4` | fix(inbox,planner): allPovs alle 4 POVs + Heute-Header |
| `a927afb` | fix(insights): userPovs-Override für korrekte Labels |
| `bc5b49f` | docs: HANDOFF Session 11 |
| `c229d0e` | feat(tests): Stagehand UX-Audit Setup |

**Cache-Bust aktuell: `?v=20260516aa`** — nächste Version: `?v=20260516ab`
