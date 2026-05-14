// Focus mode — full-bleed black, single task, big start button + reality timer.

const POMO_WORK  = 25 * 60;
const POMO_SHORT =  5 * 60;
const POMO_LONG  = 15 * 60;


function FocusScreen({ pov, activeTaskId, setActiveTaskId, taskTimes, setTaskTimes, focusTaskId, onOpenTask }) {
  // ── Mode toggle: task vs free-flow ────────────────────────────────────────
  const [freeMode, setFreeMode] = React.useState(false);

  // ── Free Flow state ───────────────────────────────────────────────────────
  const [freeProjId,       setFreeProjId]       = React.useState("");
  const [freeSecs,         setFreeSecs]         = React.useState(0);
  const [freeRunning,      setFreeRunning]      = React.useState(false);
  const [showFreeNote,     setShowFreeNote]     = React.useState(false);
  const [freeNote,         setFreeNote]         = React.useState("");
  const [freeSavedIdx,     setFreeSavedIdx]     = React.useState(-1);
  const [freeSavedSecs,    setFreeSavedSecs]    = React.useState(0);
  const freeRef = React.useRef(null);

  const freeProjs = React.useMemo(() => {
    try {
      const p    = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
      const arch = new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]"));
      return p.filter(x => !arch.has(x.id));
    } catch { return []; }
  }, [freeMode]);

  const freeStartedAt = React.useRef(0);
  const freeBaseTime  = React.useRef(0);

  React.useEffect(() => {
    if (!freeRunning) { clearInterval(freeRef.current); return; }
    // Wall-clock anchor — immune to browser tab throttling
    freeRef.current = setInterval(() => {
      const nowSecs = freeBaseTime.current + Math.floor((Date.now() - freeStartedAt.current) / 1000);
      setFreeSecs(nowSecs);
    }, 500);
    return () => clearInterval(freeRef.current);
  }, [freeRunning]);

  const startFree = () => {
    if (!freeProjId) return;
    freeBaseTime.current  = 0;
    freeStartedAt.current = Date.now();
    setFreeSecs(0); setFreeRunning(true); setShowFreeNote(false); setFreeNote("");
    window.posthog?.capture("free_flow_started", { proj_id: freeProjId });
  };

  const stopFree = () => {
    clearInterval(freeRef.current);
    setFreeRunning(false);
    // Always compute from wall-clock refs — state may be stale if tab was throttled
    const dur = freeBaseTime.current + Math.floor((Date.now() - freeStartedAt.current) / 1000);
    if (dur < 1) return;
    setFreeSecs(dur);
    const today  = new Date().toISOString().slice(0, 10);
    const dayKey = `lifeos_daily_${today}`;
    const freeKey = `free_${freeProjId}`;
    try {
      const log = JSON.parse(LS.getItem(dayKey) || "{}");
      log[freeKey] = (log[freeKey] || 0) + dur;
      LS.setItem(dayKey, JSON.stringify(log));
    } catch {}
    try {
      const all = JSON.parse(LS.getItem("lifeos_free_sessions") || "[]");
      all.push({ projId: freeProjId, dur, ts: new Date().toISOString(), note: "" });
      LS.setItem("lifeos_free_sessions", JSON.stringify(all));
      setFreeSavedIdx(all.length - 1);
    } catch {}
    setFreeSavedSecs(dur);
    setShowFreeNote(true);
    window.posthog?.capture("free_flow_stopped", { proj_id: freeProjId, duration_secs: dur });
  };

  const saveFreeNote = () => {
    if (freeSavedIdx >= 0) {
      try {
        const all = JSON.parse(LS.getItem("lifeos_free_sessions") || "[]");
        if (all[freeSavedIdx]) { all[freeSavedIdx].note = freeNote; LS.setItem("lifeos_free_sessions", JSON.stringify(all)); }
      } catch {}
    }
    window.dispatchEvent(new CustomEvent("lifeos-projects-updated"));
    setShowFreeNote(false); setFreeNote(""); setFreeSecs(0); setFreeSavedIdx(-1);
  };

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

  // In free flow mode we don't need a task — skip the early return
  const isRunning = task ? activeTaskId === task.id : false;
  const elapsed   = task ? (taskTimes[task.id] ?? task.elapsed ?? 0) : 0;

  if (!task && !freeMode) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 16 }}>
        <div style={{ fontSize: 13, color: "var(--text-faint)", letterSpacing: "0.08em" }}>Keine Aufgaben vorhanden</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", opacity: 0.6 }}>Füge zuerst Tasks im Dashboard hinzu.</div>
      </div>
    );
  }

  // Pomodoro display: which cycle label & color
  const pomoColor  = pomoCycle === "work" ? "var(--accent)" : "#10b981";
  const pomoCycleLabel = pomoCycle === "work" ? "WORK" : pomoCycle === "break" ? "BREAK" : "LONG BREAK";
  const pomoDotsTotal  = 4;

  const colonIdx = task ? task.title.indexOf(":") : -1;
  const hasColon = colonIdx > 0 && task && colonIdx < task.title.length - 1;
  const mainPart = task ? (hasColon ? task.title.slice(0, colonIdx + 1) : task.title) : "";
  const subPart  = task ? (hasColon ? task.title.slice(colonIdx + 1).trim() : "") : "";

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

      {/* ── Top bar — 3 columns: [spacer for EXIT btn | label | tabs+pomo] ── */}
      <div style={{ padding: "16px 28px 16px 170px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* Left: Focus label */}
        <div className="uppercase-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="zap" size={11} color="var(--text-faint)" />
          Focus
          <span style={{ marginLeft: 10, color: "var(--line)", fontWeight: 300 }}>|</span>
          <span style={{ color: "var(--text-faint)", fontWeight: 400, letterSpacing: "0.08em", fontSize: 10 }}>
            {freeMode ? "Free Flow · Kein Task nötig" : "Single-Task · No Distractions"}
          </span>
        </div>

        {/* Right: Mode tabs + Pomodoro */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 2, background: "var(--panel)", border: "1px solid var(--line)", padding: 3 }}>
            {[["task", "TASK"], ["free", "FREE FLOW"]].map(([id, label]) => (
              <button key={id} onClick={() => { setFreeMode(id === "free"); if (freeRunning) stopFree(); if (isRunning) setActiveTaskId(null); }}
                style={{
                  padding: "5px 14px", border: "none", cursor: "pointer", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em",
                  background: (id === "free") === freeMode ? "var(--accent)" : "transparent",
                  color: (id === "free") === freeMode ? "#0a0a0c" : "var(--text-faint)",
                  transition: "all .15s",
                }}>{label}</button>
            ))}
          </div>
          {/* Pomodoro — only in task mode */}
          {!freeMode && (
            <button
              onClick={() => { setPomodoroMode(m => !m); if (isRunning) setActiveTaskId(null); resetPomo(); }}
              style={{
                padding: "5px 14px", background: pomodoroMode ? "rgba(16,185,129,0.12)" : "transparent",
                border: `1px solid ${pomodoroMode ? "#10b981" : "var(--line)"}`,
                color: pomodoroMode ? "#10b981" : "var(--text-faint)",
                fontSize: 10.5, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer",
              }}
            >🍅 POMODORO{pomodoroMode ? " AN" : ""}</button>
          )}
        </div>
      </div>

      {/* ── Free Flow Canvas ── */}
      {freeMode && (
        <div style={{
          flex: 1, margin: "0 28px 28px", background: "#000",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          position: "relative", border: "1px solid var(--line)",
        }}>
          {freeRunning && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
              background: "radial-gradient(ellipse 60% 55% at 50% 52%, transparent 0%, rgba(0,0,0,0.72) 100%)" }} />
          )}

          {/* Note modal (post-session) */}
          {showFreeNote && (
            <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 480, background: "var(--panel)", border: "1px solid var(--accent-line)", padding: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Icon name="check" size={14} color="var(--accent)" />
                  <span className="uppercase-label" style={{ color: "var(--accent)" }}>Session gespeichert — {fmtTime(freeSavedSecs)}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 20 }}>
                  Was hast du gemacht? (optional)
                </div>
                <textarea
                  autoFocus
                  value={freeNote}
                  onChange={e => setFreeNote(e.target.value)}
                  placeholder="Kurze Notiz zur Session — Änderungen, Erkenntnisse, nächste Schritte…"
                  rows={5}
                  style={{
                    width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)",
                    borderLeft: "2px solid var(--accent)", color: "var(--text)",
                    padding: "12px 16px", fontSize: 13, fontFamily: "inherit",
                    resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                  <button onClick={saveFreeNote} style={{
                    padding: "10px 24px", background: "var(--accent)", color: "#0a0a0c",
                    border: "none", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.16em", cursor: "pointer",
                  }}>SPEICHERN →</button>
                  <button onClick={() => { setShowFreeNote(false); setFreeNote(""); setFreeSecs(0); }}
                    style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 10.5, cursor: "pointer" }}>
                    ÜBERSPRINGEN
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Project picker */}
          {!freeRunning && !showFreeNote && (
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div className="uppercase-label" style={{ color: "var(--text-faint)", marginBottom: 16, letterSpacing: "0.2em" }}>
                PROJEKT WÄHLEN
              </div>
              {freeProjs.length === 0 ? (
                <div style={{ color: "var(--text-faint)", fontSize: 13 }}>Keine aktiven Projekte vorhanden.</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 560 }}>
                  {freeProjs.map(p => (
                    <button key={p.id} onClick={() => setFreeProjId(p.id)} style={{
                      padding: "10px 20px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer",
                      background: freeProjId === p.id ? "var(--accent-soft)" : "transparent",
                      border: `1px solid ${freeProjId === p.id ? "var(--accent-line)" : "var(--line)"}`,
                      color: freeProjId === p.id ? "var(--accent)" : "var(--text-faint)",
                      transition: "all .15s",
                    }}>{(p.title || p.id).toUpperCase()}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Running: project name */}
          {freeRunning && (
            <div style={{
              textAlign: "center", marginBottom: 48,
              opacity: 0.08, filter: "blur(6px)", transition: "opacity .5s, filter .5s",
            }}>
              <h1 style={{ margin: 0, fontSize: 64, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-dim)", lineHeight: 0.95 }}>
                {((freeProjs.find(p => p.id === freeProjId)?.title) || freeProjId).toUpperCase()}
              </h1>
              <div style={{ margin: "20px auto 0", width: 96, height: 1, background: "var(--accent)" }} />
            </div>
          )}

          {/* Big button */}
          {!showFreeNote && (
            <button
              onClick={freeRunning ? stopFree : startFree}
              disabled={!freeProjId && !freeRunning}
              style={{
                width: 168, height: 168, borderRadius: "50%",
                background: freeRunning ? "var(--bg)" : (freeProjId ? "var(--accent)" : "var(--panel)"),
                color: freeRunning ? "var(--accent)" : (freeProjId ? "#0a0a0c" : "var(--text-faint)"),
                border: `4px solid ${freeRunning ? "var(--accent)" : "transparent"}`,
                fontSize: 22, fontWeight: 700, letterSpacing: "0.2em",
                cursor: freeProjId || freeRunning ? "pointer" : "default",
                boxShadow: freeRunning ? "0 0 80px var(--accent)" : freeProjId ? "0 0 80px rgba(16,185,129,.4)" : "none",
                transition: "all .35s",
              }}
            >{freeRunning ? "STOP" : "START"}</button>
          )}

          {/* Timer */}
          {!showFreeNote && (
            <div className="mono" style={{
              marginTop: 36, fontSize: 72, fontWeight: 500, letterSpacing: "0.04em",
              color: freeRunning ? "var(--text)" : "var(--text-faint)",
              textShadow: freeRunning ? "0 0 40px var(--accent)" : "none",
              transition: "all .35s",
            }}>{fmtTime(freeSecs)}</div>
          )}

          {!showFreeNote && (
            <div className="uppercase-label" style={{
              marginTop: 6,
              color: freeRunning ? "var(--accent)" : freeProjId ? "var(--text-dim)" : "var(--text-faint)",
            }}>
              {freeRunning ? "FREE FLOW · LÄUFT" : freeProjId ? "BEREIT ZU STARTEN" : "KEIN PROJEKT GEWÄHLT"}
            </div>
          )}
        </div>
      )}

      {/* ── Task Canvas ── */}
      {!freeMode && <div data-tutorial="focus-canvas" style={{
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
      </div>}
    </div>
  );
}

window.FocusScreen = FocusScreen;
