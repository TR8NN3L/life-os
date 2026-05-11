// Mission Control — overview list + project detail + KR drill-down.

function getObjectives(proj) {
  if (proj.objectives && proj.objectives.length > 0) return proj.objectives;
  return [{ id: "obj1", title: proj.objective || "", period: "", krs: proj.krs || [] }];
}

function MissionControl({ pov, setPov, taskTimes, setTaskTimes, activeTaskId, setActiveTaskId, krProgress, setKrProgress, onOpenTask, userPovs = [] }) {
  // Merge hardcoded POVs with user-created custom POVs (from sync or local creation)
  const allPovs = React.useMemo(() => {
    const hardcodedIds = new Set(POVS.map(p => p.id));
    const extras = userPovs.filter(p => !hardcodedIds.has(p.id));
    // Ensure POV_DATA has entries for synced custom POVs (may not be set if sync ran after page load)
    extras.forEach(p => {
      if (!POV_DATA[p.id]) {
        try {
          const saved = JSON.parse(LS.getItem("lifeos_pov_data") || "{}");
          POV_DATA[p.id] = { ...{ mainQuest: { title: "", progress: 0, period: "" }, objective: { title: "", period: "", keyResults: [] }, tasksToday: [] }, ...(saved[p.id] || {}) };
        } catch { POV_DATA[p.id] = { mainQuest: { title: "", progress: 0, period: "" }, objective: { title: "", period: "", keyResults: [] }, tasksToday: [] }; }
      }
    });
    return [...POVS, ...extras];
  }, [userPovs]);
  const [view, setView] = React.useState({ type: "list" });
  const [mcFilter, setMcFilter] = React.useState("alle");
  const [freeOpen, setFreeOpen] = React.useState(false);
  const [showNewModal, setShowNewModal] = React.useState(false);
  const [newModalPov, setNewModalPov] = React.useState(null);

  const [showWizard, setShowWizard] = React.useState(false);
  const [wizardDefaultPov, setWizardDefaultPov] = React.useState(null);

  const handleWizardSave = (project, mode) => {
    if (mode === "existing") {
      setCustomProjects(prev => {
        const updated = prev.map(p => p.id === project.id ? project : p);
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
  };

  const [customProjects, setCustomProjects] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_custom_projects") || "[]"); } catch { return []; }
  });
  React.useEffect(() => { LS.setItem("lifeos_custom_projects", JSON.stringify(customProjects)); }, [customProjects]);

  const [archivedIds, setArchivedIds] = React.useState(() => {
    try { return new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]")); } catch { return new Set(); }
  });
  React.useEffect(() => { LS.setItem("lifeos_archived_projects", JSON.stringify([...archivedIds])); }, [archivedIds]);
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

  // --- View guards ---
  if (view.type === "project") {
    const proj = [...PROJECTS, ...customProjects].find(p => p.id === view.id);
    if (!proj) return null;
    return <ProjectDetail proj={proj} onBack={() => setView({ type: "list" })}
      onOpenKR={(krId) => setView({ type: "kr", projectId: proj.id, krId })}
      taskTimes={taskTimes} setTaskTimes={setTaskTimes}
      activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
      krProgress={krProgress} setKrProgress={setKrProgress}
      onOpenTask={onOpenTask}
      onArchive={() => { archiveProject(proj.id); setShowArchived(true); setView({ type: "list" }); }} />;
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
    <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
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
        onClose: () => { setShowWizard(false); setWizardDefaultPov(null); },
        onSave: (project, mode) => { handleWizardSave(project, mode); window.TUTORIAL?.onAction?.('project-saved'); },
        initialDraft: window.TUTORIAL?.active ? window.TUTORIAL.getPrefill?.() : null,
        "data-tutorial": "wizard-container",
      })}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="uppercase-label">Mission Control</div>
        <div style={{ display: "flex", gap: 8 }}>
          {archivedProjects.length > 0 && (
            <button onClick={() => setShowArchived(v => !v)} style={{
              padding: "8px 16px", background: "transparent",
              border: `1px solid ${showArchived ? "var(--text-dim)" : "var(--line)"}`,
              color: showArchived ? "var(--text)" : "var(--text-faint)",
              fontSize: 10, letterSpacing: "0.16em", fontWeight: 700, cursor: "pointer",
            }}>ARCHIV ({archivedProjects.length})</button>
          )}
          <button onClick={() => { setNewModalPov(mcFilter !== "alle" ? mcFilter : null); setShowNewModal(true); }} style={{
            padding: "8px 18px", background: "var(--accent)", color: "#0a0a0c",
            border: "none", fontSize: 10.5, letterSpacing: "0.16em", fontWeight: 700, cursor: "pointer",
          }}>+ NEUES PROJEKT</button>
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
          {freeTasks.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <button onClick={() => setFreeOpen(o => !o)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "transparent", border: "none", borderTop: "2px solid var(--line)",
                borderBottom: freeOpen ? "none" : "2px solid var(--line)",
                padding: "14px 0", cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 9.5, letterSpacing: "0.18em", fontWeight: 700, color: "var(--text-dim)" }}>FREIE TASKS</span>
                  <span style={{ padding: "2px 10px", background: "var(--panel-2)", border: "1px solid var(--line)", fontSize: 9.5, fontWeight: 700, color: "var(--text-faint)" }}>{freeTasks.length}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-faint)", transform: freeOpen ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block" }}>▶</span>
              </button>
              {freeOpen && (
                <div style={{ border: "1px solid var(--line)", borderTop: "none" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "28px 120px 1fr 160px 110px 130px", gap: 16, padding: "10px 16px", borderBottom: "1px solid var(--line-soft)", background: "var(--panel)" }}>
                    {["", "POV", "TITEL", "KEY RESULT", "TIMER", ""].map((h, i) => (
                      <span key={i} style={{ fontSize: 9, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)" }}>{h}</span>
                    ))}
                  </div>
                  {freeTasks.map((t, _fi) => {
                    const isActive = activeTaskId === t.id;
                    const elapsed = taskTimes[t.id] ?? t.elapsed ?? 0;
                    const isDone = isDoneTask(t.id, t._pov);
                    const povColor = allPovs.find(x => x.id === t._pov)?.color || "var(--accent)";
                    return (
                      <div key={`${t._pov}_${t.id}_${_fi}`}
                        draggable
                        onDragStart={() => setFreeDragIdx(_fi)}
                        onDragOver={(e) => { e.preventDefault(); setFreeDragOverIdx(_fi); }}
                        onDrop={() => { handleFreeDrop(freeDragIdx, freeDragOverIdx); setFreeDragIdx(null); setFreeDragOverIdx(null); }}
                        onDragEnd={() => { setFreeDragIdx(null); setFreeDragOverIdx(null); }}
                        style={{
                          display: "grid", gridTemplateColumns: "28px 120px 1fr 160px 110px 130px",
                          gap: 16, padding: "13px 16px",
                          borderTop: freeDragOverIdx === _fi && freeDragIdx !== _fi ? "2px solid var(--accent)" : "none",
                          borderBottom: "1px solid var(--line-soft)",
                          background: isActive ? "rgba(255,255,255,0.03)" : "transparent",
                          opacity: isDone ? 0.4 : freeDragIdx === _fi ? 0.4 : 1,
                          cursor: "grab",
                        }}>
                        <button onClick={() => toggleFreeTaskDone(t.id, t._pov)} style={{
                          width: 16, height: 16, borderRadius: 3, cursor: "pointer",
                          background: isDone ? "var(--accent)" : "transparent",
                          border: `2px solid ${isDone ? "var(--accent)" : "var(--line)"}`,
                          color: isDone ? "#0a0a0c" : "transparent",
                          fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 0, flexShrink: 0,
                        }}>{isDone ? "✓" : ""}</button>
                        <POVChip pov={t._pov} />
                        <div onClick={() => onOpenTask && onOpenTask({ ...t, _pov: t._pov })} style={{ cursor: "pointer" }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--text-dim)" : "var(--accent)" }}>{t.title}</div>
                          {t.sub && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{t.sub}</div>}
                        </div>
                        <div>
                          {!t.kr
                            ? <span style={{ padding: "3px 10px", fontSize: 9.5, fontWeight: 700, color: "var(--warn)", border: "1px solid rgba(212,162,60,.4)", background: "var(--warn-soft)" }}>⚠ SIDE QUEST</span>
                            : <span style={{ padding: "3px 10px", color: povColor, border: "1px solid rgba(255,255,255,0.15)", fontSize: 9.5, fontWeight: 700 }}>→ {t.kr}</span>
                          }
                        </div>
                        <span className="mono" style={{ fontSize: 18, fontWeight: 500, color: isActive ? "var(--accent)" : "var(--text-faint)" }}>{fmtTime(elapsed)}</span>
                        <button disabled={isDone} onClick={() => setActiveTaskId(isActive ? null : t.id)} style={{
                          padding: "7px 18px",
                          background: isActive ? "var(--accent)" : "var(--panel-2)",
                          color: isActive ? "#0a0a0c" : "var(--text)",
                          border: "1px solid " + (isActive ? "var(--accent)" : "var(--line)"),
                          fontWeight: 700, fontSize: 10.5, letterSpacing: "0.16em",
                          cursor: isDone ? "default" : "pointer", opacity: isDone ? 0.4 : 1,
                        }}>{isDone ? "DONE" : isActive ? "PAUSE" : "START"}</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
                            <Metric label="REALITY" value={`${p.realityH}h`} />
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
                      padding: "12px 24px", background: "rgba(255,255,255,0.01)",
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

function ProjectDetail({ proj, onBack, onOpenKR, taskTimes, setTaskTimes, activeTaskId, setActiveTaskId, krProgress, setKrProgress, onArchive, onOpenTask }) {
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
                    : diff > 0.1 ? { kind: "good", label: "AHEAD" }
                    : diff < -0.08 ? { kind: "danger", label: "BEHIND" }
                    : { kind: "active", label: "ON TRACK" };
                  const dlStr = end.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                      <span style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.1em" }}>DEADLINE: {dlStr}</span>
                      <StatusBadge status={badge} />
                    </div>
                  );
                })()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="mono" style={{ fontSize: 14, color: "var(--text-dim)" }}>{Math.round(objProgress * 100)}%</span>
                {onArchive && (
                  <button onClick={onArchive} style={{
                    padding: "6px 14px", background: "transparent", border: "1px solid var(--line)",
                    color: "var(--text-faint)", fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700, cursor: "pointer",
                  }}>ARCHIVIEREN</button>
                )}
              </div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.16em", cursor: "pointer" }}>GENERATE OKR / TASKS</button>
          <span style={{ padding: "5px 10px", background: "var(--warn-soft)", color: "var(--warn)", border: "1px solid rgba(212,162,60,.4)", fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700 }}>PREMIUM</span>
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
                    background: "rgba(255,255,255,0.012)", borderTop: "1px solid var(--line-soft)",
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderTop: "1px solid var(--line-soft)", background: "rgba(255,255,255,0.012)" }}>
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
        <button style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.16em", cursor: "pointer" }}>GENERATE OKR / TASKS</button>
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
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
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
