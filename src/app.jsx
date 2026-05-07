// App shell — global state, routing, ticking active timer, Tweaks.

// Per-POV palettes. Each POV swaps ONLY the accent color — background stays neutral.
const POV_THEMES = {
  personal: { accent: "#8b5cf6" }, // lila — default
  founder:  { accent: "#2f8bff" }, // blau
  student:  { accent: "#e11d48" }, // rot
  athlete:  { accent: "#10b981" }, // grün
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#8b5cf6",
  "density": "comfortable",
  "fontPair": "inter-jet",
  "showTruthLoop": true
}/*EDITMODE-END*/;

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0,2), 16),
    g: parseInt(h.slice(2,4), 16),
    b: parseInt(h.slice(4,6), 16),
  };
}

function applyPovTheme(pov, accentOverride) {
  const t = POV_THEMES[pov] || POV_THEMES.personal;
  const accent = accentOverride || t.accent;
  const root = document.documentElement.style;
  // Reset background/text to neutral defaults — only the accent moves with POV.
  root.setProperty("--bg",         "#0a0a0c");
  root.setProperty("--panel",      "#141418");
  root.setProperty("--panel-2",    "#1a1a20");
  root.setProperty("--line",       "#26262d");
  root.setProperty("--line-soft",  "#1f1f25");
  root.setProperty("--text",       "#e8e8ec");
  root.setProperty("--text-dim",   "#8a8a95");
  root.setProperty("--text-faint", "#54545d");
  root.setProperty("--accent", accent);
  root.setProperty("--" + pov, accent);
  const { r, g, b } = hexToRgb(accent);
  root.setProperty("--accent-soft", `rgba(${r},${g},${b},0.12)`);
  root.setProperty("--accent-line", `rgba(${r},${g},${b},0.35)`);
}

function applyTweaks(t) {
  const dense = t.density === "dense";
  document.body.style.fontSize = dense ? "13px" : "14px";

  const pair = t.fontPair === "ibm" ? `'IBM Plex Sans', sans-serif` :
               t.fontPair === "system" ? `-apple-system, system-ui, sans-serif` :
               `'Inter', sans-serif`;
  document.body.style.fontFamily = pair;
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyTweaks(tweaks); }, [tweaks]);

  // Re-theme whenever POV changes. Founder accent is overridable via Tweaks;
  // Student/Athlete always use their own palette accent.
  // (Theme application below depends on `pov` state defined next.)

  // Inject IBM Plex if needed
  React.useEffect(() => {
    if (tweaks.fontPair === "ibm" && !document.getElementById("ibm-font")) {
      const l = document.createElement("link");
      l.id = "ibm-font";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
  }, [tweaks.fontPair]);

  const [route, setRoute] = React.useState("dashboard");
  const [pov, setPov] = React.useState(() => localStorage.getItem("lifeos_pov") || "personal");
  const [activeTaskId, setActiveTaskId] = React.useState(() => localStorage.getItem("lifeos_active") || null);
  // Tracks which task was last actively running — survives pausing (activeTaskId → null)
  const [focusTaskId, setFocusTaskId] = React.useState(() => localStorage.getItem("lifeos_active") || null);

  // Keep focusTaskId in sync whenever a task starts
  React.useEffect(() => {
    if (activeTaskId) setFocusTaskId(activeTaskId);
  }, [activeTaskId]);
  const [taskTimes, setTaskTimes] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_times") || "{}"); } catch { return {}; }
  });

  React.useEffect(() => { localStorage.setItem("lifeos_pov", pov); }, [pov]);
  React.useEffect(() => { localStorage.setItem("lifeos_active", activeTaskId || ""); }, [activeTaskId]);
  React.useEffect(() => { localStorage.setItem("lifeos_times", JSON.stringify(taskTimes)); }, [taskTimes]);

  const [krProgress, setKrProgress] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_kr_progress") || "{}"); } catch { return {}; }
  });
  const [taskNotes, setTaskNotes] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_task_notes") || "{}"); } catch { return {}; }
  });
  const [truthPlan, setTruthPlan] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_truth_plan") || "null") || TRUTH_LOOP.plan; } catch { return TRUTH_LOOP.plan; }
  });
  React.useEffect(() => { localStorage.setItem("lifeos_kr_progress", JSON.stringify(krProgress)); }, [krProgress]);
  React.useEffect(() => { localStorage.setItem("lifeos_task_notes", JSON.stringify(taskNotes)); }, [taskNotes]);
  React.useEffect(() => { localStorage.setItem("lifeos_truth_plan", JSON.stringify(truthPlan)); }, [truthPlan]);

  // Apply the per-POV theme on mount and whenever POV / accent tweak changes.
  React.useEffect(() => {
    const override = pov === "personal" ? tweaks.accent : null;
    applyPovTheme(pov, override);
  }, [pov, tweaks.accent]);

  // When POV changes, drop the active task if it doesn't belong to the new POV's today list.
  React.useEffect(() => {
    const ids = (POV_DATA[pov] || POV_DATA.founder).tasksToday.map(t => t.id);
    if (activeTaskId && !ids.includes(activeTaskId)) setActiveTaskId(null);
  }, [pov]);

  // Tick the active task across whole app
  React.useEffect(() => {
    if (!activeTaskId) return;
    const id = setInterval(() => {
      setTaskTimes(prev => ({ ...prev, [activeTaskId]: (prev[activeTaskId] ?? 0) + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [activeTaskId]);

  // Keyboard: ESC exits focus, SPACE toggles active timer in focus
  React.useEffect(() => {
    const onKey = (e) => {
      if (route === "focus" && e.key === "Escape") setRoute("dashboard");
      if (route === "focus" && e.key === " ") {
        e.preventDefault();
        setActiveTaskId(curr => curr ? null : focusTaskId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [route, focusTaskId]);

  // Global task detail — modal overlay, works from any screen
  const [globalTask, setGlobalTask] = React.useState(null);

  const focusMode = route === "focus";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}
         data-screen-label={"Life OS · " + route}>
      {!focusMode && <Sidebar route={route} setRoute={setRoute} pov={pov} setPov={setPov} />}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
        {focusMode && (
          // tiny top bar with exit
          <div style={{
            position: "absolute", top: 16, left: 16, zIndex: 5,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <button onClick={() => setRoute("dashboard")} style={{
              padding: "8px 14px", background: "var(--panel)", border: "1px solid var(--line)",
              color: "var(--text-faint)", fontSize: 10.5, letterSpacing: "0.18em", fontWeight: 600,
              cursor: "pointer",
            }}>← EXIT FOCUS</button>
          </div>
        )}
        {route === "dashboard" && (
          <Dashboard pov={pov} activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
            taskTimes={taskTimes} setTaskTimes={setTaskTimes} setRoute={setRoute}
            krProgress={krProgress} setKrProgress={setKrProgress}
            taskNotes={taskNotes} setTaskNotes={setTaskNotes}
            truthPlan={truthPlan} setTruthPlan={setTruthPlan}
            onOpenTask={setGlobalTask} />
        )}
        {route === "focus" && (
          <FocusScreen pov={pov} activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
            taskTimes={taskTimes} setTaskTimes={setTaskTimes} focusTaskId={focusTaskId}
            onOpenTask={setGlobalTask} />
        )}
        {route === "missioncontrol" && (
          <MissionControl pov={pov} setPov={setPov} taskTimes={taskTimes} setTaskTimes={setTaskTimes}
            activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
            krProgress={krProgress} setKrProgress={setKrProgress}
            onOpenTask={setGlobalTask} />
        )}
        {route === "planner" && <Planner />}
        {route === "insights" && <Insights taskTimes={taskTimes} pov={pov} />}
      </main>

      {/* Global task detail panel — slides in from right over any screen */}
      {globalTask && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setGlobalTask(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "stretch",
          }}
        >
          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setGlobalTask(null)} />
          <div style={{
            width: 680, maxWidth: "90vw",
            background: "var(--bg)", borderLeft: "1px solid var(--line)",
            overflow: "auto", display: "flex", flexDirection: "column",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
          }}>
            <TaskDetail
              task={globalTask}
              onBack={() => setGlobalTask(null)}
              breadcrumb="SCHLIESSEN ×"
              taskTimes={taskTimes} setTaskTimes={setTaskTimes}
              activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
            />
          </div>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Personal Accent">
          <TweakColor label="Hauptfarbe (Personal)" value={tweaks.accent}
            onChange={(v) => setTweak("accent", v)} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {["#8b5cf6", "#a855f7", "#6366f1", "#06b6d4", "#f97316", "#ec4899"].map(c => (
              <button key={c} onClick={() => setTweak("accent", c)} style={{
                width: 24, height: 24, borderRadius: 4, background: c,
                border: tweaks.accent === c ? "2px solid #fff" : "1px solid var(--line)",
                cursor: "pointer", padding: 0,
              }} />
            ))}
          </div>
        </TweakSection>

        <TweakSection title="Layout">
          <TweakRadio label="Density" value={tweaks.density}
            options={[{ value: "comfortable", label: "Comfortable" }, { value: "dense", label: "Dense" }]}
            onChange={(v) => setTweak("density", v)} />
          <TweakRadio label="Font" value={tweaks.fontPair}
            options={[
              { value: "inter-jet", label: "Inter" },
              { value: "ibm", label: "IBM Plex" },
              { value: "system", label: "System" },
            ]}
            onChange={(v) => setTweak("fontPair", v)} />
        </TweakSection>

        <TweakSection title="Module">
          <TweakToggle label="The Truth Loop anzeigen"
            value={tweaks.showTruthLoop}
            onChange={(v) => setTweak("showTruthLoop", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
