// Mission Control — overview list + project detail + KR drill-down.

function getObjectives(proj) {
  if (proj.objectives && proj.objectives.length > 0) return proj.objectives;
  return [{ id: "obj1", title: proj.objective || "", period: "", krs: proj.krs || [] }];
}

// ── Gantt Timeline View ───────────────────────────────────────────────────────
function GanttTimeline({ projects, allPovs, archivedIds, onBack }) {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var pad = function(n) { return String(n).padStart(2, "0"); };
  var toIso = function(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  var todayIso = toIso(today);

  // Grid: 4 past weeks + today's week + 11 future weeks = 16 weeks
  var weekStart = new Date(today);
  var dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  weekStart.setDate(today.getDate() - dow - 4 * 7); // 4 weeks back
  weekStart.setHours(0, 0, 0, 0);
  var TOTAL_WEEKS = 16;

  var weeks = Array.from({ length: TOTAL_WEEKS }, function(_, i) {
    var d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i * 7);
    var thu = new Date(d); thu.setDate(d.getDate() + 3);
    var yr = thu.getFullYear();
    var jan4 = new Date(yr, 0, 4);
    var jan4Mo = new Date(jan4); jan4Mo.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1));
    var kw = Math.round((d - jan4Mo) / 604800000) + 1;
    var endD = new Date(d); endD.setDate(d.getDate() + 6);
    var isCurrentWk = toIso(d) <= todayIso && todayIso <= toIso(endD);
    return { startIso: toIso(d), endIso: toIso(endD), kw: kw, isCurrent: isCurrentWk, idx: i };
  });

  var gridStartIso = weeks[0].startIso;
  var gridEndIso = weeks[TOTAL_WEEKS - 1].endIso;
  var gridDays = Math.round((new Date(gridEndIso + "T00:00:00") - new Date(gridStartIso + "T00:00:00")) / 86400000) + 7;

  var isoToGridPct = function(iso) {
    if (!iso) return null;
    var d = Math.round((new Date(iso + "T00:00:00") - new Date(gridStartIso + "T00:00:00")) / 86400000);
    return Math.max(0, Math.min(100, d / gridDays * 100));
  };

  var activeProjects = projects.filter(function(p) { return !archivedIds.has(p.id); });

  var getProgress = function(proj) {
    var allActiveKRs = getObjectives(proj).flatMap(function(o) { return o.krs || []; }).filter(function(k) { return k.status !== "locked"; });
    if (allActiveKRs.length === 0) return 0;
    var customKRTasks = {};
    try { customKRTasks = JSON.parse(LS.getItem("lifeos_proj_tasks_" + proj.id) || "{}"); } catch {}
    var doneTasks = new Set();
    try { doneTasks = new Set(JSON.parse(LS.getItem("lifeos_done_" + proj.pov) || "[]")); } catch {}
    var total = 0, done = 0;
    allActiveKRs.forEach(function(kr) {
      var tasks = (kr.tasks || []).concat(customKRTasks[kr.id] || []);
      total += tasks.length;
      done += tasks.filter(function(t) { return doneTasks.has(t.id); }).length;
    });
    return total === 0 ? 0 : done / total;
  };

  var todayPct = isoToGridPct(todayIso);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
      {/* Back */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, fontSize:11, color:"var(--text-faint)", letterSpacing:"0.05em" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"var(--text-faint)", cursor:"pointer", padding:0, fontSize:11, letterSpacing:"0.16em", fontWeight:600 }}>{"MISSION CONTROL"}</button>
        <span>{">"}</span>
        <span style={{ color:"var(--text)" }}>{"TIMELINE"}</span>
      </div>

      <div className="uppercase-label" style={{ marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
        <Icon name="calendar" size={11} color="var(--text-faint)" />
        {"Projekt Timeline"}
      </div>
      <div style={{ fontSize:11, color:"var(--text-faint)", marginBottom:24 }}>{"Horizontale Zeitlinie aller aktiven Projekte · 16 Wochen"}</div>

      {activeProjects.length === 0 && (
        <div style={{ padding:"48px 0", textAlign:"center", color:"var(--text-faint)" }}>{"Keine aktiven Projekte."}</div>
      )}

      {activeProjects.length > 0 && (
        <div style={{ background:"var(--panel)", border:"1px solid var(--line-soft)", overflowX:"auto" }}>

          {/* Week header */}
          <div style={{ position:"relative", height:36, borderBottom:"1px solid var(--line)", minWidth:800 }}>
            {/* Today line in header */}
            {todayPct !== null && (
              <div style={{ position:"absolute", top:0, bottom:0, left: "calc(" + todayPct + "% + 200px * " + todayPct + " / 100)", width:1, background:"var(--danger)", opacity:0.6, pointerEvents:"none", zIndex:5 }} />
            )}
            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:200, borderRight:"1px solid var(--line)", display:"flex", alignItems:"center", paddingLeft:16 }}>
              <span style={{ fontSize:9, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)" }}>{"PROJEKT"}</span>
            </div>
            <div style={{ position:"absolute", left:200, right:0, top:0, bottom:0, display:"flex" }}>
              {weeks.map(function(w) {
                return (
                  <div key={w.startIso} style={{ flex:1, borderRight:"1px solid var(--line-soft)", display:"flex", alignItems:"center", justifyContent:"center",
                    background: w.isCurrent ? "rgba(16,185,129,0.06)" : "transparent" }}>
                    <span style={{ fontSize:8.5, letterSpacing:"0.1em", fontWeight: w.isCurrent ? 800 : 600, color: w.isCurrent ? "var(--accent)" : "var(--text-faint)" }}>{"KW " + w.kw}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project rows */}
          {activeProjects.map(function(proj) {
            var povMeta = allPovs.find(function(p) { return p.id === proj.pov; });
            var povColor = (povMeta || {}).color || "var(--accent)";
            var progress = getProgress(proj);
            var deadlinePct = proj.deadline ? isoToGridPct(proj.deadline) : null;
            var startPct = isoToGridPct(todayIso); // bar starts at today if no explicit start

            return (
              <div key={proj.id} style={{ display:"flex", borderBottom:"1px solid var(--line-soft)", minHeight:52, position:"relative", minWidth:800 }}>
                {/* Name col */}
                <div style={{ width:200, flexShrink:0, borderRight:"1px solid var(--line-soft)", padding:"10px 16px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{proj.title}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:povColor, letterSpacing:"0.1em" }}>{(povMeta || {}).label ? (povMeta.label.toUpperCase()) : proj.pov}</span>
                    <span className="mono" style={{ fontSize:9, color:"var(--text-faint)" }}>{Math.round(progress * 100) + "%"}</span>
                  </div>
                </div>

                {/* Timeline col */}
                <div style={{ flex:1, position:"relative", overflow:"hidden", display:"flex", alignItems:"center" }}>
                  {/* Current week bg */}
                  {weeks.filter(function(w) { return w.isCurrent; }).map(function(w) {
                    return <div key="cwbg" style={{ position:"absolute", left: (w.idx / TOTAL_WEEKS * 100) + "%", width: (1 / TOTAL_WEEKS * 100) + "%", top:0, bottom:0, background:"rgba(16,185,129,0.05)", pointerEvents:"none" }} />;
                  })}

                  {/* Today line */}
                  {todayPct !== null && (
                    <div style={{ position:"absolute", left: todayPct + "%", top:0, bottom:0, width:1, background:"var(--danger)", opacity:0.5, pointerEvents:"none", zIndex:5 }} />
                  )}

                  {/* Project bar */}
                  {(function() {
                    var barLeft = startPct != null ? startPct : 0;
                    var barRight = deadlinePct != null ? (100 - deadlinePct) : 0;
                    var barWidth = Math.max(0.5, 100 - barLeft - barRight);
                    var isOverdue = proj.deadline && proj.deadline < todayIso;
                    var barColor = isOverdue ? "var(--danger)" : povColor;
                    return (
                      <div style={{ position:"absolute", left: barLeft + "%", width: barWidth + "%", top:"50%", transform:"translateY(-50%)", height:14, background:"var(--ring-track)", borderRadius:2, overflow:"hidden", border:"1px solid " + barColor + "55" }}>
                        <div style={{ width: (progress * 100) + "%", height:"100%", background:barColor, opacity:0.75, borderRadius:2, transition:"width .4s" }} />
                      </div>
                    );
                  })()}

                  {/* Deadline marker */}
                  {deadlinePct !== null && (
                    <div style={{ position:"absolute", left: deadlinePct + "%", top:"50%", transform:"translate(-50%,-50%)", zIndex:4 }}>
                      <div style={{ width:8, height:8, background: proj.deadline < todayIso ? "var(--danger)" : "var(--warn)", borderRadius:1, transform:"rotate(45deg)" }} title={"Deadline: " + proj.deadline} />
                    </div>
                  )}

                  {/* No deadline label */}
                  {deadlinePct === null && (
                    <div style={{ position:"absolute", right:8, fontSize:8.5, letterSpacing:"0.1em", color:"var(--text-faint)", opacity:0.5 }}>{"OFFEN"}</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div style={{ padding:"10px 16px", display:"flex", gap:20, alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:10, height:10, background:"var(--danger)", borderRadius:"50%" }} />
              <span style={{ fontSize:9, color:"var(--text-faint)", letterSpacing:"0.1em" }}>{"HEUTE"}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, background:"var(--warn)", borderRadius:1, transform:"rotate(45deg)" }} />
              <span style={{ fontSize:9, color:"var(--text-faint)", letterSpacing:"0.1em" }}>{"DEADLINE"}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:16, height:8, background:"var(--ring-track)", border:"1px solid var(--line)", borderRadius:2, overflow:"hidden" }}>
                <div style={{ width:"60%", height:"100%", background:"var(--accent)", opacity:0.75 }} />
              </div>
              <span style={{ fontSize:9, color:"var(--text-faint)", letterSpacing:"0.1em" }}>{"FORTSCHRITT"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MissionControl({ pov, setPov, taskTimes, setTaskTimes, activeTaskId, setActiveTaskId, krProgress, setKrProgress, onOpenTask, userPovs = [], inbox = [], setInbox }) {
  // Merge hardcoded POVs with user-created custom POVs (from sync or local creation)
  const allPovs = React.useMemo(() => {
    // userPovs überschreiben hardcodierte POVs bei gleicher ID
    const userIds = new Set(userPovs.map(p => p.id));
    const baseFromHardcoded = POVS.filter(p => !userIds.has(p.id));
    const combined = [...baseFromHardcoded, ...userPovs];
    // Ensure POV_DATA entries exist for all POVs
    combined.forEach(p => {
      if (!POV_DATA[p.id]) {
        try {
          const saved = JSON.parse(LS.getItem("lifeos_pov_data") || "{}");
          POV_DATA[p.id] = { ...{ mainQuest: { title: "", progress: 0, period: "" }, objective: { title: "", period: "", keyResults: [] }, tasksToday: [] }, ...(saved[p.id] || {}) };
        } catch { POV_DATA[p.id] = { mainQuest: { title: "", progress: 0, period: "" }, objective: { title: "", period: "", keyResults: [] }, tasksToday: [] }; }
      }
    });
    return combined;
  }, [userPovs]);
  const [view, setView] = React.useState({ type: "list" });
  const [inboxExpanded, setInboxExpanded] = React.useState(false);
  const [inboxAssign, setInboxAssign] = React.useState({});

  // Load all KRs for a given POV from custom projects
  const getKRsForPov = (povId) => {
    let projs = [];
    try { projs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]"); } catch {}
    return [...PROJECTS, ...projs]
      .filter(p => p.pov === povId)
      .flatMap(proj => (proj.objectives || []).flatMap(o =>
        (o.krs || []).filter(k => k.status !== "locked").map(k => ({ ...k, _projId: proj.id, _projTitle: proj.title }))
      ));
  };

  const createTaskFromInbox = (item, idx) => {
    const assign = inboxAssign[item.id] || { pov: item.pov || null, kr: null };
    const targetPov = assign.pov;
    if (!targetPov) return; // POV must be selected first
    const taskId = "inbox_" + Date.now();
    const task = { id: taskId, title: item.text, sub: "", kr: assign.kr || null, elapsed: 0, pov: targetPov, custom: true };
    const tKey = `lifeos_tasks_${targetPov}`;
    let ex = []; try { ex = JSON.parse(LS.getItem(tKey) || "[]"); } catch {}
    LS.setItem(tKey, JSON.stringify([...ex, task]));
    if (setInbox) setInbox(prev => prev.filter(x => x.id !== item.id));
    setInboxAssign(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    window.dispatchEvent(new CustomEvent("lifeos-tasks-updated", { detail: { pov: targetPov } }));
  };
  const [mcFilter, setMcFilter] = React.useState("alle");
  const [freeOpen, setFreeOpen] = React.useState(false);
  const [showNewModal, setShowNewModal] = React.useState(false);
  const [newModalPov, setNewModalPov] = React.useState(null);

  const [showWizard, setShowWizard] = React.useState(false);
  const [wizardDefaultPov, setWizardDefaultPov] = React.useState(null);
  const [wizardInitialDraft, setWizardInitialDraft] = React.useState(null);

  const handleWizardSave = (project, mode) => {
    if (mode === "existing") {
      setCustomProjects(prev => {
        const updated = prev.map(p => p.id === project.id ? { ...p, ...project } : p);
        LS.setItem("lifeos_custom_projects", JSON.stringify(updated));
        return updated;
      });
    } else {
      setCustomProjects(prev => {
        const updated = [...prev, project];
        LS.setItem("lifeos_custom_projects", JSON.stringify(updated));
        return updated;
      });
    }
    setShowWizard(false);
    setWizardDefaultPov(null);
    setWizardInitialDraft(null);
  };

  const [customProjects, setCustomProjects] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_custom_projects") || "[]"); } catch { return []; }
  });
  React.useEffect(() => {
    LS.setItem("lifeos_custom_projects", JSON.stringify(customProjects));
    window.dispatchEvent(new CustomEvent("lifeos-projects-updated"));
  }, [customProjects]);

  const [archivedIds, setArchivedIds] = React.useState(() => {
    try { return new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]")); } catch { return new Set(); }
  });
  React.useEffect(() => {
    LS.setItem("lifeos_archived_projects", JSON.stringify([...archivedIds]));
    window.dispatchEvent(new CustomEvent("lifeos-projects-updated"));
  }, [archivedIds]);
  const [showArchived, setShowArchived] = React.useState(false);
  React.useEffect(() => { if (archivedIds.size === 0) setShowArchived(false); }, [archivedIds]);

  const archiveProject = (id) => setArchivedIds(prev => { const n = new Set(prev); n.add(id); return n; });
  const unarchiveProject = (id) => setArchivedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  const addCustomProject = (proj) => setCustomProjects(prev => [...prev, proj]);

  // MainQuest edits — persisted
  const [mqEdits, setMqEdits] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_mq_edits") || "{}"); } catch { return {}; }
  });
  React.useEffect(() => { LS.setItem("lifeos_mq_edits", JSON.stringify(mqEdits)); }, [mqEdits]);
  const [editingMQ, setEditingMQ] = React.useState(null);
  const [mqDraft, setMqDraft] = React.useState({});

  // Which MainQuest sections are expanded
  const [openMQs, setOpenMQs] = React.useState(() => new Set(allPovs.map(p => p.id)));
  const toggleMQ = (povId) => setOpenMQs(prev => {
    const n = new Set(prev); n.has(povId) ? n.delete(povId) : n.add(povId); return n;
  });

  // Project progress across all objectives
  const getProjectProgress = (proj) => {
    const allActiveKRs = getObjectives(proj).flatMap(o => o.krs).filter(k => k.status !== "locked");
    if (allActiveKRs.length === 0) return 0;
    let customKRTasks = {};
    try { customKRTasks = JSON.parse(LS.getItem(`lifeos_proj_tasks_${proj.id}`) || "{}"); } catch {}
    let doneTasks = new Set();
    try { doneTasks = new Set(JSON.parse(LS.getItem(`lifeos_done_${proj.pov}`) || "[]")); } catch {}
    let total = 0, done = 0;
    for (const kr of allActiveKRs) {
      const tasks = [...kr.tasks, ...(customKRTasks[kr.id] || [])];
      total += tasks.length;
      done += tasks.filter(t => doneTasks.has(t.id)).length;
    }
    return total === 0 ? 0 : done / total;
  };

  const getMQData = (povId) => {
    const base = (POV_DATA[povId] || POV_DATA.founder).mainQuest;
    return { ...base, ...(mqEdits[povId] || {}) };
  };

  const getMQProgress = (povId) => {
    const allProjs = [...PROJECTS, ...customProjects].filter(p => p.pov === povId && !archivedIds.has(p.id));
    if (allProjs.length > 0) {
      return allProjs.reduce((sum, p) => sum + getProjectProgress(p), 0) / allProjs.length;
    }
    // fallback: task completion
    const hardcoded = (POV_DATA[povId]?.tasksToday || []);
    let custom = [];
    try { custom = JSON.parse(LS.getItem(`lifeos_tasks_${povId}`) || "[]"); } catch {}
    const allTasks = [...hardcoded, ...custom];
    let done = new Set();
    try { done = new Set(JSON.parse(LS.getItem(`lifeos_done_${povId}`) || "[]")); } catch {}
    return allTasks.length > 0 ? allTasks.filter(t => done.has(t.id)).length / allTasks.length : 0;
  };

  // Free tasks (dashboard tasks not in any project)
  const rawFreeTasks = React.useMemo(() => {
    const povIds = mcFilter === "alle" ? allPovs.map(p => p.id) : [mcFilter];
    const result = [];
    for (const povId of povIds) {
      const data = POV_DATA[povId] || {};
      const hardcoded = (data.tasksToday || []).map(t => ({ ...t, _pov: povId }));
      let custom = [];
      try { custom = JSON.parse(LS.getItem(`lifeos_tasks_${povId}`) || "[]").map(t => ({ ...t, _pov: povId })); } catch {}
      result.push(...hardcoded, ...custom);
    }
    return result;
  }, [mcFilter]);

  // Free task order — drag & drop reordering
  const [freeTaskOrder, setFreeTaskOrder] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_free_task_order") || "null"); } catch { return null; }
  });
  React.useEffect(() => {
    if (freeTaskOrder !== null) LS.setItem("lifeos_free_task_order", JSON.stringify(freeTaskOrder));
  }, [freeTaskOrder]);

  const freeTasks = React.useMemo(() => {
    if (!freeTaskOrder || freeTaskOrder.length === 0) return rawFreeTasks;
    const orderMap = {};
    freeTaskOrder.forEach((id, i) => { orderMap[id] = i; });
    return [...rawFreeTasks].sort((a, b) => (orderMap[a.id] ?? 9999) - (orderMap[b.id] ?? 9999));
  }, [rawFreeTasks, freeTaskOrder]);

  const [freeDragIdx, setFreeDragIdx] = React.useState(null);
  const [freeDragOverIdx, setFreeDragOverIdx] = React.useState(null);

  const handleFreeDrop = (fromIdx, toIdx) => {
    if (fromIdx === null || fromIdx === toIdx) return;
    const cur = [...freeTasks];
    const [moved] = cur.splice(fromIdx, 1);
    cur.splice(toIdx, 0, moved);
    setFreeTaskOrder(cur.map(t => t.id));
  };

  const [doneVer, setDoneVer] = React.useState(0);
  const isDoneTask = (taskId, povId) => {
    try { return new Set(JSON.parse(LS.getItem(`lifeos_done_${povId}`) || "[]")).has(taskId); } catch { return false; }
  };
  const toggleFreeTaskDone = (taskId, povId) => {
    const key = `lifeos_done_${povId}`;
    const done = new Set(JSON.parse(LS.getItem(key) || "[]"));
    done.has(taskId) ? done.delete(taskId) : done.add(taskId);
    LS.setItem(key, JSON.stringify([...done]));
    setDoneVer(v => v + 1);
  };

  // ── Skip-Status (heute ueberspringen) ────────────────────────────────────────
  var todaySkipKey = "lifeos_skips_" + new Date().toISOString().slice(0, 10);
  const [skippedIds, setSkippedIds] = React.useState(function() {
    try { return new Set(JSON.parse(LS.getItem(todaySkipKey) || "[]")); } catch { return new Set(); }
  });
  const toggleSkip = function(taskId) {
    setSkippedIds(function(prev) {
      var next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      LS.setItem(todaySkipKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // --- View guards ---
  if (view.type === "inbox") {
    return (
      <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.05em" }}>
          <button onClick={() => setView({ type: "list" })} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 0, fontSize: 11, letterSpacing: "0.16em", fontWeight: 600 }}>
            MISSION CONTROL
          </button>
          <span>›</span>
          <span style={{ color: "var(--text)" }}>INBOX</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div className="uppercase-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="zap" size={11} color="var(--text-faint)" />
              Quick Capture · {inbox.length} Item{inbox.length !== 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>POV und Key Result zuweisen, dann Task erstellen.</div>
          </div>
          {inbox.length > 0 && setInbox && (
            <button onClick={() => { if (window.confirm("Alle Items loeschen?")) setInbox([]); }} style={{
              padding: "7px 16px", background: "transparent", border: "1px solid var(--danger)",
              color: "var(--danger)", fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700, cursor: "pointer",
            }}>ALLE LOESCHEN</button>
          )}
        </div>
        {inbox.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
            Inbox ist leer.
          </div>
        ) : [...inbox].reverse().map((item, idx) => {
          const assign = inboxAssign[item.id] || { pov: item.pov || null, kr: null };
          const assignPov = allPovs.find(p => p.id === assign.pov);
          const povColor = assignPov?.color || null;
          const krsForPov = getKRsForPov(assign.pov);
          const ts = item.ts ? new Date(item.ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";
          return (
            <div key={item.id || idx} style={{ marginBottom: 12, background: "var(--panel)", border: "1px solid var(--line-soft)", borderLeft: `3px solid ${povColor || "var(--line)"}` }}>
              <div style={{ padding: "16px 20px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>{item.text}</div>
                    {ts && <div style={{ fontSize: 9.5, color: "var(--text-faint)", marginTop: 4 }}>{ts}</div>}
                  </div>
                  {setInbox && (
                    <button onClick={() => setInbox(prev => prev.filter(x => x.id !== item.id))} style={{
                      background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1,
                    }}>×</button>
                  )}
                </div>
                {/* POV Auswahl */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 8.5, letterSpacing: "0.14em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 6 }}>POV</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {allPovs.map(p => (
                      <button key={p.id} onClick={() => setInboxAssign(prev => ({ ...prev, [item.id]: { pov: p.id, kr: null } }))} style={{
                        padding: "4px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer",
                        background: assign.pov === p.id ? p.color : "transparent",
                        border: `1px solid ${assign.pov === p.id ? p.color : "var(--line)"}`,
                        color: assign.pov === p.id ? "#0a0a0c" : "var(--text-faint)",
                      }}>{p.label.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                {/* KR Auswahl */}
                {krsForPov.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 8.5, letterSpacing: "0.14em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 6 }}>KEY RESULT (optional)</div>
                    <select value={assign.kr || ""} onChange={e => setInboxAssign(prev => ({ ...prev, [item.id]: { ...assign, kr: e.target.value || null } }))}
                      style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: assign.kr ? "var(--text)" : "var(--text-faint)", padding: "6px 10px", fontSize: 11, fontFamily: "inherit", outline: "none" }}>
                      <option value="">Kein Key Result</option>
                      {krsForPov.map(kr => (
                        <option key={kr.id} value={kr.id}>{kr._projTitle ? `${kr._projTitle} · ` : ""}{kr.label}: {kr.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => assign.pov && createTaskFromInbox(item, idx)} style={{
                    flex: 1, padding: "8px 0",
                    background: assign.pov ? povColor : "var(--panel-2)",
                    color: assign.pov ? "#0a0a0c" : "var(--text-faint)",
                    border: assign.pov ? "none" : "1px solid var(--line)",
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
                    cursor: assign.pov ? "pointer" : "not-allowed", opacity: assign.pov ? 1 : 0.6,
                  }}>{assign.pov ? `TASK ERSTELLEN → ${assignPov?.label?.toUpperCase() || assign.pov.toUpperCase()}` : "← POV AUSWÄHLEN"}</button>
                  <button onClick={() => { if (setInbox) setInbox(prev => prev.filter(x => x.id !== item.id)); }} style={{
                    padding: "8px 14px", background: "transparent", border: "1px solid var(--line)",
                    color: "var(--text-faint)", fontSize: 10, cursor: "pointer",
                  }}>IGNORIEREN</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  if (view.type === "gantt") {
    return <GanttTimeline
      projects={[...PROJECTS, ...customProjects]}
      allPovs={allPovs}
      archivedIds={archivedIds}
      onBack={function() { setView({ type: "list" }); }}
    />;
  }

  if (view.type === "project") {
    const proj = [...PROJECTS, ...customProjects].find(p => p.id === view.id);
    if (!proj) return null;
    return <ProjectDetail proj={proj} onBack={() => setView({ type: "list" })}
      onOpenKR={(krId) => setView({ type: "kr", projectId: proj.id, krId })}
      taskTimes={taskTimes} setTaskTimes={setTaskTimes}
      activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
      krProgress={krProgress} setKrProgress={setKrProgress}
      onOpenTask={onOpenTask}
      onArchive={() => { archiveProject(proj.id); setShowArchived(true); setView({ type: "list" }); }}
      onOpenWizard={() => { setWizardInitialDraft({ mode: "existing", existingProjectId: proj.id, pov: proj.pov, projectName: proj.title }); setShowWizard(true); }}
      onSaveProjectEdit={(projId, changes) => setCustomProjects(prev => {
        const updated = prev.map(p => p.id === projId ? { ...p, ...changes } : p);
        LS.setItem("lifeos_custom_projects", JSON.stringify(updated));
        return updated;
      })} />;
  }
  if (view.type === "kr") {
    const proj = [...PROJECTS, ...customProjects].find(p => p.id === view.projectId);
    if (!proj) return null;
    return <KRDetail proj={proj} krId={view.krId}
      onBack={() => setView({ type: "project", id: proj.id })}
      onSwitchKR={(newKrId) => setView({ type: "kr", projectId: proj.id, krId: newKrId })}
      taskTimes={taskTimes} setTaskTimes={setTaskTimes}
      activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId} />;
  }

  // --- List view ---
  const allProjects = [...PROJECTS, ...customProjects];
  const activeProjects = allProjects.filter(p => !archivedIds.has(p.id));
  const archivedProjects = allProjects.filter(p => archivedIds.has(p.id));
  const displayPovs = mcFilter === "alle" ? allPovs.map(p => p.id) : [mcFilter];

  return (
    <div data-tutorial="mc-content-area" style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
      {showNewModal && (
        <NewProjectModal
          defaultPov={newModalPov}
          onClose={() => { setShowNewModal(false); setNewModalPov(null); }}
          onSave={(proj) => { addCustomProject(proj); setShowNewModal(false); setNewModalPov(null); }}
        />
      )}
      {showWizard && window.OKRWizard && React.createElement(window.OKRWizard, {
        defaultPov: wizardDefaultPov,
        customProjects: customProjects,
        onClose: () => { setShowWizard(false); setWizardDefaultPov(null); setWizardInitialDraft(null); },
        onSave: (project, mode) => { handleWizardSave(project, mode); window.TUTORIAL?.onAction?.('project-saved'); },
        initialDraft: wizardInitialDraft || (window.TUTORIAL?.active ? window.TUTORIAL.getPrefill?.() : null),
        "data-tutorial": "wizard-container",
      })}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="uppercase-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="crosshair" size={11} color="var(--text-faint)" />
          Mission Control
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView({ type: "gantt" })} style={{
            padding: "8px 16px", background: "transparent",
            border: "1px solid var(--line)",
            color: "var(--text-faint)",
            fontSize: 10, letterSpacing: "0.16em", fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <Icon name="calendar" size={13} strokeWidth={2} />
            {"ZEITLINIE"}
          </button>
          {archivedProjects.length > 0 && (
            <button onClick={() => setShowArchived(v => !v)} style={{
              padding: "8px 16px", background: "transparent",
              border: `1px solid ${showArchived ? "var(--text-dim)" : "var(--line)"}`,
              color: showArchived ? "var(--text)" : "var(--text-faint)",
              fontSize: 10, letterSpacing: "0.16em", fontWeight: 700, cursor: "pointer",
            }}>{"ARCHIV (" + archivedProjects.length + ")"}</button>
          )}
          <button onClick={() => {
            // Free-tier limit: max 2 projects
            if (window.checkFreeLimit && !window.checkFreeLimit("projects")) {
              window.triggerUpgrade?.("projects");
              return;
            }
            setNewModalPov(mcFilter !== "alle" ? mcFilter : null); setShowNewModal(true);
          }} style={{
            padding: "8px 16px", background: "var(--accent)", color: "#0a0a0c",
            border: "none", fontSize: 10.5, letterSpacing: "0.16em", fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <Icon name="plus" size={13} color="#0a0a0c" strokeWidth={2.5} />
            NEUES PROJEKT
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0 22px", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)", marginBottom: 28 }}>
        <span className="uppercase-label">Filter:</span>
        <button onClick={() => setMcFilter("alle")} style={{
          padding: "6px 16px", borderRadius: 999,
          border: `1px solid ${mcFilter === "alle" ? "var(--text-dim)" : "var(--line)"}`,
          color: mcFilter === "alle" ? "var(--text)" : "var(--text-faint)",
          background: "transparent", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.16em", cursor: "pointer",
        }}>ALLE</button>
        {allPovs.map(p => {
          const active = mcFilter === p.id;
          return (
            <button key={p.id} onClick={() => setMcFilter(active ? "alle" : p.id)} style={{
              padding: "6px 16px", borderRadius: 999,
              border: `1px solid ${active ? p.color : "var(--line)"}`,
              color: active ? p.color : "var(--text-faint)",
              background: "transparent", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.16em", cursor: "pointer",
            }}>{p.label.toUpperCase()}</button>
          );
        })}
      </div>

      {/* --- ARCHIV MODE: flat list --- */}
      {showArchived && (
        <div>
          <div className="uppercase-label" style={{ marginBottom: 16, color: "var(--text-faint)" }}>Archivierte Projekte</div>
          {archivedProjects.filter(p => mcFilter === "alle" || p.pov === mcFilter).map(p => {
            const povColor = allPovs.find(x => x.id === p.pov)?.color || "var(--accent)";
            return (
              <div key={p.id} style={{
                background: "var(--panel)", border: "1px solid var(--line-soft)",
                borderLeft: `3px solid var(--text-faint)`, padding: "18px 24px", marginBottom: 12, opacity: 0.6,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ marginBottom: 4 }}><POVChip pov={p.pov} /></div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{p.title}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setView({ type: "project", id: p.id })} style={{
                      padding: "8px 16px", background: "var(--panel-2)", border: "1px solid var(--line)",
                      color: "var(--text-faint)", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.14em", cursor: "pointer",
                    }}>ÖFFNEN</button>
                    <button onClick={() => unarchiveProject(p.id)} style={{
                      padding: "8px 16px", background: "var(--panel-2)", border: "1px solid var(--accent)",
                      color: "var(--accent)", fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700, cursor: "pointer",
                    }}>↩ WIEDERHERSTELLEN</button>
                  </div>
                </div>
              </div>
            );
          })}
          {archivedProjects.filter(p => mcFilter === "alle" || p.pov === mcFilter).length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Keine archivierten Projekte für diesen Filter.</div>
          )}
        </div>
      )}

      {/* --- MAIN VIEW: MainQuest grouped --- */}
      {!showArchived && (
        <div>

          {/* Freie Tasks */}
          {(function() {
            var visibleFT = freeTasks.filter(function(t) { return !skippedIds.has(t.id); });
            var skippedFT = freeTasks.filter(function(t) { return skippedIds.has(t.id); });
            if (freeTasks.length === 0) return null;
            return (
              <div style={{ marginBottom: 32 }}>
                <button onClick={function() { setFreeOpen(function(o) { return !o; }); }} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "transparent", border: "none", borderTop: "2px solid var(--line)",
                  borderBottom: freeOpen ? "none" : "2px solid var(--line)",
                  padding: "14px 0", cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 9.5, letterSpacing: "0.18em", fontWeight: 700, color: "var(--text-dim)" }}>{"FREIE TASKS"}</span>
                    <span style={{ padding: "2px 10px", background: "var(--panel-2)", border: "1px solid var(--line)", fontSize: 9.5, fontWeight: 700, color: "var(--text-faint)" }}>{visibleFT.length}</span>
                    {skippedFT.length > 0 && (
                      <span style={{ padding: "2px 8px", fontSize: 9, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", opacity: 0.6 }}>{"+ " + skippedFT.length + " uebersprungen"}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-faint)", transform: freeOpen ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block" }}>{"▶"}</span>
                </button>
                {freeOpen && (
                  <div style={{ border: "1px solid var(--line)", borderTop: "none" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "28px 120px 1fr 160px 110px 158px", gap: 16, padding: "10px 16px", borderBottom: "1px solid var(--line-soft)", background: "var(--panel)" }}>
                      {["", "POV", "TITEL", "KEY RESULT", "TIMER", ""].map(function(h, i) {
                        return <span key={i} style={{ fontSize: 9, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)" }}>{h}</span>;
                      })}
                    </div>
                    {visibleFT.map(function(t, _fi) {
                      var isActive = activeTaskId === t.id;
                      var elapsed = taskTimes[t.id] != null ? taskTimes[t.id] : (t.elapsed != null ? t.elapsed : 0);
                      var isDone = isDoneTask(t.id, t._pov);
                      var povColor = (allPovs.find(function(x) { return x.id === t._pov; }) || {}).color || "var(--accent)";
                      return (
                        <div key={t._pov + "_" + t.id + "_" + _fi}
                          draggable
                          onDragStart={function() { setFreeDragIdx(_fi); }}
                          onDragOver={function(e) { e.preventDefault(); setFreeDragOverIdx(_fi); }}
                          onDrop={function() { handleFreeDrop(freeDragIdx, freeDragOverIdx); setFreeDragIdx(null); setFreeDragOverIdx(null); }}
                          onDragEnd={function() { setFreeDragIdx(null); setFreeDragOverIdx(null); }}
                          style={{
                            display: "grid", gridTemplateColumns: "28px 120px 1fr 160px 110px 158px",
                            gap: 16, padding: "13px 16px",
                            borderTop: freeDragOverIdx === _fi && freeDragIdx !== _fi ? "2px solid var(--accent)" : "none",
                            borderBottom: "1px solid var(--line-soft)",
                            background: isActive ? "var(--subtle-bg)" : "transparent",
                            opacity: isDone ? 0.4 : freeDragIdx === _fi ? 0.4 : 1,
                            cursor: "grab",
                          }}>
                          <button onClick={function() { toggleFreeTaskDone(t.id, t._pov); }} style={{
                            width: 16, height: 16, borderRadius: 3, cursor: "pointer",
                            background: isDone ? "var(--accent)" : "transparent",
                            border: "2px solid " + (isDone ? "var(--accent)" : "var(--line)"),
                            color: isDone ? "#0a0a0c" : "transparent",
                            fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                            padding: 0, flexShrink: 0,
                          }}>{isDone ? "✓" : ""}</button>
                          <POVChip pov={t._pov} />
                          <div onClick={function() { if (onOpenTask) onOpenTask(Object.assign({}, t, { _pov: t._pov })); }} style={{ cursor: "pointer" }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--text-dim)" : "var(--accent)" }}>{t.title}</div>
                            {t.sub && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{t.sub}</div>}
                          </div>
                          <div>
                            {!t.kr
                              ? <span style={{ padding: "3px 10px", fontSize: 9.5, fontWeight: 700, color: "var(--warn)", border: "1px solid rgba(212,162,60,.4)", background: "var(--warn-soft)" }}>{"⚠ SIDE QUEST"}</span>
                              : <span style={{ padding: "3px 10px", color: povColor, border: "1px solid var(--line)", fontSize: 9.5, fontWeight: 700 }}>{"-> " + t.kr}</span>
                            }
                          </div>
                          <span className="mono" style={{ fontSize: 18, fontWeight: 500, color: isActive ? "var(--accent)" : "var(--text-faint)" }}>{fmtTime(elapsed)}</span>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button disabled={isDone} onClick={function() { setActiveTaskId(isActive ? null : t.id); }} style={{
                              flex: 1, padding: "7px 0",
                              background: isActive ? "var(--accent)" : "var(--panel-2)",
                              color: isActive ? "#0a0a0c" : "var(--text)",
                              border: "1px solid " + (isActive ? "var(--accent)" : "var(--line)"),
                              fontWeight: 700, fontSize: 10.5, letterSpacing: "0.14em",
                              cursor: isDone ? "default" : "pointer", opacity: isDone ? 0.4 : 1,
                            }}>{isDone ? "DONE" : isActive ? "PAUSE" : "START"}</button>
                            {!isDone && (
                              <button onClick={function() { toggleSkip(t.id); }} title="Heute ueberspringen" style={{
                                width: 28, height: 28, background: "transparent", flexShrink: 0,
                                border: "1px solid var(--line)", color: "var(--text-faint)",
                                cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1,
                              }}>{"↷"}</button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Uebersprungen heute */}
                    {skippedFT.length > 0 && (
                      <div style={{ borderTop: "1px solid var(--line-soft)", padding: "10px 16px", background: "var(--panel)" }}>
                        <div style={{ fontSize: 8.5, letterSpacing: "0.18em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8, opacity: 0.6 }}>{"UEBERSPRUNGEN HEUTE"}</div>
                        {skippedFT.map(function(t) {
                          return (
                            <div key={"skip_" + t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-soft)", opacity: 0.45 }}>
                              <span style={{ fontSize: 12.5, color: "var(--text-faint)", textDecoration: "line-through" }}>{t.title}</span>
                              <button onClick={function() { toggleSkip(t.id); }} style={{
                                background: "none", border: "1px solid var(--line)", color: "var(--text-faint)",
                                cursor: "pointer", padding: "3px 10px", fontSize: 9, letterSpacing: "0.12em", fontWeight: 700,
                              }}>{"ZURUECK"}</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* MainQuest sections */}
          {displayPovs.map(povId => {
            const povColor = allPovs.find(p => p.id === povId)?.color || "var(--accent)";
            const mqData = getMQData(povId);
            const mqProgress = getMQProgress(povId);
            const isOpen = openMQs.has(povId);
            const isEditing = editingMQ === povId;
            const povProjects = activeProjects.filter(p => p.pov === povId);
            const pct = Math.round(mqProgress * 100);

            return (
              <div key={povId} style={{ marginBottom: 36 }}>

                {/* ── MainQuest Banner ── */}
                <div data-tutorial="mc-main-quest-section" style={{
                  background: "var(--panel)",
                  border: "1px solid var(--line-soft)",
                  borderTop: `3px solid ${povColor}`,
                  padding: "22px 28px 20px",
                }}>
                  {/* top row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <POVChip pov={povId} />
                        <span style={{
                          fontSize: 9, letterSpacing: "0.22em", fontWeight: 700,
                          color: povColor, opacity: 0.7,
                        }}>MAIN QUEST</span>
                      </div>

                      {isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input
                            autoFocus
                            value={mqDraft.title ?? mqData.title}
                            onChange={e => setMqDraft(d => ({ ...d, title: e.target.value }))}
                            style={{
                              background: "var(--panel-2)", border: "1px solid var(--accent-line)",
                              color: "var(--text)", padding: "8px 12px", fontSize: 18, fontWeight: 700,
                              fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
                            }}
                          />
                          <input
                            value={mqDraft.period ?? mqData.period}
                            onChange={e => setMqDraft(d => ({ ...d, period: e.target.value }))}
                            placeholder="Zeitraum (z.B. Q2 2026)"
                            style={{
                              background: "var(--panel-2)", border: "1px solid var(--line)",
                              color: "var(--text-dim)", padding: "7px 12px", fontSize: 12,
                              fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
                            }}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => {
                              setMqEdits(prev => ({ ...prev, [povId]: {
                                title: mqDraft.title ?? mqData.title,
                                period: mqDraft.period ?? mqData.period,
                              }}));
                              setEditingMQ(null); setMqDraft({});
                            }} style={{
                              padding: "7px 18px", background: "var(--accent)", color: "#0a0a0c",
                              border: "none", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer",
                            }}>SPEICHERN ✓</button>
                            <button onClick={() => { setEditingMQ(null); setMqDraft({}); }} style={{
                              padding: "7px 14px", background: "transparent", border: "1px solid var(--line)",
                              color: "var(--text-faint)", fontSize: 10.5, cursor: "pointer",
                            }}>ABBRECHEN</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>
                            {mqData.title}
                          </h2>
                          {mqData.period && (
                            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 5, letterSpacing: "0.05em" }}>
                              {mqData.period}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* right: progress + controls */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div className="mono" style={{ fontSize: 32, fontWeight: 800, color: povColor, lineHeight: 1 }}>
                          {pct}%
                        </div>
                        <div style={{ fontSize: 9, letterSpacing: "0.16em", color: "var(--text-faint)", marginTop: 3 }}>
                          GESAMT
                        </div>
                      </div>
                      {!isEditing && (
                        <button
                          onClick={() => { setMqDraft({ title: mqData.title, period: mqData.period }); setEditingMQ(povId); }}
                          title="Bearbeiten"
                          data-tutorial="main-quest-edit"
                          style={{
                            background: "none", border: "1px solid var(--line)", color: "var(--text-faint)",
                            width: 32, height: 32, cursor: "pointer", fontSize: 14, display: "flex",
                            alignItems: "center", justifyContent: "center",
                          }}>✎</button>
                      )}
                      <button onClick={() => toggleMQ(povId)} style={{
                        background: "none", border: "1px solid var(--line)", color: "var(--text-faint)",
                        padding: "6px 12px", cursor: "pointer", fontSize: 10, letterSpacing: "0.14em", fontWeight: 700,
                        display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                      }}>
                        <span style={{ display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                        {povProjects.length} {povProjects.length === 1 ? "PROJEKT" : "PROJEKTE"}
                      </button>
                    </div>
                  </div>

                  {/* progress bar */}
                  <div style={{ marginTop: 18 }}>
                    <ProgressBar value={mqProgress} color={povColor} height={4} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.08em" }}>
                        {povProjects.length} Projekt{povProjects.length !== 1 ? "e" : ""} · {pct}% abgeschlossen
                      </span>
                      <span style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.08em" }}>
                        Main Quest → Projekte → Objectives → KRs
                      </span>
                    </div>
                  </div>

                  {/* OKR Wizard trigger */}
                  {!isEditing && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
                      <button
                        data-tutorial="new-project-btn"
                        onClick={() => { setWizardDefaultPov(povId); setShowWizard(true); window.TUTORIAL?.onAction?.('wizard-opened'); }}
                        style={{
                          padding: "9px 20px", background: "transparent",
                          border: "1px solid var(--accent-line)",
                          color: "var(--accent)",
                          fontSize: 10, letterSpacing: "0.18em", fontWeight: 700,
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >⚡ OKR WIZARD — PROJEKT ERSTELLEN</button>
                    </div>
                  )}
                </div>

                {/* ── Projects under this MainQuest ── */}
                {isOpen && (
                  <div style={{ borderLeft: `2px solid ${povColor}`, marginLeft: 14, paddingLeft: 0, opacity: 0.98 }}>
                    {povProjects.length === 0 && (
                      <div style={{
                        padding: "20px 24px", color: "var(--text-faint)", fontSize: 12,
                        border: "1px solid var(--line-soft)", borderTop: "none",
                        background: "var(--panel)",
                      }}>
                        Noch kein Projekt für diesen Main Quest. Erstelle eins →
                      </div>
                    )}
                    {povProjects.map((p) => {
                      const delta = p.realityH - p.planH;
                      const deltaColor = delta < 0 ? "var(--danger)" : delta > 0 ? "var(--good)" : "var(--accent)";
                      const progress = getProjectProgress(p);
                      const objCount = getObjectives(p).length;
                      return (
                        <div key={p.id} style={{
                          background: "var(--panel)", border: "1px solid var(--line-soft)", borderTop: "none",
                          borderLeft: `3px solid ${povColor}`, padding: "18px 24px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 700 }}>{p.title}</div>
                              {objCount > 1 && (
                                <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-faint)", marginTop: 3 }}>{objCount} OBJECTIVES</div>
                              )}
                            </div>
                            <StatusBadge status={p.status} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 24, alignItems: "end", marginBottom: 12 }}>
                            <Metric label="REALITÄT" value={`${p.realityH}h`} />
                            <Metric label="PLAN"    value={`${p.planH}h`}    color="var(--text-dim)" />
                            <Metric label="DELTA"   value={fmtH(delta)}      color={deltaColor} bold />
                            <button onClick={() => setView({ type: "project", id: p.id })} style={{
                              padding: "9px 18px", background: povColor, color: "#0a0a0c",
                              border: "none", fontWeight: 700, fontSize: 11, letterSpacing: "0.16em", cursor: "pointer",
                            }}>ÖFFNEN →</button>
                          </div>
                          <ProgressBar value={progress} color={povColor} />
                          <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 6 }}>
                            {Math.round(progress * 100)}% abgeschlossen
                          </div>
                        </div>
                      );
                    })}

                    {/* + Projekt für diesen Main Quest */}
                    <div style={{
                      border: "1px solid var(--line-soft)", borderTop: "none",
                      padding: "12px 24px", background: "var(--panel)",
                    }}>
                      <button
                        onClick={() => { setNewModalPov(povId); setShowNewModal(true); }}
                        style={{
                          background: "transparent", border: "none",
                          color: "var(--text-faint)", fontSize: 10.5, letterSpacing: "0.14em",
                          fontWeight: 700, cursor: "pointer", padding: "4px 0",
                        }}
                      >+ PROJEKT FÜR DIESEN MAIN QUEST</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color = "var(--text)", bold = false }) {
  return (
    <div>
      <div className="uppercase-label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: bold ? 700 : 500, color }}>{value}</div>
    </div>
  );
}

function ProjectDetail({ proj, onBack, onOpenKR, taskTimes, setTaskTimes, activeTaskId, setActiveTaskId, krProgress, setKrProgress, onArchive, onOpenTask, onOpenWizard, onSaveProjectEdit }) {
  // ── Edit Workload / Deadline Modal ─────────────────────────────────────────
  const [showEdit, setShowEdit] = React.useState(false);
  const [editHPW, setEditHPW] = React.useState(proj.hoursPerWeek || 8);
  const [editDeadline, setEditDeadline] = React.useState(proj.deadline || "");
  const [editTitle, setEditTitle] = React.useState(proj.title || "");

  const saveProjectEdit = () => {
    if (onSaveProjectEdit) onSaveProjectEdit(proj.id, {
      title: editTitle.trim() || proj.title,
      hoursPerWeek: editHPW,
      deadline: editDeadline || null,
    });
    setShowEdit(false);
  };
  const objectives = getObjectives(proj);
  const [activeObjId, setActiveObjId] = React.useState(() => objectives[0]?.id);
  const activeObj = objectives.find(o => o.id === activeObjId) || objectives[0];
  const currentKRs = activeObj?.krs || [];

  const [filter, setFilter] = React.useState("alle");
  const [editingKR, setEditingKR] = React.useState(null);
  const [krPrevVal, setKrPrevVal] = React.useState({});
  const getKRVal = (krId, fallback) => (krProgress || {})[`${proj.pov}_${krId}`] ?? fallback;
  const setKRVal = (krId, val) => setKrProgress && setKrProgress(prev => ({ ...prev, [`${proj.pov}_${krId}`]: val }));

  const toggleKRDone = (krId, fallback) => {
    const cur = getKRVal(krId, fallback);
    const kr = currentKRs.find(k => k.id === krId);
    const krTaskIds = kr ? [...kr.tasks, ...(JSON.parse(LS.getItem(`lifeos_proj_tasks_${proj.id}`) || "{}")[krId] || [])].map(t => t.id) : [];
    if (cur >= 1) {
      setKRVal(krId, krPrevVal[krId] ?? fallback);
      setKrPrevVal(p => { const n = { ...p }; delete n[krId]; return n; });
      setDoneTasks(prev => { const next = new Set(prev); krTaskIds.forEach(id => next.delete(id)); return next; });
    } else {
      setKrPrevVal(prev => ({ ...prev, [krId]: cur }));
      setKRVal(krId, 1);
      setDoneTasks(prev => { const next = new Set(prev); krTaskIds.forEach(id => next.add(id)); return next; });
    }
  };

  const doneKey = `lifeos_done_${proj.pov}`;
  const [doneTasks, setDoneTasks] = React.useState(() => {
    try { return new Set(JSON.parse(LS.getItem(doneKey) || "[]")); } catch { return new Set(); }
  });
  React.useEffect(() => { LS.setItem(doneKey, JSON.stringify([...doneTasks])); }, [doneTasks]);
  const toggleTaskDone = (id) => setDoneTasks(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const storageKey = `lifeos_proj_tasks_${proj.id}`;
  const deletedKey = `lifeos_deleted_proj_tasks_${proj.id}`;

  const [customKRTasks, setCustomKRTasks] = React.useState(() => {
    try { return JSON.parse(LS.getItem(storageKey) || "{}"); } catch { return {}; }
  });
  React.useEffect(() => { LS.setItem(storageKey, JSON.stringify(customKRTasks)); }, [customKRTasks]);

  const [deletedHardcoded, setDeletedHardcoded] = React.useState(() => {
    try { return new Set(JSON.parse(LS.getItem(deletedKey) || "[]")); } catch { return new Set(); }
  });
  React.useEffect(() => { LS.setItem(deletedKey, JSON.stringify([...deletedHardcoded])); }, [deletedHardcoded]);

  const getKRProgress = (krId, fallback) => {
    const kr = currentKRs.find(k => k.id === krId);
    const allTasks = kr ? [...kr.tasks, ...(customKRTasks[krId] || [])] : [];
    if (allTasks.length > 0) return allTasks.filter(t => doneTasks.has(t.id)).length / allTasks.length;
    return (krProgress || {})[`${proj.pov}_${krId}`] ?? fallback;
  };

  const [addingToKR, setAddingToKR] = React.useState(null);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskFlow, setNewTaskFlow] = React.useState("FLOW");
  const [newTaskEst, setNewTaskEst] = React.useState(30);

  const addTaskToKR = (krId) => {
    if (!newTaskTitle.trim()) return;
    const taskId = `pt_${Date.now()}`;
    const task = { id: taskId, title: newTaskTitle.trim(), kr: krId, flow: newTaskFlow, est: newTaskEst, elapsed: 0, custom: true };
    try {
      const all = JSON.parse(LS.getItem("lifeos_task_assignments") || "{}");
      const kr = currentKRs.find(k => k.id === krId);
      all[taskId] = { projectId: proj.id, krId, projectTitle: proj.title, krTitle: kr?.title };
      LS.setItem("lifeos_task_assignments", JSON.stringify(all));
    } catch {}
    setCustomKRTasks(prev => ({ ...prev, [krId]: [...(prev[krId] || []), task] }));
    setNewTaskTitle(""); setNewTaskFlow("FLOW"); setNewTaskEst(30); setAddingToKR(null);
  };

  const deleteProjectTask = (krId, taskId, isCustom) => {
    if (isCustom) {
      setCustomKRTasks(prev => ({ ...prev, [krId]: (prev[krId] || []).filter(t => t.id !== taskId) }));
    } else {
      setDeletedHardcoded(prev => { const next = new Set(prev); next.add(taskId); return next; });
    }
  };

  const getKRTasks = (kr) => [
    ...kr.tasks.filter(t => !deletedHardcoded.has(t.id)),
    ...(customKRTasks[kr.id] || []),
  ];

  const [openKRs, setOpenKRs] = React.useState(() =>
    new Set(objectives.flatMap(o => o.krs).filter(k => k.status !== "locked").map(k => k.id))
  );
  const toggleKR = (id) => setOpenKRs(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const activeKRsForProgress = currentKRs.filter(k => k.status !== "locked");
  const objProgress = activeKRsForProgress.length === 0
    ? (activeObj?.progress ?? proj.progress ?? 0)
    : activeKRsForProgress.reduce((acc, kr) => acc + getKRProgress(kr.id, kr.progress), 0) / activeKRsForProgress.length;

  // Get MainQuest for breadcrumb context
  const mqData = (POV_DATA[proj.pov] || POV_DATA.founder).mainQuest;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
      {/* breadcrumb — now includes MainQuest */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.05em", flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 0, fontSize: 11, letterSpacing: "0.16em", fontWeight: 600 }}>
          MISSION CONTROL
        </button>
        <span>›</span>
        <span style={{ color: "var(--text-faint)", fontSize: 10.5 }}>{mqData?.title}</span>
        <span>›</span>
        <span style={{ color: "var(--text)" }}>{proj.title}</span>
      </div>

      {/* Objective switcher */}
      {objectives.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {objectives.map((obj, i) => {
            const isActive = obj.id === activeObjId;
            return (
              <button key={obj.id} onClick={() => setActiveObjId(obj.id)} style={{
                padding: "7px 18px",
                background: isActive ? "var(--accent-soft)" : "transparent",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--line)"}`,
                color: isActive ? "var(--accent)" : "var(--text-faint)",
                fontSize: 10.5, fontWeight: isActive ? 700 : 600,
                letterSpacing: "0.14em", cursor: "pointer", transition: "all .15s",
              }}>
                OBJ {i + 1}
                {obj.period && <span style={{ marginLeft: 8, opacity: 0.6, fontSize: 9.5 }}>{obj.period}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Objective */}
      {(() => {
        return (
          <>
            <div className="uppercase-label" style={{ marginBottom: 6 }}>Objective</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{activeObj?.title}</h2>
                {activeObj?.period && objectives.length === 1 && (
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>{activeObj.period}</div>
                )}
                {proj.deadline && (() => {
                  const now = new Date();
                  const start = new Date(proj.startDate || now);
                  const end = new Date(proj.deadline);
                  const total = end - start;
                  const elapsed = now - start;
                  const expected = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0;
                  const diff = objProgress - expected;
                  const badge = now >= end
                    ? { kind: "danger", label: "ÜBERFÄLLIG" }
                    : diff > 0.1 ? { kind: "good", label: "VORAUS" }
                    : diff < -0.08 ? { kind: "danger", label: "HINTER PLAN" }
                    : { kind: "active", label: "AUF KURS" };
                  const dlStr = end.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                      <span style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.1em" }}>DEADLINE: {dlStr}</span>
                      <StatusBadge status={badge} />
                    </div>
                  );
                })()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mono" style={{ fontSize: 14, color: "var(--text-dim)" }}>{Math.round(objProgress * 100)}%</span>
                {onArchive && (
                  <button onClick={onArchive} style={{
                    padding: "6px 14px", background: "transparent", border: "1px solid var(--line)",
                    color: "var(--text-faint)", fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700, cursor: "pointer",
                  }}>ARCHIVIEREN</button>
                )}
              </div>

              {/* Edit Modal */}
              {showEdit && (
                <div onClick={() => setShowEdit(false)} style={{ position: "fixed", inset: 0, zIndex: 800, background: "var(--modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div onClick={e => e.stopPropagation()} style={{ width: 440, background: "var(--panel)", border: "1px solid var(--line)", padding: "28px 28px 24px" }}>
                    <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.18em", marginBottom: 24 }}>⚙ PROJEKT BEARBEITEN</div>
                    <div style={{ marginBottom: 18 }}>
                      <div className="uppercase-label" style={{ marginBottom: 8 }}>Projektname</div>
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveProjectEdit(); }}
                        style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "10px 14px", fontSize: 13.5, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ marginBottom: 18 }}>
                      <div className="uppercase-label" style={{ marginBottom: 8 }}>Stunden pro Woche</div>
                      <input type="range" min={1} max={40} step={1} value={editHPW} onChange={e => setEditHPW(+e.target.value)}
                        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
                      <div className="mono" style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)", marginTop: 6 }}>{editHPW}h/W</div>
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <div className="uppercase-label" style={{ marginBottom: 8 }}>Deadline</div>
                      <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                        style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                      {editDeadline && <button onClick={() => setEditDeadline("")} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 10.5, cursor: "pointer", marginTop: 6, padding: 0 }}>✕ Deadline entfernen</button>}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => setShowEdit(false)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 11, letterSpacing: "0.1em", cursor: "pointer", fontFamily: "inherit" }}>ABBRECHEN</button>
                      <button onClick={saveProjectEdit} style={{ padding: "9px 24px", background: "var(--accent)", border: "none", color: "#0a0a0c", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", fontFamily: "inherit" }}>SPEICHERN</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <ProgressBar value={objProgress} height={5} />
          </>
        );
      })()}

      {/* task filter */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", marginTop: 22, borderBottom: "1px solid var(--line-soft)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="uppercase-label">Tasks</span>
          {[{ id: "alle", label: "ALLE" }, { id: "flow", label: "✦ FLOW STATE" }, { id: "quick", label: "● QUICK <15m" }, { id: "easy", label: "● EASY TASK" }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: "5px 14px", borderRadius: 999, background: "transparent",
              border: `1px solid ${filter === f.id ? "var(--accent)" : "var(--line)"}`,
              color: filter === f.id ? "var(--accent)" : "var(--text-faint)",
              fontWeight: 600, fontSize: 10.5, letterSpacing: "0.12em", cursor: "pointer",
            }}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setEditTitle(proj.title || ""); setEditHPW(proj.hoursPerWeek || 8); setEditDeadline(proj.deadline || ""); setShowEdit(true); }}
            title="Projekt bearbeiten (Name, Stunden, Deadline)"
            style={{ padding: "9px 14px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 11, letterSpacing: "0.1em", fontWeight: 600, cursor: "pointer", lineHeight: 1 }}>⚙ BEARBEITEN</button>
        </div>
      </div>

      {/* KR accordion */}
      <div style={{ marginTop: 8 }}>
        {currentKRs.map(kr => {
          const locked = kr.status === "locked";
          const isOpen = openKRs.has(kr.id);
          const hasTasks = getKRTasks(kr).length > 0;
          const krDone = getKRProgress(kr.id, kr.progress) >= 1;
          return (
            <div key={kr.id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "22px 28px 60px 1fr 200px 90px 120px", alignItems: "center", gap: 16, padding: "14px 8px", opacity: locked ? 0.4 : 1 }}>
                <button onClick={() => !locked && toggleKRDone(kr.id, kr.progress)} style={{
                  width: 18, height: 18, borderRadius: 3, cursor: locked ? "default" : "pointer",
                  background: krDone ? "var(--good)" : "transparent",
                  border: `2px solid ${krDone ? "var(--good)" : "var(--line)"}`,
                  color: krDone ? "#0a0a0c" : "transparent",
                  fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 0, flexShrink: 0,
                }}>{krDone ? "✓" : ""}</button>
                <button onClick={() => !locked && hasTasks && toggleKR(kr.id)} style={{
                  background: "none", border: "none", color: "var(--text-faint)",
                  cursor: locked || !hasTasks ? "default" : "pointer", fontSize: 11, padding: 0,
                  transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s",
                }}>{hasTasks && !locked ? "▶" : " "}</button>
                <span style={{ color: krDone ? "var(--good)" : "var(--accent)", fontSize: 10.5, letterSpacing: "0.16em", fontWeight: 700 }}>{kr.label}:</span>
                <div onClick={() => !locked && onOpenKR(kr.id)} style={{
                  fontSize: 14.5, fontWeight: 600, cursor: locked ? "default" : "pointer",
                  textDecoration: krDone ? "line-through" : "none",
                  color: krDone ? "var(--text-dim)" : "var(--text)",
                }}>{kr.title}</div>
                <div>
                  <ProgressBar value={getKRProgress(kr.id, kr.progress)} dim={locked} color={krDone ? "var(--good)" : undefined} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{Math.round(getKRProgress(kr.id, kr.progress) * 100)}%</span>
                    {!locked && (
                      <button onClick={() => setEditingKR(editingKR === kr.id ? null : kr.id)} style={{ background: "none", border: "none", color: editingKR === kr.id ? "var(--accent)" : "var(--text-faint)", cursor: "pointer", fontSize: 10, padding: 0 }}>✎</button>
                    )}
                  </div>
                  {editingKR === kr.id && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <input type="range" min="0" max="100" step="1" value={Math.round(getKRVal(kr.id, kr.progress) * 100)}
                        onChange={e => setKRVal(kr.id, parseInt(e.target.value) / 100)}
                        style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }} />
                      <button onClick={() => setEditingKR(null)} style={{ background: "var(--accent)", color: "#0a0a0c", border: "none", padding: "2px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✓</button>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{getKRTasks(kr).length} Tasks</div>
                <div>{!locked ? <StatusBadge status="active" /> : <StatusBadge status="locked" />}</div>
              </div>

              {isOpen && !locked && getKRTasks(kr).map(t => {
                const isActive = activeTaskId === t.id;
                const elapsed = taskTimes[t.id] ?? t.elapsed;
                const visible = filter === "alle" || t.flow?.toLowerCase() === filter;
                const isDone = doneTasks.has(t.id);
                if (!visible) return null;
                const enrichedTask = { ...t, _pov: proj.pov, _projectId: proj.id, _projectTitle: proj.title, _krId: kr.id, _krLabel: kr.label, _krTitle: kr.title };
                return (
                  <div key={t.id} style={{
                    display: "grid", gridTemplateColumns: "110px 18px 1fr auto auto auto",
                    alignItems: "center", gap: 14, padding: "12px 8px 12px 0",
                    background: "var(--subtle-bg)", borderTop: "1px solid var(--line-soft)",
                    opacity: isDone ? 0.4 : 1,
                  }}>
                    <span />
                    <button onClick={() => toggleTaskDone(t.id)} style={{
                      width: 16, height: 16, borderRadius: 3, cursor: "pointer",
                      background: isDone ? "var(--accent)" : "transparent",
                      border: `2px solid ${isDone ? "var(--accent)" : "var(--line)"}`,
                      color: isDone ? "#0a0a0c" : "transparent",
                      fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 0, flexShrink: 0,
                    }}>{isDone ? "✓" : ""}</button>
                    <div onClick={() => onOpenTask && onOpenTask(enrichedTask)} style={{
                      fontSize: 14.5, fontWeight: 500, textDecoration: isDone ? "line-through" : "none",
                      color: isDone ? "var(--text-dim)" : "var(--text)", cursor: "pointer",
                    }}>{t.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FlowTag kind={t.flow} />
                      {t.est && <span style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.08em" }} className="mono">{t.est}m</span>}
                    </div>
                    <span className="mono" style={{ fontSize: 16, color: isActive ? "var(--accent)" : "var(--text-faint)", minWidth: 90, textAlign: "right" }}>{fmtTime(elapsed)}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isActive && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: "var(--accent)", letterSpacing: "0.12em", fontWeight: 600 }}><span style={{ width: 5, height: 5, background: "var(--accent)", borderRadius: "50%", boxShadow: "0 0 6px var(--accent)" }} /> LIVE</span>}
                      <button onClick={(e) => { e.stopPropagation(); setActiveTaskId(isActive ? null : t.id); }} style={{
                        padding: "7px 18px", background: isActive ? "var(--accent)" : "var(--panel-2)",
                        color: isActive ? "#0a0a0c" : "var(--text)",
                        border: "1px solid " + (isActive ? "var(--accent)" : "var(--line)"),
                        fontWeight: 700, fontSize: 10.5, letterSpacing: "0.18em", cursor: "pointer",
                      }}>{isActive ? "PAUSE" : "START"}</button>
                      <button onClick={() => deleteProjectTask(kr.id, t.id, !!t.custom)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                    </div>
                  </div>
                );
              })}

              {isOpen && !locked && (
                addingToKR === kr.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderTop: "1px solid var(--line-soft)", background: "var(--subtle-bg)" }}>
                    <span style={{ width: 28 }} /><span style={{ width: 60 }} />
                    <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addTaskToKR(kr.id); if (e.key === "Escape") setAddingToKR(null); }}
                      placeholder="Task-Titel…"
                      style={{ flex: 1, background: "var(--panel-2)", border: "1px solid var(--accent-line)", color: "var(--text)", padding: "7px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    <select value={newTaskFlow} onChange={e => setNewTaskFlow(e.target.value)}
                      style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text-dim)", padding: "7px 10px", fontSize: 11, fontFamily: "inherit" }}>
                      <option value="FLOW">✦ FLOW</option>
                      <option value="QUICK">● QUICK</option>
                      <option value="EASY">● EASY</option>
                    </select>
                    <select value={newTaskEst} onChange={e => setNewTaskEst(Number(e.target.value))}
                      style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text-dim)", padding: "7px 10px", fontSize: 11, fontFamily: "inherit" }}>
                      <option value={10}>10 min</option>
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                    </select>
                    <button onClick={() => addTaskToKR(kr.id)} style={{ padding: "7px 14px", background: "var(--accent)", color: "#0a0a0c", border: "none", fontWeight: 700, fontSize: 10.5, cursor: "pointer" }}>OK</button>
                    <button onClick={() => setAddingToKR(null)} style={{ padding: "7px 10px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                ) : (
                  <div style={{ padding: "6px 8px 6px 96px", borderTop: "1px solid var(--line-soft)" }}>
                    <button onClick={() => { setAddingToKR(kr.id); setNewTaskTitle(""); }} style={{ background: "transparent", border: "none", color: "var(--text-faint)", fontSize: 10.5, letterSpacing: "0.12em", cursor: "pointer", padding: "4px 0" }}>+ Task hinzufügen</button>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {proj.sideQuests && proj.sideQuests.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 8px", borderTop: "2px solid var(--warn)", background: "var(--warn-soft)" }}>
            <span style={{ color: "var(--warn)" }}>⚠</span>
            <span className="uppercase-label" style={{ color: "var(--warn)" }}>Side Quests</span>
          </div>
          {proj.sideQuests.map(sq => (
            <div key={sq.id} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", alignItems: "center", gap: 16, padding: "14px 8px", borderBottom: "1px solid var(--line-soft)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{sq.title}</div>
              <span style={{ padding: "4px 12px", color: "var(--warn)", border: "1px solid rgba(212,162,60,.4)", fontSize: 10, fontWeight: 700, background: "var(--warn-soft)" }}>⚠ SIDE QUEST</span>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontStyle: "italic" }}>{sq.note}</div>
              <button style={{ padding: "7px 18px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>GESPERRT</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 56, padding: "16px 0", borderTop: "1px solid var(--line-soft)" }}>
        <span className="uppercase-label" style={{ marginRight: 14 }}>Erfolgskette:</span>
        <span style={{ fontSize: 11.5, color: "var(--text-dim)", letterSpacing: "0.04em" }}>
          → Tasks &nbsp;→&nbsp; Key Results &nbsp;→&nbsp; {activeObj?.title} &nbsp;→&nbsp;
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>MAIN QUEST: {mqData?.title}</span>
        </span>
      </div>
    </div>
  );
}

function KRDetail({ proj, krId, onBack, onSwitchKR, taskTimes, setTaskTimes, activeTaskId, setActiveTaskId }) {
  const objectives = getObjectives(proj);
  const containingObj = objectives.find(o => o.krs.some(k => k.id === krId)) || objectives[0];
  const kr = (containingObj?.krs || []).find(k => k.id === krId);
  const siblingKRs = (containingObj?.krs || []).filter(k => k.status !== "locked");
  const objProgress = containingObj
    ? containingObj.krs.filter(k => k.status !== "locked").reduce((sum, k) => sum + (k.progress || 0), 0) /
      Math.max(1, containingObj.krs.filter(k => k.status !== "locked").length)
    : 0;

  if (!kr) return null;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 28px", border: "1px solid var(--accent)", margin: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, fontSize: 11.5, color: "var(--text-faint)", letterSpacing: "0.05em" }}>
        <button onClick={() => onBack()} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 0, fontSize: 11.5, letterSpacing: "0.16em", fontWeight: 600 }}>MISSION CONTROL</button>
        <span>›</span><span>{proj.title}</span><span>›</span>
        <span style={{ color: "var(--accent)" }}>{kr.label}: {kr.title}</span>
      </div>
      <div className="uppercase-label" style={{ marginBottom: 6 }}>Objective</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{containingObj?.title}</h2>
        <span className="mono" style={{ fontSize: 14, color: "var(--text-dim)" }}>{Math.round(objProgress * 100)}%</span>
      </div>
      <ProgressBar value={objProgress} height={5} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", marginTop: 22, borderBottom: "1px solid var(--line-soft)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="uppercase-label">Tasks</span>
          <button onClick={onBack} style={{ padding: "5px 14px", borderRadius: 999, background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", cursor: "pointer" }}>ALLE</button>
          {siblingKRs.map(k => {
            const isActive = k.id === krId;
            return (
              <button key={k.id} onClick={() => !isActive && onSwitchKR && onSwitchKR(k.id)} style={{
                padding: "5px 14px", borderRadius: 999, background: "transparent",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--line)"}`,
                color: isActive ? "var(--accent)" : "var(--text-faint)",
                fontSize: 10.5, fontWeight: isActive ? 700 : 600, letterSpacing: "0.12em",
                cursor: isActive ? "default" : "pointer", transition: "all .15s",
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-faint)"; }}}
              >{k.label}</button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 200px 130px 120px", alignItems: "center", gap: 16, padding: "16px 8px", borderBottom: "1px solid var(--line-soft)" }}>
        <span style={{ color: "var(--accent)", fontSize: 10.5, letterSpacing: "0.16em", fontWeight: 700 }}>{kr.label}:</span>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{kr.title}</div>
        <div><ProgressBar value={kr.progress} /><div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{Math.round(kr.progress * 100)}%</div></div>
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{kr.tasks.length} Tasks gefiltert</div>
        <div><StatusBadge status="active" /></div>
      </div>
      {kr.tasks.map(t => {
        const isActive = activeTaskId === t.id;
        const elapsed = taskTimes[t.id] ?? t.elapsed;
        return (
          <div key={t.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr auto auto auto auto", alignItems: "center", gap: 16, padding: "14px 8px 14px 32px", borderBottom: "1px solid var(--line-soft)" }}>
            <span />
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t.title}</div>
            <span style={{ padding: "3px 10px", color: "var(--accent)", border: "1px solid var(--accent-line)", borderRadius: 999, fontSize: 10, letterSpacing: "0.14em", fontWeight: 700 }}>→ {t.kr}</span>
            <FlowTag kind={t.flow} />
            <span className="mono" style={{ fontSize: 16, color: isActive ? "var(--accent)" : "var(--text-faint)", minWidth: 100, textAlign: "right" }}>{fmtTime(elapsed)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isActive && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: "var(--accent)", fontWeight: 600 }}><span style={{ width: 5, height: 5, background: "var(--accent)", borderRadius: "50%", boxShadow: "0 0 6px var(--accent)" }} /> LIVE</span>}
              <button onClick={() => setActiveTaskId(isActive ? null : t.id)} style={{
                padding: "7px 18px", background: isActive ? "var(--accent)" : "var(--panel-2)",
                color: isActive ? "#0a0a0c" : "var(--text)",
                border: "1px solid " + (isActive ? "var(--accent)" : "var(--line)"),
                fontWeight: 700, fontSize: 10.5, cursor: "pointer",
              }}>{isActive ? "PAUSE" : "START"}</button>
            </div>
          </div>
        );
      })}
      <div style={{ padding: "12px 8px", fontSize: 11.5, color: "var(--text-faint)" }}>{kr.tasks.length} Tasks für {kr.label}</div>
      <div style={{ marginTop: 80, padding: "16px 0", borderTop: "1px solid var(--line-soft)" }}>
        <span className="uppercase-label" style={{ marginRight: 14 }}>Erfolgskette:</span>
        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
          → {kr.label}: {kr.title} &nbsp;→&nbsp; {containingObj?.title} &nbsp;→&nbsp;
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>MAIN QUEST</span>
        </span>
      </div>
    </div>
  );
}

function NewProjectModal({ onClose, onSave, defaultPov, defaultKRs }) {
  const [name, setName] = React.useState("");
  const [selectedPov, setSelectedPov] = React.useState(defaultPov || POVS[0].id);
  const [deadline, setDeadline] = React.useState("");
  const initKRs = defaultKRs && defaultKRs.length > 0
    ? defaultKRs.map((kr, i) => ({ label: kr.label || `KR${i + 1}`, title: kr.title || "" }))
    : [{ label: "KR1", title: "" }, { label: "KR2", title: "" }];
  const [objectives, setObjectives] = React.useState([
    { id: `obj_${Date.now()}`, title: "", krs: initKRs },
  ]);

  const addObjective = () => {
    if (objectives.length >= 4) return;
    setObjectives(prev => [...prev, { id: `obj_${Date.now()}`, title: "", krs: [{ label: "KR1", title: "" }, { label: "KR2", title: "" }] }]);
  };
  const removeObjective = (oi) => { if (objectives.length <= 1) return; setObjectives(prev => prev.filter((_, i) => i !== oi)); };
  const updateObjTitle = (oi, val) => setObjectives(prev => prev.map((o, i) => i === oi ? { ...o, title: val } : o));
  const addKR = (oi) => setObjectives(prev => prev.map((o, i) => {
    if (i !== oi || o.krs.length >= 6) return o;
    return { ...o, krs: [...o.krs, { label: `KR${o.krs.length + 1}`, title: "" }] };
  }));
  const updateKR = (oi, ki, val) => setObjectives(prev => prev.map((o, i) => i !== oi ? o : { ...o, krs: o.krs.map((k, j) => j === ki ? { ...k, title: val } : k) }));
  const removeKR = (oi, ki) => setObjectives(prev => prev.map((o, i) => i !== oi ? o : { ...o, krs: o.krs.filter((_, j) => j !== ki) }));

  const handleSave = () => {
    if (!name.trim()) return;
    const validObjs = objectives.filter(o => o.title.trim());
    if (validObjs.length === 0) return;
    onSave({
      id: `custom_proj_${Date.now()}`,
      pov: selectedPov, label: selectedPov.toUpperCase(),
      title: name.trim(), realityH: 0, planH: 0, completion: 0,
      status: { kind: "active", label: "AKTIV" }, progress: 0,
      startDate: new Date().toISOString().split("T")[0],
      ...(deadline ? { deadline } : {}),
      objectives: validObjs.map((o, oi) => ({
        id: o.id, title: o.title.trim(), period: "",
        krs: o.krs.filter(k => k.title.trim()).map((k, ki) => ({
          id: `obj${oi + 1}_kr${ki + 1}`, label: k.label,
          title: k.title.trim(), progress: 0, status: "active", tasks: [],
        })),
      })),
      sideQuests: [], custom: true,
    });
  };

  const canSave = name.trim() && objectives.some(o => o.title.trim());

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "32px", width: 560, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 0 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div className="uppercase-label">Neues Projekt</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8 }}>POV</div>
          <div style={{ display: "flex", gap: 8 }}>
            {POVS.map(p => (
              <button key={p.id} onClick={() => setSelectedPov(p.id)} style={{
                padding: "7px 16px", borderRadius: 999,
                border: `1px solid ${selectedPov === p.id ? p.color : "var(--line)"}`,
                color: selectedPov === p.id ? p.color : "var(--text-faint)",
                background: "transparent", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.14em", cursor: "pointer",
              }}>{p.label.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8 }}>PROJEKTNAME</div>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Immobilienvertrieb Q3"
            style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8 }}>DEADLINE <span style={{ fontWeight: 400, color: "var(--text-faint)", letterSpacing: 0 }}>(optional)</span></div>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: deadline ? "var(--text)" : "var(--text-faint)", padding: "10px 14px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", cursor: "pointer" }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)" }}>OBJECTIVES {objectives.length > 1 && `(${objectives.length})`}</div>
            {objectives.length < 4 && (
              <button onClick={addObjective} style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer" }}>+ OBJECTIVE HINZUFÜGEN</button>
            )}
          </div>
          {objectives.map((obj, oi) => (
            <div key={obj.id} style={{ marginBottom: 16, padding: "16px", background: "var(--panel-2)", borderLeft: objectives.length > 1 ? "3px solid var(--accent)" : "1px solid var(--line)", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                {objectives.length > 1 && <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.14em", minWidth: 44 }}>OBJ {oi + 1}</span>}
                <input value={obj.title} onChange={e => updateObjTitle(oi, e.target.value)}
                  placeholder={`Objective ${oi + 1}…`}
                  style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "9px 12px", fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
                {objectives.length > 1 && <button onClick={() => removeObjective(oi)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 15, padding: "0 4px" }}>×</button>}
              </div>
              <div style={{ paddingLeft: objectives.length > 1 ? 52 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700, color: "var(--text-faint)" }}>KEY RESULTS (optional)</div>
                  {obj.krs.length < 6 && <button onClick={() => addKR(oi)} style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: 9.5, fontWeight: 700, cursor: "pointer" }}>+ KR</button>}
                </div>
                {obj.krs.map((kr, ki) => (
                  <div key={ki} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.12em", minWidth: 28 }}>{kr.label}</span>
                    <input value={kr.title} onChange={e => updateKR(oi, ki, e.target.value)} placeholder={`Key Result ${ki + 1}…`}
                      style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "7px 11px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    {obj.krs.length > 1 && <button onClick={() => removeKR(oi, ki)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 11, letterSpacing: "0.14em", fontWeight: 600, cursor: "pointer" }}>ABBRECHEN</button>
          <button onClick={handleSave} disabled={!canSave} style={{
            padding: "10px 24px", background: canSave ? "var(--accent)" : "var(--panel-2)",
            color: canSave ? "#0a0a0c" : "var(--text-faint)", border: "none",
            fontSize: 11, letterSpacing: "0.16em", fontWeight: 700, cursor: canSave ? "pointer" : "default",
          }}>PROJEKT ANLEGEN</button>
        </div>
      </div>
    </div>
  );
}

window.MissionControl = MissionControl;
