# Life OS — Handoff Dokument
**Stand: 16.05.2026 (Session 10)**

---

## Was ist das Projekt

**Life OS (Hormetic)** — React Web-App (PWA) für persönliches Produktivitätsmanagement. Verkauft als SaaS mit Freemium-Modell.

**Live URL:** `https://life-os-wine-eight.vercel.app`
**GitHub:** `github.com/TR8NN3L/life-os`
**Stack:** React 18 via CDN + Babel Standalone (kein Build-Step), Supabase (Auth + DB), Vercel (Hosting + Serverless APIs), Stripe (Payments, Stub), PostHog (Analytics, EU)

---

## KRITISCHE Regeln — niemals brechen

1. **Cache-Busting Pflicht:** Bei JEDEM Commit `?v=YYYYMMDD[buchstabe]` in `index.html` bei ALLEN Script-Tags hochzählen. **Aktuell: `?v=20260516p`**. Sonst Black Screen.

2. **Keine nested React Components:** NIEMALS `const X = () =>` innerhalb einer anderen Funktion definieren. Nur Top-Level Functions. Verursacht Black Screen sobald Komponente mit Daten rendert.

3. **Kein Unicode in JSX-Text:** `→ — ✓ ✕ ℹ` direkt in JSX-Text → Black Screen. Fix: JS-String `{"→"}` oder HTML-Entity `&#x2192;`. ABER: HTML-Entities IN JS-Strings (`"&#9650;"`) rendern als Rohtext → Unicodezeichen `"▲"` oder `"▲"` nutzen.

4. **State-Scope:** `SettingsModal` und `Sidebar` sind **separate Top-Level-Funktionen**. State für SettingsModal MUSS in SettingsModal deklariert sein, nicht in Sidebar.

5. **`renderSection(title, children)`** — genau 2 Argumente. Nie 3+, 3. Argument wird ignoriert.

6. **`window.LS`** = localStorage-Wrapper mit Supabase-Sync. Immer `LS.getItem/setItem` statt `localStorage` direkt (außer für Auth/Access-Keys wie `lifeos_guest`, `lifeos_last_uid`, `lifeos_analytics_consent`, `lifeos_openai_key`).

7. **Icon-System:** Inline SVG via `Icon`-Komponente in `src/primitives.jsx`. Kein CDN für Icons.

---

## Dateistruktur

```
Life OS/
├── index.html                    ← Script-Tags + Cache-Bust-Versionen + PostHog Snippet
├── HANDOFF.md                    ← dieses Dokument
├── tweaks-panel.jsx              ← Settings/Tweaks UI
├── src/
│   ├── app.jsx                   ← Root: Auth, Routing, Timer, Access Gate, Upgrade Modal, Cookie-Banner
│   ├── primitives.jsx            ← Icon, LS, gemeinsame UI-Komponenten
│   ├── sidebar.jsx               ← Nav + SettingsModal (6 Tabs inkl. Kalender multi-feed + KI-Datenschutzhinweis)
│   ├── dashboard.jsx             ← Übersicht, War Room Ringe, Truth Loop
│   ├── focus.jsx                 ← Focus Mode, Task Timer, Free Flow Timer
│   ├── mission-control.jsx       ← Projekte, OKRs (Projekt-Limit: 2 Free)
│   ├── okr-wizard.jsx            ← OKR-Generierung via AI (1x Free)
│   ├── planner.jsx               ← Wochenplaner + iCal-Overlays (multi-feed, Farben pro Feed)
│   ├── insights.jsx              ← Weekly Breakdown + KR-Zeitverteilung + Habits + Truth Loop
│   ├── data.jsx                  ← POV_DATA, hardcoded Tasks
│   ├── onboarding.jsx            ← Onboarding Wizard
│   ├── tutorial.jsx              ← Tutorial (window.TutorialManager)
│   ├── paywall.jsx               ← PaywallScreen + UpgradeModal + checkFreeLimit
│   ├── ai.js                     ← Anthropic API Wrapper + Langfuse Observability
│   ├── supabase.js               ← Supabase Client + LS-Sync
│   └── push.js                   ← Push Notifications
├── api/
│   ├── ical-proxy.js             ← GET ?url= → CORS-Proxy für iCal-Feeds (webcal:// → https://)
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

**Beta-Code:** `LifeOS BETA 2026` — unbegrenzt verwendbar.
**Lennarts Account:** `user_id: 5e2f904e-9b36-4e55-8573-3a9083f4fe35` → status: active, plan: pro ✅

**Freemium Limits:**
- `okr_gen`: 1 freie OKR-Generierung
- `mission_gen`: 1 freier Missions-Generator
- `projects`: max 2 Projekte

---

## Settings Modal (in `src/sidebar.jsx`)

6 Tabs: **Profil · Abo & Zugang · KI · Push · Kalender · System**

- `window.__lifeos_openSettings(tab)` — öffnet Modal direkt auf Tab
- Tab "KI": API Key + Langfuse Keys + **DSGVO-Hinweis** (Anthropic USA-Transfer)
- Tab "Kalender": 2 Accordion-Sektionen:
  - **Kalender importieren** — multi-feed UI (lifeos_ical_feeds Array), sub-tabs "URL EINGEBEN" / "ANLEITUNG", Schritt-für-Schritt für Apple/Google/Outlook/Samsung
  - **Kalender-Abo** — Stripe-Stub (noch nicht live)

---

## iCal / Kalender-Integration

**Storage:** `lifeos_ical_feeds` = JSON-Array `[{id, url, label}]`
**Legacy-Fallback:** liest `lifeos_ical_import_url` (alter Single-URL-Key) als Fallback

**CORS-Proxy:** `api/ical-proxy.js` (Vercel Serverless)
- `webcal://` wird automatisch zu `https://` konvertiert (in Planner UND in Proxy)
- Timeout: 8s, nur http/https erlaubt

**Planner-Overlays:**
- `parseICS()` + `parseDt()` in `src/planner.jsx` (Top-Level, außerhalb Planner-Komponente)
- `parseDt()` gibt `{localDateStr, mins}` zurück — UTC-Events werden korrekt zu lokaler Zeit konvertiert
- Datumsfilter nutzt **lokales Datum** (nicht `toISOString()` = UTC → war der +1-Tag-Bug)
- `FEED_COLORS` Array: 4 Farben (blau/lila/grün/amber), cycling per Feed-Index
- Calendar Events: `zIndex: 3` (über Blöcken), `pointer-events: none`
- Block-Hintergrund: `rgba(26,26,32,0.88)` (leicht transparent → Kalender-Tint sichtbar)
- `computeWeekInfo()` nutzt lokale Datumskomponenten (nicht `toISOString()`)

---

## AI / Langfuse (in `src/ai.js`)

**Anthropic API:** User trägt eigenen `sk-ant-...` Key in Settings ein → `lifeos_openai_key` (LOCAL_ONLY)

**Langfuse Observability (optional):**
- EU-Endpoint: `https://eu.cloud.langfuse.com/api/public/ingestion`
- Keys: `lifeos_langfuse_pk` + `lifeos_langfuse_sk`
- Fire-and-forget (`fetch(...).catch(() => {})`, `keepalive: true`)
- 4 getaggte Calls: `kr-generation`, `daily-mission`, `day-plan`, `okr-generation`

---

## DSGVO / Cookie-Consent

**PostHog:**
- `opt_out_capturing_by_default: true` → kein Tracking bis Consent
- `loaded` callback: re-enabled automatisch wenn `lifeos_analytics_consent === "yes"`
- `window.initPosthog()` = `posthog.opt_in_capturing()`

**Cookie-Banner (`CookieBanner` in `src/app.jsx`):**
- Fixed Bottom Bar, erscheint bis User entschieden hat (`lifeos_analytics_consent === null`)
- "NUR NOTWENDIGE" → consent = "no", "ALLE AKZEPTIEREN" → consent = "yes" + initPosthog()
- Link zu `/datenschutz` (muss noch erstellt werden!)

**Offene DSGVO-Punkte:**
- ❌ Datenschutzerklärung fehlt (→ `/datenschutz` Route oder externe Seite)
- ❌ Anthropic DPA auf anthropic.com/legal abschließen
- ❌ Supabase-Region prüfen (muss EU Frankfurt sein)

---

## Weekly Insights (in `src/insights.jsx`)

**Neu in Session 7/9:** Weekly Breakdown + Weekly Report Modal.

- `getMonday(weekOffset)` + `localDateStr(d)` — Top-Level Helpers
- `WeeklyBarChart({days})` — SVG Balkendiagramm, heute = accent, Vergangenheit = grau, Zukunft = fast unsichtbar
- Wochennavigation: `< PREV` / `HEUTE` / `NEXT >` via `weekOffset` State
- 4 Mini-Stats: Gesamt, Schnitt/Tag, Bester Tag, OKR Fokus %
- KR-Breakdown: liest `lifeos_daily_${dateStr}` pro Tag, matched Task-IDs gegen KR-Labels aus POV_DATA + custom projects

**Weekly Report Modal (Session 9):**
- `WeeklyReportModal({ onClose })` — Top-Level Function
- "WEEKLY REPORT" Button in Insights Header (oben rechts)
- Wochennavigation (prev/next/aktuell)
- 3 Big Stats: Geliefert (h), Say-Do Score (%), Streak-Tage
- Per-Tag Balkendiagramm (7 Spalten)
- Verdict Box: Exzellent (≥80%) / Solide (60–79%) / Mittelmaessig (40–59%) / Kritisch (<40%)
- Datenquellen: `lifeos_daily_YYYY-MM-DD`, `lifeos_timeblocks_v2`, `lifeos_block_selections`, `lifeos_done_${pov}`

**Datenquelle für Tages-Logs:** `lifeos_daily_${YYYY-MM-DD}` = `{taskId: seconds}`
- Wird in `src/app.jsx` alle 500ms geschrieben wenn Task-Timer läuft
- ACHTUNG: app.jsx schreibt noch mit `toISOString().slice(0,10)` (UTC) → leichte Diskrepanz zu lokalem Datum möglich (Randfall nach Mitternacht)

---

## Supabase Setup

**URL:** `https://sogifllxeanbvazfzlbf.supabase.co`
**Tabellen:**
- `public.user_data` — Key-Value Store pro User (localStorage-Sync via `window.LS`)
- `public.subscriptions` — Subscription Status pro User

**Sync-Logik (`src/supabase.js`):**
- `LS.setItem` → debounced Write (300ms) → Supabase upsert
- `syncDown(uid)` → lädt alle cloud-rows in localStorage
- `pushLocal(uid)` → pusht alle lokalen `lifeos_*` keys nach Supabase
- `LOCAL_ONLY` Keys: `lifeos_openai_key`, `lifeos_guest`, `lifeos_active`, `lifeos_langfuse_pk`, `lifeos_langfuse_sk`, `lifeos_analytics_consent`, `lifeos_ical_feeds`

**Data Isolation:**
- Sign-out: löscht alle `lifeos_*` + `lifeos_last_uid`
- Re-Login (gleicher User): kein Wipe, nur `syncDown`
- Anderer User: kompletter Wipe vorher

---

## Vercel Env Vars

| Variable | Status | Wert |
|---|---|---|
| `SUPABASE_URL` | ✅ | `https://sogifllxeanbvazfzlbf.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Settings → API → service_role |
| `BETA_CODES` | ✅ | `LifeOS BETA 2026` |
| `APP_URL` | ✅ | `https://life-os-wine-eight.vercel.app` |
| `STRIPE_SECRET_KEY` | ⚠️ offen | Stripe Dashboard → Developers → API Keys |
| `STRIPE_PRICE_MONTHLY` | ⚠️ offen | Stripe → Products → Price ID |
| `STRIPE_PRICE_YEARLY` | ⚠️ offen | Stripe → Products → Price ID |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ offen | Stripe → Webhooks → Signing secret |

---

## Timer — Wall-Clock Implementierung

```js
const startedAt = Date.now();
const baseTime = bisherGelaufeneSeconds;
// Jede 500ms:
const nowElapsed = baseTime + Math.floor((Date.now() - startedAt) / 1000);
// Daily log:
const delta = nowElapsed - lastDailyTotal;
if (delta > 0) {
  const dk = `lifeos_daily_${new Date().toISOString().slice(0, 10)}`; // UTC-Datum
  const daily = JSON.parse(localStorage.getItem(dk) || "{}");
  daily[activeTaskId] = (daily[activeTaskId] || 0) + delta;
  localStorage.setItem(dk, JSON.stringify(daily));
}
```

---

## Was noch zu tun ist (priorisiert)

### Prio 1 — Stripe fertigstellen
- Produkt + 2 Preise anlegen (9,99€/Monat + 79,99€/Jahr)
- `startAboCheckout()` in `sidebar.jsx` — Stub vorhanden, braucht echte Stripe Keys
- Webhook Endpoint + Env Vars eintragen
- Stripe Webhook URL: `https://life-os-wine-eight.vercel.app/api/stripe-webhook`

### Prio 2 — DSGVO (vor Public Launch Pflicht)
- Datenschutzerklärung schreiben (datenschutz-generator.de) → auf `/datenschutz` hosten
- Anthropic DPA abschließen
- Supabase-Region prüfen (Settings → Infrastructure)

### Prio 3 — UX Features
- Task-Reordering (Drag & Drop in POV-Listen)
- Say-Do Metric (Planner geplant vs. Timer tatsaechlich) — Weekly Report approximiert es, aber Planner-Seite zeigt es nicht direkt
- Daily Timer-Logs auf lokales Datum umstellen (aktuell UTC, Randfall nach Mitternacht)

---

## localStorage Keys (Gesamt-Referenz)

| Key | Format | Beschreibung |
|---|---|---|
| `lifeos_daily_YYYY-MM-DD` | `{taskId: seconds}` | Timer-Logs pro Tag (UTC-Datum — Randfall!) |
| `lifeos_timeblocks_v2` | `[{id, label, startH, endH, ...}]` | Wochenplan-Blöcke |
| `lifeos_recurring_blocks` | `[{id, recurrence, intervalDays, startDateStr, dayIndex, ...}]` | Wiederkehrende Blöcke; recurrence: none/daily/weekdays/weekly/biweekly/monthly/custom |
| `lifeos_block_selections` | `{YYYY-MM-DD_blockId: [taskId,...]}` | Welche Tasks in welchem Block geplant |
| `lifeos_skips_YYYY-MM-DD` | `["taskId1",...]` | Heute geskippte Tasks; auto-reset täglich durch Key-Wechsel |
| `lifeos_evening_checkin_YYYY-MM-DD` | `"1"` | Evening-Push einmal gesendet; verhindert Doppel-Trigger |
| `lifeos_tasks_${povId}` | `[{id, title, krId, elapsed, done}]` | Tasks pro POV |
| `lifeos_done_${povId}` | `{taskId: true}` | Erledigte Tasks pro POV |
| `lifeos_inbox` | `[{id, text, ts, done, doneTs}]` | Inbox-Aufgaben |
| `lifeos_user_povs` | `[{id, label, color, objective}]` | Benutzerdefinierte POVs |
| `lifeos_ical_feeds` | `[{id, url, label}]` | iCal Feed-URLs |
| `lifeos_analytics_consent` | `"yes"/"no"` | PostHog Consent (LOCAL_ONLY) |
| `lifeos_openai_key` | `"sk-ant-..."` | Anthropic API Key (LOCAL_ONLY) |
| `lifeos_guest` | `"1"` | Gast-Zugang (LOCAL_ONLY) |
| `lifeos_access` | `"1"` | Cached Pro-Zugang |

### Prio 4 — Infrastruktur
- Vite-Migration (CDN Babel → Build-Step) — entsperrt npm-Pakete, Tree-Shaking, TypeScript

---

## Feature Backlog

- **Punch Card** (Warren Buffett) — 4 strukturelle Entscheidungen pro Quartal, locked nach Verbrauch
- **Failure Resume** — Insights-Sektion für gescheiterte Versuche (gamifiziert Lerneffekte)
- **12x30 Sprint Mode** — 30-Tage-Modus, 12h Output/Tag, rotes Banner
- **Say-Do Metric** — % Plan vs. tatsächlich (stärkster Kandidat)
- **Insights Free-User** — Daten älter als 7 Tage ausblenden
- **Trial-Banner** — "Trial läuft ab in X Tagen" im Dashboard

---

## Competitor Analysis & Strategic Roadmap

**Stand: Session 8 — 16.05.2026**

### Analysierte Apps (App Store, DE-Markt)

| App | Stars | Reviews | Preis-Modell | Kern-USP | Größte Schwäche |
|---|---|---|---|---|---|
| **Structured** | 4.7 | 37k | €69.99 Lifetime / Abo | Visuelle Timeline, Auto-Replanning, Energy Monitor | Kein Execution-Tracking, kein Say-Do Score |
| **Forest** | 4.7 | 19k | €3.99 / Abo | Baum stirbt bei Ablenkung (Konsequenz-Mechanik), echte Bäume | Misst Focus-Zeit, nicht Output-Qualität |
| **Streaks** | 4.7 | 3.6k | €6.99 Einmalig | Beste Apple Watch Integration, Auto-Health-Erkennung | Kein Projektkontext, kein Geschichte-Feature |
| **TickTick** | 4.8 | 4.9k | Abo (~€3/Monat) | Alles-in-einem, KI-Voice-Input, 199 Subtasks | Kein Say-Do Score, Abo-Kritik in Reviews |
| **Stoic** | 4.7 | 5.5k | €99.99/Jahr | Morgen/Abend-Routinen, KI-Journaling, tiefe Reflexion | Soft/keine harten Metriken, teuerste Option |
| **Productive** | 4.4 | 5.5k | Abo | Skip-Funktion (meistgelobt), geführte Programme | 5-Habit Free-Limit, kein Erfolgskriterium |
| **One Sec** | 4.8 | 14k | ~€3/Monat | Psychologische Friction (57% App-Reduktion), Max-Planck validiert | Technisch komplex einzurichten |
| **Opal** | 4.7 | 4.5k | €99.99/Jahr | Community-Leaderboards, Privacy-First | €99.99 meist kritisierter Preis im Markt |
| **Focus To-Do** | 4.7 | 2.8k | €12.99 Lifetime | Pomodoro + Tasks kombiniert, Gantt Charts | Mac-Version schwach, kein Social |
| **Habit Tracker** | 4.7 | 12k | €9.99 Lifetime | Gruppen-Habits, kein Werbung, fairster Preis | Keine flexible Terminplanung |
| **Tiimo** | 4.2 | 1.6k | Abo | ADHS-fokussiert, iPhone App of Year 2025 | Niedrigste Bewertung, Sync-Probleme |
| **Productivity Wizard** | 4.0 | 28 | Abo | Einziger mit Goals→Weekly→Daily Loop (konzeptuell nah an Life OS) | Kaputtes Widget, kein Support, schlechte Ausführung |
| **MinimaList** | 4.7 | 7k | Abo | Minimal, clean, niedrige kognitive Last | Keine History, keine flexible Wiederholung |

---

### Das wichtigste Markt-Ergebnis

**Kein einziges Tool misst Say-Do Correspondence / Execution Rate.**

Productivity Wizard ist konzeptuell am nächsten (Goals → Weekly → Daily Loop), aber technisch kaputt, kein Support, 28 Reviews. Das ist der unbelegte Marktplatz. Life OS hat diese Position exklusiv — und muss sie jetzt durch prominente Sichtbarkeit des Say-Do Scores in der UI verteidigen.

---

### Was kopieren (validiert durch Wettbewerber-Reviews)

| Feature | Von wem | Warum |
|---|---|---|
| **Streak Counter** | Streaks, Productive, Habit Tracker | Universell geliebt, hohe Retention, aus `lifeos_daily_*` ableitbar |
| **Skip-Status für Tasks** | Productive | Meistgelobtes Feature im Markt — "kein Streaks-Kill durch einmalige Pause" |
| **Morning/Evening Check-in** | Stoic | Stärkster Retention-Mechanismus; Abend-Check-in = natürlicher Say-Do Score Trigger |
| **Lifetime Pricing Tier** | Structured, Streaks, Focus To-Do, Habit Tracker | Konversionstreiber #1; Structured macht €69.99 Lifetime neben Abo |
| **Konsequenz-Mechanik** | Forest (Baum stirbt) | Übertragen auf War Room Ringe: Grün → Amber → Rot basierend auf Say-Do Score |
| **Wöchentlicher Report Button** | TickTick | User wollen Fortschritt exportieren/teilen können |
| **Flexible Wiederkehrende Tasks** | Productive, Habit Tracker | Meistgefordertes fehlendes Feature quer durch alle Reviews |
| **Gantt Chart für Projekthistorie** | Focus To-Do | Long-term Projekt-Timeline im Mission Control |

### Was NICHT kopieren

| Feature | Warum nicht |
|---|---|
| Gamification / Badges | Widerspricht Brand-Character (kein Reward für mittelmäßige Execution) |
| Social / Community Leaderboard | Life OS ist privat — "Rechenschaft zwischen Nutzer und sich selbst" |
| Motivations-Push-Notifications | "Bleib dran!" = anti-ACTUM-Ton |
| Bunte Kalendervisualisierung | Ablenkung vom Kern: Score, Lücke, Zahl |
| Wellness / Mindfulness Layer | Anderes Produkt, andere Zielgruppe |

---

### Sprint-Roadmap (Feature-Priorität, abgeleitet aus Gap-Analyse)

#### Sprint 1 — Say-Do Score sichtbar machen ✅ DONE (Session 8)
- [x] **Streak Counter** auf Dashboard — konsekutive Tage mit >60s Logging, 🔥 ab 3 Tagen, gold ab 7
- [x] **Say-Do Score** als prominente Zahl im War Room Header — Wochenbasis Plan vs. Ist, Grün/Amber/Rot + Label
- [x] **War Room Ring-Farben** eskalieren: Grün (≥70%) → Amber (40–69%) → Rot (<40%) pro Ring + Center-Zahl

#### Sprint 2 — Retention & Conversion ✅ DONE (Session 9)
- [x] **Evening Check-in Push** — tägliche Notification um 20:00 mit Say-Do Tages-Summary; `lifeos_evening_checkin_YYYY-MM-DD` verhindert Doppel-Trigger; `getEveningStats` Callback in app.jsx
- [x] **Skip-Status für Tasks** — `lifeos_skips_YYYY-MM-DD` = `["taskId1",...]`; ↷ Button in MC Free Tasks; "UEBERSPRUNGEN HEUTE" Section; auto-reset täglich
- [ ] **Lifetime Pricing Tier** — €79 Lifetime neben Monat/Jahr in Stripe — ERST nach Beta-Phase

#### Sprint 3 — Feature-Parität + Differenzierung ✅ DONE (Session 9)
- [x] **Flexible Wiederkehrende Tasks** — 7 Optionen: none/daily/weekdays/weekly/biweekly/monthly/custom; `intervalDays` Feld für custom; biweekly/monthly/custom Logik in `recurringForDay()`; Layout-Fix: flexWrap statt flex:1 (7 Buttons squishing)
- [x] **Projekt Gantt Timeline** — `GanttTimeline({ projects, allPovs, archivedIds, onBack })` Top-Level in mission-control.jsx; 16-Wochen-Grid (4 Vergangenheit + 12 Zukunft); CSS % Positioning, kein SVG; Today-Linie rot, Deadline gelbes Diamond, aktuelle KW highlighted; "TIMELINE" Button in MC Header
- [x] **Weekly Report Modal** — in insights.jsx (siehe oben)

#### Sprint 3 Extras (Session 9)
- [x] **Maker/Manager Badge** — `BLOCK_TYPES` hat `mode`/`modeColor`/`modeBg`; Badge vor Block-Label in Planner; DEEP WORK = MAKER (grün), BASIC = MANAGER (blau), FLEX = FLEX (amber)
- [x] **Inbox Tasks klickbar** — `onOpenTask` Prop in InboxPage; öffnet TaskDetail Panel; Cursor pointer wenn verfügbar
- [x] **Inbox Card entfernt** aus Mission Control (eigene Seite)

#### Sprint 4 — Loop schließen
- [ ] **OKR-Review-Trigger** — nach erster Woche ≥70% Say-Do automatisch: "Bereit fuer OKR-Review? Wizard freischalten."
- [ ] **App Store Review Trigger** — nach erstem 70%+-Score in einem Insights-View
- [ ] **Morning Check-in** — optionale Tages-Intention (komplementaer zu Evening Check-in)

---

### Preismodell-Empfehlung (aus Marktanalyse)

| Tier | Preis | Vergleich |
|---|---|---|
| **Free** | Kostenlos | 2 Projekte, 1 OKR-Gen, Standard Dashboard |
| **Pro Monat** | €9,99/Monat | Marktmitte (Productive, TickTick) |
| **Pro Jahr** | €79,99/Jahr | Entspricht ~€6,67/Monat |
| **Lifetime** | €79,00 einmalig | Conversion-Treiber (Structured: €69.99, Focus To-Do: €12.99, Habit Tracker: €9.99) |

Lifetime-Tier ist **Prio 1 für Conversion** — Nutzer, die den Wert sehen, zahlen lieber einmal als monatlich. Structured macht damit ihren Großteil des Umsatzes.

---

### Gantt Chart — Konzept für Projekt-Timeline

**Wo:** Mission Control → Projekt-Detail-View, Tab "Timeline"

**Was es zeigt:**
- Horizontal: Wochen/Monate
- Vertikal: Tasks / OKRs des Projekts
- Farbe: Task-Status (offen / erledigt / geskippt)
- Balken-Länge: geplante Dauer (Start → Deadline)
- Heutiger Tag: vertikale Linie (wie Structured)

**Datenmodell:** Tasks haben bereits `deadline`-Felder. Startdatum = `created_at`. Keine neuen Keys nötig — reine Darstellungsschicht.

**Warum kein Drag-Drop im Gantt:** CDN Babel + kein Build-Step macht komplexes DnD schwer. Gantt ist read-only Timeline-Visualisierung. Bearbeitung bleibt in der bestehenden Task-Liste.

---

### Brand-Name Status

**Aktuell:** ACTUM (Platzhalter, Nutzer mag den Namen nicht)
**Suchrichtung:** Englische Tool-Wörter — deutsch aussprechbar, Präzision/Amboss-Ästhetik
**Kandidaten die gut kamen aber vergeben:** INCUS (anvil, .com vergeben), SKOPOS, FORNAX
**Eliminiert weil:** Englisches W (→ V/F), TH, -TCH, -DGE, -GH → für Deutsche nicht sprechbar
**Status:** Weitersuchen beim nächsten Naming-Sprint — gleiche Richtung

---

## Letzte Commits (Session 10 — 16.05.2026)

| Commit | Was |
|---|---|
| `f110695` | fix: UX audit — Quick Start neutral, Debt dynamisch, FOCUS btn, Tutorial nach Cookie, Main Quest CTA |
| `9328406` | feat: Inbox → Heute, Nav-Reorder (Dashboard > Heute > Focus > ...) |

**Cache-Bust aktuell: `?v=20260516r`**

### Session 10 — Änderungen

**Nav:**
- `inbox` → Label "Heute", Icon "sun", Position 2 (zwischen Dashboard und Focus)
- Inbox als Seite bleibt identisch, nur Nav-Entry umbenannt/verschoben

**Dashboard — Quick Start Banner:**
- Hintergrund: `var(--accent)` → `var(--panel)` + `borderLeft: 3px solid var(--accent)` (kein POV-Color-Bleed mehr)
- IGNORANCE DEBT: dynamisch — grün `0.0h ✓` wenn `debt ≤ 0.05`, rot `−Xh` wenn im Rückstand
- "ENGAGE →" → "FOCUS →"

**App — Tutorial:**
- Tutorial startet erst nachdem `cookieConsent !== null` (kein Doppel-Overlay mit Cookie-Banner)

**Sidebar — Main Quest:**
- "Noch nicht konfiguriert" + `→ EINRICHTEN` Button der direkt zu Mission Control navigiert

### Offene UX-Punkte (aus Session 10 Audit)
- Mission Generator im Dashboard noch nicht entfernt (niedrige Prio, User-Entscheid offen)
- Skip-Feature: Tasks nicht tagesgebunden — Skip UI ggf. entfernen (Entscheid offen)
- "TAGE VERTEILEN" im War Room: entfernen (nur im Planner behalten) — noch nicht gebaut
- Option C: Stagehand (Playwright-basiert) für automatisierte UX-Tests — Setup ausstehend

## Letzte Commits (Session 9 — 16.05.2026)

| Commit | Was |
|---|---|
| `b9f5cd4` | fix: Wiederholung-Buttons wrappen statt quetschen (flexWrap, 7 Optionen) |
| `4b18d96` | Sprint 2+3 complete: Skip-Status, Evening Push, Maker/Manager, Flex Recurring, Gantt, Weekly Report |

## Letzte Commits (Session 8 — 16.05.2026)

| Commit | Was |
|---|---|
| `d7b3b8f` | feat: Say-Do Score + Streak Counter + War Room Ring-Farben (Sprint 1 ✅) |
| `dda0e70` | fix: Bucket-Filter zeigt Personal (immer) + user_povs — keine anderen Defaults |
| `09eeb76` | fix: Spacebar in textarea + KR-Dropdown im Free Flow Modal + POV-Duplikat |

## Letzte Commits (Session 7 — 15.05.2026)

| Commit | Was |
|---|---|
| `fa6360c` | feat: Weekly Insights + WeeklyBarChart + Wochennavigation + KR-Breakdown |
| `f391df9` | fix: PostHog capture is not a function (opt_out_capturing_by_default) |
| `2f81907` | fix: Black Screen — HTML-Entity &#9432; in JSX-Text |
| `8fcb03a` | feat: DSGVO — Cookie-Consent-Banner + KI-Datenschutzhinweis |
| `a785b04` | fix: Kalender-Events +1 Tag Verschiebung (UTC vs. CEST) |
| `8d35dd4` | feat: Kalender-Events über Blöcke (z-index:3, transparent) |
| `90ce542` | fix: Accordion-Pfeile + webcal://-Support + multi-calendar UI |
| `66ade78` | feat: Multi-Kalender-Feed-Support im Planner |

---

## /hormozi Skill (Citadel)

**Pfad:** `The Citadel/.claude/commands/hormozi.md`
**Aufruf:** `/hormozi [Frage]` — nur im Claude Code Terminal (`claude` CLI), nicht in claude.ai Web

**Was er tut:** Alex Hormozi Persona basierend auf 48 seiner Videos (via NotebookLM destilliert). Antwortet auf Deutsch + englische Phrases. Immer: Reframe → Verdict → Breakdown → Binäre Handlung.

**Themen:** Offer-Erstellung, Pricing, Business-Strategie, Content/Marketing, Mindset/Selbstdisziplin

**Eingebaute Frameworks:** Value Equation, Grand Slam Offer (5 Schritte), ICE-Priorisierung, Maker vs. Manager, Scale Zero, Engpass-Regel, Einwandbehandlung, Ausreden-Stopp-Protokoll

**Wichtige Regel:** Keine Ausreden dulden. Kein Softening. Beschwerden sofort stoppen. Alles in beobachtbares Verhalten übersetzen. Binäre Handlung am Ende jeder Antwort.
