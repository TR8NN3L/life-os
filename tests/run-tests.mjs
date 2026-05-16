/**
 * Life OS — Automatisierter UX-Audit mit Stagehand + Playwright (lokal)
 *
 * Setup:
 *   cd tests && npm install && npx playwright install chromium
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   npm test
 *
 * Optionen:
 *   --smoke   Nur kurzer Smoke-Test (alle Views erreichbar?)
 *   --audit   Vollständiger UX-Audit mit Detailprüfung
 *             (default: beides)
 */

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const APP_URL    = "https://life-os-wine-eight.vercel.app";
const BETA_CODE  = "LifeOS BETA 2026";

const args       = process.argv.slice(2);
const SMOKE_ONLY = args.includes("--smoke");
const AUDIT_ONLY = args.includes("--audit");

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(icon, msg) {
  console.log(`${icon}  ${msg}`);
}

function section(title) {
  console.log("\n" + "─".repeat(60));
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

// ── Main ──────────────────────────────────────────────────────────────────────

const stagehand = new Stagehand({
  env: "LOCAL",                      // Playwright lokal — kein Browserbase-Key
  modelName: "claude-3-5-sonnet-latest", // Anthropic Claude
  modelClientOptions: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  headless: false,                   // Browser sichtbar (für Debugging)
  verbose: 1,
  logger: () => {},                  // eigene Ausgabe
});

const issues = [];

function reportIssue(view, severity, description, suggestion) {
  issues.push({ view, severity, description, suggestion });
  const icon = severity === "critical" ? "🔴" : severity === "warn" ? "🟡" : "🔵";
  log(icon, `[${view}] ${description}`);
}

async function run() {
  await stagehand.init();
  const page = stagehand.page;

  // ── 1. App laden + Auth ────────────────────────────────────────────────────
  section("1 · App laden & Auth");
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Screenshot für Basischeck
  const initialState = await stagehand.extract({
    instruction: "Was ist gerade auf dem Bildschirm zu sehen? Beschreibe kurz den Zustand (z.B. Login-Screen, Onboarding, Cookie-Banner, Dashboard).",
    schema: z.object({ state: z.string(), details: z.string().optional() }),
  });
  log("📸", `Initialzustand: ${initialState.state}`);

  // Cookie-Banner wegklicken falls vorhanden
  const hasCookie = await stagehand.extract({
    instruction: "Gibt es einen Cookie-Banner oder Datenschutz-Dialog auf dem Bildschirm?",
    schema: z.object({ visible: z.boolean() }),
  });
  if (hasCookie.visible) {
    log("🍪", "Cookie-Banner gefunden — klicke auf Ablehnen/Nur notwendige");
    await stagehand.act({ action: "Klicke auf den Button um Cookies abzulehnen oder nur notwendige Cookies zu akzeptieren" });
    await page.waitForTimeout(1000);
  }

  // Beta-Code / Login falls nötig
  const needsAuth = await stagehand.extract({
    instruction: "Ist ein Login-Formular, ein Beta-Code-Eingabefeld oder eine Zugangsschranke sichtbar?",
    schema: z.object({ required: z.boolean(), type: z.string().optional() }),
  });

  if (needsAuth.required) {
    log("🔑", `Auth erforderlich (${needsAuth.type}) — gebe Beta-Code ein`);
    if (needsAuth.type?.includes("beta") || needsAuth.type?.includes("code")) {
      await stagehand.act({ action: `Gib den Beta-Code "${BETA_CODE}" in das Eingabefeld ein und bestätige` });
    } else {
      await stagehand.act({ action: "Wähle den Gast-Zugang oder Ohne-Login-Button falls vorhanden" });
    }
    await page.waitForTimeout(2000);
  }

  // Tutorial wegklicken falls vorhanden
  const hasTutorial = await stagehand.extract({
    instruction: "Ist ein Tutorial-Overlay oder ein Willkommen-Modal sichtbar?",
    schema: z.object({ visible: z.boolean() }),
  });
  if (hasTutorial.visible) {
    log("📖", "Tutorial gefunden — schließe es");
    await stagehand.act({ action: "Schließe das Tutorial oder klicke auf Überspringen/Skip/Fertig" });
    await page.waitForTimeout(1000);
  }

  // ── 2. Smoke Tests: alle Views erreichbar? ─────────────────────────────────
  section("2 · Smoke Tests — alle Views erreichbar?");

  const VIEWS = [
    { nav: "Dashboard",        id: "dashboard"       },
    { nav: "Heute",            id: "heute"           },
    { nav: "Focus",            id: "focus"           },
    { nav: "Mission Control",  id: "missioncontrol"  },
    { nav: "Planner",          id: "planner"         },
    { nav: "Insights",         id: "insights"        },
  ];

  const viewResults = {};

  for (const v of VIEWS) {
    log("🔗", `Navigiere zu: ${v.nav}`);
    await stagehand.act({ action: `Klicke auf "${v.nav}" in der linken Sidebar-Navigation` });
    await page.waitForTimeout(1500);

    const check = await stagehand.extract({
      instruction: `Ist die "${v.nav}" Ansicht jetzt geladen und sichtbar? Was ist der Hauptinhalt?`,
      schema: z.object({
        loaded: z.boolean(),
        content: z.string(),
        errors: z.string().optional(),
      }),
    });

    viewResults[v.id] = check;

    if (!check.loaded) {
      reportIssue(v.nav, "critical", `View nicht geladen`, `Navigations-Bug prüfen`);
    } else {
      log("✅", `${v.nav} — OK: ${check.content.slice(0, 80)}`);
    }

    if (check.errors) {
      reportIssue(v.nav, "warn", `Fehler erkannt: ${check.errors}`, "Prüfen");
    }
  }

  if (SMOKE_ONLY) {
    await summarize(page);
    return;
  }

  // ── 3. Detail-Audit pro View ───────────────────────────────────────────────
  section("3 · Detail-Audit");

  // ── Dashboard ──
  log("🔍", "Audit: Dashboard");
  await stagehand.act({ action: 'Klicke auf "Dashboard" in der Sidebar' });
  await page.waitForTimeout(1500);

  const dashboard = await stagehand.extract({
    instruction: `Analysiere die Dashboard-Ansicht:
1. Sind alle 4 POV-Kacheln (Personal, Education, Health, Business/Professional) sichtbar?
2. Gibt es den "War Room" Bereich?
3. Gibt es den "Ignorance Debt" Indikator?
4. Gibt es einen "Daily Check-In" Bereich?
5. Gibt es irgendwelche Elemente die broken, abgeschnitten oder unlesbar aussehen?`,
    schema: z.object({
      povTiles: z.number().describe("Anzahl sichtbarer POV-Kacheln"),
      warRoom: z.boolean(),
      ignoranceDebt: z.boolean(),
      dailyCheckin: z.boolean(),
      brokenElements: z.string().optional(),
      otherIssues: z.string().optional(),
    }),
  });

  log("📊", `Dashboard — POV-Tiles: ${dashboard.povTiles}, War Room: ${dashboard.warRoom}, Debt: ${dashboard.ignoranceDebt}`);
  if (dashboard.brokenElements) reportIssue("Dashboard", "warn", dashboard.brokenElements, "Code prüfen");
  if (dashboard.otherIssues) reportIssue("Dashboard", "info", dashboard.otherIssues, "Überprüfen");

  // ── Heute (Inbox) ──
  log("🔍", "Audit: Heute");
  await stagehand.act({ action: 'Klicke auf "Heute" in der Sidebar' });
  await page.waitForTimeout(1500);

  const heute = await stagehand.extract({
    instruction: `Analysiere die "Heute" Ansicht:
1. Was zeigt die Seite als Titel/Header? (sollte "HEUTE" mit Sonnen-Icon sein)
2. Gibt es ein Quick-Capture Eingabefeld?
3. Gibt es eine OFFEN-Liste und ERLEDIGT-Liste?
4. Gibt es einen -> ZUTEILEN Button pro Task?
5. Sieht irgendwas broken aus?`,
    schema: z.object({
      headerText: z.string(),
      hasCaptureInput: z.boolean(),
      hasTaskList: z.boolean(),
      hasZuteilen: z.boolean(),
      issues: z.string().optional(),
    }),
  });

  log("☀️", `Heute — Header: "${heute.headerText}", Capture: ${heute.hasCaptureInput}`);
  if (!heute.hasCaptureInput) reportIssue("Heute", "critical", "Quick-Capture fehlt", "inbox.jsx prüfen");
  if (heute.issues) reportIssue("Heute", "warn", heute.issues, "Prüfen");

  // ── Focus ──
  log("🔍", "Audit: Focus");
  await stagehand.act({ action: 'Klicke auf "Focus" in der Sidebar' });
  await page.waitForTimeout(1500);

  const focus = await stagehand.extract({
    instruction: `Analysiere die Focus-Ansicht:
1. Gibt es einen aktiven Task oder leeren Zustand?
2. Wenn ein Task angezeigt wird: Was steht im Breadcrumb oben (sollte POV → KR-Label sein, kein rohes ID wie OBJ1_KR1)?
3. Gibt es einen START-Button oder Timer?
4. Gibt es die Tabs TASK | FREE FLOW | POMODORO?
5. Irgendwelche Darstellungsprobleme?`,
    schema: z.object({
      hasTask: z.boolean(),
      breadcrumb: z.string().optional(),
      hasRawId: z.boolean().describe("Zeigt Breadcrumb eine rohe ID wie OBJ1_KR1?"),
      hasTimer: z.boolean(),
      hasTabs: z.boolean(),
      issues: z.string().optional(),
    }),
  });

  log("⚡", `Focus — Breadcrumb: "${focus.breadcrumb || 'n/a'}", Raw-ID: ${focus.hasRawId}`);
  if (focus.hasRawId) reportIssue("Focus", "warn", `Breadcrumb zeigt rohe ID: ${focus.breadcrumb}`, "KR-Label Lookup in focus.jsx prüfen");
  if (focus.issues) reportIssue("Focus", "warn", focus.issues, "Prüfen");

  // ── Mission Control ──
  log("🔍", "Audit: Mission Control");
  await stagehand.act({ action: 'Klicke auf "Mission Control" in der Sidebar' });
  await page.waitForTimeout(2000);

  const mc = await stagehand.extract({
    instruction: `Analysiere Mission Control:
1. Wie viele POV-Sektionen sind sichtbar? (sollten Personal, Education, Health, Business sein)
2. Gibt es den "MAIN QUEST" Bereich pro POV?
3. Gibt es einen OKR/Objective-Bereich?
4. Gibt es einen Filter (ALLE / einzelne POVs)?
5. Sind alle POV-Labels korrekt (nicht "Professional" statt "Business")?`,
    schema: z.object({
      povCount: z.number(),
      povLabels: z.array(z.string()),
      hasMainQuest: z.boolean(),
      hasOkr: z.boolean(),
      hasFilter: z.boolean(),
      issues: z.string().optional(),
    }),
  });

  log("🎯", `MC — POVs: ${mc.povCount}, Labels: [${mc.povLabels.join(", ")}]`);
  if (mc.povLabels.includes("Professional")) {
    reportIssue("Mission Control", "warn", '"Professional" statt user-label sichtbar', "allPovs override prüfen");
  }
  if (mc.issues) reportIssue("Mission Control", "warn", mc.issues, "Prüfen");

  // ── Planner ──
  log("🔍", "Audit: Planner");
  await stagehand.act({ action: 'Klicke auf "Planner" in der Sidebar' });
  await page.waitForTimeout(1500);

  const planner = await stagehand.extract({
    instruction: `Analysiere den Planner:
1. Gibt es die Wochennavigation (< Pfeile + KW-Anzeige)?
2. Gibt es Tages-Tabs (MO–SO)?
3. Gibt es das Zeitgrid links?
4. Gibt es einen rechten Panel (Task-Zuteilung / Promised vs. Delivered)?
5. Gibt es den "+ BLOCK" Button?
6. Ist "TAGE VERTEILEN" vorhanden?
7. Irgendwelche Layout-Probleme?`,
    schema: z.object({
      hasWeekNav: z.boolean(),
      hasDayTabs: z.boolean(),
      hasTimeGrid: z.boolean(),
      hasRightPanel: z.boolean(),
      hasAddBlock: z.boolean(),
      hasTageVerteilen: z.boolean(),
      issues: z.string().optional(),
    }),
  });

  log("📅", `Planner — Grid: ${planner.hasTimeGrid}, Tage verteilen: ${planner.hasTageVerteilen}`);
  if (planner.issues) reportIssue("Planner", "warn", planner.issues, "Prüfen");

  // ── Insights ──
  log("🔍", "Audit: Insights");
  await stagehand.act({ action: 'Klicke auf "Insights" in der Sidebar' });
  await page.waitForTimeout(1500);

  const insights = await stagehand.extract({
    instruction: `Analysiere Insights:
1. Gibt es einen Weekly Breakdown Bereich mit Balkendiagramm?
2. Gibt es 4 Mini-Stats (Gesamt, Schnitt, Bester Tag, OKR Fokus)?
3. Gibt es einen "Promised vs. Delivered" Bereich pro POV?
4. Sind die POV-Labels korrekt (nicht "Professional" statt "Business")?
5. Gibt es einen WEEKLY REPORT Button?
6. Irgendwelche Probleme?`,
    schema: z.object({
      hasWeeklyChart: z.boolean(),
      hasMiniStats: z.boolean(),
      hasPvd: z.boolean(),
      correctLabels: z.boolean(),
      weeklyReportButton: z.boolean(),
      issues: z.string().optional(),
    }),
  });

  log("📈", `Insights — Chart: ${insights.hasWeeklyChart}, PvD: ${insights.hasPvd}, Labels OK: ${insights.correctLabels}`);
  if (!insights.correctLabels) reportIssue("Insights", "warn", "POV-Labels inkorrekt", "allPovsMeta in insights.jsx prüfen");
  if (insights.issues) reportIssue("Insights", "warn", insights.issues, "Prüfen");

  await summarize(page);
}

async function summarize(page) {
  section("AUDIT ERGEBNIS");

  if (issues.length === 0) {
    log("✅", "Keine Issues gefunden — alle Views funktionieren korrekt.");
    return;
  }

  const critical = issues.filter(i => i.severity === "critical");
  const warns    = issues.filter(i => i.severity === "warn");
  const infos    = issues.filter(i => i.severity === "info");

  console.log(`\n  🔴 Critical: ${critical.length}  🟡 Warn: ${warns.length}  🔵 Info: ${infos.length}\n`);

  for (const issue of issues) {
    const icon = issue.severity === "critical" ? "🔴" : issue.severity === "warn" ? "🟡" : "🔵";
    console.log(`  ${icon} [${issue.view}] ${issue.description}`);
    console.log(`     → ${issue.suggestion}`);
  }

  console.log("");
  await stagehand.close();
}

run().catch(async (err) => {
  console.error("❌ Test-Fehler:", err.message);
  await stagehand.close();
  process.exit(1);
});
