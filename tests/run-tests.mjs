/**
 * Life OS — UX Audit mit Stagehand (AI-gesteuerter Browser-Agent)
 *
 * Setup:
 *   cd tests && npm install
 *   npx playwright install chromium
 *   echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
 *
 * Aufruf:
 *   node run-tests.mjs              # vollständiger Audit
 *   node run-tests.mjs --smoke      # nur Erreichbarkeit prüfen
 *   node run-tests.mjs --view=focus # nur einen View auditen
 */

import { Stagehand } from "@browserbasehq/stagehand";
import { z }         from "zod";

// ── Config ───────────────────────────────────────────────────────────────────

const APP_URL   = "https://life-os-wine-eight.vercel.app";
const SMOKE     = process.argv.includes("--smoke");
const VIEW_ARG  = (process.argv.find(a => a.startsWith("--view=")) || "").split("=")[1];

// ── State ────────────────────────────────────────────────────────────────────

const issues = [];

function log(icon, msg) { console.log(`${icon}  ${msg}`); }

function section(title) {
  console.log("\n" + "─".repeat(64));
  console.log(`  ${title}`);
  console.log("─".repeat(64));
}

function flag(view, severity, description, suggestion) {
  issues.push({ view, severity, description, suggestion });
  const icon = severity === "critical" ? "🔴" : "🟡";
  log(icon, `[${view}] ${description}`);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function handleAuth(stagehand) {
  const page = stagehand.page;

  section("1 · Auth & App laden");
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Cookie-Banner
  try {
    const { visible } = await stagehand.extract({
      instruction: "Gibt es einen Cookie-Banner oder Consent-Dialog mit Ablehnen/Akzeptieren-Button?",
      schema: z.object({ visible: z.boolean() }),
    });
    if (visible) {
      log("🍪", "Cookie-Banner gefunden — ablehnen");
      await stagehand.act({ action: 'Klicke auf "Nur notwendige" oder "Ablehnen" im Cookie-Banner' });
      await page.waitForTimeout(800);
    }
  } catch {}

  // Prüfen ob Paywall / Beta-Code / Login nötig
  const { screen } = await stagehand.extract({
    instruction: "Was ist gerade auf dem Bildschirm? Optionen: 'paywall' (Beta-Code oder Login nötig), 'onboarding' (Setup-Wizard), 'app' (die App ist geladen, Sidebar sichtbar)",
    schema: z.object({ screen: z.enum(["paywall", "onboarding", "app", "other"]) }),
  });
  log("📸", `Bildschirm-Status: ${screen}`);

  if (screen === "paywall") {
    // Gast-Login versuchen
    log("👤", "Paywall erkannt — Gast-Login");
    try {
      await stagehand.act({ action: 'Klicke auf "Ohne Account fortfahren" oder "Als Gast" oder "Weiter ohne Login"' });
      await page.waitForTimeout(1000);
    } catch {}
  }

  // localStorage: Onboarding + Tutorial überspringen, Gast-Flag setzen
  await page.evaluate(() => {
    localStorage.setItem("lifeos_guest",           "1");
    localStorage.setItem("lifeos_onboarding_done", "1");
    localStorage.setItem("lifeos_tutorial_done",   "1");
    if (!localStorage.getItem("lifeos_user_name")) {
      localStorage.setItem("lifeos_user_name", "Stagehand-Test");
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  // Notifications-Permission erteilen (verhindert Browser-Crash)
  try { await page.context().grantPermissions(["notifications"]); } catch {}

  // Prüfen ob App geladen
  const { loaded } = await stagehand.extract({
    instruction: "Ist die Life OS App geladen? Erkennungsmerkmale: Sidebar mit Nav-Punkten (Dashboard, Heute, Focus, Mission Control, Planner, Insights) ist sichtbar.",
    schema: z.object({ loaded: z.boolean(), detail: z.string() }),
  });

  if (loaded) {
    log("✅", "App geladen — bereit");
  } else {
    log("⚠️", "App möglicherweise nicht vollständig geladen — weiter trotzdem");
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────

async function navigateTo(stagehand, viewName) {
  await stagehand.act({
    action: `Klicke in der linken Sidebar auf den Nav-Eintrag "${viewName}"`,
  });
  await stagehand.page.waitForTimeout(1500);
}

// ── Smoke Tests ───────────────────────────────────────────────────────────────

async function smokeTests(stagehand) {
  section("2 · Smoke — alle Views erreichbar?");

  const VIEWS = ["Dashboard", "Heute", "Focus", "Mission Control", "Planner", "Insights"];

  for (const view of VIEWS) {
    log("🔗", `→ ${view}`);
    await navigateTo(stagehand, view);

    const { reached, detail } = await stagehand.extract({
      instruction: `Wurde die "${view}"-Ansicht erfolgreich geladen? Erkennungsmerkmale: passender Seiteninhalt, kein Lade-Spinner, kein Fehler-Screen.`,
      schema: z.object({
        reached: z.boolean(),
        detail:  z.string().describe("Was konkret sichtbar ist"),
      }),
    });

    if (reached) {
      log("✅", `${view}: ${detail.slice(0, 80)}`);
    } else {
      flag(view, "critical", `View nicht geladen: ${detail.slice(0, 80)}`, "Navigations-Bug oder Render-Fehler prüfen");
    }
  }
}

// ── Detail-Audit ──────────────────────────────────────────────────────────────

async function auditDashboard(stagehand) {
  log("🔍", "Dashboard");
  await navigateTo(stagehand, "Dashboard");

  const result = await stagehand.extract({
    instruction: "Analysiere das Dashboard auf UI-Qualität und Vollständigkeit.",
    schema: z.object({
      warRoomVisible:      z.boolean().describe("War Room Ringe sichtbar?"),
      streakVisible:       z.boolean().describe("Streak Counter sichtbar?"),
      sayDoVisible:        z.boolean().describe("Say-Do Score sichtbar?"),
      brokenElements:      z.array(z.string()).describe("Liste abgeschnittener oder kaputt aussehender Elemente"),
      layoutIssues:        z.array(z.string()).describe("Layout-Probleme (z.B. Overflow, falsche Farben, fehlender Text)"),
      overallQuality:      z.enum(["gut", "ok", "problematisch"]),
    }),
  });

  log("📊", `War Room: ${result.warRoomVisible ? "✅" : "❌"} | Streak: ${result.streakVisible ? "✅" : "❌"} | Say-Do: ${result.sayDoVisible ? "✅" : "❌"} | Qualität: ${result.overallQuality}`);
  result.brokenElements.forEach(e => flag("Dashboard", "warn", `Kaputtes Element: ${e}`, "Code prüfen"));
  result.layoutIssues.forEach(e => flag("Dashboard", "warn", `Layout-Problem: ${e}`, "CSS prüfen"));
}

async function auditHeute(stagehand) {
  log("🔍", "Heute");
  await navigateTo(stagehand, "Heute");

  const result = await stagehand.extract({
    instruction: "Analysiere die 'Heute'-Ansicht (Inbox/Quick Capture).",
    schema: z.object({
      headerText:       z.string().describe("Was steht im Header? (sollte 'HEUTE' sein, nicht 'INBOX')"),
      inputVisible:     z.boolean().describe("Gibt es ein Eingabefeld für neue Tasks?"),
      addButtonVisible: z.boolean().describe("Gibt es einen + Button zum Hinzufügen?"),
      flowIssues:       z.array(z.string()).describe("Fluss-Brüche oder unklare UX-Elemente"),
    }),
  });

  log("☀️", `Header: "${result.headerText}" | Input: ${result.inputVisible ? "✅" : "❌"} | Add-Button: ${result.addButtonVisible ? "✅" : "❌"}`);
  if (result.headerText.toLowerCase().includes("inbox")) {
    flag("Heute", "warn", `Header zeigt noch "INBOX" statt "HEUTE"`, "Cache-Problem oder Code-Bug");
  }
  result.flowIssues.forEach(i => flag("Heute", "warn", i, "UX-Review nötig"));
}

async function auditFocus(stagehand) {
  log("🔍", "Focus");
  await navigateTo(stagehand, "Focus");
  await stagehand.page.waitForTimeout(500);

  const result = await stagehand.extract({
    instruction: "Analysiere die Focus-Ansicht mit Task-Timer.",
    schema: z.object({
      breadcrumb:        z.string().describe("Breadcrumb-Text oben (z.B. EDUCATION > Key Result Name) — zeigt er echte Labels oder rohe IDs wie OBJ1_KR1?"),
      startButtonVisible: z.boolean().describe("Gibt es einen START-Button für den Timer?"),
      timerVisible:      z.boolean().describe("Ist ein Timer-Display sichtbar?"),
      rawIdInBreadcrumb: z.boolean().describe("Enthält der Breadcrumb eine rohe ID (OBJ1_KR, obj_, kr_) statt echtem Text?"),
      issues:            z.array(z.string()).describe("Weitere UX-Probleme"),
    }),
  });

  log("⚡", `Breadcrumb: "${result.breadcrumb.slice(0,60)}" | Start: ${result.startButtonVisible ? "✅" : "❌"} | rawID: ${result.rawIdInBreadcrumb ? "⚠️" : "✅"}`);
  if (result.rawIdInBreadcrumb) {
    flag("Focus", "warn", `Breadcrumb zeigt rohe KR-ID: "${result.breadcrumb}"`, "POV_DATA Lookup in focus.jsx prüfen");
  }
  result.issues.forEach(i => flag("Focus", "warn", i, "Code/UX prüfen"));
}

async function auditMissionControl(stagehand) {
  log("🔍", "Mission Control");
  await navigateTo(stagehand, "Mission Control");
  await stagehand.page.waitForTimeout(800);

  const result = await stagehand.extract({
    instruction: "Analysiere Mission Control (Projektübersicht / POV-Sektionen).",
    schema: z.object({
      povSections:       z.array(z.string()).describe("Sichtbare POV-Labels (z.B. Personal, Business, Education, Health)"),
      wrongLabels:       z.array(z.string()).describe("Falsche Labels die auftauchen (z.B. 'Professional' statt 'Business')"),
      ganttButtonVisible: z.boolean().describe("Gibt es einen TIMELINE-Button?"),
      skipStatusVisible: z.boolean().describe("Gibt es einen Skip-Button (Pfeil) neben Tasks?"),
      issues:            z.array(z.string()).describe("Layout-Probleme oder Fluss-Brüche"),
    }),
  });

  log("🎯", `POVs: ${result.povSections.join(", ")} | TIMELINE: ${result.ganttButtonVisible ? "✅" : "❌"}`);
  result.wrongLabels.forEach(l => flag("Mission Control", "warn", `Falsches Label: "${l}"`, "userPovs Override prüfen"));
  result.issues.forEach(i => flag("Mission Control", "warn", i, "Code/Layout prüfen"));
}

async function auditPlanner(stagehand) {
  log("🔍", "Planner");
  await navigateTo(stagehand, "Planner");

  const result = await stagehand.extract({
    instruction: "Analysiere den Wochenplaner.",
    schema: z.object({
      dayTabsVisible:       z.boolean().describe("Gibt es Tages-Tabs Mo-So?"),
      addBlockButtonVisible: z.boolean().describe("Gibt es einen '+ Block' oder '+ BLOCK' Button?"),
      makerManagerBadges:   z.boolean().describe("Zeigen Blöcke MAKER/MANAGER/FLEX Badges?"),
      recurringIconVisible:  z.boolean().describe("Gibt es Wiederkehrend-Icons oder Optionen?"),
      issues:               z.array(z.string()).describe("Layout oder UX Probleme"),
    }),
  });

  log("📅", `Tabs: ${result.dayTabsVisible ? "✅" : "❌"} | +Block: ${result.addBlockButtonVisible ? "✅" : "❌"} | MAKER/MANAGER: ${result.makerManagerBadges ? "✅" : "❌"}`);
  result.issues.forEach(i => flag("Planner", "warn", i, "Code/Layout prüfen"));
}

async function auditInsights(stagehand) {
  log("🔍", "Insights");
  await navigateTo(stagehand, "Insights");

  const result = await stagehand.extract({
    instruction: "Analysiere die Insights-Seite.",
    schema: z.object({
      weeklyBarChartVisible: z.boolean().describe("Gibt es ein Balkendiagramm für die aktuelle Woche?"),
      weeklyReportButton:    z.boolean().describe("Gibt es einen 'WEEKLY REPORT' Button?"),
      povLabels:             z.array(z.string()).describe("Sichtbare POV-Labels in der KR-Breakdown (z.B. Business, Education)"),
      wrongLabels:           z.array(z.string()).describe("Falsche Labels wie 'Professional' statt 'Business'"),
      issues:                z.array(z.string()).describe("Weitere UX-Probleme"),
    }),
  });

  log("📈", `Balkendiagramm: ${result.weeklyBarChartVisible ? "✅" : "❌"} | Weekly Report: ${result.weeklyReportButton ? "✅" : "❌"} | POVs: ${result.povLabels.join(", ")}`);
  result.wrongLabels.forEach(l => flag("Insights", "warn", `Falsches Label: "${l}"`, "allPovsMeta in insights.jsx prüfen"));
  result.issues.forEach(i => flag("Insights", "warn", i, "Code/UX prüfen"));
}

async function auditUserFlows(stagehand) {
  section("3b · User Flow Audit — kritische Flüsse");

  // Flow 1: Task in Heute erstellen
  log("🔄", "Flow: Task in Heute erstellen");
  await navigateTo(stagehand, "Heute");
  await stagehand.act({ action: 'Klicke auf das Eingabefeld für neue Tasks (Placeholder "Task hinzufuegen")' });
  await stagehand.act({ action: 'Tippe den Text "Stagehand Test Task"' });
  await stagehand.act({ action: 'Drücke Enter oder klicke den + Button zum Speichern' });
  await stagehand.page.waitForTimeout(800);

  const { taskCreated } = await stagehand.extract({
    instruction: 'Erscheint ein neuer Task mit dem Text "Stagehand Test Task" in der Liste?',
    schema: z.object({ taskCreated: z.boolean() }),
  });
  if (taskCreated) {
    log("✅", "Task erstellt — Flow funktioniert");
    // Cleanup
    try {
      await stagehand.act({ action: 'Klicke den Löschen-Button (X) neben dem "Stagehand Test Task" Eintrag' });
    } catch {}
  } else {
    flag("Heute", "critical", "Task-Erstellung funktioniert nicht", "addTask() in inbox.jsx prüfen");
  }

  // Flow 2: Weekly Report öffnen
  log("🔄", "Flow: Weekly Report öffnen");
  await navigateTo(stagehand, "Insights");
  await stagehand.act({ action: 'Klicke auf den "WEEKLY REPORT" Button oben rechts in Insights' });
  await stagehand.page.waitForTimeout(1000);

  const { modalOpen } = await stagehand.extract({
    instruction: "Ist ein Weekly Report Modal / Dialog geöffnet mit Statistiken (Geliefert, Say-Do Score, Streak-Tage)?",
    schema: z.object({ modalOpen: z.boolean() }),
  });
  if (modalOpen) {
    log("✅", "Weekly Report Modal öffnet korrekt");
    await stagehand.act({ action: 'Schließe das Modal (X Button oder Klick außerhalb)' });
  } else {
    flag("Insights", "warn", "Weekly Report Modal öffnet nicht", "showReport State in insights.jsx prüfen");
  }

  // Flow 3: Mission Control → Timeline
  log("🔄", "Flow: Gantt Timeline öffnen");
  await navigateTo(stagehand, "Mission Control");
  await stagehand.act({ action: 'Klicke auf den "TIMELINE" Button in Mission Control' });
  await stagehand.page.waitForTimeout(800);

  const { ganttVisible } = await stagehand.extract({
    instruction: "Ist eine Gantt Timeline Ansicht sichtbar (horizontale Balken, Wochen-Grid, Projekt-Zeilen)?",
    schema: z.object({ ganttVisible: z.boolean() }),
  });
  if (ganttVisible) {
    log("✅", "Gantt Timeline öffnet korrekt");
  } else {
    flag("Mission Control", "warn", "Gantt Timeline öffnet nicht", "GanttTimeline Komponente in mission-control.jsx prüfen");
  }
}

// ── Detail-Audit ──────────────────────────────────────────────────────────────

async function detailAudit(stagehand) {
  section("3 · Detail-Audit — jeder View");

  const VIEW_AUDITS = {
    "dashboard":        auditDashboard,
    "heute":            auditHeute,
    "focus":            auditFocus,
    "missioncontrol":   auditMissionControl,
    "mission control":  auditMissionControl,
    "planner":          auditPlanner,
    "insights":         auditInsights,
  };

  if (VIEW_ARG) {
    const fn = VIEW_AUDITS[VIEW_ARG.toLowerCase()];
    if (fn) {
      await fn(stagehand);
    } else {
      log("⚠️", `Unbekannter View: ${VIEW_ARG}. Gültig: ${Object.keys(VIEW_AUDITS).join(", ")}`);
    }
  } else {
    await auditDashboard(stagehand);
    await auditHeute(stagehand);
    await auditFocus(stagehand);
    await auditMissionControl(stagehand);
    await auditPlanner(stagehand);
    await auditInsights(stagehand);
    await auditUserFlows(stagehand);
  }
}

// ── Ergebnis-Report ───────────────────────────────────────────────────────────

async function printReport(stagehand) {
  section("ERGEBNIS");

  if (issues.length === 0) {
    log("✅", "Keine Issues gefunden — alles OK.");
  } else {
    const critical = issues.filter(i => i.severity === "critical");
    const warns    = issues.filter(i => i.severity === "warn");
    console.log(`\n  🔴 Critical: ${critical.length}  🟡 Warn: ${warns.length}\n`);

    if (critical.length > 0) {
      console.log("  ── CRITICAL ──");
      critical.forEach(i => {
        console.log(`  🔴 [${i.view}] ${i.description}`);
        console.log(`     → ${i.suggestion}`);
      });
    }
    if (warns.length > 0) {
      console.log("\n  ── WARNINGS ──");
      warns.forEach(i => {
        console.log(`  🟡 [${i.view}] ${i.description}`);
        console.log(`     → ${i.suggestion}`);
      });
    }
  }

  // KI-Gesamteinschätzung
  if (!SMOKE) {
    console.log("\n  ── KI-GESAMTEINSCHÄTZUNG ──");
    const { summary, topPriority } = await stagehand.extract({
      instruction: "Du hast gerade eine vollständige UX-Prüfung von Life OS (einer persönlichen Produktivitäts-PWA) durchgeführt. Gib eine ehrliche Gesamteinschätzung der App-Qualität und nenne die eine wichtigste Verbesserung.",
      schema: z.object({
        summary:     z.string().describe("2-3 Sätze Gesamteinschätzung auf Deutsch"),
        topPriority: z.string().describe("Die eine wichtigste Verbesserung in 1 Satz"),
      }),
    });
    console.log(`\n  ${summary}`);
    console.log(`\n  Top-Prio: ${topPriority}`);
  }

  console.log("");
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
  const stagehand = new Stagehand({
    env:                "LOCAL",
    modelName:          "claude-3-5-haiku-20241022",
    modelClientOptions: { apiKey: process.env.ANTHROPIC_API_KEY },
    headless:           false,
    verbose:            0,
    debugDom:           false,
  });

  try {
    await stagehand.init();

    await handleAuth(stagehand);

    if (SMOKE || VIEW_ARG) {
      if (!VIEW_ARG) await smokeTests(stagehand);
    } else {
      await smokeTests(stagehand);
    }

    if (!SMOKE) {
      await detailAudit(stagehand);
    }

    await printReport(stagehand);

  } catch (e) {
    console.error("\n❌ Test-Fehler:", e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await stagehand.close().catch(() => {});
  }
}

run();
