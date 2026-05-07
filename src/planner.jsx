// Planner — Timeblocking system with dynamic blocks and task suggestions.

const BLOCK_TYPES = [
  { id: "deep-work", label: "DEEP WORK",   color: "var(--accent)",   glyph: "✦", desc: "Flow-State · Konzentration · ≥60 min" },
  { id: "basic",     label: "BASIC TASKS", color: "var(--text-dim)", glyph: "●", desc: "Quick-Erledigung · ≤30 min" },
  { id: "flex",      label: "FLEX",        color: "var(--warn)",     glyph: "◎", desc: "Beliebige Aufgaben · alle Typen" },
];

const DAY_KEYS = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];

function Planner() {
  const todayRaw = new Date().getDay();
  const todayIdx = todayRaw === 0 ? 6 : todayRaw - 1;

  const [selDay, setSelDay] = React.useState(todayIdx);
  const [selBlockId, setSelBlockId] = React.useState(null);

  const [blocks, setBlocks] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_timeblocks") || "{}"); } catch { return {}; }
  });
  React.useEffect(() => { localStorage.setItem("lifeos_timeblocks", JSON.stringify(blocks)); }, [blocks]);

  const dayBlocks = [...(blocks[selDay] || [])].sort((a, b) => a.start.localeCompare(b.start));
  const selBlock = dayBlocks.find(b => b.id === selBlockId) || null;

  const [showModal, setShowModal] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [draft, setDraft] = React.useState({ name: "", start: "09:00", end: "11:00", type: "deep-work", bucket: "alle", days: [0] });

  const toggleDraftDay = (i) => setDraft(d => {
    const next = d.days.includes(i) ? d.days.filter(x => x !== i) : [...d.days, i];
    return { ...d, days: next.length === 0 ? d.days : next };
  });

  const openAdd = () => {
    setEditId(null);
    setDraft({ name: "", start: "09:00", end: "11:00", type: "deep-work", bucket: "alle", days: [selDay] });
    setShowModal(true);
  };
  const openEdit = (block) => {
    setEditId(block.id);
    setDraft({ name: block.name, start: block.start, end: block.end, type: block.type, bucket: block.bucket, days: [selDay] });
    setShowModal(true);
  };

  const saveBlock = () => {
    if (!draft.name.trim() || draft.start >= draft.end || draft.days.length === 0) return;
    const { days, ...blockData } = draft;
    setBlocks(prev => {
      const next = { ...prev };
      if (editId) {
        // edit only affects the current day
        const arr = [...(next[selDay] || [])];
        const idx = arr.findIndex(b => b.id === editId);
        if (idx !== -1) arr[idx] = { ...arr[idx], ...blockData, name: blockData.name.trim() };
        next[selDay] = arr;
      } else {
        days.forEach(dayIdx => {
          const arr = [...(next[dayIdx] || [])];
          arr.push({ id: `tb_${Date.now()}_${dayIdx}`, ...blockData, name: blockData.name.trim() });
          next[dayIdx] = arr;
        });
      }
      return next;
    });
    setShowModal(false);
  };

  const deleteBlock = (id) => {
    setBlocks(prev => ({ ...prev, [selDay]: (prev[selDay] || []).filter(b => b.id !== id) }));
    if (selBlockId === id) setSelBlockId(null);
  };

  const parseTime = (str) => { const [h, m] = (str || "00:00").split(":").map(Number); return h * 60 + m; };
  const blockMins = (b) => parseTime(b.end) - parseTime(b.start);

  const getSuggestions = (block) => {
    if (!block) return [];
    const allTasks = [];

    for (const { id: povId } of POVS) {
      if (block.bucket !== "alle" && block.bucket !== povId) continue;
      (POV_DATA[povId]?.tasksToday || []).forEach(t =>
        allTasks.push({ ...t, _pov: povId, _source: "daily" })
      );
    }

    for (const proj of PROJECTS) {
      if (block.bucket !== "alle" && block.bucket !== proj.pov) continue;
      (proj.objectives || []).flatMap(o => o.krs).filter(k => k.status !== "locked").forEach(kr => {
        (kr.tasks || []).forEach(t =>
          allTasks.push({ ...t, _pov: proj.pov, _source: proj.title, _kr: kr.label })
        );
      });
    }

    const filtered = allTasks.filter(t => {
      const est = t.est || 30;
      const flow = (t.flow || "QUICK").toUpperCase();
      if (block.type === "deep-work") return flow === "FLOW" || est >= 60;
      if (block.type === "basic")     return flow === "QUICK" || flow === "EASY" || est <= 30;
      return true;
    });

    if (block.type === "deep-work") filtered.sort((a, b) => (b.est || 30) - (a.est || 30));
    else if (block.type === "basic") filtered.sort((a, b) => (a.est || 20) - (b.est || 20));
    return filtered;
  };

  const [blockSelections, setBlockSelections] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_block_selections") || "{}"); } catch { return {}; }
  });
  React.useEffect(() => { localStorage.setItem("lifeos_block_selections", JSON.stringify(blockSelections)); }, [blockSelections]);

  const toggleTaskSel = (blockId, taskKey) => {
    setBlockSelections(prev => {
      const cur = new Set(prev[blockId] || []);
      cur.has(taskKey) ? cur.delete(taskKey) : cur.add(taskKey);
      return { ...prev, [blockId]: [...cur] };
    });
  };
  const isTaskSel = (blockId, taskKey) => (blockSelections[blockId] || []).includes(taskKey);

  const suggestions = getSuggestions(selBlock);
  const budget = selBlock ? blockMins(selBlock) : 0;
  const selTaskKeys = selBlock ? (blockSelections[selBlock.id] || []) : [];
  const selSuggestions = suggestions.filter(t => selTaskKeys.includes(`${t.id}_${t._pov}`));
  const selectedEst = selSuggestions.reduce((s, t) => s + (t.est || 30), 0);

  const tc = (type) => BLOCK_TYPES.find(b => b.id === type) || BLOCK_TYPES[0];
  const canSave = draft.name.trim() && draft.start < draft.end;

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* ── Block modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: 32, width: 440, boxShadow: "0 0 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div className="uppercase-label">{editId ? "Block bearbeiten" : "Neuer Zeitblock"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8 }}>NAME</div>
              <input autoFocus value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && saveBlock()}
                placeholder="z.B. Deep Work · Leads abtelefonieren…"
                style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8 }}>
                {editId ? "TAG" : "WOCHENTAG(E)"}
                {!editId && draft.days.length > 1 && (
                  <span style={{ marginLeft: 8, fontWeight: 400, letterSpacing: 0, color: "var(--accent)" }}>{draft.days.length} Tage gewählt</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {DAY_KEYS.map((key, i) => {
                  const isSel = draft.days.includes(i);
                  const isToday = i === todayIdx;
                  return (
                    <button key={key} onClick={() => !editId ? toggleDraftDay(i) : null} style={{
                      flex: 1, padding: "8px 4px", cursor: editId ? "default" : "pointer",
                      background: isSel ? "var(--accent-soft)" : "var(--panel-2)",
                      border: `1px solid ${isSel ? "var(--accent)" : "var(--line)"}`,
                      color: isSel ? "var(--accent)" : isToday ? "var(--text-dim)" : "var(--text-faint)",
                      fontSize: 10, fontWeight: isSel ? 700 : 600, letterSpacing: "0.1em",
                      transition: "all .1s",
                    }}>{key}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8 }}>VON</div>
                <input type="time" value={draft.start} onChange={e => setDraft(d => ({ ...d, start: e.target.value }))}
                  style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8 }}>BIS</div>
                <input type="time" value={draft.end} onChange={e => setDraft(d => ({ ...d, end: e.target.value }))}
                  style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            </div>
            {draft.start >= draft.end && draft.start && draft.end && (
              <div style={{ fontSize: 9.5, color: "var(--danger)", marginBottom: 10, letterSpacing: "0.1em" }}>⚠ Endzeit muss nach Startzeit liegen</div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8 }}>TYP</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {BLOCK_TYPES.map(bt => (
                  <button key={bt.id} onClick={() => setDraft(d => ({ ...d, type: bt.id }))} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", textAlign: "left",
                    background: draft.type === bt.id ? "var(--accent-soft)" : "var(--panel-2)",
                    border: `1px solid ${draft.type === bt.id ? "var(--accent)" : "var(--line)"}`,
                    color: draft.type === bt.id ? "var(--accent)" : "var(--text-faint)", cursor: "pointer",
                  }}>
                    <span style={{ fontSize: 13, color: bt.color, width: 14 }}>{bt.glyph}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em" }}>{bt.label}</div>
                      <div style={{ fontSize: 9.5, color: "var(--text-faint)", marginTop: 1 }}>{bt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8 }}>BUCKET-FILTER (optional)</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[{ id: "alle", label: "Alle", color: "var(--text-dim)" }, ...POVS].map(p => (
                  <button key={p.id} onClick={() => setDraft(d => ({ ...d, bucket: p.id }))} style={{
                    padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                    border: `1px solid ${draft.bucket === p.id ? p.color : "var(--line)"}`,
                    color: draft.bucket === p.id ? p.color : "var(--text-faint)",
                    background: "transparent", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em",
                  }}>{(p.label).toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {editId && (
                <button onClick={() => { deleteBlock(editId); setShowModal(false); }} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: 10.5, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer" }}>LÖSCHEN</button>
              )}
              <button onClick={() => setShowModal(false)} style={{ padding: "10px 18px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 11, cursor: "pointer" }}>ABBRECHEN</button>
              <button onClick={saveBlock} disabled={!canSave} style={{
                padding: "10px 22px", background: canSave ? "var(--accent)" : "var(--panel-2)",
                color: canSave ? "#0a0a0c" : "var(--text-faint)",
                border: "none", fontSize: 11, letterSpacing: "0.16em", fontWeight: 700, cursor: canSave ? "pointer" : "default",
              }}>SPEICHERN ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ padding: "20px 28px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line-soft)", flexShrink: 0 }}>
        <div>
          <div className="uppercase-label" style={{ marginBottom: 6 }}>Planner</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>KW {WEEK.kw} · {WEEK.range}</h2>
        </div>
        <button onClick={openAdd} style={{ padding: "9px 20px", background: "var(--accent)", color: "#0a0a0c", border: "none", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", cursor: "pointer" }}>+ BLOCK</button>
      </div>

      {/* ── Day tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "var(--panel)", flexShrink: 0 }}>
        {DAY_KEYS.map((key, i) => {
          const isToday = i === todayIdx;
          const isSel = i === selDay;
          const count = (blocks[i] || []).length;
          return (
            <button key={key} onClick={() => { setSelDay(i); setSelBlockId(null); }} style={{
              flex: 1, padding: "13px 8px 11px", background: "transparent",
              border: "none", borderBottom: `3px solid ${isSel ? "var(--accent)" : "transparent"}`,
              color: isSel ? "var(--accent)" : isToday ? "var(--text)" : "var(--text-faint)",
              fontWeight: isSel || isToday ? 700 : 600, fontSize: 10.5, letterSpacing: "0.14em", cursor: "pointer",
            }}>
              {key}
              {count > 0 && <span style={{ display: "block", fontSize: 8, letterSpacing: 0, marginTop: 3, color: isSel ? "var(--accent)" : "var(--text-faint)" }}>{count}</span>}
              {count === 0 && isToday && <span style={{ display: "block", width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", margin: "3px auto 0" }} />}
            </button>
          );
        })}
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr", overflow: "hidden" }}>

        {/* Left — block list */}
        <div style={{ borderRight: "1px solid var(--line)", overflow: "auto", padding: "16px 0" }}>
          <div style={{ padding: "0 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, letterSpacing: "0.18em", fontWeight: 700, color: "var(--text-faint)" }}>ZEITBLÖCKE · {DAY_KEYS[selDay]}</span>
            <span style={{ fontSize: 9, color: "var(--text-faint)" }}>{dayBlocks.length} Block{dayBlocks.length !== 1 ? "s" : ""}</span>
          </div>

          {dayBlocks.length === 0 && (
            <div style={{ padding: "32px 18px", textAlign: "center" }}>
              <div style={{ color: "var(--text-faint)", fontSize: 12, marginBottom: 14 }}>Noch keine Blöcke für diesen Tag.</div>
              <button onClick={openAdd} style={{ background: "transparent", border: "1px dashed var(--line)", color: "var(--accent)", padding: "8px 18px", fontSize: 10, letterSpacing: "0.14em", fontWeight: 700, cursor: "pointer" }}>+ BLOCK HINZUFÜGEN</button>
            </div>
          )}

          {dayBlocks.map(block => {
            const t = tc(block.type);
            const mins = blockMins(block);
            const isSel = selBlockId === block.id;
            const bPov = POVS.find(p => p.id === block.bucket);
            return (
              <div key={block.id} onClick={() => setSelBlockId(isSel ? null : block.id)} style={{
                margin: "0 14px 8px", padding: "13px 15px",
                background: isSel ? "var(--accent-soft)" : "var(--panel)",
                border: `1px solid ${isSel ? "var(--accent)" : "var(--line-soft)"}`,
                borderLeft: `3px solid ${t.color}`,
                cursor: "pointer", transition: "all .15s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: t.color, fontWeight: 700, letterSpacing: "0.14em", marginBottom: 4 }}>{t.glyph} {t.label}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: isSel ? "var(--accent)" : "var(--text)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{block.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>{block.start} – {block.end}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                    <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: isSel ? "var(--accent)" : "var(--text-dim)" }}>{mins}<span style={{ fontSize: 9, fontWeight: 400, marginLeft: 2 }}>min</span></div>
                    {bPov && <div style={{ fontSize: 8.5, letterSpacing: "0.12em", color: bPov.color, marginTop: 3, fontWeight: 700 }}>{bPov.label.toUpperCase()}</div>}
                    {!bPov && <div style={{ fontSize: 8.5, color: "var(--text-faint)", marginTop: 3 }}>ALLE</div>}
                    <button onClick={e => { e.stopPropagation(); openEdit(block); }} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 12, marginTop: 5, padding: 0, display: "block", marginLeft: "auto" }}>✎</button>
                  </div>
                </div>
              </div>
            );
          })}

          {dayBlocks.length > 0 && (
            <div style={{ padding: "4px 14px" }}>
              <button onClick={openAdd} style={{ width: "100%", padding: "9px", background: "transparent", border: "1px dashed var(--line)", color: "var(--text-faint)", fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700, cursor: "pointer" }}>+ BLOCK HINZUFÜGEN</button>
            </div>
          )}
        </div>

        {/* Right — suggestions */}
        <div style={{ overflow: "auto", padding: "20px 24px" }}>
          {!selBlock ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-faint)", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.12 }}>◎</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>Block auswählen</div>
              <div style={{ fontSize: 11 }}>um passende Task-Vorschläge zu sehen</div>
            </div>
          ) : (
            <>
              {/* Suggestions header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--line-soft)" }}>
                <div>
                  <div style={{ fontSize: 9.5, letterSpacing: "0.18em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 4 }}>TASK-ZUTEILUNG</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{selBlock.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>{selBlock.start} – {selBlock.end} · {budget} min Budget</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 26, fontWeight: 800, color: selectedEst > budget ? "var(--danger)" : selTaskKeys.length > 0 ? "var(--good)" : "var(--text-dim)", lineHeight: 1 }}>
                    {selectedEst}<span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-faint)" }}> / {budget} min</span>
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: "0.14em", fontWeight: 700, marginTop: 4, color: selectedEst > budget ? "var(--danger)" : selTaskKeys.length > 0 ? "var(--good)" : "var(--text-faint)" }}>
                    {selectedEst > budget ? "⚠ ÜBERFÜLLT" : selTaskKeys.length === 0 ? "KEINE AUSWAHL" : `✓ ${selTaskKeys.length} TASK${selTaskKeys.length !== 1 ? "S" : ""} GEWÄHLT`}
                  </div>
                </div>
              </div>

              {budget > 0 && selTaskKeys.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <ProgressBar value={Math.min(1, selectedEst / budget)} color={selectedEst > budget ? "var(--danger)" : "var(--good)"} height={3} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 9, color: "var(--text-faint)" }}>{selTaskKeys.length} von {suggestions.length} Aufgaben gewählt</span>
                    <span style={{ fontSize: 9, color: "var(--text-faint)" }}>{Math.round(Math.min(100, selectedEst / budget * 100))}% des Budgets verplant</span>
                  </div>
                </div>
              )}

              {suggestions.length === 0 && (
                <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-faint)" }}>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>Keine passenden Aufgaben gefunden.</div>
                  <div style={{ fontSize: 10.5 }}>Ändere den Block-Typ oder füge Tasks in Mission Control hinzu.</div>
                </div>
              )}

              {suggestions.length > 0 && (
                <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--text-faint)", marginBottom: 12, fontWeight: 600 }}>
                  {suggestions.length} VORSCHLÄGE — ANHAKEN ZUM ZUTEILEN
                </div>
              )}

              {suggestions.map((t, i) => {
                const taskKey = `${t.id}_${t._pov}`;
                const isSel = isTaskSel(selBlock.id, taskKey);
                const povColor = POVS.find(p => p.id === (t._pov || t.pov))?.color || "var(--accent)";
                const flow = (t.flow || "QUICK").toUpperCase();
                const est = t.est || 30;
                return (
                  <div key={`${t.id}_${i}`} onClick={() => toggleTaskSel(selBlock.id, taskKey)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    marginBottom: 6,
                    background: isSel ? "var(--accent-soft)" : "var(--panel)",
                    border: `1px solid ${isSel ? "var(--accent-line)" : "var(--line-soft)"}`,
                    cursor: "pointer", transition: "all .12s",
                    borderLeft: `3px solid ${isSel ? "var(--accent)" : povColor}`,
                  }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                      border: `2px solid ${isSel ? "var(--accent)" : "var(--line)"}`,
                      background: isSel ? "var(--accent)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .12s",
                    }}>
                      {isSel && <span style={{ color: "#0a0a0c", fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: isSel ? 700 : 600, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isSel ? "var(--text)" : "var(--text-dim)" }}>{t.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, color: povColor, letterSpacing: "0.12em", fontWeight: 700 }}>{(t._pov || t.pov || "").toUpperCase()}</span>
                        {t._source && t._source !== "daily" && <span style={{ fontSize: 9.5, color: "var(--text-faint)" }}>· {t._source}</span>}
                        {t._kr && <span style={{ fontSize: 9.5, color: "var(--text-faint)" }}>· {t._kr}</span>}
                      </div>
                    </div>
                    <FlowTag kind={flow} />
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: isSel ? "var(--accent)" : "var(--text-faint)" }}>{est} <span style={{ fontSize: 9, fontWeight: 400 }}>min</span></div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

window.Planner = Planner;
