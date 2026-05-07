// Planner — Visual time grid with drag-to-move and drag-to-resize blocks.

const BLOCK_TYPES = [
  { id: "deep-work", label: "DEEP WORK",   color: "var(--accent)",   glyph: "✦", desc: "Flow-State · Konzentration · ≥60 min" },
  { id: "basic",     label: "BASIC TASKS", color: "var(--text-dim)", glyph: "●", desc: "Quick-Erledigung · ≤30 min" },
  { id: "flex",      label: "FLEX",        color: "var(--warn)",     glyph: "◎", desc: "Beliebige Aufgaben · alle Typen" },
];

const DAY_KEYS = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];

const GRID_START_H = 6;
const GRID_END_H   = 23;
const HOUR_H       = 64; // px per hour

const minsFromStr = s => { const [h,m] = (s||"00:00").split(":").map(Number); return h*60+m; };
const strFromMins = t => { const h=Math.floor(t/60); const m=t%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; };
const snap15      = t => Math.round(t/15)*15;
const clamp       = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const minsToY     = t => (t - GRID_START_H*60) / 60 * HOUR_H;
const yToMins     = y => y / HOUR_H * 60 + GRID_START_H*60;
const GRID_H      = (GRID_END_H - GRID_START_H) * HOUR_H;
const LABEL_W     = 48;

function Planner() {
  const todayRaw = new Date().getDay();
  const todayIdx = todayRaw === 0 ? 6 : todayRaw - 1;

  const [selDay,     setSelDay]     = React.useState(todayIdx);
  const [selBlockId, setSelBlockId] = React.useState(null);

  const [blocks, setBlocks] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_timeblocks") || "{}"); } catch { return {}; }
  });
  React.useEffect(() => { localStorage.setItem("lifeos_timeblocks", JSON.stringify(blocks)); }, [blocks]);

  const dayBlocks = [...(blocks[selDay] || [])].sort((a,b) => a.start.localeCompare(b.start));
  const selBlock  = dayBlocks.find(b => b.id === selBlockId) || null;

  // ── Modal state ──
  const [showModal, setShowModal] = React.useState(false);
  const [editId,    setEditId]    = React.useState(null);
  const [draft, setDraft] = React.useState({ name:"", start:"09:00", end:"11:00", type:"deep-work", bucket:"alle", days:[0] });

  const toggleDraftDay = i => setDraft(d => {
    const next = d.days.includes(i) ? d.days.filter(x=>x!==i) : [...d.days,i];
    return { ...d, days: next.length===0 ? d.days : next };
  });

  const openAdd = (startMins=null) => {
    setEditId(null);
    const s = startMins !== null ? strFromMins(clamp(snap15(startMins), GRID_START_H*60, GRID_END_H*60-60)) : "09:00";
    const e = startMins !== null ? strFromMins(clamp(snap15(startMins)+60, GRID_START_H*60+60, GRID_END_H*60)) : "11:00";
    setDraft({ name:"", start:s, end:e, type:"deep-work", bucket:"alle", days:[selDay] });
    setShowModal(true);
  };
  const openEdit = block => {
    setEditId(block.id);
    setDraft({ name:block.name, start:block.start, end:block.end, type:block.type, bucket:block.bucket, days:[selDay] });
    setShowModal(true);
  };

  const saveBlock = () => {
    if (!draft.name.trim() || draft.start >= draft.end || draft.days.length===0) return;
    const { days, ...blockData } = draft;
    setBlocks(prev => {
      const next = {...prev};
      if (editId) {
        const arr = [...(next[selDay]||[])];
        const idx = arr.findIndex(b=>b.id===editId);
        if (idx!==-1) arr[idx] = { ...arr[idx], ...blockData, name:blockData.name.trim() };
        next[selDay] = arr;
      } else {
        days.forEach(dayIdx => {
          const arr = [...(next[dayIdx]||[])];
          arr.push({ id:`tb_${Date.now()}_${dayIdx}`, ...blockData, name:blockData.name.trim() });
          next[dayIdx] = arr;
        });
      }
      return next;
    });
    setShowModal(false);
  };

  const deleteBlock = id => {
    setBlocks(prev => ({ ...prev, [selDay]:(prev[selDay]||[]).filter(b=>b.id!==id) }));
    if (selBlockId===id) setSelBlockId(null);
  };

  // ── Drag state ──
  const gridRef    = React.useRef(null);
  const dragRef    = React.useRef(null);
  const [, forceRender] = React.useReducer(x=>x+1, 0);

  const onBlockMouseDown = (e, block, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top + gridRef.current.closest("[data-grid-scroll]").scrollTop;
    const startMins = minsFromStr(block.start);
    const endMins   = minsFromStr(block.end);
    dragRef.current = {
      type, blockId: block.id,
      clickOffsetY: type==="move" ? clickY - minsToY(startMins) : 0,
      origStartMins: startMins, origEndMins: endMins,
      liveStartMins: startMins, liveEndMins: endMins,
      startClientY: e.clientY, moved: false,
    };
    forceRender();
  };

  React.useEffect(() => {
    const onMouseMove = e => {
      const dr = dragRef.current;
      if (!dr || !gridRef.current) return;
      const scrollEl = gridRef.current.closest("[data-grid-scroll]");
      const rect = gridRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top + (scrollEl ? scrollEl.scrollTop : 0);
      if (Math.abs(e.clientY - dr.startClientY) > 3) dr.moved = true;

      if (dr.type === "move") {
        const duration = dr.origEndMins - dr.origStartMins;
        const rawStart = snap15(yToMins(y - dr.clickOffsetY));
        const newStart = clamp(rawStart, GRID_START_H*60, GRID_END_H*60 - duration);
        dr.liveStartMins = newStart;
        dr.liveEndMins   = newStart + duration;
      } else {
        const rawEnd = snap15(yToMins(y));
        dr.liveEndMins = clamp(rawEnd, dr.origStartMins + 15, GRID_END_H*60);
      }
      forceRender();
    };

    const onMouseUp = () => {
      const dr = dragRef.current;
      if (!dr) return;
      if (!dr.moved) {
        setSelBlockId(id => id===dr.blockId ? null : dr.blockId);
      } else {
        const { blockId, liveStartMins, liveEndMins } = dr;
        setBlocks(prev => ({
          ...prev,
          [selDay]: (prev[selDay]||[]).map(b =>
            b.id===blockId ? { ...b, start:strFromMins(liveStartMins), end:strFromMins(liveEndMins) } : b
          )
        }));
      }
      dragRef.current = null;
      forceRender();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [selDay]);

  // ── Suggestions / task selection ──
  const getSuggestions = block => {
    if (!block) return [];
    const allTasks = [];
    for (const { id:povId } of POVS) {
      if (block.bucket!=="alle" && block.bucket!==povId) continue;
      (POV_DATA[povId]?.tasksToday||[]).forEach(t => allTasks.push({...t,_pov:povId,_source:"daily"}));
    }
    for (const proj of PROJECTS) {
      if (block.bucket!=="alle" && block.bucket!==proj.pov) continue;
      (proj.objectives||[]).flatMap(o=>o.krs).filter(k=>k.status!=="locked").forEach(kr => {
        (kr.tasks||[]).forEach(t => allTasks.push({...t,_pov:proj.pov,_source:proj.title,_kr:kr.label}));
      });
    }
    const filtered = allTasks.filter(t => {
      const est=t.est||30, flow=(t.flow||"QUICK").toUpperCase();
      if (block.type==="deep-work") return flow==="FLOW"||est>=60;
      if (block.type==="basic")     return flow==="QUICK"||flow==="EASY"||est<=30;
      return true;
    });
    if (block.type==="deep-work") filtered.sort((a,b)=>(b.est||30)-(a.est||30));
    else if (block.type==="basic") filtered.sort((a,b)=>(a.est||20)-(b.est||20));
    return filtered;
  };

  const [blockSelections, setBlockSelections] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_block_selections") || "{}"); } catch { return {}; }
  });
  React.useEffect(() => { localStorage.setItem("lifeos_block_selections", JSON.stringify(blockSelections)); }, [blockSelections]);

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

  const tc       = type => BLOCK_TYPES.find(b=>b.id===type)||BLOCK_TYPES[0];
  const canSave  = draft.name.trim() && draft.start < draft.end;

  // current time position
  const nowMins = (() => { const n=new Date(); return n.getHours()*60+n.getMinutes(); })();
  const showNow = selDay===todayIdx && nowMins>=GRID_START_H*60 && nowMins<=GRID_END_H*60;

  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

      {/* ── Modal ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={{ background:"var(--panel)", border:"1px solid var(--line)", padding:32, width:440, boxShadow:"0 0 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div className="uppercase-label">{editId?"Block bearbeiten":"Neuer Zeitblock"}</div>
              <button onClick={()=>setShowModal(false)} style={{ background:"none", border:"none", color:"var(--text-faint)", cursor:"pointer", fontSize:18, padding:0 }}>×</button>
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>NAME</div>
              <input autoFocus value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&saveBlock()}
                placeholder="z.B. Deep Work · Leads abtelefonieren…"
                style={{ width:"100%", background:"var(--panel-2)", border:"1px solid var(--line)", color:"var(--text)", padding:"10px 14px", fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>
                {editId?"TAG":"WOCHENTAG(E)"}
                {!editId&&draft.days.length>1&&<span style={{ marginLeft:8, fontWeight:400, letterSpacing:0, color:"var(--accent)" }}>{draft.days.length} Tage gewählt</span>}
              </div>
              <div style={{ display:"flex", gap:5 }}>
                {DAY_KEYS.map((key,i)=>{
                  const isSel=draft.days.includes(i), isToday=i===todayIdx;
                  return <button key={key} onClick={()=>!editId&&toggleDraftDay(i)} style={{
                    flex:1, padding:"8px 4px", cursor:editId?"default":"pointer",
                    background:isSel?"var(--accent-soft)":"var(--panel-2)",
                    border:`1px solid ${isSel?"var(--accent)":"var(--line)"}`,
                    color:isSel?"var(--accent)":isToday?"var(--text-dim)":"var(--text-faint)",
                    fontSize:10, fontWeight:isSel?700:600, letterSpacing:"0.1em", transition:"all .1s",
                  }}>{key}</button>;
                })}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>VON</div>
                <input type="time" value={draft.start} onChange={e=>setDraft(d=>({...d,start:e.target.value}))}
                  style={{ width:"100%", background:"var(--panel-2)", border:"1px solid var(--line)", color:"var(--text)", padding:"10px 14px", fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
              </div>
              <div>
                <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>BIS</div>
                <input type="time" value={draft.end} onChange={e=>setDraft(d=>({...d,end:e.target.value}))}
                  style={{ width:"100%", background:"var(--panel-2)", border:"1px solid var(--line)", color:"var(--text)", padding:"10px 14px", fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
              </div>
            </div>
            {draft.start>=draft.end&&draft.start&&draft.end&&(
              <div style={{ fontSize:9.5, color:"var(--danger)", marginBottom:10, letterSpacing:"0.1em" }}>⚠ Endzeit muss nach Startzeit liegen</div>
            )}

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

            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>BUCKET-FILTER (optional)</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {[{id:"alle",label:"Alle",color:"var(--text-dim)"},...POVS].map(p=>(
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

      {/* ── Header ── */}
      <div style={{ padding:"20px 28px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--line-soft)", flexShrink:0 }}>
        <div>
          <div className="uppercase-label" style={{ marginBottom:6 }}>Planner</div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>KW {WEEK.kw} · {WEEK.range}</h2>
        </div>
        <button onClick={()=>openAdd()} style={{ padding:"9px 20px", background:"var(--accent)", color:"#0a0a0c", border:"none", fontSize:10.5, fontWeight:700, letterSpacing:"0.16em", cursor:"pointer" }}>+ BLOCK</button>
      </div>

      {/* ── Day tabs ── */}
      <div style={{ display:"flex", borderBottom:"1px solid var(--line)", background:"var(--panel)", flexShrink:0 }}>
        {DAY_KEYS.map((key,i)=>{
          const isToday=i===todayIdx, isSel=i===selDay, count=(blocks[i]||[]).length;
          return (
            <button key={key} onClick={()=>{setSelDay(i);setSelBlockId(null);}} style={{
              flex:1, padding:"13px 8px 11px", background:"transparent",
              border:"none", borderBottom:`3px solid ${isSel?"var(--accent)":"transparent"}`,
              color:isSel?"var(--accent)":isToday?"var(--text)":"var(--text-faint)",
              fontWeight:isSel||isToday?700:600, fontSize:10.5, letterSpacing:"0.14em", cursor:"pointer",
            }}>
              {key}
              {count>0&&<span style={{ display:"block", fontSize:8, letterSpacing:0, marginTop:3, color:isSel?"var(--accent)":"var(--text-faint)" }}>{count}</span>}
              {count===0&&isToday&&<span style={{ display:"block", width:4, height:4, borderRadius:"50%", background:"var(--accent)", margin:"3px auto 0" }} />}
            </button>
          );
        })}
      </div>

      {/* ── Main area ── */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"360px 1fr", overflow:"hidden" }}>

        {/* ── Left: Time grid ── */}
        <div data-grid-scroll="" style={{ borderRight:"1px solid var(--line)", overflowY:"auto", overflowX:"hidden", position:"relative" }}>

          {/* Sticky header */}
          <div style={{ position:"sticky", top:0, zIndex:20, background:"var(--panel)", borderBottom:"1px solid var(--line-soft)", padding:"10px 14px 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:9, letterSpacing:"0.18em", fontWeight:700, color:"var(--text-faint)" }}>ZEITGRID · {DAY_KEYS[selDay]}</span>
            <button onClick={()=>openAdd()} style={{ background:"transparent", border:"1px dashed var(--line)", color:"var(--accent)", padding:"4px 12px", fontSize:9, letterSpacing:"0.14em", fontWeight:700, cursor:"pointer" }}>+ BLOCK</button>
          </div>

          {/* Grid */}
          <div style={{ padding:"8px 12px 24px", position:"relative" }}>
            <div ref={gridRef} style={{ position:"relative", height:GRID_H, userSelect:"none" }}
              onDoubleClick={e=>{
                if (!gridRef.current) return;
                const scrollEl = gridRef.current.closest("[data-grid-scroll]");
                const rect = gridRef.current.getBoundingClientRect();
                const y = e.clientY - rect.top + (scrollEl?scrollEl.scrollTop:0);
                openAdd(yToMins(y - LABEL_W/2));
              }}
            >
              {/* Hour lines + labels */}
              {Array.from({length: GRID_END_H - GRID_START_H + 1}, (_,i) => (
                <div key={i} style={{ position:"absolute", top:i*HOUR_H, left:0, right:0, display:"flex", alignItems:"flex-start", pointerEvents:"none" }}>
                  <span className="mono" style={{ width:LABEL_W, fontSize:9, color:i===0?"transparent":"var(--text-faint)", textAlign:"right", paddingRight:10, lineHeight:1, flexShrink:0, marginTop:-5 }}>
                    {String(GRID_START_H+i).padStart(2,"0")}:00
                  </span>
                  <div style={{ flex:1, borderTop:`1px solid ${i%2===0?"var(--line-soft)":"rgba(255,255,255,0.03)"}` }} />
                </div>
              ))}

              {/* Half-hour faint lines */}
              {Array.from({length: GRID_END_H - GRID_START_H}, (_,i) => (
                <div key={`h${i}`} style={{ position:"absolute", top:i*HOUR_H+HOUR_H/2, left:LABEL_W, right:0, borderTop:"1px dashed rgba(255,255,255,0.04)", pointerEvents:"none" }} />
              ))}

              {/* Current time line */}
              {showNow && (
                <div style={{ position:"absolute", top:minsToY(nowMins), left:LABEL_W, right:0, zIndex:8, pointerEvents:"none" }}>
                  <div style={{ position:"absolute", left:-5, top:-4, width:8, height:8, borderRadius:"50%", background:"var(--danger)" }} />
                  <div style={{ borderTop:"2px solid var(--danger)", marginLeft:3 }} />
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
                const bPov   = POVS.find(p=>p.id===block.bucket);
                const isDragging = isLive && dr.moved;

                return (
                  <div key={block.id}
                    onMouseDown={e=>onBlockMouseDown(e,block,"move")}
                    style={{
                      position:"absolute",
                      top, left:LABEL_W, right:4,
                      height,
                      background: isSel ? "rgba(139,92,246,0.15)" : "var(--panel-2)",
                      border:`1px solid ${isSel?"var(--accent)":t.color}`,
                      borderLeft:`3px solid ${t.color}`,
                      cursor: isDragging ? "grabbing" : "grab",
                      zIndex: isDragging ? 20 : isSel ? 5 : 2,
                      overflow:"hidden",
                      boxSizing:"border-box",
                      boxShadow: isDragging ? "0 8px 32px rgba(0,0,0,0.5)" : "none",
                      transition: isDragging ? "none" : "box-shadow .15s",
                    }}
                  >
                    <div style={{ padding:"4px 8px 2px", pointerEvents:"none" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:8, color:t.color, fontWeight:700, letterSpacing:"0.14em", marginBottom:2 }}>{t.glyph} {t.label}</div>
                          <div style={{ fontSize:11, fontWeight:700, color:isSel?"var(--accent)":"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{block.name}</div>
                          {height>40&&<div className="mono" style={{ fontSize:9, color:"var(--text-faint)", marginTop:2 }}>{strFromMins(startMins)} – {strFromMins(endMins)}</div>}
                        </div>
                        {bPov&&<span style={{ fontSize:7.5, color:bPov.color, fontWeight:700, letterSpacing:"0.1em", marginLeft:4, flexShrink:0 }}>{bPov.label.toUpperCase()}</span>}
                      </div>
                    </div>
                    {/* Edit button */}
                    <button
                      onMouseDown={e=>e.stopPropagation()}
                      onClick={e=>{e.stopPropagation();openEdit(block);}}
                      style={{ position:"absolute", top:3, right:4, background:"none", border:"none", color:"var(--text-faint)", cursor:"pointer", fontSize:11, padding:"0 2px", opacity:0.6, lineHeight:1 }}
                    >✎</button>
                    {/* Resize handle */}
                    <div
                      onMouseDown={e=>{e.stopPropagation();onBlockMouseDown(e,block,"resize");}}
                      style={{
                        position:"absolute", bottom:0, left:0, right:0, height:10,
                        cursor:"ns-resize", display:"flex", alignItems:"center", justifyContent:"center",
                        background:"linear-gradient(transparent, rgba(0,0,0,0.2))",
                      }}
                    >
                      <div style={{ width:20, height:2, background:t.color, opacity:0.5, borderRadius:1 }} />
                    </div>
                  </div>
                );
              })}

              {/* Empty state hint */}
              {dayBlocks.length===0&&(
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                  <div style={{ color:"var(--text-faint)", fontSize:11, marginBottom:6 }}>Noch keine Blöcke.</div>
                  <div style={{ color:"var(--text-faint)", fontSize:9.5, opacity:0.6 }}>Doppelklick ins Grid oder + BLOCK</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Task suggestions / checkboxes ── */}
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
                  <div style={{ fontSize:11, color:"var(--text-faint)", marginTop:3 }}>{selBlock.start} – {selBlock.end} · {budget} min Budget</div>
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
                    <span style={{ fontSize:9, color:"var(--text-faint)" }}>{Math.round(Math.min(100,selectedEst/budget*100))}% des Budgets verplant</span>
                  </div>
                </div>
              )}

              {suggestions.length===0&&(
                <div style={{ padding:"48px 0", textAlign:"center", color:"var(--text-faint)" }}>
                  <div style={{ fontSize:12, marginBottom:6 }}>Keine passenden Aufgaben gefunden.</div>
                  <div style={{ fontSize:10.5 }}>Ändere den Block-Typ oder füge Tasks in Mission Control hinzu.</div>
                </div>
              )}

              {suggestions.length>0&&(
                <div style={{ fontSize:9, letterSpacing:"0.14em", color:"var(--text-faint)", marginBottom:12, fontWeight:600 }}>
                  {suggestions.length} VORSCHLÄGE — ANHAKEN ZUM ZUTEILEN
                </div>
              )}

              {suggestions.map((t,i) => {
                const taskKey = `${t.id}_${t._pov}`;
                const isSel   = isTaskSel(selBlock.id, taskKey);
                const povColor = POVS.find(p=>p.id===(t._pov||t.pov))?.color||"var(--accent)";
                const flow = (t.flow||"QUICK").toUpperCase();
                const est  = t.est||30;
                return (
                  <div key={`${t.id}_${i}`} onClick={()=>toggleTaskSel(selBlock.id,taskKey)} style={{
                    display:"flex", alignItems:"center", gap:12, padding:"12px 14px", marginBottom:6,
                    background:isSel?"var(--accent-soft)":"var(--panel)",
                    border:`1px solid ${isSel?"var(--accent-line)":"var(--line-soft)"}`,
                    borderLeft:`3px solid ${isSel?"var(--accent)":povColor}`,
                    cursor:"pointer", transition:"all .12s",
                  }}>
                    <div style={{
                      width:16, height:16, borderRadius:3, flexShrink:0,
                      border:`2px solid ${isSel?"var(--accent)":"var(--line)"}`,
                      background:isSel?"var(--accent)":"transparent",
                      display:"flex", alignItems:"center", justifyContent:"center", transition:"all .12s",
                    }}>
                      {isSel&&<span style={{ color:"#0a0a0c", fontSize:10, fontWeight:900, lineHeight:1 }}>✓</span>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13.5, fontWeight:isSel?700:600, marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:isSel?"var(--text)":"var(--text-dim)" }}>{t.title}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontSize:9, color:povColor, letterSpacing:"0.12em", fontWeight:700 }}>{(t._pov||t.pov||"").toUpperCase()}</span>
                        {t._source&&t._source!=="daily"&&<span style={{ fontSize:9.5, color:"var(--text-faint)" }}>· {t._source}</span>}
                        {t._kr&&<span style={{ fontSize:9.5, color:"var(--text-faint)" }}>· {t._kr}</span>}
                      </div>
                    </div>
                    <FlowTag kind={flow} />
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div className="mono" style={{ fontSize:15, fontWeight:700, color:isSel?"var(--accent)":"var(--text-faint)" }}>{est} <span style={{ fontSize:9, fontWeight:400 }}>min</span></div>
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
