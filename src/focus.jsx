// Focus mode — full-bleed black, single task, big start button + reality timer.

const POMO_WORK  = 25 * 60;
const POMO_SHORT =  5 * 60;
const POMO_LONG  = 15 * 60;


function FocusScreen({ pov, activeTaskId, setActiveTaskId, taskTimes, setTaskTimes, focusTaskId, onOpenTask }) {
  // ── Pomodoro state (defined first — before any early returns) ─────────────
  const [pomodoroMode, setPomodoroMode] = React.useState(false);
  const [pomoCycle,    setPomoCycle]    = React.useState("work");   // "work" | "break" | "long-break"
  const [pomoSecsLeft, setPomoSecsLeft] = React.useState(POMO_WORK);
  const [pomoCount,    setPomoCount]    = React.useState(0);
  const pomoRef = React.useRef(null);

  // Use activeTaskId as "is running" proxy — safe before early return
  const timerActive = !!activeTaskId;

  React.useEffect(() => {
    if (!pomodoroMode || !timerActive) {
      if (pomoRef.current) clearInterval(pomoRef.current);
      return;
    }
    pomoRef.current = setInterval(() => {
      setPomoSecsLeft(prev => {
        if (prev > 1) return prev - 1;
        // Cycle complete — stop timer, advance cycle
        clearInterval(pomoRef.current);
        setActiveTaskId(null);
        if (pomoCycle === "work") {
          const next = pomoCount + 1;
          setPomoCount(next);
          const isLong = next % 4 === 0;
          const nextCycle = isLong ? "long-break" : "break";
          setPomoCycle(nextCycle);
          setPomoSecsLeft(isLong ? POMO_LONG : POMO_SHORT);
          window.Push?.send({ title: "🍅 Pomodoro fertig!", message: isLong ? "Lange Pause — 15 Min. erholen." : "Kurze Pause — 5 Min. durchatmen.", tag: "pomo" });
        } else {
          setPomoCycle("work");
          setPomoSecsLeft(POMO_WORK);
          window.Push?.send({ title: "⚡ Pause vorbei!", message: "Nächster Pomodoro — 25 Min. Fokus.", tag: "pomo-back" });
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(pomoRef.current);
  }, [pomodoroMode, pomoCycle, pomoCount, timerActive]);

  const resetPomo = () => {
    clearInterval(pomoRef.current);
    setPomoCycle("work"); setPomoSecsLeft(POMO_WORK); setPomoCount(0);
    setActiveTaskId(null);
  };

  // ── Task resolution ─────────────────────────────────────────────────────
  const hardcoded = (POV_DATA[pov] || POV_DATA.founder).tasksToday;
  let custom = [];
  try { custom = JSON.parse(LS.getItem(`lifeos_tasks_${pov}`) || "[]"); } catch {}
  let projTasks = [];
  try {
    const projs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
    projTasks = projs.flatMap(p =>
      (p.objectives || []).flatMap(o =>
        (o.krs || []).filter(k => k.status !== "locked").flatMap(kr =>
          (kr.tasks || []).map(t => ({ ...t, kr: kr.id, pov: p.pov, _fromProject: true }))
        )
      )
    );
  } catch {}
  const tasksToday = [...hardcoded, ...custom, ...projTasks];

  const displayId = activeTaskId || focusTaskId;
  const task = tasksToday.find(t => t.id === displayId) ?? tasksToday[0];

  if (!task) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 16 }}>
        <div style={{ fontSize: 13, color: "var(--text-faint)", letterSpacing: "0.08em" }}>Keine Aufgaben vorhanden</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", opacity: 0.6 }}>Füge zuerst Tasks im Dashboard hinzu.</div>
      </div>
    );
  }

  const isRunning = activeTaskId === task.id;
  const elapsed   = taskTimes[task.id] ?? task.elapsed ?? 0;

  // Pomodoro display: which cycle label & color
  const pomoColor  = pomoCycle === "work" ? "var(--accent)" : "#10b981";
  const pomoCycleLabel = pomoCycle === "work" ? "WORK" : pomoCycle === "break" ? "BREAK" : "LONG BREAK";
  const pomoDotsTotal  = 4;

  const colonIdx = task.title.indexOf(":");
  const hasColon = colonIdx > 0 && colonIdx < task.title.length - 1;
  const mainPart = hasColon ? task.title.slice(0, colonIdx + 1) : task.title;
  const subPart  = hasColon ? task.title.slice(colonIdx + 1).trim() : "";

  const toggleTimer = () => {
    const willRun = !isRunning;
    if (pomodoroMode && !isRunning && pomoSecsLeft === 0) {
      // Auto-advance to next pomo phase
      if (pomoCycle !== "work") {
        setPomoCycle("work"); setPomoSecsLeft(POMO_WORK);
      }
    }
    setActiveTaskId(isRunning ? null : task.id);
    if (willRun) window.TUTORIAL?.onAction?.("timer-started");
    else         window.TUTORIAL?.onAction?.("timer-paused");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)" }}>

      {/* ── Top bar ── */}
      <div style={{ padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="uppercase-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="zap" size={11} color="var(--text-faint)" />
          Focus
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Pomodoro toggle */}
          <button
            onClick={() => { setPomodoroMode(m => !m); if (isRunning) setActiveTaskId(null); resetPomo(); }}
            style={{
              padding: "5px 14px", background: pomodoroMode ? "rgba(16,185,129,0.12)" : "transparent",
              border: `1px solid ${pomodoroMode ? "#10b981" : "var(--line)"}`,
              color: pomodoroMode ? "#10b981" : "var(--text-faint)",
              fontSize: 10.5, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer",
            }}
          >🍅 POMODORO{pomodoroMode ? " AN" : ""}</button>
          <div className="uppercase-label" style={{ color: "var(--text-dim)" }}>Single-Task · No Distractions</div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div data-tutorial="focus-canvas" style={{
        flex: 1, margin: "0 28px 28px", background: "#000",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", border: "1px solid var(--line)",
      }}>
        {/* Vignette when running */}
        {isRunning && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 60% 55% at 50% 52%, transparent 0%, rgba(0,0,0,0.72) 100%)",
          }} />
        )}

        {/* Pomodoro cycle info strip */}
        {pomodoroMode && (
          <div style={{
            position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            opacity: isRunning ? 0.3 : 1, transition: "opacity .5s",
          }}>
            <span style={{ fontSize: 9, letterSpacing: "0.22em", fontWeight: 700, color: pomoColor, border: `1px solid ${pomoColor}50`, padding: "3px 12px" }}>
              🍅 {pomoCycleLabel}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: pomoDotsTotal }).map((_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: i < (pomoCount % 4) ? "var(--accent)" : "var(--line)",
                  border: `1px solid ${i < (pomoCount % 4) ? "var(--accent)" : "var(--line)"}`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Anchor chip (reality mode) */}
        {!pomodoroMode && (
          <div style={{
            position: "absolute", top: 32, left: "50%", transform: "translateX(-50%)",
            opacity: isRunning ? 0.15 : 1, filter: isRunning ? "blur(4px)" : "none", transition: "opacity .5s, filter .5s",
          }}>
            <span style={{ padding: "6px 14px", border: "1px solid rgba(47,139,255,0.4)", color: "var(--accent)", fontSize: 10, letterSpacing: "0.2em", fontWeight: 600 }}>
              {task.pov ? task.pov.toUpperCase() : "FOCUS"} → {task.kr ? task.kr.toUpperCase() : "EXECUTE"}
            </span>
          </div>
        )}

        {/* Task title */}
        <div
          onClick={() => !isRunning && onOpenTask && onOpenTask({ ...task, _pov: task.pov || pov })}
          style={{
            textAlign: "center", marginBottom: 48,
            opacity: isRunning ? 0.08 : 1, filter: isRunning ? "blur(6px)" : "none",
            transition: "opacity .5s, filter .5s", cursor: isRunning ? "default" : "pointer",
          }}
        >
          <h1 style={{ margin: 0, fontSize: hasColon ? 72 : 64, fontWeight: 800, letterSpacing: "-0.02em", color: hasColon ? "var(--text)" : "var(--text-dim)", lineHeight: 0.95 }}>
            {mainPart.toUpperCase()}
          </h1>
          {subPart && (
            <h1 style={{ margin: "4px 0 0", fontSize: 44, fontWeight: 700, letterSpacing: "0.02em", color: "var(--text-faint)", lineHeight: 1 }}>
              {subPart.toUpperCase()}
            </h1>
          )}
          <div style={{ margin: "20px auto 0", width: 96, height: 1, background: "var(--accent)" }} />
          {!isRunning && <div style={{ marginTop: 10, fontSize: 9.5, letterSpacing: "0.18em", color: "var(--text-faint)", fontWeight: 600 }}>↗ DETAIL ÖFFNEN</div>}
        </div>

        {/* Big button */}
        <button
          data-tutorial="focus-start-btn"
          onClick={toggleTimer}
          style={{
            width: 168, height: 168, borderRadius: "50%",
            background: isRunning ? "var(--bg)" : pomodoroMode ? pomoColor : "var(--accent)",
            color: isRunning ? (pomodoroMode ? pomoColor : "var(--accent)") : "#0a0a0c",
            border: `4px solid ${isRunning ? (pomodoroMode ? pomoColor : "var(--accent)") : "transparent"}`,
            fontSize: pomodoroMode ? 18 : 22, fontWeight: 700, letterSpacing: "0.2em",
            cursor: "pointer",
            boxShadow: isRunning ? `0 0 80px ${pomodoroMode ? pomoColor : "var(--accent)"}` : `0 0 80px rgba(47,139,255,.4)`,
            transition: "all .35s", zIndex: 1,
          }}
        >{isRunning ? "PAUSE" : pomodoroMode ? (pomoCycle === "work" ? "START" : "PAUSE →") : "START"}</button>

        {/* Timer display */}
        <div className="mono" style={{
          marginTop: 36, fontSize: 72, fontWeight: 500, letterSpacing: "0.04em",
          color: isRunning ? "var(--text)" : "var(--text-faint)",
          textShadow: isRunning ? `0 0 40px ${pomodoroMode ? pomoColor : "var(--accent)"}` : "none",
          transition: "all .35s", zIndex: 1,
        }}>
          {pomodoroMode ? fmtTime(pomoSecsLeft) : fmtTime(elapsed)}
        </div>

        <div className="uppercase-label" style={{
          marginTop: 6,
          color: isRunning ? (pomodoroMode ? pomoColor : "var(--accent)") : "var(--text-faint)",
          transition: "color .35s", zIndex: 1,
        }}>
          {pomodoroMode ? `${pomoCycleLabel} · Pomodoro #${Math.floor(pomoCount / 1) + (pomoCycle === "work" ? 1 : 0)}` : "Reality Tracker"}
        </div>

        {/* Bottom controls */}
        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 16, alignItems: "center",
        }}>
          <button onClick={() => setTaskTimes(prev => ({ ...prev, [task.id]: 0 }))} style={{ background: "transparent", border: "none", color: "var(--text-faint)", fontSize: 10, letterSpacing: "0.14em", fontWeight: 600, cursor: "pointer" }}>
            RESET TIMER
          </button>
          {pomodoroMode && (
            <button onClick={resetPomo} style={{ background: "transparent", border: "none", color: "var(--text-faint)", fontSize: 10, letterSpacing: "0.14em", fontWeight: 600, cursor: "pointer" }}>
              POMO RESET
            </button>
          )}
          <span style={{ color: "var(--text-faint)", fontSize: 10, letterSpacing: "0.1em" }}>ESC = EXIT · SPACE = PAUSE</span>
        </div>
      </div>
    </div>
  );
}

window.FocusScreen = FocusScreen;
