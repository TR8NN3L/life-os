// Planner — Visual time grid with week navigation + recurring blocks.

const BLOCK_TYPES = [
  { id: "deep-work", label: "DEEP WORK",   color: "var(--accent)",   glyph: "✦", desc: "Flow-State · Konzentration · ≥60 min" },
  { id: "basic",     label: "BASIC TASKS", color: "var(--text-dim)", glyph: "●", desc: "Quick-Erledigung · ≤30 min" },
  { id: "flex",      label: "FLEX",        color: "var(--warn)",     glyph: "◎", desc: "Beliebige Aufgaben · alle Typen" },
];

const DAY_KEYS = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];

const GRID_START_H = 6;
const GRID_END_H   = 23;
const HOUR_H       = 64;

const minsFromStr = s => { const [h,m] = (s||"00:00").split(":").map(Number); return h*60+m; };
const strFromMins = t => { const h=Math.floor(t/60); const m=t%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; };
const snap15      = t => Math.round(t/15)*15;
const clamp       = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const minsToY     = t => (t - GRID_START_H*60) / 60 * HOUR_H;
const yToMins     = y => y / HOUR_H * 60 + GRID_START_H*60;
const GRID_H      = (GRID_END_H - GRID_START_H) * HOUR_H;
const LABEL_W     = 48;

// ── Week helpers ────────────────────────────────────────────────────────────
const DE_MONTHS      = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const DE_MONTHS_S    = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

function computeWeekInfo(monday) {
  const thu    = new Date(monday); thu.setDate(monday.getDate() + 3);
  const yr     = thu.getFullYear();
  const jan4   = new Date(yr, 0, 4);
  const jan4Mo = new Date(jan4);
  jan4Mo.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1));
  const kw     = Math.round((monday - jan4Mo) / 604800000) + 1;
  const sun    = new Date(monday); sun.setDate(monday.getDate() + 6);
  const range  = `${monday.getDate()}.–${sun.getDate()}. ${DE_MONTHS[sun.getMonth()]} ${sun.getFullYear()}`;
  const days   = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return {
      k: DAY_KEYS[i],
      n: String(d.getDate()).padStart(2, "0"),
      dateStr: d.toISOString().slice(0, 10),
      monthShort: DE_MONTHS_S[d.getMonth()],
    };
  });
  return { kw, range, days };
}

function getWeekKey(monday) {
  const thu    = new Date(monday); thu.setDate(monday.getDate() + 3);
  const yr     = thu.getFullYear();
  const jan4   = new Date(yr, 0, 4);
  const jan4Mo = new Date(jan4);
  jan4Mo.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1));
  const kw     = Math.round((monday - jan4Mo) / 604800000) + 1;
  return `${yr}-W${String(kw).padStart(2, "0")}`;
}

// ── Planner component ────────────────────────────────────────────────────────
function Planner() {
  const todayRaw = new Date().getDay();
  const todayIdx = todayRaw === 0 ? 6 : todayRaw - 1;

  // Merge hardcoded + user-created POVs
  const allPovs = React.useMemo(() => {
    try {
      const custom = JSON.parse(LS.getItem("lifeos_user_povs") || "[]");
      const seenIds = new Set(POVS.map(p => p.id));
      return [...POVS, ...custom.filter(p => !seenIds.has(p.id))];
    } catch { return POVS; }
  }, []);

  const [selDay,     setSelDay]     = React.useState(todayIdx);
  const [selBlockId, setSelBlockId] = React.useState(null);
  const [weekOffset, setWeekOffset] = React.useState(0);

  // Display week
  const displayMonday = React.useMemo(() => {
    const m = new Date(WEEK.mon);
    m.setDate(WEEK.mon.getDate() + weekOffset * 7);
    return m;
  }, [weekOffset]);
  const dispWeek    = React.useMemo(() => computeWeekInfo(displayMonday), [displayMonday]);
  const dispWeekKey = React.useMemo(() => getWeekKey(displayMonday), [displayMonday]);
  const isCurrentWk = weekOffset === 0;

  // ── Block storage: allBlocks[weekKey][dayIdx] = [...] ──────────────────────
  const [allBlocks, setAllBlocks] = React.useState(() => {
    try {
      const v2 = LS.getItem("lifeos_timeblocks_v2");
      if (v2) return JSON.parse(v2);
      // Migrate v1 (day-index keyed) → v2 (weekKey keyed)
      const v1  = JSON.parse(LS.getItem("lifeos_timeblocks") || "{}");
      const wk  = getWeekKey(WEEK.mon);
      return { [wk]: v1 };
    } catch { return {}; }
  });
  React.useEffect(() => { LS.setItem("lifeos_timeblocks_v2", JSON.stringify(allBlocks)); }, [allBlocks]);

  // Proxy: read/write the current display week's blocks transparently
  const weekBlocks = allBlocks[dispWeekKey] || {};
  const setWeekBlocks = React.useCallback(updater => {
    setAllBlocks(prev => {
      const cur  = prev[dispWeekKey] || {};
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...prev, [dispWeekKey]: next };
    });
  }, [dispWeekKey]);

  // ── Recurring blocks ───────────────────────────────────────────────────────
  const [recurring, setRecurring] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_recurring_blocks") || "[]"); }
    catch { return []; }
  });
  React.useEffect(() => { LS.setItem("lifeos_recurring_blocks", JSON.stringify(recurring)); }, [recurring]);

  // Merge recurring + week-specific for selDay
  const recurringForDay = React.useMemo(() => {
    const dateStr = dispWeek.days[selDay]?.dateStr;
    if (!dateStr) return [];
    const deleted = new Set(weekBlocks[`del_${selDay}`] || []);
    return recurring.filter(rb => {
      if (deleted.has(rb.id)) return false;
      if (rb.startDateStr && rb.startDateStr > dateStr) return false;
      if (rb.recurrence === "daily")    return true;
      if (rb.recurrence === "weekdays") return selDay <= 4;
      if (rb.recurrence === "weekly")   return rb.dayIndex === selDay;
      return false;
    }).map(rb => ({ ...rb, _recurring: true }));
  }, [recurring, selDay, dispWeek, weekBlocks]);

  const specificForDay = weekBlocks[selDay] || [];
  const dayBlocks = [...recurringForDay, ...specificForDay]
    .sort((a, b) => a.start.localeCompare(b.start));
  const selBlock = dayBlocks.find(b => b.id === selBlockId) || null;

  // ── Modal ──────────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = React.useState(false);
  const [editId,    setEditId]    = React.useState(null);
  const [draft, setDraft] = React.useState({
    name:"", start:"09:00", end:"11:00", type:"deep-work", bucket:"alle",
    days:[0], recurrence:"none",
  });

  const toggleDraftDay = i => setDraft(d => {
    const next = d.days.includes(i) ? d.days.filter(x=>x!==i) : [...d.days,i];
    return { ...d, days: next.length===0 ? d.days : next };
  });

  const openAdd = (startMins=null) => {
    setEditId(null);
    const s = startMins !== null ? strFromMins(clamp(snap15(startMins), GRID_START_H*60, GRID_END_H*60-60)) : "09:00";
    const e = startMins !== null ? strFromMins(clamp(snap15(startMins)+60, GRID_START_H*60+60, GRID_END_H*60)) : "11:00";
    setDraft({ name:"", start:s, end:e, type:"deep-work", bucket:"alle", days:[selDay], recurrence:"none" });
    setShowModal(true);
  };

  const openEdit = block => {
    setEditId(block.id);
    const isRec = !!block._recurring;
    setDraft({
      name: block.name, start: block.start, end: block.end,
      type: block.type, bucket: block.bucket,
      days: [selDay],
      recurrence: isRec ? (block.recurrence || "none") : "none",
    });
    setShowModal(true);
  };

  const saveBlock = () => {
    if (!draft.name.trim() || draft.start >= draft.end) return;
    const { days, recurrence, ...blockData } = draft;
    const base = { ...blockData, name: blockData.name.trim() };

    if (recurrence !== "none") {
      const rb = {
        id: editId && recurring.find(r=>r.id===editId) ? editId : `rb_${Date.now()}`,
        ...base, recurrence, dayIndex: selDay,
        startDateStr: dispWeek.days[selDay]?.dateStr || "",
      };
      setRecurring(prev =>
        prev.find(r=>r.id===rb.id)
          ? prev.map(r => r.id===rb.id ? rb : r)
          : [...prev, rb]
      );
    } else {
      setWeekBlocks(prev => {
        const next = { ...prev };
        if (editId) {
          // Could be editing a specific block OR converting recurring→specific
          const arr = [...(next[selDay]||[])];
          const idx = arr.findIndex(b=>b.id===editId);
          if (idx!==-1) {
            arr[idx] = { ...arr[idx], ...base };
            next[selDay] = arr;
          } else {
            // Was recurring, now specific for this day only
            next[selDay] = [...arr, { id:`tb_${Date.now()}_${selDay}`, ...base }];
          }
        } else {
          days.forEach(d => {
            next[d] = [...(next[d]||[]), { id:`tb_${Date.now()}_${d}`, ...base }];
          });
        }
        return next;
      });
    }
    setShowModal(false);
  };

  const deleteBlock = id => {
    const isRec = recurring.some(rb => rb.id === id);
    if (isRec) {
      setRecurring(prev => prev.filter(rb => rb.id !== id));
    } else {
      setWeekBlocks(prev => ({ ...prev, [selDay]:(prev[selDay]||[]).filter(b=>b.id!==id) }));
    }
    if (selBlockId===id) setSelBlockId(null);
  };

  // ── Drag ──────────────────────────────────────────────────────────────────
  const gridRef    = React.useRef(null);
  const dragRef    = React.useRef(null);
  const [, forceRender] = React.useReducer(x=>x+1, 0);
  const [hoverMins, setHoverMins] = React.useState(null);

  const getGridY = clientY => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    return (y >= 0 && y <= GRID_H) ? y : null;
  };

  const onBlockMouseDown = (e, block, type) => {
    e.preventDefault(); e.stopPropagation();
    const startMins = minsFromStr(block.start);
    const endMins   = minsFromStr(block.end);
    const rect = gridRef.current.getBoundingClientRect();
    const yInGrid = e.clientY - rect.top;
    const mouseOffsetMins = clamp(yToMins(yInGrid) - startMins, 0, endMins - startMins);
    dragRef.current = {
      type, blockId: block.id, isRecurring: !!block._recurring,
      startClientY: e.clientY, mouseOffsetMins,
      origStartMins: startMins, origEndMins: endMins,
      liveStartMins: startMins, liveEndMins: endMins, moved: false,
    };
    forceRender();
  };

  React.useEffect(() => {
    const onMouseMove = e => {
      const dr = dragRef.current;
      if (!dr) return;
      if (Math.abs(e.clientY - dr.startClientY) > 3) dr.moved = true;
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const cur  = yToMins(e.clientY - rect.top);
      if (dr.type === "move") {
        const dur = dr.origEndMins - dr.origStartMins;
        const ns  = clamp(snap15(cur - dr.mouseOffsetMins), GRID_START_H*60, GRID_END_H*60 - dur);
        dr.liveStartMins = ns; dr.liveEndMins = ns + dur;
      } else {
        dr.liveEndMins = clamp(snap15(cur), dr.origStartMins + 15, GRID_END_H*60);
      }
      forceRender();
    };
    const onMouseUp = () => {
      const dr = dragRef.current;
      if (!dr) return;
      if (!dr.moved) {
        setSelBlockId(id => id===dr.blockId ? null : dr.blockId);
      } else {
        const { blockId, liveStartMins, liveEndMins, isRecurring } = dr;
        const newStart = strFromMins(liveStartMins);
        const newEnd   = strFromMins(liveEndMins);
        if (isRecurring) {
          // Drag on recurring → create day-specific override
          const rb = recurring.find(r => r.id === blockId);
          if (rb) {
            const override = { ...rb, id:`tb_${Date.now()}_${selDay}`, start:newStart, end:newEnd, _recurring:false };
            delete override._recurring;
            // Mark recurring as deleted for this day
            setWeekBlocks(prev => ({
              ...prev,
              [`del_${selDay}`]: [...(prev[`del_${selDay}`]||[]), blockId],
              [selDay]: [...(prev[selDay]||[]), override],
            }));
          }
        } else {
          setWeekBlocks(prev => ({
            ...prev,
            [selDay]: (prev[selDay]||[]).map(b =>
              b.id===blockId ? { ...b, start:newStart, end:newEnd } : b
            )
          }));
        }
      }
      dragRef.current = null; forceRender();
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [selDay, recurring]);

  // ── Suggestions / task selection ──────────────────────────────────────────
  const getSuggestions = block => {
    if (!block) return [];
    const allTasks = [];
    let customProjs = [];
    try { customProjs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]"); } catch {}
    for (const { id:povId } of allPovs) {
      if (block.bucket!=="alle" && block.bucket!==povId) continue;
      (POV_DATA[povId]?.tasksToday||[]).forEach(t => allTasks.push({...t,_pov:povId,_source:"daily"}));
    }
    for (const proj of [...PROJECTS, ...customProjs]) {
      if (block.bucket!=="alle" && block.bucket!==proj.pov) continue;
      (proj.objectives||[]).flatMap(o=>o.krs||[]).filter(k=>k.status!=="locked").forEach(kr => {
        (kr.tasks||[]).forEach(t => allTasks.push({...t,_pov:proj.pov,_source:proj.title,_kr:kr.label}));
      });
    }
    return allTasks.filter(t => {
      const est=t.est||30, flow=(t.flow||"QUICK").toUpperCase();
      if (block.type==="deep-work") return flow==="FLOW"||est>=60;
      if (block.type==="basic")     return flow==="QUICK"||flow==="EASY"||est<=30;
      return true;
    }).sort((a,b) => block.type==="deep-work" ? (b.est||30)-(a.est||30) : (a.est||20)-(b.est||20));
  };

  const [blockSelections, setBlockSelections] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_block_selections") || "{}"); } catch { return {}; }
  });
  React.useEffect(() => { LS.setItem("lifeos_block_selections", JSON.stringify(blockSelections)); }, [blockSelections]);

  const toggleTaskSel = (blockId, taskKey) => {
    setBlockSelections(prev => {
      const cur = new Set(prev[blockId]||[]);
      cur.has(taskKey) ? cur.delete(taskKey) : cur.add(taskKey);
      return { ...prev, [blockId]:[...cur] };
    });
  };
  const isTaskSel = (blockId, taskKey) => (blockSelections[blockId]||[]).includes(taskKey);

  const suggestions  = getSuggestions(selBlock);
  const budget       = selBlock ? minsFromStr(selBlock.end) - minsFromStr(selBlock.start) : 0;
  const selTaskKeys  = selBlock ? (blockSelections[selBlock.id]||[]) : [];
  const selSuggs     = suggestions.filter(t => selTaskKeys.includes(`${t.id}_${t._pov}`));
  const selectedEst  = selSuggs.reduce((s,t)=>s+(t.est||30),0);

  const tc      = type => BLOCK_TYPES.find(b=>b.id===type)||BLOCK_TYPES[0];
  const canSave = draft.name.trim() && draft.start < draft.end;

  const nowMins  = (() => { const n=new Date(); return n.getHours()*60+n.getMinutes(); })();
  const showNow  = isCurrentWk && selDay===todayIdx && nowMins>=GRID_START_H*60 && nowMins<=GRID_END_H*60;

  const recurrenceLabels = { none:"Einmalig", daily:"Täglich", weekdays:"Werktags (Mo–Fr)", weekly:"Wöchentlich" };

  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={{ background:"var(--panel)", border:"1px solid var(--line)", padding:32, width:460, boxShadow:"0 0 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div className="uppercase-label">{editId?"Block bearbeiten":"Neuer Zeitblock"}</div>
              <button onClick={()=>setShowModal(false)} style={{ background:"none", border:"none", color:"var(--text-faint)", cursor:"pointer", fontSize:18, padding:0 }}>×</button>
            </div>

            {/* Name */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>NAME</div>
              <input autoFocus value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&saveBlock()}
                placeholder="z.B. Deep Work · Leads abtelefonieren…"
                style={{ width:"100%", background:"var(--panel-2)", border:"1px solid var(--line)", color:"var(--text)", padding:"10px 14px", fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
            </div>

            {/* Wiederkehrend */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>WIEDERHOLUNG</div>
              <div style={{ display:"flex", gap:6 }}>
                {Object.entries(recurrenceLabels).map(([val, lbl]) => (
                  <button key={val} onClick={()=>setDraft(d=>({...d,recurrence:val}))} style={{
                    flex:1, padding:"7px 4px", cursor:"pointer", fontSize:9, fontWeight:700, letterSpacing:"0.08em",
                    background:draft.recurrence===val?"var(--accent-soft)":"var(--panel-2)",
                    border:`1px solid ${draft.recurrence===val?"var(--accent)":"var(--line)"}`,
                    color:draft.recurrence===val?"var(--accent)":"var(--text-faint)",
                  }}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* Day selector (only for Einmalig) */}
            {draft.recurrence === "none" && !editId && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>
                  TAG{draft.days.length>1&&<span style={{ marginLeft:8, fontWeight:400, letterSpacing:0, color:"var(--accent)" }}>{draft.days.length} Tage</span>}
                </div>
                <div style={{ display:"flex", gap:5 }}>
                  {DAY_KEYS.map((key,i)=>{
                    const isSel=draft.days.includes(i), isToday=isCurrentWk&&i===todayIdx;
                    return <button key={key} onClick={()=>toggleDraftDay(i)} style={{
                      flex:1, padding:"8px 4px", cursor:"pointer",
                      background:isSel?"var(--accent-soft)":"var(--panel-2)",
                      border:`1px solid ${isSel?"var(--accent)":"var(--line)"}`,
                      color:isSel?"var(--accent)":isToday?"var(--text-dim)":"var(--text-faint)",
                      fontSize:10, fontWeight:isSel?700:600, letterSpacing:"0.1em", transition:"all .1s",
                    }}>{key}</button>;
                  })}
                </div>
              </div>
            )}

            {/* Time */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              {[["VON","start"],["BIS","end"]].map(([lbl,key])=>(
                <div key={key}>
                  <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>{lbl}</div>
                  <input type="time" value={draft[key]} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))}
                    style={{ width:"100%", background:"var(--panel-2)", border:"1px solid var(--line)", color:"var(--text)", padding:"10px 14px", fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                </div>
              ))}
            </div>
            {draft.start>=draft.end&&draft.start&&draft.end&&(
              <div style={{ fontSize:9.5, color:"var(--danger)", marginBottom:10, letterSpacing:"0.1em" }}>⚠ Endzeit muss nach Startzeit liegen</div>
            )}

            {/* Type */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>TYP</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {BLOCK_TYPES.map(bt=>(
                  <button key={bt.id} onClick={()=>setDraft(d=>({...d,type:bt.id}))} style={{
                    display:"flex", alignItems:"center", gap:12, padding:"10px 14px", textAlign:"left",
                    background:draft.type===bt.id?"var(--accent-soft)":"var(--panel-2)",
                    border:`1px solid ${draft.type===bt.id?"var(--accent)":"var(--line)"}`,
                    color:draft.type===bt.id?"var(--accent)":"var(--text-faint)", cursor:"pointer",
                  }}>
                    <span style={{ fontSize:13, color:bt.color, width:14 }}>{bt.glyph}</span>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em" }}>{bt.label}</div>
                      <div style={{ fontSize:9.5, color:"var(--text-faint)", marginTop:1 }}>{bt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bucket */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>BUCKET-FILTER</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {[{id:"alle",label:"Alle",color:"var(--text-dim)"},...allPovs].map(p=>(
                  <button key={p.id} onClick={()=>setDraft(d=>({...d,bucket:p.id}))} style={{
                    padding:"6px 14px", borderRadius:999, cursor:"pointer",
                    border:`1px solid ${draft.bucket===p.id?p.color:"var(--line)"}`,
                    color:draft.bucket===p.id?p.color:"var(--text-faint)",
                    background:"transparent", fontSize:10.5, fontWeight:700, letterSpacing:"0.12em",
                  }}>{p.label.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              {editId&&(
                <button onClick={()=>{deleteBlock(editId);setShowModal(false);}} style={{ padding:"10px 16px", background:"transparent", border:"1px solid var(--danger)", color:"var(--danger)", fontSize:10.5, letterSpacing:"0.12em", fontWeight:700, cursor:"pointer" }}>LÖSCHEN</button>
              )}
              <button onClick={()=>setShowModal(false)} style={{ padding:"10px 18px", background:"transparent", border:"1px solid var(--line)", color:"var(--text-faint)", fontSize:11, cursor:"pointer" }}>ABBRECHEN</button>
              <button onClick={saveBlock} disabled={!canSave} style={{
                padding:"10px 22px", background:canSave?"var(--accent)":"var(--panel-2)",
                color:canSave?"#0a0a0c":"var(--text-faint)",
                border:"none", fontSize:11, letterSpacing:"0.16em", fontWeight:700, cursor:canSave?"pointer":"default",
              }}>SPEICHERN ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding:"16px 28px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--line-soft)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {/* Week nav */}
          <button onClick={()=>setWeekOffset(w=>w-1)} style={{ background:"none", border:"1px solid var(--line)", color:"var(--text-faint)", cursor:"pointer", padding:"4px 10px", fontSize:14, lineHeight:1 }}>‹</button>
          <div>
            <div className="uppercase-label" style={{ marginBottom:3 }}>
              Planner
              {weekOffset!==0&&<span style={{ marginLeft:8, color:"var(--accent)" }}>
                {weekOffset===1?"Nächste Woche":weekOffset===-1?"Letzte Woche":`${weekOffset>0?"+":""}${weekOffset} Wochen`}
              </span>}
            </div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>KW {dispWeek.kw} · {dispWeek.range}</h2>
          </div>
          <button onClick={()=>setWeekOffset(w=>w+1)} style={{ background:"none", border:"1px solid var(--line)", color:"var(--text-faint)", cursor:"pointer", padding:"4px 10px", fontSize:14, lineHeight:1 }}>›</button>
          {weekOffset!==0&&(
            <button onClick={()=>setWeekOffset(0)} style={{ background:"var(--accent-soft)", border:"1px solid var(--accent-line)", color:"var(--accent)", cursor:"pointer", padding:"4px 12px", fontSize:9.5, letterSpacing:"0.12em", fontWeight:700 }}>HEUTE</button>
          )}
        </div>
        <button onClick={()=>openAdd()} style={{ padding:"9px 20px", background:"var(--accent)", color:"#0a0a0c", border:"none", fontSize:10.5, fontWeight:700, letterSpacing:"0.16em", cursor:"pointer" }}>+ BLOCK</button>
      </div>

      {/* ── Day tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", borderBottom:"1px solid var(--line)", background:"var(--panel)", flexShrink:0 }}>
        {DAY_KEYS.map((key,i)=>{
          const isToday=isCurrentWk&&i===todayIdx, isSel=i===selDay;
          const dayInfo=dispWeek.days[i];
          const specific=(weekBlocks[i]||[]).length;
          const rec=recurring.filter(rb=>{
            const del=new Set(weekBlocks[`del_${i}`]||[]);
            if(del.has(rb.id)) return false;
            if(rb.recurrence==="daily") return true;
            if(rb.recurrence==="weekdays") return i<=4;
            if(rb.recurrence==="weekly") return rb.dayIndex===i;
            return false;
          }).length;
          const total=specific+rec;
          return (
            <button key={key} onClick={()=>{setSelDay(i);setSelBlockId(null);}} style={{
              flex:1, padding:"10px 8px 9px", background:"transparent",
              border:"none", borderBottom:`3px solid ${isSel?"var(--accent)":"transparent"}`,
              color:isSel?"var(--accent)":isToday?"var(--text)":"var(--text-faint)",
              fontWeight:isSel||isToday?700:600, fontSize:10.5, letterSpacing:"0.14em", cursor:"pointer",
            }}>
              {key}
              <span style={{ display:"block", fontSize:9, letterSpacing:0, marginTop:2, fontWeight:isToday?700:400, color:isToday?(isSel?"var(--accent)":"var(--warn)"):"var(--text-faint)", fontFamily:"'JetBrains Mono',monospace" }}>
                {dayInfo?.n||""}
              </span>
              {total>0&&<span style={{ display:"block", fontSize:7.5, letterSpacing:0, marginTop:1, color:isSel?"var(--accent)":"var(--text-faint)" }}>
                {rec>0&&<span title="Wiederkehrend">↻{rec} </span>}{specific>0&&`✦${specific}`}
              </span>}
            </button>
          );
        })}
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"360px 1fr", overflow:"hidden" }}>

        {/* ── Left: Time grid ─────────────────────────────────────────────── */}
        <div data-grid-scroll="" style={{ borderRight:"1px solid var(--line)", overflowY:"auto", overflowX:"hidden", position:"relative" }}>

          {/* Sticky header */}
          <div style={{ position:"sticky", top:0, zIndex:20, background:"var(--panel)", borderBottom:"1px solid var(--line-soft)", padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:9, letterSpacing:"0.18em", fontWeight:700, color:"var(--text-faint)" }}>
              ZEITGRID · {DAY_KEYS[selDay]} {dispWeek.days[selDay]?.n}. {dispWeek.days[selDay]?.monthShort}
            </span>
            <button onClick={()=>openAdd()} style={{ background:"transparent", border:"1px dashed var(--line)", color:"var(--accent)", padding:"4px 12px", fontSize:9, letterSpacing:"0.14em", fontWeight:700, cursor:"pointer" }}>+ BLOCK</button>
          </div>

          {/* Grid */}
          <div style={{ padding:"8px 12px 24px", position:"relative" }}>
            <div ref={gridRef} style={{ position:"relative", height:GRID_H, userSelect:"none" }}
              onMouseMove={e=>{
                if (dragRef.current) return;
                const y = getGridY(e.clientY);
                setHoverMins(y !== null ? snap15(yToMins(y)) : null);
              }}
              onMouseLeave={()=>setHoverMins(null)}
              onDoubleClick={e=>{
                if (e.target !== gridRef.current) return;
                const y = getGridY(e.clientY);
                if (y === null) return;
                openAdd(yToMins(y));
              }}
            >
              {/* Hour lines */}
              {Array.from({length: GRID_END_H - GRID_START_H + 1}, (_,i) => (
                <div key={i} style={{ position:"absolute", top:i*HOUR_H, left:0, right:0, display:"flex", alignItems:"flex-start", pointerEvents:"none" }}>
                  <span className="mono" style={{ width:LABEL_W, fontSize:9, color:i===0?"transparent":"var(--text-faint)", textAlign:"right", paddingRight:10, lineHeight:1, flexShrink:0, marginTop:-5 }}>
                    {String(GRID_START_H+i).padStart(2,"0")}:00
                  </span>
                  <div style={{ flex:1, borderTop:`1px solid ${i%2===0?"var(--line-soft)":"rgba(255,255,255,0.03)"}` }} />
                </div>
              ))}
              {/* Half-hour lines */}
              {Array.from({length: GRID_END_H - GRID_START_H}, (_,i) => (
                <div key={`h${i}`} style={{ position:"absolute", top:i*HOUR_H+HOUR_H/2, left:LABEL_W, right:0, borderTop:"1px dashed rgba(255,255,255,0.04)", pointerEvents:"none" }} />
              ))}
              {/* Now line */}
              {showNow && (
                <div style={{ position:"absolute", top:minsToY(nowMins), left:LABEL_W, right:0, zIndex:8, pointerEvents:"none" }}>
                  <div style={{ position:"absolute", left:-5, top:-4, width:8, height:8, borderRadius:"50%", background:"var(--danger)" }} />
                  <div style={{ borderTop:"2px solid var(--danger)", marginLeft:3 }} />
                </div>
              )}
              {/* Hover indicator */}
              {hoverMins !== null && !dragRef.current && (
                <div style={{ position:"absolute", top:minsToY(hoverMins), left:0, right:0, zIndex:15, pointerEvents:"none" }}>
                  <span className="mono" style={{ position:"absolute", left:0, width:LABEL_W-2, textAlign:"right", fontSize:9, color:"rgba(139,92,246,0.8)", paddingRight:4, transform:"translateY(-50%)", lineHeight:1.2, background:"var(--panel)" }}>
                    {strFromMins(hoverMins)}
                  </span>
                  <div style={{ position:"absolute", left:LABEL_W, right:0, borderTop:"1px solid rgba(139,92,246,0.3)" }} />
                </div>
              )}

              {/* Blocks */}
              {dayBlocks.map(block => {
                const dr = dragRef.current;
                const isLive = dr && dr.blockId===block.id;
                const startMins = isLive ? dr.liveStartMins : minsFromStr(block.start);
                const endMins   = isLive ? dr.liveEndMins   : minsFromStr(block.end);
                const top    = minsToY(startMins);
                const height = Math.max(minsToY(endMins) - top, 24);
                const isSel  = selBlockId===block.id;
                const t      = tc(block.type);
                const bPov   = allPovs.find(p=>p.id===block.bucket);
                const isDragging = isLive && dr.moved;
                const isRec  = !!block._recurring;

                return (
                  <div key={block.id}
                    onMouseDown={e=>onBlockMouseDown(e,block,"move")}
                    style={{
                      position:"absolute", top, left:LABEL_W, right:4, height,
                      background: isSel ? "rgba(139,92,246,0.15)" : "var(--panel-2)",
                      border:`1px solid ${isSel?"var(--accent)":t.color}`,
                      borderLeft:`3px solid ${t.color}`,
                      cursor: isDragging ? "grabbing" : "grab",
                      zIndex: isDragging ? 20 : isSel ? 5 : 2,
                      overflow:"hidden", boxSizing:"border-box",
                      boxShadow: isDragging ? "0 8px 32px rgba(0,0,0,0.5)" : "none",
                      transition: isDragging ? "none" : "box-shadow .15s",
                      opacity: isRec ? 0.85 : 1,
                    }}
                  >
                    <div style={{ padding:"4px 8px 2px", pointerEvents:"none" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:8, color:t.color, fontWeight:700, letterSpacing:"0.14em", marginBottom:2 }}>
                            {isRec&&<span style={{ marginRight:4, opacity:0.7 }}>↻</span>}{t.glyph} {t.label}
                          </div>
                          <div style={{ fontSize:11, fontWeight:700, color:isSel?"var(--accent)":"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{block.name}</div>
                          {height>40&&<div className="mono" style={{ fontSize:9, color:"var(--text-faint)", marginTop:2 }}>{strFromMins(startMins)} – {strFromMins(endMins)}</div>}
                        </div>
                        {bPov&&<span style={{ fontSize:7.5, color:bPov.color, fontWeight:700, letterSpacing:"0.1em", marginLeft:4, flexShrink:0 }}>{bPov.label.toUpperCase()}</span>}
                      </div>
                    </div>
                    <button
                      onMouseDown={e=>e.stopPropagation()}
                      onClick={e=>{e.stopPropagation();openEdit(block);}}
                      style={{ position:"absolute", top:3, right:4, background:"none", border:"none", color:"var(--text-faint)", cursor:"pointer", fontSize:11, padding:"0 2px", opacity:0.6, lineHeight:1 }}
                    >✎</button>
                    <div
                      onMouseDown={e=>{e.stopPropagation();onBlockMouseDown(e,block,"resize");}}
                      style={{ position:"absolute", bottom:0, left:0, right:0, height:10, cursor:"ns-resize", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(transparent, rgba(0,0,0,0.2))" }}
                    >
                      <div style={{ width:20, height:2, background:t.color, opacity:0.5, borderRadius:1 }} />
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {dayBlocks.length===0&&(
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                  <div style={{ color:"var(--text-faint)", fontSize:11, marginBottom:6 }}>Noch keine Blöcke.</div>
                  <div style={{ color:"var(--text-faint)", fontSize:9.5, opacity:0.6 }}>Doppelklick ins Grid oder + BLOCK</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Task suggestions ──────────────────────────────────────── */}
        <div style={{ overflow:"auto", padding:"20px 24px" }}>
          {!selBlock ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"var(--text-faint)", textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:14, opacity:0.12 }}>◎</div>
              <div style={{ fontSize:13.5, fontWeight:600, marginBottom:6 }}>Block auswählen</div>
              <div style={{ fontSize:11 }}>um passende Task-Vorschläge zu sehen</div>
            </div>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, paddingBottom:16, borderBottom:"1px solid var(--line-soft)" }}>
                <div>
                  <div style={{ fontSize:9.5, letterSpacing:"0.18em", fontWeight:700, color:"var(--text-faint)", marginBottom:4 }}>TASK-ZUTEILUNG</div>
                  <div style={{ fontSize:17, fontWeight:700 }}>{selBlock.name}</div>
                  <div style={{ fontSize:11, color:"var(--text-faint)", marginTop:3 }}>
                    {selBlock.start} – {selBlock.end} · {budget} min Budget
                    {selBlock._recurring&&<span style={{ marginLeft:8, color:"var(--warn)", fontSize:9.5 }}>↻ Wiederkehrend</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className="mono" style={{ fontSize:26, fontWeight:800, color:selectedEst>budget?"var(--danger)":selTaskKeys.length>0?"var(--good)":"var(--text-dim)", lineHeight:1 }}>
                    {selectedEst}<span style={{ fontSize:11, fontWeight:400, color:"var(--text-faint)" }}> / {budget} min</span>
                  </div>
                  <div style={{ fontSize:9, letterSpacing:"0.14em", fontWeight:700, marginTop:4, color:selectedEst>budget?"var(--danger)":selTaskKeys.length>0?"var(--good)":"var(--text-faint)" }}>
                    {selectedEst>budget?"⚠ ÜBERFÜLLT":selTaskKeys.length===0?"KEINE AUSWAHL":`✓ ${selTaskKeys.length} TASK${selTaskKeys.length!==1?"S":""} GEWÄHLT`}
                  </div>
                </div>
              </div>

              {budget>0&&selTaskKeys.length>0&&(
                <div style={{ marginBottom:20 }}>
                  <ProgressBar value={Math.min(1,selectedEst/budget)} color={selectedEst>budget?"var(--danger)":"var(--good)"} height={3} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                    <span style={{ fontSize:9, color:"var(--text-faint)" }}>{selTaskKeys.length} von {suggestions.length} Aufgaben gewählt</span>
                    <span style={{ fontSize:9, color:"var(--text-faint)" }}>{Math.round(Math.min(100,selectedEst/budget*100))}% des Budgets</span>
                  </div>
                </div>
              )}

              {suggestions.length===0&&(
                <div style={{ padding:"48px 0", textAlign:"center", color:"var(--text-faint)" }}>
                  <div style={{ fontSize:12, marginBottom:6 }}>Keine passenden Aufgaben.</div>
                  <div style={{ fontSize:10.5 }}>Ändere Typ oder füge Tasks in Mission Control hinzu.</div>
                </div>
              )}
              {suggestions.length>0&&(
                <div style={{ fontSize:9, letterSpacing:"0.14em", color:"var(--text-faint)", marginBottom:12, fontWeight:600 }}>
                  {suggestions.length} VORSCHLÄGE — ANHAKEN ZUM ZUTEILEN
                </div>
              )}
              {(() => {
                // Group by _source → _kr
                const groups = {};
                suggestions.forEach(t => {
                  const src = t._source || "Täglich";
                  if (!groups[src]) groups[src] = {};
                  const kr = t._kr || null;
                  const krKey = kr || "__none__";
                  if (!groups[src][krKey]) groups[src][krKey] = [];
                  groups[src][krKey].push(t);
                });
                const TaskRow = ({t, i}) => {
                  const taskKey = `${t.id}_${t._pov}`;
                  const isSel   = isTaskSel(selBlock.id, taskKey);
                  const povColor = allPovs.find(p=>p.id===(t._pov||t.pov))?.color||"var(--accent)";
                  const flow = (t.flow||"QUICK").toUpperCase();
                  const est  = t.est||30;
                  return (
                    <div key={`${t.id}_${i}`} onClick={()=>toggleTaskSel(selBlock.id,taskKey)} style={{
                      display:"flex", alignItems:"center", gap:12, padding:"10px 14px", marginBottom:4,
                      background:isSel?"var(--accent-soft)":"var(--panel)",
                      border:`1px solid ${isSel?"var(--accent-line)":"var(--line-soft)"}`,
                      borderLeft:`3px solid ${isSel?"var(--accent)":povColor}`,
                      cursor:"pointer", transition:"all .12s",
                    }}>
                      <div style={{ width:16, height:16, borderRadius:3, flexShrink:0, border:`2px solid ${isSel?"var(--accent)":"var(--line)"}`, background:isSel?"var(--accent)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .12s" }}>
                        {isSel&&<span style={{ color:"#0a0a0c", fontSize:10, fontWeight:900, lineHeight:1 }}>✓</span>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:isSel?700:600, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:isSel?"var(--text)":"var(--text-dim)" }}>{t.title}</div>
                        <span style={{ fontSize:9, color:povColor, letterSpacing:"0.12em", fontWeight:700 }}>{(t._pov||t.pov||"").toUpperCase()}</span>
                      </div>
                      <FlowTag kind={flow} />
                      <div className="mono" style={{ fontSize:14, fontWeight:700, color:isSel?"var(--accent)":"var(--text-faint)", flexShrink:0 }}>{est}<span style={{ fontSize:8, fontWeight:400 }}>m</span></div>
                    </div>
                  );
                };
                return Object.entries(groups).map(([src, krGroups]) => (
                  <div key={src} style={{ marginBottom:16 }}>
                    <div style={{ fontSize:9, letterSpacing:"0.16em", fontWeight:700, color:"var(--accent)", padding:"6px 0 8px", borderBottom:"1px solid var(--line-soft)", marginBottom:8 }}>
                      {src === "Täglich" ? "⚡ TÄGLICH" : `✦ ${src.toUpperCase()}`}
                    </div>
                    {Object.entries(krGroups).map(([krKey, tasks]) => (
                      <div key={krKey} style={{ marginBottom:10 }}>
                        {krKey !== "__none__" && (
                          <div style={{ fontSize:9.5, fontWeight:600, color:"var(--text-faint)", letterSpacing:"0.08em", marginBottom:6, paddingLeft:2 }}>
                            → {krKey}
                          </div>
                        )}
                        {tasks.map((t,i) => <TaskRow key={`${t.id}_${i}`} t={t} i={i} />)}
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

window.Planner = Planner;
