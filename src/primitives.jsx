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

  const [noteText, setNoteText] = React.useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem("lifeos_task_notes") || "{}")[task.id];
      if (!v) return "";
      return typeof v === "string" ? v : (v.text || "");
    } catch { return ""; }
  });
  const [noteTs, setNoteTs] = React.useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem("lifeos_task_notes") || "{}")[task.id];
      return (v && typeof v === "object" && v.updatedAt) ? v.updatedAt : null;
    } catch { return null; }
  });
  const saveNote = (text) => {
    const updatedAt = new Date().toISOString();
    setNoteText(text);
    setNoteTs(updatedAt);
    try {
      const all = JSON.parse(localStorage.getItem("lifeos_task_notes") || "{}");
      all[task.id] = { text, updatedAt };
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

  // Est time (editable, minutes)
  const [est, setEst] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_task_est") || "{}")[task.id] || 0; } catch { return 0; }
  });
  const saveEst = (val) => {
    const n = Math.max(0, Math.round(val / 5) * 5);
    setEst(n);
    try {
      const all = JSON.parse(localStorage.getItem("lifeos_task_est") || "{}");
      all[task.id] = n;
      localStorage.setItem("lifeos_task_est", JSON.stringify(all));
    } catch {}
  };

  // Subtasks
  const [subtasks, setSubtasks] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_subtasks") || "{}")[task.id] || []; } catch { return []; }
  });
  const saveSubtasks = (arr) => {
    setSubtasks(arr);
    try {
      const all = JSON.parse(localStorage.getItem("lifeos_subtasks") || "{}");
      all[task.id] = arr;
      localStorage.setItem("lifeos_subtasks", JSON.stringify(all));
    } catch {}
  };
  const addSubtask = () => {
    const next = [...subtasks, { id: `st_${Date.now()}`, text: "", done: false }];
    saveSubtasks(next);
  };
  const doneCount = subtasks.filter(s => s.done).length;

  // Work sessions (read-only, written by app.jsx)
  const [sessions, setSessions] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_sessions") || "{}")[task.id] || []; } catch { return []; }
  });
  // Refresh sessions when task becomes active/inactive
  React.useEffect(() => {
    try { setSessions(JSON.parse(localStorage.getItem("lifeos_sessions") || "{}")[task.id] || []); } catch {}
  }, [task.id]);

  // KR override for side quests
  const [krOverride, setKrOverride] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_task_kr_overrides") || "{}")[task.id] || null; } catch { return null; }
  });
  const [assigningKR, setAssigningKR] = React.useState(false);
  const [selOvrKR, setSelOvrKR] = React.useState("");
  const povKRs = (POV_DATA[povId]?.objective?.keyResults || []).filter(k => k.status !== "locked");
  const saveKrOverride = (krId) => {
    setKrOverride(krId || null);
    try {
      const all = JSON.parse(localStorage.getItem("lifeos_task_kr_overrides") || "{}");
      if (krId) all[task.id] = krId; else delete all[task.id];
      localStorage.setItem("lifeos_task_kr_overrides", JSON.stringify(all));
    } catch {}
  };
  const effectiveKrId = task.kr || krOverride;
  const effectiveKrDef = effectiveKrId ? povKRs.find(k => k.id === effectiveKrId) : null;

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
            {effectiveKrId ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ padding: "3px 12px", color: povColor, border: `1px solid ${povColor}`, fontSize: 10, letterSpacing: "0.12em", fontWeight: 700 }}>
                  → {effectiveKrDef?.label || effectiveKrId}
                </span>
                {krOverride && !task.kr && (
                  <button onClick={() => saveKrOverride(null)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 9.5, letterSpacing: "0.1em", padding: 0 }}>× zurücksetzen</button>
                )}
              </div>
            ) : assigningKR ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select value={selOvrKR} onChange={e => setSelOvrKR(e.target.value)}
                  style={{ background: "var(--panel-2)", border: "1px solid var(--accent-line)", color: selOvrKR ? "var(--text)" : "var(--text-faint)", padding: "5px 10px", fontSize: 11, fontFamily: "inherit", outline: "none" }}>
                  <option value="">KR wählen…</option>
                  {povKRs.map(kr => <option key={kr.id} value={kr.id}>{kr.label}</option>)}
                </select>
                <button disabled={!selOvrKR} onClick={() => { saveKrOverride(selOvrKR); setAssigningKR(false); }}
                  style={{ padding: "5px 12px", background: selOvrKR ? "var(--accent)" : "var(--panel-2)", color: selOvrKR ? "#0a0a0c" : "var(--text-faint)", border: "none", fontWeight: 700, fontSize: 10, cursor: selOvrKR ? "pointer" : "default" }}>✓</button>
                <button onClick={() => { setAssigningKR(false); setSelOvrKR(""); }}
                  style={{ padding: "5px 10px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 10, cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ padding: "3px 12px", color: "var(--warn)", border: "1px solid rgba(212,162,60,.4)", background: "var(--warn-soft)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em" }}>⚠ SIDE QUEST — Kein KR</span>
                {povKRs.length > 0 && (
                  <button onClick={() => setAssigningKR(true)} style={{
                    padding: "3px 12px", background: "transparent", border: "1px solid var(--line)",
                    color: "var(--text-faint)", fontSize: 9.5, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer",
                  }}>→ KR ZUWEISEN</button>
                )}
              </div>
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

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>

        {/* Est Zeit */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "16px 18px" }}>
          <div className="uppercase-label" style={{ marginBottom: 10 }}>Geschätzte Zeit</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" min={0} step={5} value={est || ""}
              onChange={e => saveEst(Number(e.target.value))}
              onBlur={e => !e.target.value && saveEst(0)}
              placeholder="—"
              style={{
                width: 64, background: "var(--panel-2)", border: "1px solid var(--line)",
                color: "var(--text)", padding: "6px 8px", fontSize: 20,
                fontFamily: "'JetBrains Mono',monospace", outline: "none",
                textAlign: "right", MozAppearance: "textfield",
              }} />
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>min</span>
          </div>
          {est > 0 && elapsed > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 3, background: "var(--line-soft)", marginBottom: 4 }}>
                <div style={{ height: "100%", background: elapsed/60 > est ? "var(--danger)" : "var(--accent)", width: `${Math.min(100, (elapsed/60)/est*100)}%`, transition: "width .4s" }} />
              </div>
              <div style={{ fontSize: 9.5, color: elapsed/60 > est ? "var(--danger)" : "var(--text-faint)", letterSpacing: "0.08em" }}>
                {Math.round(elapsed/60)}/{est} min
              </div>
            </div>
          )}
        </div>

        {/* Total tracked */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "16px 18px" }}>
          <div className="uppercase-label" style={{ marginBottom: 10 }}>Getracked</div>
          <div className="mono" style={{ fontSize: 22, color: elapsed > 0 ? "var(--accent)" : "var(--text-faint)" }}>
            {fmtTime(elapsed)}
          </div>
          {sessions.length > 0 && (
            <div style={{ fontSize: 9.5, color: "var(--text-faint)", marginTop: 6, letterSpacing: "0.08em" }}>
              {sessions.length} Session{sessions.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Subtask progress */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "16px 18px" }}>
          <div className="uppercase-label" style={{ marginBottom: 10 }}>Subtasks</div>
          <div className="mono" style={{ fontSize: 22, color: subtasks.length === 0 ? "var(--text-faint)" : doneCount === subtasks.length && subtasks.length > 0 ? "var(--good)" : "var(--text-dim)" }}>
            {subtasks.length === 0 ? "—" : `${doneCount}/${subtasks.length}`}
          </div>
          {subtasks.length > 0 && (
            <div style={{ height: 3, background: "var(--line-soft)", marginTop: 8 }}>
              <div style={{ height: "100%", background: doneCount === subtasks.length ? "var(--good)" : "var(--accent)", width: `${subtasks.length > 0 ? doneCount/subtasks.length*100 : 0}%`, transition: "width .3s" }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Subtasks ──────────────────────────────────────────────────────── */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: subtasks.length > 0 ? 14 : 0 }}>
          <div className="uppercase-label">
            Subtasks
            {subtasks.length > 0 && (
              <span style={{ marginLeft: 8, color: doneCount === subtasks.length ? "var(--good)" : "var(--accent)", fontWeight: 700 }}>
                {doneCount}/{subtasks.length}
              </span>
            )}
          </div>
          <button onClick={addSubtask} style={{
            background: "none", border: "1px dashed var(--line)", color: "var(--accent)",
            padding: "3px 12px", fontSize: 9.5, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer",
          }}>+ SUBTASK</button>
        </div>
        {subtasks.length === 0 && (
          <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontStyle: "italic" }}>
            Task in Zwischenschritte aufteilen — + SUBTASK klicken.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {subtasks.map((st, i) => (
            <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => {
                const next = [...subtasks]; next[i] = { ...next[i], done: !next[i].done }; saveSubtasks(next);
              }} style={{
                width: 18, height: 18, borderRadius: 3, cursor: "pointer", flexShrink: 0,
                background: st.done ? "var(--accent)" : "transparent",
                border: `2px solid ${st.done ? "var(--accent)" : "var(--line)"}`,
                color: st.done ? "#0a0a0c" : "transparent",
                fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                transition: "all .15s",
              }}>{st.done ? "✓" : ""}</button>
              <input
                autoFocus={st.text === ""}
                value={st.text}
                onChange={e => { const n = [...subtasks]; n[i] = { ...n[i], text: e.target.value }; saveSubtasks(n); }}
                onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Backspace" && !st.text) saveSubtasks(subtasks.filter((_, j) => j !== i)); }}
                placeholder="Zwischenschritt…"
                style={{
                  flex: 1, background: "transparent", border: "none",
                  borderBottom: "1px solid var(--line-soft)",
                  color: st.done ? "var(--text-faint)" : "var(--text)",
                  textDecoration: st.done ? "line-through" : "none",
                  fontSize: 13, padding: "4px 0", outline: "none", fontFamily: "inherit",
                }} />
              <button onClick={() => saveSubtasks(subtasks.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: "0 4px", opacity: 0.5, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Notes — full width */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div className="uppercase-label">Notizen</div>
          {noteTs && (
            <span style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.08em" }}>
              {(() => {
                const diff = Math.floor((Date.now() - new Date(noteTs).getTime()) / 1000);
                if (diff < 60) return "gerade eben";
                if (diff < 3600) return `vor ${Math.floor(diff/60)} Min.`;
                if (diff < 86400) return `vor ${Math.floor(diff/3600)} Std.`;
                return `vor ${Math.floor(diff/86400)} Tagen`;
              })()}
            </span>
          )}
        </div>
        <textarea value={noteText} onChange={e => saveNote(e.target.value)}
          placeholder="Notizen, Kontext, nächste Schritte…"
          rows={8}
          style={{
            width: "100%", background: "var(--panel-2)",
            border: "1px solid var(--line)", borderLeft: "2px solid var(--accent)",
            color: "var(--text)", padding: "12px 16px",
            fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none",
            boxSizing: "border-box", lineHeight: 1.6,
          }} />
        {noteText && <div style={{ marginTop: 8, fontSize: 9.5, color: "var(--accent)", letterSpacing: "0.1em" }}>● GESPEICHERT</div>}
      </div>

      {/* ── Work Log ──────────────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 22px", marginTop: 16 }}>
          <div className="uppercase-label" style={{ marginBottom: 14 }}>Arbeitsvorgänge</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...sessions].reverse().map((s, i) => {
              const d = new Date(s.ts);
              const DE_DAYS = ["So","Mo","Di","Mi","Do","Fr","Sa"];
              const dateStr = `${DE_DAYS[d.getDay()]}, ${d.getDate()}.${d.getMonth()+1}. · ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} Uhr`;
              return (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 14px", background: "var(--panel-2)",
                  borderLeft: `2px solid ${i === 0 ? "var(--accent)" : "var(--line)"}`,
                }}>
                  <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontFamily: "'JetBrains Mono',monospace" }}>{dateStr}</span>
                  <span className="mono" style={{ fontSize: 13, color: i === 0 ? "var(--accent)" : "var(--text-dim)", fontWeight: 600 }}>{fmtTime(s.dur)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.08em" }}>
            Gesamt: <span style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace" }}>{fmtTime(sessions.reduce((a, s) => a + s.dur, 0))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  fmtTime, fmtH, ProgressBar, StatusBadge, POVChip, FlowTag, MiniBars, useTimer, TaskDetail,
});
