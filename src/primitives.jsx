// Shared primitives: progress bars, badges, formatters, hooks.

const fmtTime = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const fmtH = (h) => {
  const sign = h > 0 ? "+" : h < 0 ? "" : "";
  return `${sign}${h.toFixed(1)}h`;
};

// Linear bar — solid track segment, transparent rest. Square edges.
function ProgressBar({ value = 0, color = "var(--accent)", height = 4, dim = false, track = "var(--line-soft)" }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div style={{ position: "relative", height, background: track, width: "100%" }}>
      <div style={{
        position: "absolute", inset: 0, width: `${pct}%`,
        background: dim ? "var(--text-faint)" : color, transition: "width .4s ease",
      }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active:  { bg: "var(--accent-soft)", color: "var(--accent)", border: "var(--accent-line)", label: "AKTIV" },
    danger:  { bg: "var(--danger-soft)", color: "var(--danger)", border: "rgba(214,50,74,.4)", label: "BEHIND" },
    good:    { bg: "var(--good-soft)",   color: "var(--good)",   border: "rgba(58,171,91,.4)", label: "ON TRACK" },
    locked:  { bg: "transparent",        color: "var(--text-faint)", border: "var(--line)",     label: "LOCKED" },
    blocked: { bg: "var(--warn-soft)",   color: "var(--warn)",   border: "rgba(212,162,60,.4)", label: "GESPERRT" },
  };
  const k = typeof status === "string" ? status : status.kind;
  const label = (typeof status === "object" && status.label) || map[k]?.label || k.toUpperCase();
  const s = map[k] || map.active;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "4px 10px",
      fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{label}</span>
  );
}

function POVChip({ pov }) {
  const p = POVS.find(x => x.id === pov);
  if (!p) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 8px",
      fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em",
      color: p.color, border: `1px solid ${p.color}`, background: "transparent",
    }}>{p.label.toUpperCase()}</span>
  );
}

function FlowTag({ kind = "FLOW" }) {
  const map = {
    FLOW:  { color: "var(--accent)",  glyph: "✦" },
    QUICK: { color: "var(--text-dim)", glyph: "●" },
    EASY:  { color: "var(--warn)",    glyph: "●" },
  };
  const m = map[kind] || map.FLOW;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px",
      fontSize: 10, letterSpacing: "0.12em", color: m.color, fontWeight: 600,
    }}>
      <span aria-hidden style={{ fontSize: 10 }}>{m.glyph}</span>
      {kind === "FLOW" ? "FLOW" : kind === "QUICK" ? "QUICK <15m" : "EASY TASK"}
    </span>
  );
}

// Bar chart used by The Truth Loop. Hollow bars (Plan) / filled (Reality).
function MiniBars({ data, days, fill = "transparent", stroke = "var(--text-faint)", textColor = "var(--text-dim)", max = 10 }) {
  const W = 360, H = 160, pad = 28, gap = 12;
  const innerW = W - pad * 2;
  const innerH = H - pad - 24;
  const bw = (innerW - gap * (data.length - 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* y-axis labels */}
      {[0, 2, 4, 6, 8, 10].map((v) => {
        const y = pad + innerH - (v / max) * innerH;
        return (
          <g key={v}>
            <text x={4} y={y + 3} fontSize="9" fill="var(--text-faint)" fontFamily="JetBrains Mono">{v}h</text>
            <line x1={pad} x2={W - 8} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth="1" />
          </g>
        );
      })}
      {data.map((v, i) => {
        const h = (v / max) * innerH;
        const x = pad + i * (bw + gap);
        const y = pad + innerH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} fill={fill} stroke={stroke} strokeWidth="1.2" />
            <text x={x + bw / 2} y={y - 6} fontSize="9.5" textAnchor="middle" fill={textColor} fontFamily="JetBrains Mono">{v}h</text>
            <text x={x + bw / 2} y={H - 6} fontSize="9.5" textAnchor="middle" fill="var(--text-faint)" fontFamily="JetBrains Mono" letterSpacing="0.1em">{days[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// Hook: ticking active timer. Returns elapsed seconds + control.
function useTimer(initial = 0, running = false) {
  const [sec, setSec] = React.useState(initial);
  const [run, setRun] = React.useState(running);
  React.useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [run]);
  return [sec, run, setRun, setSec];
}

// Shared Task Detail view — used by both Dashboard and MissionControl
function TaskDetail({ task, onBack, taskTimes, setTaskTimes, activeTaskId, setActiveTaskId, breadcrumb = "ZURÜCK" }) {
  const povId = task._pov || task.pov;
  const isActive = activeTaskId === task.id;
  const elapsed = (taskTimes || {})[task.id] ?? task.elapsed ?? 0;
  const povColor = POVS.find(x => x.id === povId)?.color || "var(--accent)";

  const [note, setNote] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_task_notes") || "{}")[task.id] || ""; } catch { return ""; }
  });
  const saveNote = (text) => {
    setNote(text);
    try {
      const all = JSON.parse(localStorage.getItem("lifeos_task_notes") || "{}");
      all[task.id] = text;
      localStorage.setItem("lifeos_task_notes", JSON.stringify(all));
    } catch {}
  };

  // Embedded context: task was opened from within a project (has _projectId set)
  const embeddedContext = task._projectId ? {
    projectId: task._projectId,
    projectTitle: task._projectTitle,
    krId: task._krId,
    krLabel: task._krLabel,
    krTitle: task._krTitle,
    embedded: true,
  } : null;

  // OKR context: task is from Dashboard, linked to a quarterly objective KR
  const okrContext = !embeddedContext && task._objectiveTitle ? {
    objectiveTitle: task._objectiveTitle,
    krLabel: task._krLabel,
    krTitle: task._krTitle,
  } : null;

  const [assignment, setAssignment] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_task_assignments") || "{}")[task.id] || null; } catch { return null; }
  });
  const [editingAssignment, setEditingAssignment] = React.useState(false);

  // Pre-fill only for unassigned tasks with project context
  const [selProject, setSelProject] = React.useState(
    assignment?.projectId || (!assignment && task._projectId ? task._projectId : "")
  );
  const [selKR, setSelKR] = React.useState(
    assignment?.krId || (!assignment && task._krId ? task._krId : "")
  );
  const selProj = (typeof PROJECTS !== "undefined" ? PROJECTS : []).find(p => p.id === selProject);

  const saveAssignment = () => {
    if (!selProject || !selKR) return;
    const proj = (typeof PROJECTS !== "undefined" ? PROJECTS : []).find(p => p.id === selProject);
    const projKRs = proj ? (proj.objectives || [{ krs: proj.krs || [] }]).flatMap(o => o.krs) : [];
    const kr = projKRs.find(k => k.id === selKR);
    const entry = { projectId: selProject, krId: selKR, projectTitle: proj?.title, krTitle: kr?.title };
    try {
      const all = JSON.parse(localStorage.getItem("lifeos_task_assignments") || "{}");
      all[task.id] = entry;
      localStorage.setItem("lifeos_task_assignments", JSON.stringify(all));
    } catch {}
    setAssignment(entry);
  };

  const removeAssignment = () => {
    try {
      const all = JSON.parse(localStorage.getItem("lifeos_task_assignments") || "{}");
      delete all[task.id];
      localStorage.setItem("lifeos_task_assignments", JSON.stringify(all));
    } catch {}
    setAssignment(null); setSelProject(""); setSelKR("");
  };

  const isDone = (() => {
    try { return new Set(JSON.parse(localStorage.getItem(`lifeos_done_${povId}`) || "[]")).has(task.id); } catch { return false; }
  })();

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
      {/* breadcrumb */}
      <button onClick={onBack} style={{
        background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 0,
        fontSize: 11, letterSpacing: "0.16em", fontWeight: 600, marginBottom: 24, display: "flex", alignItems: "center", gap: 6,
      }}>← {breadcrumb}</button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--line-soft)" }}>
        <div>
          <div style={{ marginBottom: 10 }}><POVChip pov={povId} /></div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em", color: isDone ? "var(--text-dim)" : "var(--text)", textDecoration: isDone ? "line-through" : "none" }}>
            {task.title}
          </h1>
          {task.sub && <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 6 }}>{task.sub}</div>}
          <div style={{ marginTop: 12 }}>
            {task.kr ? (
              <span style={{ padding: "3px 12px", color: povColor, border: `1px solid ${povColor}`, fontSize: 10, letterSpacing: "0.12em", fontWeight: 700 }}>→ {task.kr}</span>
            ) : (
              <span style={{ padding: "3px 12px", color: "var(--warn)", border: "1px solid rgba(212,162,60,.4)", background: "var(--warn-soft)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em" }}>⚠ SIDE QUEST — Kein KR</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <div className="mono" style={{ fontSize: 44, fontWeight: 500, lineHeight: 1, color: isActive ? "var(--accent)" : "var(--text-dim)", textShadow: isActive ? "0 0 30px var(--accent)" : "none", transition: "all .3s" }}>
            {fmtTime(elapsed)}
          </div>
          {isActive && <div className="uppercase-label" style={{ color: "var(--accent)" }}>● LÄUFT</div>}
          <button disabled={isDone} onClick={() => setActiveTaskId(isActive ? null : task.id)}
            style={{
              padding: "11px 28px", background: isActive ? "var(--accent)" : "var(--panel-2)",
              color: isActive ? "#0a0a0c" : "var(--text)",
              border: "1px solid " + (isActive ? "var(--accent)" : "var(--line)"),
              fontWeight: 700, fontSize: 12, letterSpacing: "0.18em",
              cursor: isDone ? "default" : "pointer", opacity: isDone ? 0.4 : 1,
            }}>{isDone ? "DONE" : isActive ? "PAUSE" : "START →"}</button>
          {elapsed > 0 && setTaskTimes && (
            <button onClick={() => setTaskTimes(prev => ({ ...prev, [task.id]: 0 }))}
              style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 9.5, letterSpacing: "0.14em", cursor: "pointer", padding: 0 }}>RESET</button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Notes */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "20px 24px" }}>
          <div className="uppercase-label" style={{ marginBottom: 14 }}>Notizen</div>
          <textarea value={note} onChange={e => saveNote(e.target.value)}
            placeholder="Notizen zu dieser Aufgabe… (wird automatisch gespeichert)"
            rows={10}
            style={{
              width: "100%", background: "var(--panel-2)",
              border: "1px solid var(--line)", borderLeft: "2px solid var(--accent)",
              color: "var(--text)", padding: "12px 16px",
              fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none",
              boxSizing: "border-box", lineHeight: 1.6,
            }} />
          {note && <div style={{ marginTop: 8, fontSize: 9.5, color: "var(--accent)", letterSpacing: "0.1em" }}>● GESPEICHERT</div>}
        </div>

        {/* Project assignment */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "20px 24px" }}>
          <div className="uppercase-label" style={{ marginBottom: 14 }}>Projekt</div>

          {/* Embedded context — task is structurally part of a project */}
          {embeddedContext ? (
            <div style={{ padding: "14px 16px", background: "var(--accent-soft)", border: "1px solid var(--accent-line)" }}>
              <div style={{ fontSize: 9.5, color: "var(--accent)", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 8 }}>IM PROJEKT</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{embeddedContext.projectTitle}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {embeddedContext.krLabel && <span style={{ fontWeight: 600 }}>{embeddedContext.krLabel}:</span>} {embeddedContext.krTitle}
              </div>
            </div>
          ) : (
            <>
              {/* OKR context badge */}
              {okrContext && task.kr && (
                <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(47,139,255,0.06)", border: "1px solid var(--line)", fontSize: 11, color: "var(--text-dim)" }}>
                  <span style={{ fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700, color: "var(--accent)", marginRight: 8 }}>QUARTERLY OKR</span>
                  {okrContext.krLabel && <span style={{ fontWeight: 600, color: "var(--text)" }}>{okrContext.krLabel}</span>}
                  {okrContext.krTitle && <span> — {okrContext.krTitle}</span>}
                </div>
              )}

              {/* Assignment badge — shown when assigned and not editing */}
              {assignment && !editingAssignment ? (
                <div style={{ padding: "10px 14px", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: "var(--accent)", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 3 }}>✓ ZUGEWIESEN</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{assignment.projectTitle}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>→ {assignment.krTitle}</div>
                  </div>
                  <button onClick={() => { setSelProject(assignment.projectId); setSelKR(assignment.krId); setEditingAssignment(true); }}
                    title="Zuweisung bearbeiten"
                    style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 15, padding: "4px 8px", lineHeight: 1 }}>✎</button>
                </div>
              ) : !assignment && !editingAssignment ? (
                /* No assignment — show form (pre-filled if context available) */
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {!selProject && (
                    <div style={{ padding: "10px 14px", border: "1px dashed var(--line)", color: "var(--text-faint)", fontSize: 11 }}>
                      Kein Projekt — erscheint als "Frei" in Mission Control.
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-faint)", marginBottom: 6 }}>PROJEKT</div>
                    <select value={selProject} onChange={e => { setSelProject(e.target.value); setSelKR(""); }}
                      style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: selProject ? "var(--text)" : "var(--text-faint)", padding: "10px 14px", fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                      <option value="">— Projekt wählen —</option>
                      {(typeof PROJECTS !== "undefined" ? PROJECTS : []).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  {selProject && (
                    <div>
                      <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-faint)", marginBottom: 6 }}>KEY RESULT</div>
                      <select value={selKR} onChange={e => setSelKR(e.target.value)}
                        style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: selKR ? "var(--text)" : "var(--text-faint)", padding: "10px 14px", fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                        <option value="">— Key Result wählen —</option>
                        {(selProj ? (selProj.objectives || [{ krs: selProj.krs || [] }]).flatMap(o => o.krs) : []).filter(k => k.status !== "locked").map(kr => (
                          <option key={kr.id} value={kr.id}>{kr.label}: {kr.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {selProject && selKR && (
                    <button onClick={saveAssignment} style={{ padding: "10px 0", background: "var(--accent)", color: "#0a0a0c", border: "none", fontWeight: 700, fontSize: 11, letterSpacing: "0.16em", cursor: "pointer" }}>
                      ZUWEISEN ✓
                    </button>
                  )}
                </div>
              ) : (
                /* Edit mode */
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-faint)", marginBottom: 6 }}>PROJEKT ÄNDERN</div>
                    <select value={selProject} onChange={e => { setSelProject(e.target.value); setSelKR(""); }}
                      style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--accent-line)", color: "var(--text)", padding: "10px 14px", fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                      <option value="">— Projekt wählen —</option>
                      {(typeof PROJECTS !== "undefined" ? PROJECTS : []).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  {selProject && (
                    <div>
                      <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-faint)", marginBottom: 6 }}>KEY RESULT</div>
                      <select value={selKR} onChange={e => setSelKR(e.target.value)}
                        style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--accent-line)", color: "var(--text)", padding: "10px 14px", fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                        <option value="">— Key Result wählen —</option>
                        {(selProj ? (selProj.objectives || [{ krs: selProj.krs || [] }]).flatMap(o => o.krs) : []).filter(k => k.status !== "locked").map(kr => (
                          <option key={kr.id} value={kr.id}>{kr.label}: {kr.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    {selProject && selKR && (
                      <button onClick={() => { saveAssignment(); setEditingAssignment(false); }}
                        style={{ flex: 1, padding: "10px 0", background: "var(--accent)", color: "#0a0a0c", border: "none", fontWeight: 700, fontSize: 11, letterSpacing: "0.16em", cursor: "pointer" }}>
                        SPEICHERN ✓
                      </button>
                    )}
                    <button onClick={() => { setEditingAssignment(false); }}
                      style={{ padding: "10px 14px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 10.5, cursor: "pointer" }}>
                      ABBRECHEN
                    </button>
                    {assignment && (
                      <button onClick={() => { removeAssignment(); setEditingAssignment(false); }}
                        style={{ padding: "10px 14px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 10.5, cursor: "pointer" }}>
                        ENTFERNEN
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  fmtTime, fmtH, ProgressBar, StatusBadge, POVChip, FlowTag, MiniBars, useTimer, TaskDetail,
});
