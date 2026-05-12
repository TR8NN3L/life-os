// Focus mode — full-bleed black, single task, big start button + reality timer.

function FocusScreen({ pov, activeTaskId, setActiveTaskId, taskTimes, setTaskTimes, focusTaskId, onOpenTask }) {
  // Merge hardcoded + custom + project tasks — search across ALL POVs so active task is always found
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

  // Use focusTaskId (from App) as the authoritative "last started task"
  const displayId = activeTaskId || focusTaskId;
  const task = tasksToday.find(t => t.id === displayId) ?? tasksToday[0];

  // Empty state — no tasks configured yet
  if (!task) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 16 }}>
        <div style={{ fontSize: 13, color: "var(--text-faint)", letterSpacing: "0.08em" }}>Keine Aufgaben vorhanden</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", opacity: 0.6 }}>Füge zuerst Tasks im Dashboard hinzu.</div>
      </div>
    );
  }

  const isRunning = activeTaskId === task.id;
  const elapsed = taskTimes[task.id] ?? task.elapsed;

  // big-mode line breaks: title/subtitle styling
  const titleParts = task.title.split(" ");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* breadcrumb / context */}
      <div style={{ padding: "20px 28px 8px", display: "flex", justifyContent: "space-between" }}>
        <div className="uppercase-label">Focus</div>
        <div className="uppercase-label" style={{ color: "var(--text-dim)" }}>Single-Task Mode · No Distractions</div>
      </div>

      {/* canvas */}
      <div data-tutorial="focus-canvas" style={{
        flex: 1, margin: "0 28px 28px", background: "#000",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", border: "1px solid var(--line)",
      }}>
        {/* vignette overlay when running — darkens edges, creates tunnel */}
        {isRunning && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 60% 55% at 50% 52%, transparent 0%, rgba(0,0,0,0.72) 100%)",
            transition: "opacity .6s",
          }} />
        )}

        {/* anchor chip */}
        <div style={{
          position: "absolute", top: 32, left: "50%", transform: "translateX(-50%)",
          transition: "opacity .5s, filter .5s",
          opacity: isRunning ? 0.15 : 1,
          filter: isRunning ? "blur(4px)" : "none",
        }}>
          <span style={{
            padding: "6px 14px", border: "1px solid rgba(47,139,255,0.4)",
            color: "var(--accent)", fontSize: 10, letterSpacing: "0.2em", fontWeight: 600,
          }}>{task.pov ? task.pov.toUpperCase() : "FOCUS"} → {task.kr ? task.kr.toUpperCase() : "EXECUTE"}</span>
        </div>

        {/* title — blurs into background when running, click opens task detail */}
        <div
          onClick={() => !isRunning && onOpenTask && onOpenTask({ ...task, _pov: task.pov || pov })}
          style={{
            textAlign: "center", marginBottom: 48,
            transition: "opacity .5s, filter .5s",
            opacity: isRunning ? 0.08 : 1,
            filter: isRunning ? "blur(6px)" : "none",
            cursor: isRunning ? "default" : "pointer",
          }}
        >
          <h1 style={{
            margin: 0, fontSize: 84, fontWeight: 800, letterSpacing: "-0.02em",
            color: "var(--text)", lineHeight: 0.95,
          }}>{titleParts[0].toUpperCase()}</h1>
          <h1 style={{
            margin: "4px 0 0", fontSize: 52, fontWeight: 800, letterSpacing: "0.04em",
            color: "var(--text-faint)", lineHeight: 1,
          }}>{titleParts.slice(1).join(" ").toUpperCase()}</h1>
          <div style={{
            margin: "20px auto 0", width: 96, height: 1, background: "var(--accent)",
          }} />
          {!isRunning && (
            <div style={{ marginTop: 10, fontSize: 9.5, letterSpacing: "0.18em", color: "var(--text-faint)", fontWeight: 600 }}>
              ↗ DETAIL ÖFFNEN
            </div>
          )}
        </div>

        {/* big button */}
        <button
          data-tutorial="focus-start-btn"
          onClick={() => {
            const willRun = !isRunning;
            setActiveTaskId(isRunning ? null : task.id);
            if (willRun) window.TUTORIAL?.onAction?.('timer-started');
            else window.TUTORIAL?.onAction?.('timer-paused');
          }}
          style={{
            width: 168, height: 168, borderRadius: "50%",
            background: isRunning ? "var(--bg)" : "var(--accent)",
            color: isRunning ? "var(--accent)" : "#0a0a0c",
            border: `4px solid ${isRunning ? "var(--accent)" : "transparent"}`,
            fontSize: 22, fontWeight: 700, letterSpacing: "0.2em",
            cursor: "pointer",
            boxShadow: isRunning
              ? "0 0 80px var(--accent), 0 0 160px rgba(47,139,255,.2)"
              : "0 0 80px rgba(47,139,255,.4)",
            transition: "all .35s",
            zIndex: 1,
          }}
        >{isRunning ? "PAUSE" : "START"}</button>

        {/* timer */}
        <div className="mono" style={{
          marginTop: 36, fontSize: 72, fontWeight: 500, letterSpacing: "0.04em",
          color: isRunning ? "var(--text)" : "var(--text-faint)",
          textShadow: isRunning ? "0 0 40px var(--accent)" : "none",
          transition: "all .35s",
          zIndex: 1,
        }}>{fmtTime(elapsed)}</div>
        <div className="uppercase-label" style={{
          marginTop: 6,
          color: isRunning ? "var(--accent)" : "var(--text-faint)",
          transition: "color .35s",
          zIndex: 1,
        }}>Reality Tracker</div>

        {/* reset row */}
        <button
          onClick={() => setTaskTimes(prev => ({ ...prev, [task.id]: 0 }))}
          style={{
            position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: "transparent", border: "none", color: "var(--text-faint)",
            fontSize: 10, letterSpacing: "0.18em", fontWeight: 600, cursor: "pointer",
          }}
        >RESET · ESC = EXIT FOCUS · SPACE = PAUSE/PLAY</button>
      </div>
    </div>
  );
}

window.FocusScreen = FocusScreen;
