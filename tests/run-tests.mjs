/**
 * Life OS — UX Audit: Playwright (Navigation) + Anthropic Vision (Analyse)
 *
 * Setup:
 *   cd tests && npm install && npx playwright install chromium
 *   echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
 *   node --input-type=module run-tests.mjs --smoke   (oder: npm test)
 *
 * Flags: --smoke (nur Views erreichbar?), default = vollständiger Audit
 */

import { chromium }  from "playwright";
import Anthropic      from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { tmpdir }     from "os";
import { join }       from "path";
import { writeFileSync } from "fs";

const APP_URL   = "https://life-os-wine-eight.vercel.app";
const BETA_CODE = "LifeOS BETA 2026";
const SMOKE     = process.argv.includes("--smoke");

const ai     = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const issues = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(icon, msg) { console.log(`${icon}  ${msg}`); }

function section(title) {
  console.log("\n" + "─".repeat(60));
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

function flag(view, severity, description, suggestion) {
  issues.push({ view, severity, description, suggestion });
  const icon = severity === "critical" ? "🔴" : severity === "warn" ? "🟡" : "🔵";
  log(icon, `[${view}] ${description}`);
}

async function screenshot(page) {
  const path = join(tmpdir(), `lifeos_${Date.now()}.png`);
  await page.screenshot({ path, fullPage: false });
  return readFileSync(path).toString("base64");
}

async function vision(page, question) {
  const img = await screenshot(page);
  const r = await ai.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: img } },
        { type: "text", text: question + "\n\nAntworte kurz und direkt auf Deutsch." },
      ],
    }],
  });
  return r.content[0].text.trim();
}

async function clickNav(page, label) {
  // Sidebar-Navigation: klicke auf den Link mit diesem Text
  const sidebar = page.locator("nav, [data-sidebar], aside").first();
  const link = page.getByRole("button", { name: new RegExp(label, "i") })
    .or(page.locator(`text=${label}`).first());
  await link.click({ timeout: 5000 }).catch(async () => {
    // Fallback: alle Buttons durchsuchen
    const buttons = await page.locator("button").all();
    for (const b of buttons) {
      const txt = await b.textContent();
      if (txt && txt.trim().toLowerCase().includes(label.toLowerCase())) {
        await b.click();
        return;
      }
    }
  });
  await page.waitForTimeout(1500);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function handleAuth(page) {
  await page.waitForTimeout(2000);

  // Cookie-Banner
  const cookieBtn = page.locator("button").filter({ hasText: /ablehnen|nur notwendig|decline|reject/i }).first();
  if (await cookieBtn.isVisible().catch(() => false)) {
    log("🍪", "Cookie-Banner wegklicken");
    await cookieBtn.click();
    await page.waitForTimeout(800);
  }

  // Beta-Code Input
  const betaInput = page.locator("input[placeholder*='Beta'], input[placeholder*='Code'], input[type='text']").first();
  if (await betaInput.isVisible().catch(() => false)) {
    const state = await vision(page, "Was ist auf dem Bildschirm? Gibt es ein Login-Formular oder Beta-Code-Eingabe?");
    if (state.toLowerCase().includes("beta") || state.toLowerCase().includes("code") || state.toLowerCase().includes("login")) {
      log("🔑", "Beta-Code eingeben");
      await betaInput.fill(BETA_CODE);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);
    }
  }

  // Gast-Zugang / "Ohne Account fortfahren"
  const guestBtn = page.locator("button").filter({ hasText: /ohne account|gast|guest|ohne login|fortfahren/i }).first();
  if (await guestBtn.isVisible().catch(() => false)) {
    log("👤", "Ohne Account fortfahren");
    await guestBtn.click();
    await page.waitForTimeout(800);

    // App setzt nach dem Klick lifeos_onboarding_done=undefined → sofort überschreiben
    // damit Onboarding-Wizard + Tutorial-Modal übersprungen werden
    await page.evaluate(() => {
      localStorage.setItem("lifeos_guest", "1");
      localStorage.setItem("lifeos_onboarding_done", "1");
      localStorage.setItem("lifeos_tutorial_done", "1");
      // Minimale POV-Daten damit die Views nicht leer sind
      if (!localStorage.getItem("lifeos_user_name")) {
        localStorage.setItem("lifeos_user_name", "Test");
      }
    });
    log("💾", "localStorage: onboarding + tutorial als erledigt markiert");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    log("🔄", "Seite neu geladen — direkt im App-Modus");
    return; // Auth fertig, kein Onboarding-Loop nötig
  }

  // Fallback: Onboarding / Setup-Wizard durchklicken (falls kein Guest-Button)
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.waitForTimeout(800);

    const onboardCheck = await vision(page, "Ist ein Setup-Dialog, Onboarding-Wizard oder mehrstufiges Willkommens-Formular (mit WEITER-Button) noch sichtbar? Antworte nur: JA oder NEIN.");
    if (onboardCheck.toUpperCase().includes("NEIN")) { log("📖", "Onboarding fertig"); break; }

    // Schritt 1: Name-Feld füllen wenn leer und WEITER disabled
    const nameInput = page.locator("input[placeholder*='Name'], input[placeholder*='name'], input[type='text']").first();
    const weiterBtn = page.locator("button").filter({ hasText: /^WEITER/i }).first();
    const isDisabled = await weiterBtn.isDisabled().catch(() => false);

    if (isDisabled) {
      const hasNameInput = await nameInput.isVisible().catch(() => false);
      if (hasNameInput) {
        const val = await nameInput.inputValue().catch(() => "");
        if (!val.trim()) {
          await nameInput.fill("Test");
          log("📖", "Name 'Test' eingegeben");
          await page.waitForTimeout(400);
        }
      }
    }

    // Weiter-Button klicken (enabled)
    const btn = page.locator("button").filter({ hasText: /^WEITER|^FERTIG|^LOS GEHT|^ABSCHLIESSEN|^DONE/i }).first();
    if (await btn.isEnabled().catch(() => false)) {
      await btn.click();
      log("📖", `Onboarding Step ${attempt + 1} weiter`);
      continue;
    }

    // Notification-Step: "Später" oder zweiten Button wählen
    const laterBtn = page.locator("button").filter({ hasText: /später|skip|nein|abbrechen/i }).first();
    if (await laterBtn.isVisible().catch(() => false)) {
      await laterBtn.click();
      log("📖", "Später geklickt");
      continue;
    }

    await page.keyboard.press("Escape");
    log("📖", `Escape attempt ${attempt + 1}`);
  }

  // Fallback: localStorage direkt setzen + reload falls noch Modals offen
  await page.evaluate(() => {
    localStorage.setItem("lifeos_onboarding_done", "1");
    localStorage.setItem("lifeos_tutorial_done", "1");
  });
  await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
}

// ── Smoke Tests ───────────────────────────────────────────────────────────────

async function smokeTests(page) {
  section("2 · Smoke — alle Views erreichbar?");

  const VIEWS = ["Dashboard", "Heute", "Focus", "Mission Control", "Planner", "Insights"];

  for (const v of VIEWS) {
    log("🔗", `→ ${v}`);
    await clickNav(page, v);

    const answer = await vision(page, `Ist die "${v}"-Ansicht oder Sidebar-Navigation sichtbar? Antworte mit JA (was du siehst) oder NEIN (was stattdessen zu sehen ist).`);
    const loaded = answer.toUpperCase().startsWith("JA") || answer.toLowerCase().includes(v.toLowerCase().split(" ")[0]);

    if (loaded) {
      log("✅", `${v}: ${answer.slice(0, 90)}`);
    } else {
      flag(v, "critical", `View nicht geladen: ${answer.slice(0, 80)}`, "Navigations-Bug oder Onboarding-Block prüfen");
    }
  }
}

// ── Detail-Audit ──────────────────────────────────────────────────────────────

async function detailAudit(page) {
  section("3 · Detail-Audit");

  // Dashboard
  log("🔍", "Dashboard");
  await clickNav(page, "Dashboard");
  const dash = await vision(page, "Analysiere das Dashboard: Wie viele POV-Kacheln siehst du? Gibt es einen 'War Room'? Einen Ignorance-Debt-Indikator? Gibt es kaputte oder abgeschnittene Elemente?");
  log("📊", dash.slice(0, 120));
  if (dash.toLowerCase().includes("kaputt") || dash.toLowerCase().includes("fehler")) {
    flag("Dashboard", "warn", dash, "Code prüfen");
  }

  // Heute
  log("🔍", "Heute");
  await clickNav(page, "Heute");
  const heute = await vision(page, "Analysiere die 'Heute'-Ansicht: Zeigt der Header 'HEUTE' oder noch 'INBOX'? Gibt es ein Eingabefeld für neue Tasks? Siehst du eine Task-Liste?");
  log("☀️", heute.slice(0, 120));
  if (heute.toLowerCase().includes("inbox")) {
    flag("Heute", "warn", "Header zeigt noch INBOX statt HEUTE", "Cmd+Shift+R nötig oder cache-Problem");
  }

  // Focus
  log("🔍", "Focus");
  await clickNav(page, "Focus");
  await page.waitForTimeout(500);
  const focus = await vision(page, "Analysiere die Focus-Ansicht: Was steht im Breadcrumb oben (z.B. EDUCATION → etwas)? Siehst du eine rohe ID wie OBJ1_KR1 oder einen echten Label-Text? Gibt es einen START-Button?");
  log("⚡", focus.slice(0, 120));
  if (focus.toUpperCase().includes("OBJ1_KR") || focus.toUpperCase().includes("OBJ2_KR")) {
    flag("Focus", "warn", `Breadcrumb zeigt rohe KR-ID: ${focus.slice(0, 60)}`, "POV_DATA Lookup in focus.jsx");
  }

  // Mission Control
  log("🔍", "Mission Control");
  await clickNav(page, "Mission Control");
  await page.waitForTimeout(500);
  const mc = await vision(page, "Analysiere Mission Control: Wie viele POV-Sektionen siehst du? Steht da 'Business' oder 'Professional'? Zeigt es Education und Health?");
  log("🎯", mc.slice(0, 120));
  if (mc.toLowerCase().includes("professional")) {
    flag("Mission Control", "warn", '"Professional" statt "Business" sichtbar', "userPovs Override prüfen");
  }

  // Planner
  log("🔍", "Planner");
  await clickNav(page, "Planner");
  const plan = await vision(page, "Analysiere den Planner: Gibt es Tages-Tabs (Mo-So), ein Zeitgrid, einen '+ Block'-Button? Gibt es einen 'Tage verteilen'-Button? Sieht alles korrekt aus?");
  log("📅", plan.slice(0, 120));

  // Insights
  log("🔍", "Insights");
  await clickNav(page, "Insights");
  const ins = await vision(page, "Analysiere Insights: Gibt es ein Balkendiagramm für diese Woche? Zeigt es POV-Labels — steht da 'Business' oder 'Professional'? Gibt es einen 'Weekly Report'-Button?");
  log("📈", ins.slice(0, 120));
  if (ins.toLowerCase().includes("professional")) {
    flag("Insights", "warn", '"Professional" statt "Business" in POV-Stats', "allPovsMeta in insights.jsx");
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
  const browser = await chromium.launch({ headless: false });
  const ctx     = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["notifications"],
  });
  const page    = await ctx.newPage();

  try {
    section("1 · App laden & Auth");
    await page.goto(APP_URL, { waitUntil: "networkidle" });
    const initial = await vision(page, "Was ist gerade auf dem Bildschirm zu sehen? Ein Satz.");
    log("📸", initial);

    await handleAuth(page);

    await smokeTests(page);
    if (!SMOKE) await detailAudit(page);

  } finally {
    section("ERGEBNIS");
    if (issues.length === 0) {
      log("✅", "Keine Issues — alles OK.");
    } else {
      const c = issues.filter(i => i.severity === "critical").length;
      const w = issues.filter(i => i.severity === "warn").length;
      console.log(`\n  🔴 Critical: ${c}  🟡 Warn: ${w}\n`);
      for (const i of issues) {
        const icon = i.severity === "critical" ? "🔴" : "🟡";
        console.log(`  ${icon} [${i.view}] ${i.description}`);
        console.log(`     → ${i.suggestion}`);
      }
    }
    console.log("");
    await browser.close();
  }
}

run().catch(e => { console.error("❌", e.message); process.exit(1); });
