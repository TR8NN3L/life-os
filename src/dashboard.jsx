// Dashboard — three-pane: Strategic Anchor (KRs) | Quick Start + Today's Tasks + Truth Loop

const DONE_QUOTES = [
  "Erledigt. Momentum aufgebaut.",
  "Done. Der nächste Schritt wartet.",
  "Check. Du bist näher dran.",
  "Fertig — einer weniger. Weiter.",
  "Sauber erledigt. Bleib dran.",
  "Task down. Keep pushing.",
  "Abgehakt. Skaliere das.",
  "Exakt so. Weiter.",
];

function Dashboard({ pov, activeTaskId, setActiveTaskId, taskTimes, setTaskTimes, tickActive, setRoute,
                      krProgress, setKrProgress, taskNotes, setTaskNotes, truthPlan, setTruthPlan,
                      inbox, setInbox, onOpenTask }) {
  const data = POV_DATA[pov] || POV_DATA.founder;
  const objective = data.objective;

  // KR progress helpers — localStorage overrides hardcoded values
  const getKRVal = (krId, fallback) => krProgress[`${pov}_${krId}`] ?? fallback;
  const setKRVal = (krId, val) => setKrProgress(prev => ({ ...prev, [`${pov}_${krId}`]: val }));
  // Task-based display progress: done tasks / total tasks in KR. Fallback to manual value if no tasks.
  const getKRDisplayVal = (krId, fallback) => {
    const krTasks = (tasksToday || []).filter(t => t.kr === krId);
    if (krTasks.length > 0) return krTasks.filter(t => doneTasks.has(t.id)).length / krTasks.length;
    return getKRVal(krId, fallback);
  };
  const [editingKR, setEditingKR] = React.useState(null);

  // Helper: set of archived project IDs
  const getArchivedIds = () => {
    try { return new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]")); } catch { return new Set(); }
  };

  // All objectives — POV_DATA + custom projects (excluding archived)
  const loadAllObjectives = (povId) => {
    const objs = [];
    const d2 = POV_DATA[povId] || POV_DATA.founder;
    if (d2.objective) {
      objs.push({ id: "povdata_obj", title: d2.objective.title, period: d2.objective.period, krs: d2.objective.keyResults || [], _isPovData: true });
    }
    try {
      const archivedIds = getArchivedIds();
      const projs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
      projs.filter(p => p.pov === povId && !archivedIds.has(p.id)).forEach(proj => {
        (proj.objectives || []).forEach(o => {
          objs.push({ id: o.id, title: o.title, period: o.period || proj.title, krs: o.krs || [], _projectTitle: proj.title });
        });
      });
    } catch {}
    return objs;
  };
  const [allObjectives, setAllObjectives] = React.useState(() => loadAllObjectives(pov));
  const [openObjectives, setOpenObjectives] = React.useState(() => new Set());
  React.useEffect(() => {
    setAllObjectives(loadAllObjectives(pov));
    setOpenObjectives(new Set());
  }, [pov]);
  const findKRLabel = (krId) => {
    for (const obj of allObjectives) {
      const kr = (obj.krs || []).find(k => k.id === krId);
      if (kr) return kr.label;
    }
    return null;
  };
  const allKRsForSelect = allObjectives.flatMap(o =>
    (o.krs || []).filter(k => k.status !== "locked").map(k => ({ ...k, _objTitle: o.title }))
  );

  // Task notes helpers — storage: {text, updatedAt} or legacy string
  const getNoteEntry = (id) => {
    const v = (taskNotes || {})[id];
    if (!v) return { text: "", updatedAt: null };
    if (typeof v === "string") return { text: v, updatedAt: null };
    return v;
  };
  const getNoteText = (id) => getNoteEntry(id).text;

  // Custom tasks — persisted per POV
  const storageKey = `lifeos_tasks_${pov}`;
  const [customTasks, setCustomTasks] = React.useState(() => {
    try { return JSON.parse(LS.getItem(storageKey) || "[]"); } catch { return []; }
  });
  React.useEffect(() => { LS.setItem(storageKey, JSON.stringify(customTasks)); }, [customTasks]);
  React.useEffect(() => {
    try { setCustomTasks(JSON.parse(LS.getItem(`lifeos_tasks_${pov}`) || "[]")); } catch { setCustomTasks([]); }
  }, [pov]);
  React.useEffect(() => {
    const handler = (e) => {
      if (!e.detail?.pov || e.detail.pov === pov) {
        try { setCustomTasks(JSON.parse(LS.getItem(`lifeos_tasks_${pov}`) || "[]")); } catch {}
        try { setDoneTasks(new Set(JSON.parse(LS.getItem(`lifeos_done_${pov}`) || "[]"))); } catch {}
      }
    };
    window.addEventListener("lifeos-tasks-updated", handler);
    return () => window.removeEventListener("lifeos-tasks-updated", handler);
  }, [pov]);

  // Tasks from wizard-generated custom projects for this POV (excluding archived projects)
  const loadProjTasks = (povId) => {
    try {
      const archivedIds = getArchivedIds();
      const projs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
      return projs
        .filter(p => p.pov === povId && !archivedIds.has(p.id))
        .flatMap(p => (p.objectives || []).flatMap(o =>
          (o.krs || []).filter(k => k.status !== "locked").flatMap(kr =>
            (kr.tasks || []).map(t => ({
              ...t,
              kr: kr.id,
              _projectTitle: p.title,
              _krLabel: kr.label,
              pov: povId,
              _fromProject: true,
            }))
          )
        ));
    } catch { return []; }
  };
  const [projTasks, setProjTasks] = React.useState(() => loadProjTasks(pov));
  React.useEffect(() => { setProjTasks(loadProjTasks(pov)); }, [pov]);
  React.useEffect(() => { setAllObjectives(loadAllObjectives(pov)); }, [projTasks]);

  const tasksToday = [...data.tasksToday, ...customTasks, ...projTasks];

  // Retroactive time editing
  const [editingTimeId, setEditingTimeId] = React.useState(null);
  const [editTimeVal, setEditTimeVal]     = React.useState("");

  const startEditTime = (t) => {
    const sec = elapsedFor(t);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    setEditTimeVal(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    setEditingTimeId(t.id);
  };
  const commitEditTime = (taskId) => {
    const raw = editTimeVal.trim();
    let totalSec = 0;
    if (/^\d+$/.test(raw)) {
      totalSec = parseInt(raw) * 60; // just minutes
    } else if (/^\d+:\d{2}$/.test(raw)) {
      const [hh, mm] = raw.split(":").map(Number);
      totalSec = hh * 3600 + mm * 60;
    } else if (/^\d+:\d{2}:\d{2}$/.test(raw)) {
      const [hh, mm, ss] = raw.split(":").map(Number);
      totalSec = hh * 3600 + mm * 60 + ss;
    }
    if (totalSec >= 0) setTaskTimes(prev => ({ ...prev, [taskId]: totalSec }));
    setEditingTimeId(null);
  };

  // Add-task form state
  const [adding, setAdding] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newKR, setNewKR] = React.useState("none");

  const addTask = () => {
    if (!newTitle.trim()) return;
    const task = {
      id: `custom_${Date.now()}`,
      n: tasksToday.length + 1,
      title: newTitle.trim(),
      sub: "",
      kr: newKR === "none" ? null : newKR,
      elapsed: 0,
      pov,
      custom: true,
    };
    setCustomTasks(prev => [...prev, task]);
    setNewTitle(""); setNewKR("none"); setAdding(false);
  };

  const deleteCustomTask = (id) => setCustomTasks(prev => prev.filter(t => t.id !== id));

  // Completed tasks — persisted per POV
  const doneKey = `lifeos_done_${pov}`;
  const [doneTasks, setDoneTasks] = React.useState(() => {
    try { return new Set(JSON.parse(LS.getItem(doneKey) || "[]")); } catch { return new Set(); }
  });
  React.useEffect(() => { LS.setItem(doneKey, JSON.stringify([...doneTasks])); }, [doneTasks]);
  React.useEffect(() => {
    try { setDoneTasks(new Set(JSON.parse(LS.getItem(`lifeos_done_${pov}`) || "[]"))); } catch { setDoneTasks(new Set()); }
  }, [pov]);

  const [doneToast, setDoneToast] = React.useState(null);
  const doneToastTimer = React.useRef(null);
  const showDoneToast = () => {
    const quote = DONE_QUOTES[Math.floor(Math.random() * DONE_QUOTES.length)];
    setDoneToast(quote);
    clearTimeout(doneToastTimer.current);
    doneToastTimer.current = setTimeout(() => setDoneToast(null), 2200);
  };

  const toggleDone = (id) => setDoneTasks(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    if (next.has(id)) {
      window.TUTORIAL?.onAction?.('task-checked-' + id);
      showDoneToast();
    }
    return next;
  });

  // KR filter: null = alle, "kr1" etc = nur Tasks dieses KR
  const [activeKR, setActiveKR] = React.useState(null);

  // AI Daily Mission
  const loadSavedMission = (povId) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const saved = JSON.parse(LS.getItem(`lifeos_daily_mission_${povId}`) || "null");
      return saved && saved.date === today ? saved : null;
    } catch { return null; }
  };
  const [dailyMission, setDailyMission] = React.useState(() => loadSavedMission(pov));
  const [missionLoading, setMissionLoading] = React.useState(false);
  const [missionError, setMissionError] = React.useState(null);
  React.useEffect(() => {
    setDailyMission(loadSavedMission(pov));
    setMissionError(null);
  }, [pov]);

  const generateMission = async () => {
    if (!window.AI) return;
    setMissionLoading(true);
    setMissionError(null);
    try {
      const povLabel = POVS.find(p => p.id === pov)?.label || pov;
      const _rawName = LS.getItem("lifeos_user_name") || "";
      const userName = (() => { try { const p = JSON.parse(_rawName); return typeof p === "string" ? p : _rawName; } catch { return _rawName; } })();
      const mqTitle = (POV_DATA[pov]?.mainQuest?.title) || "";
      const krs = (objective.keyResults || []).filter(k => k.status !== "locked");
      const result = await window.AI.generateDailyMission(mqTitle, krs, povLabel, userName);
      const today = new Date().toISOString().split("T")[0];
      const mission = { date: today, tasks: result.tasks || [], motivation: result.motivation || "" };
      setDailyMission(mission);
      LS.setItem(`lifeos_daily_mission_${pov}`, JSON.stringify(mission));
    } catch (e) {
      if (e.code === "NO_KEY") setMissionError("Kein API Key — bitte in ⚙ Einstellungen eintragen.");
      else setMissionError(e.message || "Fehler beim Generieren.");
    } finally {
      setMissionLoading(false);
    }
  };

  // Inbox section open/collapsed
  const [inboxOpen, setInboxOpen] = React.useState(true);

  // Task order — drag & drop reordering, persisted per POV
  const orderKey = `lifeos_task_order_${pov}`;
  const [taskOrder, setTaskOrder] = React.useState(() => {
    try { return JSON.parse(LS.getItem(`lifeos_task_order_${pov}`) || "null"); } catch { return null; }
  });
  React.useEffect(() => {
    if (taskOrder !== null) LS.setItem(orderKey, JSON.stringify(taskOrder));
  }, [taskOrder, orderKey]);
  React.useEffect(() => {
    try { setTaskOrder(JSON.parse(LS.getItem(`lifeos_task_order_${pov}`) || "null")); } catch { setTaskOrder(null); }
  }, [pov]);

  const orderedTasksToday = React.useMemo(() => {
    if (!taskOrder || taskOrder.length === 0) return tasksToday;
    const orderMap = {};
    taskOrder.forEach((id, i) => { orderMap[id] = i; });
    return [...tasksToday].sort((a, b) => (orderMap[a.id] ?? 9999) - (orderMap[b.id] ?? 9999));
  }, [tasksToday, taskOrder]);

  // Drag state
  const [dragIdx, setDragIdx] = React.useState(null);
  const [dragOverIdx, setDragOverIdx] = React.useState(null);

  const handleTaskDrop = (fromIdx, toIdx) => {
    if (fromIdx === null || fromIdx === toIdx) return;
    const cur = [...filteredTasks];
    const [moved] = cur.splice(fromIdx, 1);
    cur.splice(toIdx, 0, moved);
    // Merge back into full ordered list
    const filteredIds = new Set(filteredTasks.map(t => t.id));
    let fi = 0;
    const newFull = orderedTasksToday.map(t => filteredIds.has(t.id) ? cur[fi++] : t);
    setTaskOrder(newFull.map(t => t.id));
  };

  // Reset KR filter when POV changes
  React.useEffect(() => { setActiveKR(null); }, [pov]);

  const filteredTasks = activeKR
    ? orderedTasksToday.filter(t => t.kr === activeKR)
    : orderedTasksToday;

  const active = tasksToday.find(t => t.id === activeTaskId);
  const elapsedFor = (t) => taskTimes[t.id] ?? t.elapsed;
  const krOverrides = (() => { try { return JSON.parse(LS.getItem("lifeos_task_kr_overrides") || "{}"); } catch { return {}; } })();

  // Strategic Anchor — MainQuest → Objectives accordion → KRs clickable filter
  const renderAnchor = () => {
    const mainQuestTitle = data.mainQuest?.title || "";
    return (
    <div style={{
      width: 280, flex: "0 0 280px", padding: "28px 24px", borderRight: "1px solid var(--line)",
      overflow: "auto",
    }}>
      <div className="uppercase-label" style={{ marginBottom: 20 }}>Strategic Anchor</div>

      {mainQuestTitle && (
        <div style={{ marginBottom: 24, padding: "12px 14px", background: "var(--panel-2)", border: "1px solid var(--accent-line)" }}>
          <div style={{ fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>⚡ MAIN QUEST</div>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: "var(--text)" }}>{mainQuestTitle}</div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="uppercase-label">Objectives</div>
        {activeKR && (
          <button onClick={() => setActiveKR(null)} style={{
            background: "none", border: "none", color: "var(--accent)", fontSize: 9.5,
            letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer", padding: 0,
          }}>ALLE ×</button>
        )}
      </div>

      {allObjectives.map((obj) => {
        const isOpen = openObjectives.has(obj.id);
        const objKRs = obj.krs || [];
        const hasActiveKR = objKRs.some(k => k.id === activeKR);
        return (
          <div key={obj.id} style={{ marginBottom: 6 }}>
            <button
              onClick={() => setOpenObjectives(prev => {
                const next = new Set(prev);
                next.has(obj.id) ? next.delete(obj.id) : next.add(obj.id);
                return next;
              })}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px",
                background: hasActiveKR ? "var(--accent-soft)" : isOpen ? "rgba(255,255,255,0.04)" : "transparent",
                border: `1px solid ${hasActiveKR ? "var(--accent-line)" : "var(--line-soft)"}`,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .15s",
              }}
            >
              <div style={{ flex: 1, marginRight: 8 }}>
                {obj._projectTitle && (
                  <div style={{ fontSize: 8.5, letterSpacing: "0.12em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 3 }}>
                    {obj._projectTitle.toUpperCase()}
                  </div>
                )}
                <div style={{ fontSize: 11.5, fontWeight: 600, color: hasActiveKR ? "var(--accent)" : "var(--text)", lineHeight: 1.3 }}>
                  {obj.title}
                </div>
                {obj.period && (
                  <div style={{ fontSize: 9.5, color: "var(--text-faint)", marginTop: 2 }}>{obj.period}</div>
                )}
              </div>
              <span style={{ color: "var(--text-faint)", fontSize: 9, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div style={{ border: "1px solid var(--line-soft)", borderTop: "none" }}>
                {objKRs.length === 0 && (
                  <div style={{ padding: "10px 12px", fontSize: 10.5, color: "var(--text-faint)", fontStyle: "italic" }}>Keine Key Results</div>
                )}
                {objKRs.map((kr) => {
                  const locked = kr.status === "locked";
                  const isFiltered = activeKR === kr.id;
                  const isEditing = editingKR === kr.id;
                  const taskCount = tasksToday.filter(t => t.kr === kr.id).length;
                  const krVal = getKRDisplayVal(kr.id, kr.value || 0);
                  return (
                    <div key={kr.id} style={{
                      padding: "9px 12px",
                      background: isFiltered ? "var(--accent-soft)" : "transparent",
                      borderBottom: "1px solid var(--line-soft)",
                      opacity: locked ? 0.45 : 1,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                        <span
                          onClick={() => !locked && !isEditing && setActiveKR(isFiltered ? null : kr.id)}
                          style={{
                            fontSize: 11, fontWeight: 600, cursor: locked ? "default" : "pointer",
                            color: isFiltered ? "var(--accent)" : "var(--text-dim)",
                            flex: 1, lineHeight: 1.3, marginRight: 6,
                          }}
                        >{kr.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                          {taskCount > 0 && !locked && (
                            <span style={{ fontSize: 8.5, fontWeight: 700, color: isFiltered ? "var(--accent)" : "var(--text-faint)" }}>{taskCount}T</span>
                          )}
                          <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{Math.round(krVal * 100)}%</span>
                          {!locked && taskCount === 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingKR(isEditing ? null : kr.id); }}
                              style={{ background: "none", border: "none", color: isEditing ? "var(--accent)" : "var(--text-faint)", cursor: "pointer", fontSize: 10, padding: "0 2px", lineHeight: 1 }}
                            >✎</button>
                          )}
                        </div>
                      </div>
                      <ProgressBar value={krVal} dim={locked} color={isFiltered ? "var(--accent)" : undefined} />
                      {isEditing && taskCount === 0 && (
                        <div onClick={e => e.stopPropagation()} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="range" min="0" max="100" step="1" value={Math.round(getKRVal(kr.id, kr.value || 0) * 100)}
                            onChange={e => setKRVal(kr.id, parseInt(e.target.value) / 100)}
                            style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }} />
                          <button onClick={() => setEditingKR(null)}
                            style={{ background: "var(--accent)", color: "#0a0a0c", border: "none", padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✓</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {activeKR && (
        <div style={{
          marginTop: 8, padding: "8px 12px",
          border: "1px solid var(--accent-line)", background: "var(--accent-soft)",
          fontSize: 10.5, color: "var(--accent)", letterSpacing: "0.08em",
        }}>
          ✦ Filter aktiv — {filteredTasks.length} Task{filteredTasks.length !== 1 ? "s" : ""} sichtbar
        </div>
      )}

      {/* ── AI Daily Mission ── */}
      <div style={{ marginTop: 28, borderTop: "1px solid var(--line-soft)", paddingTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, color: "var(--accent)" }}>⚡ MISSION HEUTE</div>
          {dailyMission && (
            <button onClick={() => { setDailyMission(null); LS.removeItem(`lifeos_daily_mission_${pov}`); }} title="Neu generieren"
              style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}>↺</button>
          )}
        </div>

        {!dailyMission && !missionLoading && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 10, lineHeight: 1.5 }}>
              Wizard generiert 3 konkrete Aufgaben aus deinen OKRs für heute.
            </div>
            <button onClick={generateMission} style={{
              width: "100%", padding: "9px 0", background: "transparent",
              border: "1px solid var(--accent-line)", color: "var(--accent)",
              fontSize: 10, letterSpacing: "0.16em", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>⚡ GENERIEREN</button>
            {missionError && (
              <div style={{ fontSize: 10.5, color: "var(--danger)", marginTop: 8, lineHeight: 1.4 }}>{missionError}</div>
            )}
          </div>
        )}

        {missionLoading && (
          <div style={{ fontSize: 11.5, color: "var(--text-faint)", padding: "12px 0", textAlign: "center" }}>
            Generiere Mission…
          </div>
        )}

        {dailyMission && (
          <div>
            {dailyMission.motivation && (
              <div style={{
                fontSize: 11, color: "var(--accent)", marginBottom: 12,
                fontStyle: "italic", lineHeight: 1.45, opacity: 0.85,
              }}>"{dailyMission.motivation}"</div>
            )}
            {(dailyMission.tasks || []).map((task, i) => (
              <div key={i} style={{
                marginBottom: 8, padding: "10px 12px",
                background: "var(--panel-2)", border: "1px solid var(--line-soft)",
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3, color: "var(--text)", lineHeight: 1.35 }}>{task.title}</div>
                {task.sub && (
                  <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginBottom: 6, lineHeight: 1.4 }}>{task.sub}</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {task.krLabel && task.krLabel !== "null" && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent)", border: "1px solid var(--accent-line)", padding: "2px 6px" }}>→ {task.krLabel}</span>
                    )}
                    {task.est && (
                      <span className="mono" style={{ fontSize: 9.5, color: "var(--text-faint)" }}>{task.est}m</span>
                    )}
                  </div>
                  <button onClick={() => {
                    const krId = task.krLabel && task.krLabel !== "null"
                      ? (allKRsForSelect.find(k => k.label === task.krLabel || k.label?.split(":")[0]?.trim() === task.krLabel)?.id || null)
                      : null;
                    setCustomTasks(prev => [...prev, {
                      id: `ai_${Date.now()}_${i}`,
                      n: tasksToday.length + 1 + i,
                      title: task.title,
                      sub: task.sub || "",
                      kr: krId,
                      elapsed: 0, pov, custom: true,
                    }]);
                  }} style={{
                    padding: "4px 10px", background: "var(--accent)", color: "#0a0a0c",
                    border: "none", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                    cursor: "pointer", fontFamily: "inherit",
                  }}>ÜBERNEHMEN</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ); };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "var(--bg)" }}>
      {renderAnchor()}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Quick Start banner — fixed */}
        {(() => {
          const debt = (truthPlan || TRUTH_LOOP.plan).reduce((a,b)=>a+b,0) - TRUTH_LOOP.reality.reduce((a,b)=>a+b,0);
          return (
            <div style={{
              background: "var(--accent)", color: "#0a0a0c",
              padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
              borderBottom: "1px solid #0a0a0c",
            }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>
                  QUICK START — WAS IST DIE EINE SACHE, DIE JETZT ZÄHLT?
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>
                  {active ? active.title : "Wähle deine eine Sache"}
                </div>
                <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 4 }}>
                  {active ? active.sub : "Tippe START bei einer Aufgabe unten."}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 8.5, letterSpacing: "0.16em", fontWeight: 700, opacity: 0.8, marginBottom: 2 }}>IGNORANCE DEBT</div>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>−{debt.toFixed(1)}h</div>
                </div>
                <button
                  onClick={() => setRoute("focus")}
                  style={{
                    padding: "12px 22px", background: "#0a0a0c", color: "var(--accent)",
                    border: "none", fontWeight: 700, fontSize: 12, letterSpacing: "0.18em",
                    cursor: "pointer",
                  }}
                >ENGAGE →</button>
              </div>
            </div>
          );
        })()}

        {/* Tasks — scrollable middle section */}
        <div data-tutorial="task-list" style={{ flex: 1, overflowY: "auto" }}>

        {/* Tasks today */}
        <div style={{ padding: "20px 28px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="uppercase-label">
            Aufgaben Heute
            {activeKR && (
              <span style={{ marginLeft: 10, color: "var(--accent)" }}>
                · {findKRLabel(activeKR)}
              </span>
            )}
          </div>
          <div className="uppercase-label" style={{ color: "var(--text-dim)" }}>{(() => {
            const n = new Date();
            const DE_DAYS = ["So","Mo","Di","Mi","Do","Fr","Sa"];
            const DE_MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
            return `${DE_DAYS[n.getDay()]}, ${n.getDate()}. ${DE_MONTHS[n.getMonth()]} ${n.getFullYear()}`;
          })()}</div>
        </div>

        <div style={{ padding: "0 28px" }}>
          {filteredTasks.map((t, i) => {
            const isActive = activeTaskId === t.id;
            const isSideQuest = !t.kr && !krOverrides[t.id];
            const noteEntry = getNoteEntry(t.id);
            const hasNote = !!noteEntry.text;
            const isDone = doneTasks.has(t.id);
            return (
              <div key={t.id}
                draggable
                data-tutorial={t.id === "tutorial_task_1" ? "tutorial-task-row" : undefined}
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                onDrop={() => { handleTaskDrop(dragIdx, dragOverIdx); setDragIdx(null); setDragOverIdx(null); }}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                style={{
                  borderTop: dragOverIdx === i && dragIdx !== i
                    ? "2px solid var(--accent)"
                    : i === 0 ? "1px solid var(--line-soft)" : "none",
                  borderBottom: "1px solid var(--line-soft)",
                  opacity: isDone ? 0.35 : isSideQuest ? 0.6 : dragIdx === i ? 0.4 : 1,
                  transition: "opacity .15s",
                  cursor: "grab",
                }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr auto auto auto auto",
                alignItems: "center",
                gap: 18, padding: "16px 0",
              }}>
                <button
                  onClick={() => toggleDone(t.id)}
                  title={isDone ? "Als offen markieren" : "Als erledigt markieren"}
                  data-tutorial={t.id === "tutorial_task_1" ? "tutorial-task-checkbox" : undefined}
                  style={{
                    width: 22, height: 22, borderRadius: 4, cursor: "pointer",
                    background: isDone ? "var(--accent)" : "transparent",
                    border: `2px solid ${isDone ? "var(--accent)" : "var(--line)"}`,
                    color: isDone ? "#0a0a0c" : "transparent",
                    fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s", padding: 0, flexShrink: 0,
                  }}
                >{isDone ? "✓" : ""}</button>
                <div data-tutorial={t.id === "tutorial_task_1" ? "task-content" : undefined} onClick={() => {
                  const krLabel = findKRLabel(t.kr) || "";
                  const parts = krLabel ? krLabel.split(":") : [];
                  const ownerObj = allObjectives.find(o => o.krs.some(k => k.id === t.kr));
                  onOpenTask && onOpenTask({
                    ...t,
                    _pov: t.pov || pov,
                    _objectiveTitle: ownerObj?.title || objective.title,
                    _krLabel: parts.length > 0 ? parts[0].trim() : null,
                    _krTitle: parts.length > 1 ? parts.slice(1).join(":").trim() : null,
                  });
                }} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5, textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--text-dim)" : "var(--accent)" }}>{t.title}</span>
                    {isSideQuest && (
                      <span title="Kein Key Result — Ablenkungsrisiko" style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                        color: "var(--warn)", border: "1px solid rgba(212,162,60,.4)",
                        background: "var(--warn-soft)", padding: "2px 7px",
                      }}>⚠ SIDE QUEST</span>
                    )}
                    {!t.kr && krOverrides[t.id] && (() => {
                      const oKr = objective.keyResults.find(k => k.id === krOverrides[t.id]);
                      return oKr ? (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent)", border: "1px solid var(--accent-line)", padding: "2px 7px" }}>
                          → {oKr.label}
                        </span>
                      ) : null;
                    })()}
                    {hasNote && (
                      <span title="Hat Notiz" style={{ fontSize: 9.5, color: "var(--accent)", opacity: 0.7 }}>✎</span>
                    )}
                  </div>
                  {hasNote ? (
                    <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 3, fontStyle: "italic", lineHeight: 1.4 }}>
                      {noteEntry.text.length > 80 ? noteEntry.text.slice(0, 80) + "…" : noteEntry.text}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                      {(() => {
                        if (isSideQuest) return <span style={{ color: "var(--warn)", fontStyle: "italic" }}>Warum machst du das? → Kein KR-Bezug.</span>;
                        if (!t.kr && krOverrides[t.id]) {
                          const oKr = objective.keyResults.find(k => k.id === krOverrides[t.id]);
                          if (oKr) return <span style={{ color: "var(--accent)" }}>✓ Konvertiert → {oKr.label}</span>;
                        }
                        return t.sub;
                      })()}
                    </div>
                  )}
                </div>
                {editingTimeId === t.id ? (
                  <input
                    autoFocus
                    className="mono"
                    value={editTimeVal}
                    onChange={e => setEditTimeVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") commitEditTime(t.id); if (e.key === "Escape") setEditingTimeId(null); }}
                    onBlur={() => commitEditTime(t.id)}
                    style={{
                      width: 90, fontSize: 20, fontWeight: 500, textAlign: "center",
                      background: "var(--panel-2)", border: "1px solid var(--accent-line)",
                      color: "var(--accent)", padding: "4px 8px", outline: "none",
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                  />
                ) : (
                  <span
                    className="mono"
                    title={isActive ? undefined : "Klicken zum Bearbeiten"}
                    onClick={() => !isActive && startEditTime(t)}
                    style={{
                      fontSize: 22, fontWeight: 500,
                      color: isActive ? "var(--accent)" : "var(--text-faint)",
                      cursor: isActive ? "default" : "pointer",
                    }}
                  >{fmtTime(elapsedFor(t))}</span>
                )}
                {isActive ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--accent)", letterSpacing: "0.12em", fontWeight: 600 }}>
                    <span style={{ width: 6, height: 6, background: "var(--accent)", borderRadius: "50%", boxShadow: "0 0 8px var(--accent)" }} />
                    LIVE
                  </span>
                ) : <span />}
                <button
                  data-tutorial={t.id === "tutorial_task_1" ? "task-start-btn" : undefined}
                  disabled={isDone}
                  onClick={() => {
                    if (isActive) { setActiveTaskId(null); }
                    else { setActiveTaskId(t.id); setRoute("focus"); window.TUTORIAL?.onAction?.('route-focus'); }
                  }}
                  style={{
                    padding: "9px 22px", minWidth: 100,
                    background: isActive ? "var(--accent)" : "var(--panel-2)",
                    color: isActive ? "#0a0a0c" : "var(--text)",
                    border: "1px solid " + (isActive ? "var(--accent)" : "var(--line)"),
                    fontWeight: 700, fontSize: 11, letterSpacing: "0.18em",
                    cursor: isDone ? "default" : "pointer",
                    opacity: isDone ? 0.3 : 1,
                  }}
                >{isDone ? "DONE" : isActive ? "PAUSE" : "START →"}</button>
                {t.custom ? (
                  <button onClick={() => deleteCustomTask(t.id)} title="Task löschen"
                    style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: "0 4px", lineHeight: 1 }}>×</button>
                ) : <span />}
              </div>
              </div>
            );
          })}

          {filteredTasks.length === 0 && activeKR && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
              Keine Tasks für dieses Key Result. Füge welche hinzu.
            </div>
          )}

          {/* Add task */}
          {adding ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderTop: "1px solid var(--line-soft)" }}>
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setAdding(false); }}
                placeholder="Task-Titel…"
                style={{
                  flex: 1, background: "var(--panel-2)", border: "1px solid var(--accent-line)",
                  color: "var(--text)", padding: "9px 14px", fontSize: 13.5,
                  outline: "none", fontFamily: "inherit",
                }}
              />
              <select
                value={newKR}
                onChange={e => setNewKR(e.target.value)}
                style={{
                  background: "var(--panel-2)", border: "1px solid var(--line)",
                  color: "var(--text-dim)", padding: "9px 12px", fontSize: 11,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <option value="none">⚠ Kein KR (Side Quest)</option>
                {allKRsForSelect.map(k => (
                  <option key={k.id} value={k.id}>{k.label}</option>
                ))}
              </select>
              <button onClick={addTask} style={{
                padding: "9px 18px", background: "var(--accent)", color: "#0a0a0c",
                border: "none", fontWeight: 700, fontSize: 11, letterSpacing: "0.16em", cursor: "pointer",
              }}>HINZUFÜGEN</button>
              <button onClick={() => setAdding(false)} style={{
                padding: "9px 14px", background: "transparent", border: "1px solid var(--line)",
                color: "var(--text-faint)", fontSize: 11, cursor: "pointer",
              }}>✕</button>
            </div>
          ) : (
            <div style={{ padding: "12px 0" }}>
              <button onClick={() => setAdding(true)} style={{
                background: "transparent", border: "1px dashed var(--line)",
                color: "var(--text-faint)", padding: "8px 18px", fontSize: 11,
                letterSpacing: "0.14em", fontWeight: 600, cursor: "pointer", width: "100%",
                transition: "all .15s",
              }}>+ TASK HINZUFÜGEN</button>
            </div>
          )}
        </div>

        {/* Inbox — quick capture items */}
        {inbox && inbox.length > 0 && (
          <div style={{ margin: "8px 28px 0", border: "1px solid var(--line-soft)" }}>
            <button
              onClick={() => setInboxOpen(o => !o)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", background: "transparent", border: "none",
                color: "var(--text-faint)", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.18em" }}>
                INBOX <span style={{ color: "var(--warn)", marginLeft: 6 }}>{inbox.length}</span>
              </span>
              <span style={{ fontSize: 10 }}>{inboxOpen ? "▲" : "▼"}</span>
            </button>
            {inboxOpen && inbox.map(item => {
              const ts = new Date(item.ts);
              const timeStr = ts.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
              const dayStr = ts.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
              return (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                  borderTop: "1px solid var(--line-soft)",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 500 }}>{item.text}</div>
                    <div style={{ fontSize: 9.5, color: "var(--text-faint)", marginTop: 2, letterSpacing: "0.04em" }}>
                      {dayStr} {timeStr} · {item.pov}
                    </div>
                  </div>
                  <button onClick={() => {
                    const task = {
                      id: `custom_${Date.now()}`,
                      n: tasksToday.length + 1,
                      title: item.text,
                      sub: "", kr: null, elapsed: 0, pov, custom: true,
                    };
                    setCustomTasks(prev => [...prev, task]);
                    setInbox(prev => prev.filter(i => i.id !== item.id));
                  }} style={{
                    background: "var(--accent-soft)", border: "1px solid var(--accent-line)",
                    color: "var(--accent)", padding: "5px 12px", fontSize: 9.5,
                    fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer", fontFamily: "inherit",
                    flexShrink: 0,
                  }}>→ TASK</button>
                  <button onClick={() => setInbox(prev => prev.filter(i => i.id !== item.id))} style={{
                    background: "none", border: "none", color: "var(--text-faint)",
                    fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0,
                  }}>×</button>
                </div>
              );
            })}
          </div>
        )}

        </div>{/* end scrollable tasks */}

        {/* Behavior Check-in Strip */}
        <BehaviorStrip />

        {/* Truth Loop — fixed at bottom */}
        <div style={{ flexShrink: 0, borderTop: "1px solid var(--line)", maxHeight: "42vh", overflowY: "auto" }}>
          <TruthLoop truthPlan={truthPlan} setTruthPlan={setTruthPlan} />
        </div>
      </div>

      {/* Done Toast */}
      {doneToast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "var(--panel)", border: "1px solid var(--good)",
          color: "var(--good)", fontSize: 12.5, fontWeight: 700,
          padding: "10px 22px", letterSpacing: "0.06em",
          zIndex: 9999, pointerEvents: "none",
          animation: "fadeInUp .18s ease",
        }}>{doneToast}</div>
      )}
    </div>
  );
}

// ─── Behavior Strip ─────────────────────────────────────────────────────────
function BehaviorStrip() {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [habits, setHabits] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_habits") || "[]"); } catch { return []; }
  });
  const [expanded, setExpanded]       = React.useState(false);
  const [manualCheckin, setManualCheckin] = React.useState(() => {
    try { return !!(JSON.parse(LS.getItem("lifeos_system_checkin") || "{}")[todayISO]); } catch { return false; }
  });

  const saveHabits = (arr) => {
    setHabits(arr);
    try { LS.setItem("lifeos_habits", JSON.stringify(arr)); } catch {}
    window.dispatchEvent(new CustomEvent("lifeos-habits-updated"));
  };

  React.useEffect(() => {
    const sync = () => {
      try { setHabits(JSON.parse(LS.getItem("lifeos_habits") || "[]")); } catch {}
    };
    window.addEventListener("lifeos-habits-updated", sync);
    return () => window.removeEventListener("lifeos-habits-updated", sync);
  }, []);

  const saveManualCheckin = (val) => {
    setManualCheckin(val);
    try {
      const log = JSON.parse(LS.getItem("lifeos_system_checkin") || "{}");
      if (val) log[todayISO] = "manual"; else delete log[todayISO];
      LS.setItem("lifeos_system_checkin", JSON.stringify(log));
    } catch {}
  };

  const getStreak = (log) => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const iso = d.toISOString().slice(0, 10);
      if (!log[iso]) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  const toggleHabit = (habitId) => {
    const arr = habits.map(h => {
      if (h.id !== habitId) return h;
      const log = { ...h.log };
      const checked = !log[todayISO];
      checked ? (log[todayISO] = true) : delete log[todayISO];
      if (checked) window.TUTORIAL?.onAction?.('habit-checked-' + habitId);
      return { ...h, log };
    });
    saveHabits(arr);
  };

  const checkedCount  = habits.filter(h => !!h.log[todayISO]).length;
  const allDone       = habits.length > 0 && checkedCount === habits.length;
  const systemDone    = allDone || manualCheckin;
  const isOverride    = manualCheckin && !allDone;

  // Auto-clear manual flag when all habits are actually done
  React.useEffect(() => {
    if (allDone && manualCheckin) saveManualCheckin(false);
  }, [allDone]);

  const masterColor = allDone ? "var(--good)" : isOverride ? "var(--warn)" : "var(--line)";

  return (
    <div data-tutorial="behavior-strip" style={{ flexShrink: 0, borderTop: "1px solid var(--line-soft)", background: "var(--panel)" }}>

      {/* ── Header — always visible ── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 28px", cursor: "pointer", userSelect: "none",
          borderBottom: expanded ? "1px solid var(--line-soft)" : "none",
        }}
      >
        {/* Master checkbox */}
        <button
          onClick={e => { e.stopPropagation(); if (!allDone) saveManualCheckin(!manualCheckin); }}
          title={allDone ? "Automatisch ✓ — alle Habits erledigt" : isOverride ? "Manuell gesetzt — klicken zum Zurücksetzen" : "Manuell als erledigt markieren"}
          style={{
            width: 22, height: 22, borderRadius: 4, flexShrink: 0,
            background: systemDone ? masterColor : "transparent",
            border: `2px solid ${masterColor}`,
            color: "#0a0a0c", fontSize: 11, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: allDone ? "default" : "pointer",
            transition: "all .2s", padding: 0,
          }}
        >{systemDone ? "✓" : ""}</button>

        {/* Label + count */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.16em", color: systemDone ? (allDone ? "var(--good)" : "var(--warn)") : "var(--text-faint)" }}>
            DAILY SYSTEM CHECK-IN{isOverride ? " · OVERRIDE" : ""}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>
            {habits.length === 0 ? "Keine Habits — in Insights hinzufügen" : `${checkedCount} / ${habits.length} Habits erledigt`}
          </div>
        </div>

        {/* Progress dots */}
        {habits.length > 0 && (
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            {habits.map(h => (
              <div key={h.id} style={{
                width: 8, height: 8, borderRadius: 2,
                background: h.log[todayISO] ? h.color : "var(--line)",
                transition: "background .2s",
              }} />
            ))}
          </div>
        )}

        <span style={{ fontSize: 9, color: "var(--text-faint)", flexShrink: 0, marginLeft: 4 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* ── Expanded habit grid ── */}
      {expanded && (
        <div style={{
          padding: "12px 28px 16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: 8,
        }}>
          {habits.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontStyle: "italic", gridColumn: "1/-1" }}>
              Noch keine Habits — unter Insights → Behavior Tracker hinzufügen.
            </div>
          ) : habits.map(h => {
            const done = !!h.log[todayISO];
            const streak = getStreak(h.log);
            return (
              <div
                key={h.id}
                onClick={() => toggleHabit(h.id)}
                data-tutorial={h.id === "tutorial_habit_1" ? "tutorial-habit-checkbox" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  background: done ? h.color + "18" : "var(--panel-2)",
                  border: `1px solid ${done ? h.color + "60" : "var(--line-soft)"}`,
                  cursor: "pointer", transition: "all .15s",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                  background: done ? h.color : "transparent",
                  border: `2px solid ${done ? h.color : "var(--line)"}`,
                  color: "#0a0a0c", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
                }}>{done ? "✓" : ""}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: done ? h.color : "var(--text-dim)", flex: 1 }}>
                  {h.name}
                </span>
                {streak > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                    color: streak >= 7 ? "var(--good)" : streak >= 3 ? "var(--warn)" : "var(--text-faint)",
                  }}>{streak >= 3 ? "🔥" : ""}{streak}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TruthLoop({ truthPlan, setTruthPlan }) {
  const [hl, setHl] = React.useState("both");
  const [editMode, setEditMode] = React.useState(false);
  const [areaHover, setAreaHover] = React.useState(false);
  const plan = truthPlan || TRUTH_LOOP.plan;
  const reality = TRUTH_LOOP.reality;
  const days = TRUTH_LOOP.days;
  const debt = plan.reduce((a, b) => a + b, 0) - reality.reduce((a, b) => a + b, 0);

  const updatePlanDay = (i, val) => {
    const v = Math.max(0, Math.min(24, parseFloat(val) || 0));
    setTruthPlan(prev => prev.map((x, idx) => idx === i ? v : x));
  };

  const max = 10;
  const W = 600, H = 180, padL = 32, padR = 8, padT = 24, padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const gap = 7;
  const bw = (innerW - gap * (days.length - 1)) / days.length;

  const pOp = hl === "reality" ? 0.1 : 1;
  const rOp = hl === "plan"    ? 0.1 : 1;

  return (
    <div
      onMouseEnter={() => setAreaHover(true)}
      onMouseLeave={() => { setAreaHover(false); setHl("both"); }}
      style={{ padding: "32px 28px 40px" }}
    >
      {/* header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div className="uppercase-label">The Truth Loop</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* NUR-Buttons — erscheinen nur bei Hover */}
          {[["plan", "NUR PLAN"], ["reality", "NUR REALITÄT"]].map(([id, label]) => {
            const active = hl === id;
            return (
              <button key={id}
                onMouseEnter={() => setHl(id)}
                onMouseLeave={() => setHl("both")}
                style={{
                  padding: "4px 12px", background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  cursor: "pointer",
                  border: `1px solid ${active ? "var(--text-dim)" : "var(--line)"}`,
                  color: active ? "var(--text)" : "var(--text-faint)",
                  fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em",
                  transition: "all .15s",
                  opacity: areaHover ? 1 : 0,
                  pointerEvents: areaHover ? "auto" : "none",
                }}>{label}</button>
            );
          })}
          {/* Edit-Button — nur bei Hover oder wenn editMode aktiv */}
          <button onClick={() => setEditMode(e => !e)}
            style={{
              marginLeft: 10,
              padding: "4px 12px",
              background: editMode ? "var(--accent)" : "transparent",
              cursor: "pointer",
              border: `1px solid ${editMode ? "var(--accent)" : "var(--line)"}`,
              color: editMode ? "#0a0a0c" : "var(--text-faint)",
              fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em",
              transition: "all .15s",
              opacity: (areaHover || editMode) ? 1 : 0,
              pointerEvents: (areaHover || editMode) ? "auto" : "none",
            }}>EDIT</button>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 20 }}>
        Plan (sollte) vs. Realität (das ist) — leerer Raum = Selbstbetrug.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center" }}>
        {/* overlaid chart */}
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {/* grid */}
          {[0, 2, 4, 6, 8, 10].map(v => {
            const y = padT + innerH - (v / max) * innerH;
            return (
              <g key={v}>
                <text x={4} y={y + 3} fontSize="9" fill="var(--text-faint)" fontFamily="JetBrains Mono, monospace">{v}h</text>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth="1" />
              </g>
            );
          })}

          {days.map((day, i) => {
            const x = padL + i * (bw + gap);
            const ph = (plan[i] / max) * innerH;
            const rh = (reality[i] / max) * innerH;
            const py = padT + innerH - ph;
            const ry = padT + innerH - rh;
            const hasGap = plan[i] > reality[i];

            return (
              <g key={i}>
                {/* debt gap — reddish fill between reality top and plan top */}
                {hasGap && (
                  <rect x={x} y={py} width={bw} height={ph - rh}
                    style={{ fill: "rgba(214,50,74,0.13)", opacity: rOp, transition: "opacity .2s" }} />
                )}
                {/* reality bar */}
                {reality[i] > 0 && (
                  <rect x={x} y={ry} width={bw} height={rh}
                    style={{ fill: "rgba(214,50,74,0.65)", stroke: "rgba(214,50,74,0.9)", strokeWidth: 1, opacity: rOp, transition: "opacity .2s" }} />
                )}
                {/* plan outline */}
                <rect x={x} y={py} width={bw} height={ph}
                  style={{ fill: "transparent", stroke: "var(--text-dim)", strokeWidth: 1.5, opacity: pOp, transition: "opacity .2s" }} />

                {/* plan label */}
                <text x={x + bw / 2} y={py - 5} fontSize="9" textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  style={{ fill: "var(--text-dim)", opacity: pOp, transition: "opacity .2s" }}>{plan[i]}h</text>

                {/* reality label — only if meaningfully different from plan */}
                {reality[i] > 0 && ph - rh > 14 && (
                  <text x={x + bw / 2} y={ry - 5} fontSize="9" textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace"
                    style={{ fill: "rgba(214,50,74,0.9)", opacity: rOp, transition: "opacity .2s" }}>{reality[i]}h</text>
                )}

                {/* day label */}
                <text x={x + bw / 2} y={H - 5} fontSize="9" textAnchor="middle"
                  fill="var(--text-faint)" fontFamily="JetBrains Mono, monospace" letterSpacing="0.08em">{day}</text>
              </g>
            );
          })}
        </svg>

        {/* ignorance debt */}
        <div style={{
          background: "var(--danger)", color: "#fff",
          padding: "20px 24px", textAlign: "center", minWidth: 160,
        }}>
          <div style={{ fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, opacity: 0.85, marginBottom: 8 }}>IGNORANCE DEBT</div>
          <div className="mono" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1 }}>−{debt.toFixed(1)}h</div>
          <div style={{ fontSize: 10, opacity: 0.85, marginTop: 8, letterSpacing: "0.05em" }}>Stunden Selbstbetrug</div>
        </div>
      </div>

      {/* editable plan hours */}
      {editMode && (
        <div style={{ marginTop: 10, display: "flex", gap: 4, paddingLeft: 32 }}>
          {days.map((day, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <input
                type="number" min="0" max="24" step="0.5"
                value={plan[i]}
                onChange={e => updatePlanDay(i, e.target.value)}
                style={{
                  width: "100%", background: "var(--panel-2)", border: "1px solid var(--accent-line)",
                  color: "var(--text)", textAlign: "center", padding: "4px 2px",
                  fontSize: 11, fontFamily: "JetBrains Mono, monospace", outline: "none",
                }}
              />
              <div style={{ fontSize: 8.5, color: "var(--text-faint)", letterSpacing: "0.08em", marginTop: 3 }}>{day}</div>
            </div>
          ))}
        </div>
      )}

      {/* legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 16, height: 10, border: "1.5px solid var(--text-dim)", background: "transparent" }} />
          <span style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.08em" }}>PLAN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 16, height: 10, background: "rgba(214,50,74,0.65)" }} />
          <span style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.08em" }}>REALITÄT</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 16, height: 10, background: "rgba(214,50,74,0.13)" }} />
          <span style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.08em" }}>DEBT</span>
        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
