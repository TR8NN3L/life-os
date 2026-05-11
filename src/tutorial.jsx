// Life OS — Interactive Tutorial
// Launched after onboarding completes (first time only).

// ─── Seed Data ───────────────────────────────────────────────────────────────
function injectTutorialSeedData() {
  try {
    const tasks = JSON.parse(LS.getItem("lifeos_tasks_personal") || "[]");
    if (!tasks.find(t => t.id === "tutorial_task_1")) {
      LS.setItem("lifeos_tasks_personal", JSON.stringify([
        { id: "tutorial_task_1", title: "Life OS installieren & einloggen", sub: "Du hast es geschafft. Der erste Schritt ist getan. 🎉", elapsed: 0, pov: "personal", custom: true, _tutorial: true },
        ...tasks,
      ]));
    }
  } catch {}
  try {
    const habits = JSON.parse(LS.getItem("lifeos_habits") || "[]");
    if (!habits.find(h => h.id === "tutorial_habit_1")) {
      LS.setItem("lifeos_habits", JSON.stringify([
        { id: "tutorial_habit_1", name: "Täglicher System-Check", color: "var(--accent)", log: {}, _tutorial: true },
        ...habits,
      ]));
    }
  } catch {}
  // Reset done-state for tutorial task so it always starts unchecked
  try {
    const done = new Set(JSON.parse(localStorage.getItem("lifeos_done_personal") || "[]"));
    done.delete("tutorial_task_1");
    localStorage.setItem("lifeos_done_personal", JSON.stringify([...done]));
  } catch {}
  // Notify Dashboard to re-read tasks + done state from LS
  window.dispatchEvent(new CustomEvent("lifeos-tasks-updated", { detail: { pov: "personal" } }));
}

function getTutorialPrefill() {
  const name = (LS.getItem("lifeos_user_name") || "Mein").split(" ")[0];
  const userPovs = (() => { try { return JSON.parse(LS.getItem("lifeos_user_povs") || "[]"); } catch { return []; } })();
  const firstPov = userPovs[0] || { id: "personal", label: "Personal" };
  return {
    mode: "new",
    pov: firstPov.id,
    projectName: `${name}s erstes Life OS Projekt`,
    bigGoal: `Mein System in Life OS vollständig aufsetzen: Main Quest definieren, meinen wichtigsten Lebensbereich "${firstPov.label}" konkret strukturieren und Life OS täglich als Command-Center nutzen`,
    why1: "Weil ich kein leeres System will — sondern eines das ab Tag 1 meine echten Ziele und meinen Alltag abbildet",
    why2: "Damit ich jeden Morgen ohne Nachdenken weiß was als nächstes zu tun ist und wirklich vorwärtskomme",
    motivationTypes: ["learning", "freedom"],
    deadlineWeeks: 6,
    hoursPerWeek: 5,
    successDefinition: `Ich habe meinen Main Quest für "${firstPov.label}" definiert, mindestens ein echtes Projekt mit OKRs angelegt und nutze Life OS täglich für Planung und Tracking`,
    obstacles: ["discipline", "unclear"],
    implementationIntention: "Wenn ich morgens aufstehe, öffne ich als erstes Life OS, schaue meinen Main Quest an und plane meinen Tag.",
    complexity: "simple",
    generateTodos: true,
    generateSubtasks: false,
  };
}

// ─── Steps ───────────────────────────────────────────────────────────────────
const TUT_STEPS = [
  {
    id: "welcome", route: "dashboard", selector: null, type: "explain",
    title: "Willkommen in Life OS",
    body: "In den nächsten Minuten lernst du alles kennen — nicht durch Zuschauen, sondern durch echte Aktionen. Am Ende ist dein System nicht mehr leer.",
    position: "center", nextLabel: "Lass uns starten →", blockClicks: false,
  },
  {
    id: "pov-section", route: "dashboard", selector: "[data-tutorial='pov-section']", type: "explain",
    title: "Deine Lebensbereiche (POVs)",
    body: () => {
      try {
        const extra = JSON.parse(LS.getItem("lifeos_user_povs") || "[]");
        const names = ["Personal", ...extra.map(p => p.label)].join(", ");
        return `Deine Bereiche: ${names}. Alles in Life OS gehört zu einem davon. Klick auf einen POV um den Kontext zu wechseln.`;
      } catch { return "Deine POVs sind die Säulen deines Systems. Klick auf einen um den Kontext zu wechseln."; }
    },
    position: "right", blockClicks: false,
  },
  {
    id: "main-quest-sidebar", route: "dashboard", selector: "[data-tutorial='main-quest-sidebar']", type: "explain",
    title: "Dein Main Quest",
    body: "Jeder POV hat ein übergeordnetes Hauptziel — den Main Quest. Er zeigt dir immer wohin du willst. Du setzt ihn im Mission Control über das Stift-Symbol.",
    position: "right", blockClicks: false,
  },
  {
    id: "task-list", route: "dashboard", forcePov: "personal", selector: "[data-tutorial='task-list']", type: "explain",
    title: "Heutige Tasks",
    body: "Hier siehst du was heute ansteht. Tasks aus all deinen Projekten, nach POV geordnet. Eine spezielle Aufgabe wartet schon auf dich.",
    position: "right", blockClicks: false,
  },
  {
    id: "check-task", route: "dashboard", forcePov: "personal", selector: "[data-tutorial='tutorial-task-row']", type: "do",
    waitFor: "task-checked-tutorial_task_1",
    title: "Life OS installieren – Task erledigt!",
    body: "Das bist du — du hast es gerade getan. Hak die Aufgabe ab. Dein erster echter Fortschritt.",
    hint: "Klick auf die Checkbox links neben dem Task.",
    position: "bottom", blockClicks: true,
  },
  {
    id: "nav-mc", route: "dashboard", selector: "[data-tutorial='nav-missioncontrol']", type: "do",
    waitFor: "route-missioncontrol",
    title: "Mission Control öffnen",
    body: "Hier lebst du deine Strategie. Alle Lebensbereiche auf einen Blick — mit Hauptzielen und OKR-Projekten darunter.",
    hint: "Klick auf 'Mission Control' in der Sidebar.", position: "right", blockClicks: true,
  },
  {
    id: "mc-page-intro", route: "missioncontrol", selector: "[data-tutorial='mc-content-area']", type: "explain",
    title: "Mission Control — Überblick",
    body: "Das ist dein strategisches Cockpit. Jeder Lebensbereich hat einen Main Quest (dein großes Ziel) und darunter OKR-Projekte mit konkreten Key Results. Schau dir kurz an wie alles strukturiert ist.",
    position: "center", blockClicks: false,
  },
  {
    id: "mc-overview", route: "missioncontrol", selector: "[data-tutorial='mc-main-quest-section']", type: "explain",
    title: "Das Mission Control Board",
    body: "Jeder Bereich zeigt seinen Main Quest und darunter Projekte mit OKRs. Du kannst dein Hauptziel direkt hier bearbeiten — klick auf das Stift-Symbol neben dem Prozentwert.",
    position: "bottom", blockClicks: false,
  },
  {
    id: "setup-api", route: "missioncontrol", selector: "[data-tutorial='settings-area']", type: "do",
    waitFor: "api-key-set",
    title: "API Key einrichten",
    body: "Der OKR Wizard braucht deinen Anthropic API Key. Klick unten links auf ⚙ — dann füge deinen Key (sk-ant-...) in das Feld ein.",
    hint: "⚙ Einstellungen öffnen → Anthropic API Key eingeben.",
    position: "right", blockClicks: true,
  },
  {
    id: "new-project", route: "missioncontrol", selector: "[data-tutorial='new-project-btn']", type: "do",
    waitFor: "wizard-opened",
    title: "Ersten Projektplan erstellen",
    body: "Der OKR-Wizard führt dich durch die Erstellung — mit Wizard-generierten Key Results und konkreten Tasks.",
    hint: "Klick auf '⚡ OKR WIZARD — PROJEKT ERSTELLEN'.", position: "right", blockClicks: true,
  },
  {
    id: "wizard-session", route: "missioncontrol", selector: null, type: "do",
    waitFor: "project-saved", noSpotlight: true,
    title: "Wizard: Deinen ersten Plan erstellen",
    body: "Die Felder sind vorausgefüllt. Schau sie durch, passe sie an — und klick am Ende auf 'Generieren', dann unten auf '⚡ PROJEKT STARTEN'.",
    hint: "⚡ PROJEKT STARTEN klicken um deinen Plan zu speichern.",
    position: "corner-left", blockClicks: false,
  },
  {
    id: "nav-insights", route: "missioncontrol", selector: "[data-tutorial='nav-insights']", type: "do",
    waitFor: "route-insights",
    title: "Insights & Tracking",
    body: "Hier siehst du deinen Fortschritt über Zeit und verfolgst deine täglichen Gewohnheiten.",
    hint: "Klick auf 'Insights'.", position: "right", blockClicks: true,
  },
  {
    id: "insights-page-intro", route: "insights", selector: "[data-tutorial='insights-content-area']", type: "explain",
    title: "Insights — Überblick",
    body: "Hier siehst du alles auf einen Blick: geplante vs. gelebte Stunden, KR-Fortschritt nach POV, Behavior Streaks. Mit jedem Tag füllst du dieses Dashboard mit echten Daten.",
    position: "center", blockClicks: false,
  },
  {
    id: "behaviors-section", route: "insights", selector: "[data-tutorial='behaviors-section']", type: "explain",
    title: "Behavior Change Tracker",
    body: "Täglich einchecken. Streaks aufbauen. Drift sichtbar machen. Ein erster Behavior wartet schon auf dich.",
    position: "top", blockClicks: false,
  },
  {
    id: "check-behavior", route: "insights", selector: "[data-tutorial='behaviors-section']", type: "do",
    waitFor: "habit-checked-tutorial_habit_1",
    title: "Erster Behavior Check-in",
    body: "Hak 'Täglicher System-Check' für heute ab. Streak Tag 1 startet jetzt.",
    hint: "Klick auf die heutige Checkbox im Tracker.", position: "top", blockClicks: true,
  },
  {
    id: "nav-planner", route: "insights", selector: "[data-tutorial='nav-planner']", type: "do",
    waitFor: "route-planner",
    title: "Der Planner",
    body: "Dein tägliches Cockpit. Erstelle Zeitblöcke und weise ihnen Tasks zu.",
    hint: "Klick auf 'Planner'.", position: "right", blockClicks: true,
  },
  {
    id: "planner-page-intro", route: "planner", selector: "[data-tutorial='planner-content-area']", type: "explain",
    title: "Planner — Überblick",
    body: "Dein tägliches Cockpit. Ziehe auf der Zeitachse um Blöcke zu erstellen und weise ihnen Tasks zu. So wird jede Stunde bewusst verplant.",
    position: "center", blockClicks: false,
  },
  {
    id: "planner-intro", route: "planner", selector: "[data-tutorial='timeline']", type: "explain",
    title: "Timeline & Zeitblöcke",
    body: "Doppelklick auf die Zeitachse um einen Block zu erstellen. Oder oben rechts auf '+ BLOCK' klicken. Gib dem Block einen Namen und speichere ihn.",
    position: "right", blockClicks: false,
  },
  {
    id: "planner-drop", route: "planner", selector: "[data-tutorial='planner-block-form']", type: "do",
    waitFor: "block-created",
    title: "Ersten Zeitblock anlegen",
    body: "Das Formular ist offen. Gib deinem Block einen Namen, passe die Zeit an — und klick auf Speichern.",
    hint: "Name eingeben → Speichern klicken.", position: "right", blockClicks: false,
  },
  {
    id: "done", route: null, selector: null, type: "celebrate", position: "center", blockClicks: false,
  },
];

// ─── Spotlight ────────────────────────────────────────────────────────────────
function TutSpotlight({ selector }) {
  const [rect, setRect] = React.useState(null);
  React.useEffect(() => {
    if (!selector) { setRect(null); return; }
    let running = true;
    const measure = () => {
      if (!running) return;
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else { setRect(null); }
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const iv = setInterval(measure, 400);
    return () => { running = false; window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); clearInterval(iv); };
  }, [selector]);

  if (!rect) return null;
  const PAD = 10;
  return (
    <div style={{
      position: "fixed",
      left: rect.left - PAD, top: rect.top - PAD,
      width: rect.width + PAD * 2, height: rect.height + PAD * 2,
      boxShadow: "0 0 0 9999px rgba(0,0,0,0.82)",
      borderRadius: 10,
      border: "2px solid rgba(139,92,246,0.6)",
      zIndex: 9994, pointerEvents: "none",
      transition: "left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease",
    }} />
  );
}

// ─── Card position ────────────────────────────────────────────────────────────
function cardPos(position, selector) {
  const W = 330, MARGIN = 20;
  const base = {
    position: "fixed", width: W, zIndex: 9998,
    background: "#16161e", border: "1px solid rgba(139,92,246,0.35)",
    borderRadius: 14, padding: "24px 24px 20px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(139,92,246,0.1)",
  };
  if (position === "center")      return { ...base, left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
  if (position === "corner")      return { ...base, right: 24, bottom: 80, width: 320 };
  if (position === "corner-left") return { ...base, left: 24, bottom: 80, width: 310 };
  const el = selector ? document.querySelector(selector) : null;
  const r = el ? el.getBoundingClientRect() : null;
  if (!r) return { ...base, left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
  const midY = Math.max(20, Math.min(window.innerHeight - 320, r.top + r.height / 2 - 120));
  if (position === "right") return { ...base, left: Math.min(r.right + 20, window.innerWidth - W - 10), top: midY };
  if (position === "left")  return { ...base, left: Math.max(10, r.left - W - 20), top: midY };
  const midX = Math.max(10, Math.min(window.innerWidth - W - 10, r.left + r.width / 2 - W / 2));
  if (position === "top")    return { ...base, left: midX, top: Math.max(10, r.top - 280) };
  if (position === "bottom") return { ...base, left: midX, top: r.bottom + 20 };
  return { ...base, left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function TutProgress({ idx, total }) {
  const nonCelebrate = total - 1;
  const pct = Math.min(1, idx / nonCelebrate);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-faint)" }}>
          TUTORIAL
        </span>
        <span style={{ fontSize: 9.5, color: "var(--text-faint)" }}>{idx + 1} / {nonCelebrate}</span>
      </div>
      <div style={{ height: 3, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ─── Celebrate Screen ─────────────────────────────────────────────────────────
function TutCelebrate({ onDone }) {
  const items = [
    { icon: "✓", label: "Ersten Task abgehakt" },
    { icon: "🎯", label: "Ersten OKR-Plan mit dem Wizard erstellt" },
    { icon: "🔥", label: "Ersten Behavior Streak gestartet" },
    { icon: "📅", label: "Ersten Zeitblock geplant" },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#16161e", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 18, padding: "48px 52px", maxWidth: 460, width: "90%", textAlign: "center", boxShadow: "0 32px 80px rgba(0,0,0,0.85)" }}>
        <div style={{ fontSize: 52, marginBottom: 18 }}>🎯</div>
        <div style={{ fontSize: 23, fontWeight: 800, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.02em" }}>Life OS gehört dir.</div>
        <div style={{ fontSize: 13.5, color: "var(--text-dim)", marginBottom: 32, lineHeight: 1.65 }}>
          Du hast alles kennengelernt — und dein System ist nicht mehr leer.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
          {items.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--panel)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "12px 16px", textAlign: "left" }}>
              <div style={{ fontSize: 17, width: 26, textAlign: "center" }}>{a.icon}</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500 }}>{a.label}</div>
              <div style={{ marginLeft: "auto", color: "var(--good)", fontSize: 12, fontWeight: 700 }}>✓</div>
            </div>
          ))}
        </div>
        <button onClick={onDone} style={{
          background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8,
          padding: "14px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%",
        }}>Los geht's →</button>
      </div>
    </div>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────
function TutCard({ step, idx, total, onNext, onSkip }) {
  const [style, setStyle] = React.useState(() => cardPos(step.position, step.selector));
  React.useEffect(() => {
    const upd = () => setStyle(cardPos(step.position, step.selector));
    upd();
    const id = setInterval(upd, 150);
    return () => clearInterval(id);
  }, [step]);

  return (
    <div id="tutorial-info-card" style={style}>
      <TutProgress idx={idx} total={total} />
      {step.type === "do" && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", animation: "tutDot 1.4s ease-in-out infinite" }} />
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.18em", color: "var(--accent)" }}>AKTION ERFORDERLICH</span>
        </div>
      )}
      <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>{step.title}</div>
      <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.65, marginBottom: step.hint ? 14 : 20 }}>{typeof step.body === "function" ? step.body() : step.body}</div>
      {step.hint && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 20 }}>
          <span style={{ fontSize: 14, marginTop: 1 }}>👆</span>
          <span style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>{step.hint}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {step.type === "explain" ? (
          <button onClick={onNext} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 7, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {step.nextLabel || "Weiter →"}
          </button>
        ) : (
          <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontStyle: "italic" }}>Führe die Aktion aus…</span>
        )}
        <button onClick={onSkip} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 11.5, cursor: "pointer", padding: "4px 8px" }}>
          Überspringen
        </button>
      </div>
      <style>{`
        @keyframes tutDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(1.6)} }
      `}</style>
    </div>
  );
}

// ─── Tutorial Manager ─────────────────────────────────────────────────────────
function TutorialManager({ onDone, setRoute, setPov }) {
  const [idx, setIdx] = React.useState(0);
  const step = TUT_STEPS[idx];

  const advance = React.useCallback(() => {
    const next = idx + 1;
    if (next >= TUT_STEPS.length) { onDone(); return; }
    setIdx(next);
  }, [idx, onDone]);

  // Register global hook
  React.useEffect(() => {
    window.TUTORIAL = {
      active: true,
      onAction: (actionId) => {
        // Use functional update to always have current idx
        setIdx(cur => {
          const s = TUT_STEPS[cur];
          if (s && s.type === "do" && s.waitFor === actionId) return cur + 1;
          return cur;
        });
      },
      getPrefill: getTutorialPrefill,
    };
    return () => { if (window.TUTORIAL) window.TUTORIAL.active = false; };
  }, []); // register once; onAction uses setIdx functional form so it doesn't need idx

  // Force route + pov when step changes
  React.useEffect(() => {
    if (step && step.route && setRoute) setRoute(step.route);
    if (step && step.forcePov && setPov) setPov(step.forcePov);
  }, [step && step.id]);

  // Global click blocking for ALL steps — only card + current target + wizard are allowed
  React.useEffect(() => {
    if (!step) return;
    if (step.type === "celebrate") return; // celebrate screen handles its own clicks
    const sel = step.selector;
    const block = (e) => {
      const card = document.getElementById("tutorial-info-card");
      if (card && card.contains(e.target)) return;
      if (sel) {
        const target = document.querySelector(sel);
        if (target && target.contains(e.target)) return;
      }
      const wizard = document.querySelector("[data-tutorial='wizard-container']");
      if (wizard && wizard.contains(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    document.addEventListener("mousedown", block, true);
    document.addEventListener("click", block, true);
    return () => {
      document.removeEventListener("mousedown", block, true);
      document.removeEventListener("click", block, true);
    };
  }, [step && step.id]);

  if (!step) return null;
  if (step.type === "celebrate") return <TutCelebrate onDone={onDone} />;

  return (
    <>
      {!step.noSpotlight && <TutSpotlight selector={step.selector} />}
      <TutCard step={step} idx={idx} total={TUT_STEPS.length} onNext={advance} onSkip={onDone} />
    </>
  );
}

window.TutorialManager       = TutorialManager;
window.injectTutorialSeedData = injectTutorialSeedData;
