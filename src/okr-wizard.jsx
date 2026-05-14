// OKR Wizard v2 — Full guided OKR generation flow
// Steps: Kontext → Motivation → Zeitrahmen → Ziel → Optionen → Generate → Review

const OKR_MOTIVATION_TYPES = [
  { id: "income",      label: "💰 Einkommen",    desc: "Mehr verdienen" },
  { id: "growth",      label: "🚀 Wachstum",     desc: "Schneller skalieren" },
  { id: "recognition", label: "🏆 Anerkennung",  desc: "Respekt & Status" },
  { id: "learning",    label: "🧠 Lernen",       desc: "Neues Wissen" },
  { id: "freedom",     label: "🕊 Freiheit",     desc: "Zeit & Ort" },
  { id: "impact",      label: "⚡ Impact",       desc: "Etwas bewegen" },
  { id: "security",    label: "🔒 Sicherheit",   desc: "Stabilität" },
  { id: "proof",       label: "🎯 Beweis",       desc: "Sich beweisen" },
  { id: "fun",         label: "😊 Spaß",         desc: "Weil es Freude macht" },
];

const OKR_OBSTACLES = [
  { id: "time",         label: "⏰ Keine Zeit",     prompt: "Zeitmangel" },
  { id: "money",        label: "💸 Kein Geld",      prompt: "Geldmangel" },
  { id: "knowledge",    label: "🤷 Kein Wissen",    prompt: "fehlendes Wissen" },
  { id: "discipline",   label: "😴 Disziplin",      prompt: "mangelnde Disziplin" },
  { id: "dependencies", label: "👥 Abhängigkeiten", prompt: "externe Abhängigkeiten" },
  { id: "unclear",      label: "🌀 Unklarheit",     prompt: "Unklarheit über den Weg" },
];

const OKR_COMPLEXITY = [
  { id: "simple",  label: "Fokus",    desc: "1 Objective · 3 KRs · ~9 Tasks",      color: "#10b981" },
  { id: "medium",  label: "Standard", desc: "2 Objectives · 4 KRs je · ~20 Tasks", color: "#2f8bff" },
  { id: "complex", label: "Intensiv", desc: "3–4 Objectives · 5–6 KRs · 30+ Tasks", color: "#8b5cf6" },
];

const PARKINSON_HINTS = {
  2:  { level: "good",   msg: "Extremer Druck — nur das Allerwichtigste schafft es durch. Perfekt für Sprint-Projekte." },
  4:  { level: "good",   msg: "Parkinson's Law aktiv — perfekter Druck für maximale Fokussierung ohne Burnout." },
  6:  { level: "good",   msg: "Sweet Spot: genug Zeit für Qualität, zu wenig für endloses Aufschieben." },
  12: { level: "warn",   msg: "3 Monate sind lang. Das Gehirn sieht es als 'irgendwann'. Der Wizard teilt es in Meilensteine." },
  24: { level: "danger", msg: "6 Monate: hohes Prokrastinationsrisiko. Setze harte monatliche Milestones — sonst verpufft die Energie nach Woche 3." },
};

// ─── Speech-to-Text Mic Button ──────────────────────────────────────────────
function MicButton({ onTranscript, lang = "de-DE", style }) {
  const [listening, setListening] = React.useState(false);
  const recRef = React.useRef(null);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = Array.from(e.results)
        .filter(r => r.isFinal)
        .map(r => r[0].transcript)
        .join(" ");
      if (t) onTranscript(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "Aufnahme stoppen" : "Diktieren (de)"}
      style={{
        background: listening ? "rgba(214,50,74,0.15)" : "var(--panel-2)",
        border: `1px solid ${listening ? "var(--danger)" : "var(--line)"}`,
        color: listening ? "var(--danger)" : "var(--text-faint)",
        padding: "6px 10px", cursor: "pointer", fontSize: 16, lineHeight: 1,
        transition: "all .15s", flexShrink: 0,
        ...style,
      }}
    >{listening ? "⏹" : "🎙"}</button>
  );
}

function addWeeks(weeks) {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

function weeksLabel(w) {
  if (w === 2) return "2 Wochen";
  if (w === 4) return "4 Wochen";
  if (w === 6) return "6 Wochen";
  if (w === 12) return "3 Monate";
  if (w === 24) return "6 Monate";
  return `${w} Wochen`;
}

// ─── Main Wizard ────────────────────────────────────────────────────────────

function OKRWizard({ onClose, onSave, defaultPov, customProjects, initialDraft }) {
  const STEPS = [
    { id: "mode",      phase: "KONTEXT",    title: "Wie möchtest du starten?" },
    { id: "project",   phase: "KONTEXT",    title: "Dein Projekt" },
    { id: "goal",      phase: "KONTEXT",    title: "Was genau willst du erreichen?" },
    { id: "why",       phase: "MOTIVATION", title: "Der echte Grund dahinter" },
    { id: "drivers",   phase: "MOTIVATION", title: "Was treibt dich an?" },
    { id: "deadline",  phase: "ZEITRAHMEN", title: "Bis wann — Parkinson's Law" },
    { id: "budget",    phase: "ZEITRAHMEN", title: "Wieviel Zeit pro Woche?" },
    { id: "success",   phase: "ZIEL",       title: "Was bedeutet Erfolg?" },
    { id: "obstacles", phase: "ZIEL",       title: "Was könnte dich stoppen?" },
    { id: "options",   phase: "OPTIONEN",   title: "Detailgrad & Einstellungen" },
  ];
  const PHASE_COLORS = {
    KONTEXT: "#8b5cf6", MOTIVATION: "#2f8bff", ZEITRAHMEN: "#d4a23c",
    ZIEL: "#10b981", OPTIONEN: "#ec4899",
  };

  const allPovs = React.useMemo(() => {
    try {
      const custom = JSON.parse(LS.getItem("lifeos_user_povs") || "[]");
      // Only show Personal + user's own custom POVs — not all hardcoded defaults
      const personal = POVS.find(p => p.id === "personal") || { id: "personal", label: "Personal", color: "var(--personal)" };
      return [personal, ...custom];
    } catch { return [POVS[0]]; }
  }, []);

  const [step, setStep] = React.useState(initialDraft ? 1 : 0);
  const [d, setD] = React.useState({
    mode: null, existingProjectId: null,
    pov: defaultPov || (allPovs[0] ? allPovs[0].id : "personal"),
    projectName: "", bigGoal: "", why1: "", why2: "",
    motivationTypes: [], deadlineWeeks: null, hoursPerWeek: 8,
    successDefinition: "", obstacles: [], obstacleCustom: "",
    implementationIntention: "", complexity: "medium",
    generateTodos: true, generateSubtasks: false,
    ...(initialDraft || {}),
  });
  const upd = (k, v) => setD(p => ({ ...p, [k]: v }));
  const toggleArr = (k, v) => setD(p => ({
    ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v],
  }));

  const [phase, setPhase] = React.useState("wizard"); // wizard | generating | review
  const [genLog, setGenLog] = React.useState([]);
  const [genError, setGenError] = React.useState(null);
  const [genAiPending, setGenAiPending] = React.useState(false);
  const [editResult, setEditResult] = React.useState(null);

  const totalHours = (d.deadlineWeeks || 6) * d.hoursPerWeek;

  const canNext = () => {
    switch (step) {
      case 0: return !!d.mode;
      case 1: return d.mode === "existing" ? !!d.existingProjectId : (!!d.pov && d.projectName.trim().length > 0);
      case 2: return d.bigGoal.trim().length > 10;
      case 3: return d.why1.trim().length > 3;
      case 4: return d.motivationTypes.length > 0;
      case 5: return !!d.deadlineWeeks;
      case 6: return d.hoursPerWeek >= 1;
      case 7: return d.successDefinition.trim().length > 5;
      case 8: return d.obstacles.length > 0 || d.obstacleCustom.trim().length > 0;
      default: return true;
    }
  };

  const goNext = () => step < STEPS.length - 1 ? setStep(s => s + 1) : startGeneration();

  const startGeneration = async () => {
    // Free-tier limit: 1 OKR generation
    if (window.checkFreeLimit && !window.checkFreeLimit("okr_gen")) {
      window.triggerUpgrade?.("okr_gen");
      return;
    }
    setPhase("generating");
    setGenLog([]);
    setGenError(null);
    const logItems = [
      "Analysiere Motivation und Antrieb...",
      "Berechne Zeitbudget nach Parkinson's Law...",
      "Formuliere Objective aus Erfolgsdefinition...",
      `Generiere ${d.complexity === "complex" ? "3–4" : d.complexity === "medium" ? "2" : "1"} Objective${d.complexity !== "simple" ? "s" : ""} mit Key Results...`,
      d.generateTodos ? "Erstelle konkrete Tasks pro Key Result..." : null,
      d.generateSubtasks ? "Generiere Subtasks für maximale Klarheit..." : null,
      "Integriere WOOP-Hindernisplanung...",
      "Verankere Implementation Intention...",
      "Finalisiere Parkinson-konforme Struktur...",
    ].filter(Boolean);

    for (let i = 0; i < logItems.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      setGenLog(prev => [...prev, logItems[i]]);
    }
    setGenAiPending(true);
    try {
      const result = await window.AI.generateOKRProject(d);
      setGenAiPending(false);
      setEditResult(JSON.parse(JSON.stringify(result)));
      setPhase("review");
    } catch (e) {
      setGenAiPending(false);
      setGenError(e.code === "NO_KEY"
        ? "Kein API Key — bitte in ⚙ Einstellungen eintragen."
        : (e.message || "Fehler. Bitte erneut versuchen."));
    }
  };

  const handleSave = (result) => {
    const project = {
      id: d.mode === "existing" ? d.existingProjectId : `custom_proj_${Date.now()}`,
      pov: d.pov,
      label: d.pov.toUpperCase(),
      title: result.projectName,
      realityH: 0, planH: totalHours, completion: 0,
      status: { kind: "active", label: "AKTIV" },
      progress: 0,
      startDate: new Date().toISOString().split("T")[0],
      ...(d.deadlineWeeks ? { deadline: addWeeks(d.deadlineWeeks) } : {}),
      objectives: (result.objectives || []).map((obj, oi) => ({
        id: obj.id || `obj_${Date.now()}_${oi}`,
        title: obj.title,
        period: obj.period || "",
        krs: (obj.keyResults || []).map((kr, ki) => ({
          id: `${obj.id || `obj${oi}`}_kr${ki + 1}`,
          label: kr.label || `KR${ki + 1}`,
          title: kr.title,
          progress: 0, status: "active",
          tasks: (kr.tasks || []).map((t, ti) => ({
            id: `kt_${Date.now()}_${oi}_${ki}_${ti}`,
            title: t.title, sub: t.sub || "",
            kr: kr.label || `KR${ki + 1}`,
            est: t.est || 30, flow: t.flow || "FLOW",
            elapsed: 0, subtasks: t.subtasks || [],
          })),
        })),
      })),
      sideQuests: [], custom: true,
      _wizardMeta: {
        firstDomino: result.firstDomino,
        weeklyFocus: result.weeklyFocus,
        implementationIntention: d.implementationIntention,
      },
    };
    onSave(project, d.mode);
    onClose();
  };

  // ── Generation screen ──
  if (phase === "generating") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 520, background: "var(--panel)", border: "1px solid var(--line)", padding: "48px 44px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.24em", fontWeight: 700, color: "var(--accent)", marginBottom: 18 }}>OKR WIZARD · GENERIERT</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 36, lineHeight: 1.15 }}>
            Erstelle deinen<br />präzisen Projektplan…
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {genLog.map((msg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                <span style={{ color: "var(--good)", fontSize: 17, lineHeight: 1, flexShrink: 0 }}>✓</span>
                <span style={{ color: "var(--text)" }}>{msg}</span>
              </div>
            ))}
            {!genError && !genAiPending && genLog.length < 9 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--text-faint)" }}>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "okr-spin 0.7s linear infinite", flexShrink: 0 }} />
                Analysiert…
              </div>
            )}
          </div>
          {genAiPending && !genError && (
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              <span style={{ display: "inline-block", width: 48, height: 48, border: "4px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "okr-spin 0.9s linear infinite" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.06em", marginBottom: 4 }}>Wizard generiert deinen Projektplan…</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Das kann 15–30 Sekunden dauern. Je komplexer, desto präziser.</div>
              </div>
            </div>
          )}
          {genError && (
            <div style={{ marginTop: 28, padding: "14px 16px", background: "var(--danger-soft)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: 12.5, lineHeight: 1.5 }}>
              {genError}
              <button onClick={() => { setPhase("wizard"); setStep(STEPS.length - 1); }} style={{
                display: "block", marginTop: 12, background: "transparent",
                border: "1px solid var(--danger)", color: "var(--danger)",
                padding: "7px 16px", cursor: "pointer", fontSize: 11, fontFamily: "inherit",
              }}>← ZURÜCK ZU DEN EINSTELLUNGEN</button>
            </div>
          )}
        </div>
        <style>{`@keyframes okr-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Review screen ──
  if (phase === "review" && editResult) {
    return (
      <OKRReview
        result={editResult}
        setResult={setEditResult}
        wizardData={d}
        totalHours={totalHours}
        onBack={() => { setPhase("wizard"); setStep(STEPS.length - 1); }}
        onSave={handleSave}
        onClose={onClose}
      />
    );
  }

  // ── Wizard steps ──
  const cur = STEPS[step];
  const phaseColor = PHASE_COLORS[cur.phase] || "var(--accent)";
  const pct = (step / (STEPS.length - 1)) * 100;

  return (
    <div data-tutorial="wizard-container" style={{
      position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ width: 720, maxHeight: "93vh", background: "var(--bg)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 28px 14px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 9, letterSpacing: "0.22em", fontWeight: 700, color: phaseColor, padding: "3px 10px", border: `1px solid ${phaseColor}50` }}>{cur.phase}</span>
              <span style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.08em" }}>SCHRITT {step + 1} / {STEPS.length}</span>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 20, padding: 0, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ height: 3, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, background: phaseColor, width: `${pct}%`, transition: "width .3s ease" }} />
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 4, borderRadius: 2,
                width: i <= step ? 20 : 6,
                background: i < step ? "var(--good)" : i === step ? phaseColor : "var(--line)",
                transition: "all .2s",
              }} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 24px", lineHeight: 1.2 }}>{cur.title}</h2>
          <WizardStep step={step} d={d} upd={upd} toggleArr={toggleArr} phaseColor={phaseColor} totalHours={totalHours} customProjects={customProjects} allPovs={allPovs} />
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()} style={{
            padding: "10px 20px", background: "transparent", border: "1px solid var(--line)",
            color: "var(--text-faint)", fontSize: 11, letterSpacing: "0.14em", fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>{step === 0 ? "ABBRECHEN" : "← ZURÜCK"}</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {step === STEPS.length - 1 && (
              <span style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                Alles bereit — Wizard generiert deinen Plan
              </span>
            )}
            <button onClick={goNext} disabled={!canNext()} style={{
              padding: "10px 28px",
              background: canNext() ? phaseColor : "var(--panel-2)",
              color: canNext() ? "#0a0a0c" : "var(--text-faint)",
              border: "none", fontSize: 11, letterSpacing: "0.18em", fontWeight: 700,
              cursor: canNext() ? "pointer" : "default", fontFamily: "inherit", transition: "all .15s",
            }}>
              {step === STEPS.length - 1 ? "⚡ GENERIEREN" : "WEITER →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step renderer ───────────────────────────────────────────────────────────

function WizardStep({ step, d, upd, toggleArr, phaseColor, totalHours, customProjects, allPovs }) {
  allPovs = allPovs || POVS || [];
  const inp = {
    width: "100%", background: "var(--panel)", border: "1px solid var(--line)",
    color: "var(--text)", padding: "12px 16px", fontSize: 14, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.5,
  };

  switch (step) {
    // ── Step 0: Mode ──
    case 0:
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { id: "new",      icon: "✦", title: "Neues Projekt", sub: "Von Grund auf neu — Projektnamen, Objectives und KRs werden komplett generiert." },
            { id: "existing", icon: "↗", title: "Bestehendes erweitern", sub: "Wähle ein vorhandenes Projekt und füge neue Objectives und KRs hinzu." },
          ].map(opt => (
            <button key={opt.id} onClick={() => upd("mode", opt.id)} style={{
              textAlign: "left", padding: "28px 22px", cursor: "pointer", fontFamily: "inherit",
              background: d.mode === opt.id ? `${phaseColor}18` : "var(--panel)",
              border: `2px solid ${d.mode === opt.id ? phaseColor : "var(--line)"}`,
              transition: "all .15s",
            }}>
              <div style={{ fontSize: 32, marginBottom: 14, lineHeight: 1 }}>{opt.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: d.mode === opt.id ? phaseColor : "var(--text)" }}>{opt.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.6 }}>{opt.sub}</div>
            </button>
          ))}
        </div>
      );

    // ── Step 1: Project ──
    case 1:
      if (d.mode === "existing") {
        const list = (customProjects || []);
        return (
          <div>
            <div className="uppercase-label" style={{ marginBottom: 10 }}>Projekt auswählen</div>
            {list.length === 0
              ? <div style={{ padding: "28px", color: "var(--text-faint)", border: "1px solid var(--line)", textAlign: "center", fontSize: 13 }}>Noch keine eigenen Projekte vorhanden.</div>
              : list.map(p => (
                <button key={p.id} onClick={() => { upd("existingProjectId", p.id); upd("pov", p.pov); upd("projectName", p.title); }} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "14px 18px",
                  marginBottom: 8, cursor: "pointer", fontFamily: "inherit",
                  background: d.existingProjectId === p.id ? `${phaseColor}15` : "var(--panel)",
                  border: `1px solid ${d.existingProjectId === p.id ? phaseColor : "var(--line)"}`,
                }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.title}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 3 }}>{p.pov}</div>
                </button>
              ))
            }
          </div>
        );
      }
      return (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div className="uppercase-label" style={{ marginBottom: 8 }}>POV</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allPovs.map(p => (
                <button key={p.id} onClick={() => upd("pov", p.id)} style={{
                  padding: "8px 18px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${d.pov === p.id ? p.color : "var(--line)"}`,
                  color: d.pov === p.id ? p.color : "var(--text-faint)",
                  background: "transparent", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.14em",
                }}>{p.label.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="uppercase-label" style={{ marginBottom: 8 }}>Projektname</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input autoFocus value={d.projectName} onChange={e => upd("projectName", e.target.value)}
                placeholder="z.B. Immobilienvertrieb Mastery, Uni Q3, Bodybuilding-Wettkampf…"
                style={{ ...inp, flex: 1 }} />
              <MicButton onTranscript={t => upd("projectName", t.trim())} />
            </div>
          </div>
        </div>
      );

    // ── Step 2: Big goal ──
    case 2:
      return (
        <div>
          <div style={{ position: "relative" }}>
            <textarea autoFocus value={d.bigGoal} onChange={e => upd("bigGoal", e.target.value)}
              placeholder="Schreib so, als würdest du einem Freund erklären was du dir in ein paar Monaten wünschst. Kein Druck — einfach ehrlich."
              rows={5} style={{ ...inp, resize: "none", paddingRight: 50 }} />
            <MicButton onTranscript={t => upd("bigGoal", d.bigGoal ? d.bigGoal + " " + t : t)}
              style={{ position: "absolute", top: 10, right: 10 }} />
          </div>
          <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.7, padding: "12px 16px", background: "var(--panel)", border: "1px solid var(--line-soft)" }}>
            💡 <strong style={{ color: "var(--text-dim)" }}>Tipp:</strong> Je konkreter du schreibst, desto präziser werden deine Key Results. Statt "mehr Geld" lieber "meine erste Provision verdient und X€ auf dem Konto."
          </div>
        </div>
      );

    // ── Step 3: Why ──
    case 3:
      return (
        <div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginBottom: 14, lineHeight: 1.7 }}>
              Das "Warum" ist dein Kraftstoff. Wenn es klar ist, überwindest du auch schlechte Tage. Nicht die Version die gut klingt — die echte.
            </div>
            <div className="uppercase-label" style={{ marginBottom: 8 }}>Warum ist dieses Projekt wichtig für dich?</div>
            <div style={{ position: "relative" }}>
              <textarea autoFocus value={d.why1} onChange={e => upd("why1", e.target.value)}
                placeholder="Sei ehrlich…" rows={3} style={{ ...inp, resize: "none", paddingRight: 50 }} />
              <MicButton onTranscript={t => upd("why1", d.why1 ? d.why1 + " " + t : t)}
                style={{ position: "absolute", top: 10, right: 10 }} />
            </div>
          </div>
          {d.why1.trim().length > 5 && (
            <div>
              <div className="uppercase-label" style={{ marginBottom: 8, color: phaseColor }}>Und warum ist <em>das</em> wichtig? (eine Ebene tiefer)</div>
              <div style={{ position: "relative" }}>
                <textarea value={d.why2} onChange={e => upd("why2", e.target.value)}
                  placeholder="Oft ist die Antwort auf diese Frage der eigentliche Antrieb…" rows={3}
                  style={{ ...inp, resize: "none", paddingRight: 50 }} />
                <MicButton onTranscript={t => upd("why2", d.why2 ? d.why2 + " " + t : t)}
                  style={{ position: "absolute", top: 10, right: 10 }} />
              </div>
              <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--text-faint)", lineHeight: 1.6 }}>
                ✦ <strong>5-Whys-Methode</strong> (Toyota): Das zweite Warum deckt den echten Antrieb auf. Der Wizard nutzt beide Ebenen für präzisere Formulierungen.
              </div>
            </div>
          )}
        </div>
      );

    // ── Step 4: Motivation drivers ──
    case 4:
      return (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginBottom: 20, lineHeight: 1.6 }}>
            Wähle alle die zutreffen. Der Wizard formuliert KRs die dich wirklich motivieren — nicht generische Ziele die sich nach Hausaufgaben anfühlen.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {OKR_MOTIVATION_TYPES.map(m => {
              const on = d.motivationTypes.includes(m.id);
              return (
                <button key={m.id} onClick={() => toggleArr("motivationTypes", m.id)} style={{
                  padding: "14px 12px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  background: on ? `${phaseColor}18` : "var(--panel)",
                  border: `1px solid ${on ? phaseColor : "var(--line)"}`,
                  transition: "all .15s",
                }}>
                  <div style={{ fontSize: 16, marginBottom: 5, color: on ? phaseColor : "var(--text)", fontWeight: on ? 700 : 500 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{m.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      );

    // ── Step 5: Deadline ──
    case 5: {
      const hint = PARKINSON_HINTS[d.deadlineWeeks];
      return (
        <div>
          <div style={{ marginBottom: 20, padding: "14px 18px", background: "var(--panel)", border: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-faint)", lineHeight: 1.8 }}>
            <strong style={{ color: "var(--warn)", letterSpacing: "0.06em" }}>PARKINSON'S LAW:</strong> Arbeit dehnt sich aus um die Zeit zu füllen die ihr zur Verfügung steht. Eine enge Deadline ist kein Stress — sie ist der einzige Schutz vor endlosem "Ich fange nächste Woche an."
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {[{w:2,l:"2 WOCHEN"},{w:4,l:"4 WOCHEN"},{w:6,l:"6 WOCHEN"},{w:12,l:"3 MONATE"},{w:24,l:"6 MONATE"}].map(opt => (
              <button key={opt.w} onClick={() => upd("deadlineWeeks", opt.w)} style={{
                padding: "12px 22px", cursor: "pointer", fontFamily: "inherit",
                background: d.deadlineWeeks === opt.w ? phaseColor : "var(--panel)",
                color: d.deadlineWeeks === opt.w ? "#0a0a0c" : "var(--text-faint)",
                border: `1px solid ${d.deadlineWeeks === opt.w ? phaseColor : "var(--line)"}`,
                fontWeight: 700, fontSize: 11, letterSpacing: "0.14em",
              }}>{opt.l}</button>
            ))}
          </div>
          {hint && (
            <div style={{
              padding: "12px 16px", fontSize: 12.5, lineHeight: 1.5, marginBottom: 14,
              background: hint.level === "good" ? "var(--good-soft)" : hint.level === "warn" ? "var(--warn-soft)" : "var(--danger-soft)",
              border: `1px solid ${hint.level === "good" ? "var(--good)" : hint.level === "warn" ? "var(--warn)" : "var(--danger)"}`,
              color: hint.level === "good" ? "var(--good)" : hint.level === "warn" ? "var(--warn)" : "var(--danger)",
            }}>
              {hint.level === "good" ? "✓" : "⚠"} {hint.msg}
            </div>
          )}
          {d.deadlineWeeks && (
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
              Zieldatum: <strong style={{ color: "var(--text)" }}>{new Date(addWeeks(d.deadlineWeeks)).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</strong>
            </div>
          )}
        </div>
      );
    }

    // ── Step 6: Budget ──
    case 6: {
      const budget = d.deadlineWeeks ? d.deadlineWeeks * d.hoursPerWeek : d.hoursPerWeek * 6;
      const moodLabel = budget < 20 ? "Sehr fokussiert" : budget < 60 ? "Realistisch" : budget < 120 ? "Intensiv" : "Fulltime";
      return (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginBottom: 24, lineHeight: 1.6 }}>
            Sei ehrlich — nicht wie viel du dir wünschst, sondern wie viel du <em>wirklich</em> investieren wirst. Der Wizard passt die Anzahl der Tasks und KRs genau diesem Budget an.
          </div>
          <div className="uppercase-label" style={{ marginBottom: 10 }}>Stunden pro Woche (realistisch)</div>
          <input type="range" min={1} max={40} step={1} value={d.hoursPerWeek}
            onChange={e => upd("hoursPerWeek", Number(e.target.value))}
            style={{ width: "100%", accentColor: phaseColor, cursor: "pointer", marginBottom: 12 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
            <span className="mono" style={{ fontSize: 42, fontWeight: 800, color: phaseColor, lineHeight: 1 }}>{d.hoursPerWeek}h</span>
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>pro Woche</span>
          </div>
          {d.deadlineWeeks && (
            <div style={{ padding: "16px 20px", background: "var(--panel)", border: "1px solid var(--line-soft)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              <div>
                <div className="uppercase-label" style={{ marginBottom: 5 }}>Gesamtbudget</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{budget}h</div>
              </div>
              <div>
                <div className="uppercase-label" style={{ marginBottom: 5 }}>Zeitraum</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{weeksLabel(d.deadlineWeeks)}</div>
              </div>
              <div>
                <div className="uppercase-label" style={{ marginBottom: 5 }}>Modus</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: phaseColor, marginTop: 6 }}>{moodLabel}</div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── Step 7: Success definition ──
    case 7:
      return (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginBottom: 20, lineHeight: 1.7 }}>
            Stell dir vor du bist am Tag der Deadline und schaust zufrieden zurück. Was ist passiert? Der Wizard entwickelt daraus deine Objectives — sei so konkret wie möglich.
          </div>
          <div style={{ position: "relative" }}>
            <textarea autoFocus value={d.successDefinition} onChange={e => upd("successDefinition", e.target.value)}
              placeholder='"Ich habe meine erste Immobilienprovision verdient und den vollständigen Vertriebsprozess von Opening bis Close beherrscht."'
              rows={4} style={{ ...inp, resize: "none", paddingRight: 50 }} />
            <MicButton onTranscript={t => upd("successDefinition", d.successDefinition ? d.successDefinition + " " + t : t)}
              style={{ position: "absolute", top: 10, right: 10 }} />
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-faint)", lineHeight: 1.6, padding: "10px 14px", background: "var(--panel)", border: "1px solid var(--line-soft)" }}>
            ✦ <strong style={{ color: "var(--text-dim)" }}>Tipp:</strong> Zahlen, Ergebnisse und Zustände machen bessere Objectives als Absichten. "Ich habe X erreicht" statt "Ich möchte X erreichen".
          </div>
        </div>
      );

    // ── Step 8: Obstacles ──
    case 8: {
      const allObs = [...d.obstacles, ...(d.obstacleCustom.trim() ? ["custom"] : [])];
      const allPrompts = [
        ...d.obstacles.map(id => OKR_OBSTACLES.find(o => o.id === id)?.prompt || id),
        ...(d.obstacleCustom.trim() ? [d.obstacleCustom.trim()] : []),
      ].filter(Boolean);
      const joinDE = (arr) => arr.length === 0 ? "dein Hindernis" : arr.length === 1 ? arr[0] : arr.length === 2 ? `${arr[0]} und ${arr[1]}` : `${arr.slice(0, -1).join(", ")} und ${arr[arr.length - 1]}`;
      const fullPrompt = joinDE(allPrompts);
      const verb = allPrompts.length > 1 ? "passieren" : "passiert";
      return (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginBottom: 20, lineHeight: 1.6 }}>
            <strong style={{ color: "var(--warn)" }}>WOOP-Methode:</strong> Wer Hindernisse im Voraus plant, erreicht Ziele 2–3× häufiger (Oettingen, NYU). Was wird dich aufhalten?
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {OKR_OBSTACLES.map(o => {
              const on = d.obstacles.includes(o.id);
              return (
                <button key={o.id} onClick={() => toggleArr("obstacles", o.id)} style={{
                  padding: "13px 16px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  background: on ? `${phaseColor}18` : "var(--panel)",
                  border: `1px solid ${on ? phaseColor : "var(--line)"}`,
                  fontSize: 13, fontWeight: on ? 700 : 400,
                  color: on ? "var(--text)" : "var(--text-faint)",
                }}>{o.label}</button>
              );
            })}
          </div>
          <input value={d.obstacleCustom} onChange={e => upd("obstacleCustom", e.target.value)}
            placeholder="Eigenes Hindernis eingeben…" style={{ ...inp, marginBottom: 18 }} />
          {allObs.length > 0 && (
            <div style={{ padding: "16px 18px", background: "var(--panel)", border: `1px solid ${phaseColor}50`, borderLeft: `3px solid ${phaseColor}` }}>
              <div className="uppercase-label" style={{ marginBottom: 8, color: phaseColor }}>Implementation Intention</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 10, lineHeight: 1.6 }}>
                "Wenn <strong style={{ color: "var(--text)" }}>{fullPrompt}</strong> {verb}, werde ich…"
              </div>
              <div style={{ position: "relative" }}>
                <textarea value={d.implementationIntention} onChange={e => upd("implementationIntention", e.target.value)}
                  placeholder="…konkret beschreiben was ich dann tue. z.B. 'sofort den nächsten Schritt ausführen und Termin fixieren.'"
                  rows={2} style={{ ...inp, resize: "none", paddingRight: 50 }} />
                <MicButton onTranscript={t => upd("implementationIntention", d.implementationIntention ? d.implementationIntention + " " + t : t)}
                  style={{ position: "absolute", top: 10, right: 10 }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 8 }}>✦ Gollwitzer 1999: If-Then-Pläne erhöhen Zielerreichung um 200–300%</div>
            </div>
          )}
        </div>
      );
    }

    // ── Step 9: Options ──
    case 9: {
      const budget = d.deadlineWeeks ? d.deadlineWeeks * d.hoursPerWeek : d.hoursPerWeek * 6;
      return (
        <div>
          <div style={{ marginBottom: 24 }}>
            <div className="uppercase-label" style={{ marginBottom: 12 }}>Komplexität des Plans</div>
            <div style={{ display: "flex", gap: 10 }}>
              {OKR_COMPLEXITY.map(c => (
                <button key={c.id} onClick={() => { upd("complexity", c.id); if (c.id === "complex") upd("generateSubtasks", false); }} style={{
                  flex: 1, padding: "16px 12px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  background: d.complexity === c.id ? `${c.color}18` : "var(--panel)",
                  border: `2px solid ${d.complexity === c.id ? c.color : "var(--line)"}`,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5, color: d.complexity === c.id ? c.color : "var(--text)" }}>{c.label}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-faint)", lineHeight: 1.5 }}>{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {[
              { key: "generateTodos", label: "Tasks generieren", sub: "Erstellt konkrete Aufgaben pro Key Result (empfohlen)" },
            ].map(opt => (
              <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", padding: "14px 18px", background: "var(--panel)", border: `1px solid ${d[opt.key] ? phaseColor : "var(--line)"}` }}>
                <input type="checkbox" checked={d[opt.key]} onChange={e => upd(opt.key, e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: phaseColor, cursor: "pointer", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{opt.sub}</div>
                </div>
              </label>
            ))}
            {d.generateTodos && d.complexity !== "complex" && (
              <label style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", padding: "14px 18px", background: "var(--panel)", border: `1px solid ${d.generateSubtasks ? phaseColor : "var(--line)"}`, marginLeft: 24 }}>
                <input type="checkbox" checked={d.generateSubtasks} onChange={e => upd("generateSubtasks", e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: phaseColor, cursor: "pointer", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>Subtasks generieren</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>Jeder Task bekommt 2–4 konkrete Teilschritte — maximale Klarheit, kein "Was mache ich als erstes?"</div>
                </div>
              </label>
            )}
          </div>

          <div style={{ padding: "18px 20px", background: "var(--panel)", border: "1px solid var(--accent-line)" }}>
            <div className="uppercase-label" style={{ marginBottom: 12, color: "var(--accent)" }}>Zusammenfassung</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: 12 }}>
              {[
                ["Projekt", d.projectName || "–"],
                ["Zeitrahmen", d.deadlineWeeks ? weeksLabel(d.deadlineWeeks) : "–"],
                ["Budget", `${budget}h gesamt (${d.hoursPerWeek}h/Woche)`],
                ["Komplexität", OKR_COMPLEXITY.find(c => c.id === d.complexity)?.desc || "–"],
                ["Psych-Tools", [d.deadlineWeeks <= 6 && "Parkinson's Law", d.obstacles.length > 0 && "WOOP", d.implementationIntention && "Impl. Intention"].filter(Boolean).join(" · ") || "–"],
              ].map(([label, val]) => (
                <React.Fragment key={label}>
                  <span style={{ color: "var(--text-faint)", whiteSpace: "nowrap" }}>{label}:</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{val}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      );
    }

    default: return null;
  }
}

// ─── Review ──────────────────────────────────────────────────────────────────

function OKRReview({ result, setResult, wizardData, totalHours, onBack, onSave, onClose }) {
  const updPath = (path, val) => {
    setResult(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[isNaN(parts[i]) ? parts[i] : +parts[i]];
      }
      const last = parts[parts.length - 1];
      obj[isNaN(last) ? last : +last] = val;
      return next;
    });
  };

  const removeKR = (oi, ki) => setResult(prev => {
    const n = JSON.parse(JSON.stringify(prev));
    n.objectives[oi].keyResults.splice(ki, 1);
    return n;
  });

  const removeTask = (oi, ki, ti) => setResult(prev => {
    const n = JSON.parse(JSON.stringify(prev));
    n.objectives[oi].keyResults[ki].tasks.splice(ti, 1);
    return n;
  });

  const addKR = (oi) => setResult(prev => {
    const n = JSON.parse(JSON.stringify(prev));
    const krs = n.objectives[oi].keyResults;
    krs.push({ label: `KR${krs.length + 1}`, title: "", tasks: [] });
    return n;
  });

  const psychBadges = [
    wizardData.deadlineWeeks && wizardData.deadlineWeeks <= 6 && "⚡ PARKINSON'S LAW",
    wizardData.obstacles.length > 0 && "🧠 WOOP INTEGRIERT",
    wizardData.implementationIntention && "🎯 IMPL. INTENTION",
    wizardData.motivationTypes.length > 0 && "💡 MOTIVATIONSANKER",
    wizardData.why2 && "🔍 5-WHYS ANALYSE",
  ].filter(Boolean);

  return (
    <div data-tutorial="wizard-container" style={{
      position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ width: 820, maxHeight: "94vh", background: "var(--bg)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", fontWeight: 700, color: "var(--good)", marginBottom: 5 }}>✓ PLAN GENERIERT — REVIEW & BESTÄTIGUNG</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Überprüfe deinen Projektplan</div>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 4 }}>Alle Felder sind inline editierbar. Entferne was nicht passt, bestätige dann.</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 20, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
          {psychBadges.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {psychBadges.map(b => (
                <span key={b} style={{ padding: "3px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "var(--good)", border: "1px solid var(--good)", background: "var(--good-soft)" }}>{b}</span>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {/* Project name + meta */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
            <div style={{ flex: 1 }}>
              <div className="uppercase-label" style={{ marginBottom: 6 }}>Projektname</div>
              <input value={result.projectName || ""} onChange={e => updPath("projectName", e.target.value)}
                style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--text)", padding: "10px 14px", fontSize: 17, fontWeight: 700, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div style={{ flexShrink: 0, textAlign: "right", paddingTop: 20 }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{totalHours}h</div>
              <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{wizardData.hoursPerWeek}h/W · {wizardData.deadlineWeeks ? weeksLabel(wizardData.deadlineWeeks) : "–"}</div>
            </div>
          </div>

          {/* First domino + weekly focus */}
          {(result.firstDomino || result.weeklyFocus) && (
            <div style={{ marginBottom: 24, padding: "14px 18px", background: "var(--panel)", borderLeft: "3px solid var(--accent)", border: "1px solid var(--accent-line)" }}>
              {result.firstDomino && (
                <div style={{ marginBottom: result.weeklyFocus ? 10 : 0 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent)" }}>FIRST DOMINO:</span>
                  <span style={{ fontSize: 12.5, color: "var(--text)", marginLeft: 8 }}>{result.firstDomino}</span>
                </div>
              )}
              {result.weeklyFocus && (
                <div>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent)" }}>WÖCHENTLICHER FOKUS:</span>
                  <span style={{ fontSize: 12.5, color: "var(--text)", marginLeft: 8 }}>{result.weeklyFocus}</span>
                </div>
              )}
            </div>
          )}

          {/* Objectives */}
          {(result.objectives || []).map((obj, oi) => (
            <div key={oi} style={{ marginBottom: 28 }}>
              {/* Objective banner */}
              <div style={{ padding: "14px 18px", background: "var(--panel)", borderTop: `3px solid var(--accent)`, border: "1px solid var(--line-soft)" }}>
                <div className="uppercase-label" style={{ marginBottom: 6 }}>
                  {result.objectives.length > 1 ? `OBJECTIVE ${oi + 1}` : "OBJECTIVE"}
                </div>
                <input value={obj.title || ""} onChange={e => updPath(`objectives.${oi}.title`, e.target.value)}
                  style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--line)", color: "var(--text)", padding: "5px 0", fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                {obj.period && <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 6 }}>{obj.period}</div>}
              </div>

              {/* KRs */}
              {(obj.keyResults || []).map((kr, ki) => (
                <div key={ki} style={{ borderLeft: "2px solid rgba(139,92,246,0.3)", marginLeft: 14 }}>
                  {/* KR row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", background: "var(--panel-2)", borderBottom: "1px solid var(--line-soft)" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent)", minWidth: 28, flexShrink: 0 }}>{kr.label || `KR${ki + 1}`}</span>
                    <input value={kr.title || ""} onChange={e => updPath(`objectives.${oi}.keyResults.${ki}.title`, e.target.value)}
                      style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid var(--line)", color: "var(--text)", padding: "3px 0", fontSize: 13, fontWeight: 600, outline: "none", fontFamily: "inherit" }} />
                    <button onClick={() => removeKR(oi, ki)} title="KR entfernen"
                      style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 16, padding: "0 4px", opacity: 0.5, lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>

                  {/* Tasks */}
                  {(kr.tasks || []).map((t, ti) => (
                    <div key={ti} style={{ padding: "9px 16px 9px 36px", borderBottom: "1px solid var(--line-soft)", background: "rgba(255,255,255,0.008)" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ width: 4, height: 4, background: "var(--text-faint)", borderRadius: "50%", marginTop: 10, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <input value={t.title || ""} onChange={e => updPath(`objectives.${oi}.keyResults.${ki}.tasks.${ti}.title`, e.target.value)}
                            style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--line-soft)", color: "var(--text)", padding: "2px 0", fontSize: 12.5, outline: "none", fontFamily: "inherit" }} />
                          {t.sub && <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 3, lineHeight: 1.4 }}>{t.sub}</div>}
                          {(t.subtasks || []).length > 0 && (
                            <div style={{ marginTop: 5, paddingLeft: 10 }}>
                              {t.subtasks.map((st, sti) => (
                                <div key={sti} style={{ fontSize: 10.5, color: "var(--text-faint)", padding: "1px 0", display: "flex", gap: 6 }}>
                                  <span style={{ color: "var(--accent)", fontSize: 8, marginTop: 3, flexShrink: 0 }}>▸</span>
                                  {st}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {t.est && <span className="mono" style={{ fontSize: 9.5, color: "var(--text-faint)" }}>{t.est}m</span>}
                          {t.flow && <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-faint)", opacity: 0.6 }}>{t.flow}</span>}
                          <button onClick={() => removeTask(oi, ki, ti)}
                            style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: "0 2px", opacity: 0.4, lineHeight: 1 }}>×</button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add KR */}
                </div>
              ))}

              <button onClick={() => addKR(oi)} style={{
                width: "100%", padding: "8px", background: "transparent",
                border: "1px dashed var(--line)", borderTop: "none", marginLeft: 0,
                color: "var(--text-faint)", fontSize: 10.5, letterSpacing: "0.12em",
                cursor: "pointer", fontFamily: "inherit",
              }}>+ KEY RESULT HINZUFÜGEN</button>
            </div>
          ))}

          {/* Implementation intention callout */}
          {wizardData.implementationIntention && (
            <div style={{ padding: "14px 18px", background: "var(--panel)", border: "1px solid var(--line-soft)", borderLeft: "3px solid var(--warn)" }}>
              <div className="uppercase-label" style={{ marginBottom: 6, color: "var(--warn)" }}>🎯 NOTFALLPLAN (Implementation Intention)</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.7 }}>
                Wenn{" "}
                <strong style={{ color: "var(--text)" }}>
                  {(() => { const ps = [...wizardData.obstacles.map(id => OKR_OBSTACLES.find(o => o.id === id)?.prompt || id), ...(wizardData.obstacleCustom?.trim() ? [wizardData.obstacleCustom.trim()] : [])].filter(Boolean); return ps.length === 0 ? "Hindernisse" : ps.length === 1 ? ps[0] : ps.length === 2 ? `${ps[0]} und ${ps[1]}` : `${ps.slice(0, -1).join(", ")} und ${ps[ps.length - 1]}`; })()}
                </strong>{" "}
                auftreten, werde ich:{" "}
                <strong style={{ color: "var(--text)" }}>{wizardData.implementationIntention}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "var(--panel)" }}>
          <button onClick={onBack} style={{
            padding: "10px 20px", background: "transparent", border: "1px solid var(--line)",
            color: "var(--text-faint)", fontSize: 11, letterSpacing: "0.14em", cursor: "pointer", fontFamily: "inherit",
          }}>← ZURÜCK</button>
          <button data-tutorial="wizard-review-save" onClick={() => onSave(result)} style={{
            padding: "12px 36px", background: "var(--good)", color: "#0a0a0c",
            border: "none", fontSize: 11.5, letterSpacing: "0.18em", fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>⚡ PROJEKT STARTEN</button>
        </div>
      </div>
    </div>
  );
}

window.OKRWizard = OKRWizard;
