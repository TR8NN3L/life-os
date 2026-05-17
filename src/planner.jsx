// Planner — Visual time grid with week navigation + recurring blocks.

const BLOCK_TYPES = [
  { id: "deep-work", label: "DEEP WORK",   color: "var(--accent)",   glyph: "✦", mode: "MAKER",   modeColor: "var(--accent)",  modeBg: "rgba(16,185,129,0.15)",  desc: "MAKER · Flow-State · Konzentration · >= 60 min" },
  { id: "basic",     label: "BASIC TASKS", color: "var(--text-dim)", glyph: "●", mode: "MANAGER", modeColor: "var(--founder)", modeBg: "rgba(47,139,255,0.15)",  desc: "MANAGER · Quick-Erledigung · Koordination · <= 30 min" },
  { id: "flex",      label: "FLEX",        color: "var(--warn)",     glyph: "◎", mode: "FLEX",    modeColor: "var(--warn)",    modeBg: "rgba(212,162,60,0.15)",   desc: "FLEX · Beliebige Aufgaben · alle Typen" },
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
    // Use local date components — toISOString() returns UTC which shifts the date
    // at midnight in UTC+1/+2 timezones (e.g. CEST = UTC+2: midnight local = 22:00 UTC prev day)
    const pad = n => String(n).padStart(2, "0");
    const localDateStr = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    return {
      k: DAY_KEYS[i],
      n: String(d.getDate()).padStart(2, "0"),
      dateStr: localDateStr,
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

// ── Calendar feed colors ─────────────────────────────────────────────────────
var FEED_COLORS = [
  { bg: "rgba(47,139,255,0.08)",  border: "rgba(47,139,255,0.25)",  left: "rgba(47,139,255,0.5)",  label: "rgba(47,139,255,0.65)",  text: "rgba(255,255,255,0.55)" },
  { bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.25)",  left: "rgba(139,92,246,0.5)",  label: "rgba(139,92,246,0.65)",  text: "rgba(255,255,255,0.55)" },
  { bg: "rgba(6,148,101,0.08)",   border: "rgba(6,148,101,0.25)",   left: "rgba(6,148,101,0.5)",   label: "rgba(6,148,101,0.65)",   text: "rgba(255,255,255,0.55)" },
  { bg: "rgba(212,162,60,0.08)",  border: "rgba(212,162,60,0.25)",  left: "rgba(212,162,60,0.5)",  label: "rgba(212,162,60,0.65)",  text: "rgba(255,255,255,0.55)" },
];

// ── ICS parser ───────────────────────────────────────────────────────────────
function parseICS(text, dateStr) {
  // Unfold folded lines (RFC 5545: CRLF + space/tab = continuation)
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const events = [];

  const pad2 = function(n) { return String(n).padStart(2, "0"); };

  // Parse a DTSTART/DTEND value → { localDateStr: "YYYY-MM-DD", mins: number }
  const parseDt = function(dtStr) {
    if (!dtStr || dtStr.length < 15) return null;
    var hh = parseInt(dtStr.slice(9, 11), 10);
    var mm = parseInt(dtStr.slice(11, 13), 10);
    if (isNaN(hh) || isNaN(mm)) return null;
    if (dtStr.endsWith("Z")) {
      // UTC → local: use Date so JS applies the local timezone correctly
      var d = new Date(Date.UTC(
        parseInt(dtStr.slice(0,4),10), parseInt(dtStr.slice(4,6),10)-1,
        parseInt(dtStr.slice(6,8),10), hh, mm, 0
      ));
      return {
        localDateStr: d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate()),
        mins: d.getHours() * 60 + d.getMinutes(),
      };
    }
    // No Z / TZID-aware → treat as local time, take the date directly from string
    var localDateStr = dtStr.slice(0,4) + "-" + dtStr.slice(4,6) + "-" + dtStr.slice(6,8);
    return { localDateStr: localDateStr, mins: hh * 60 + mm };
  };

  const veventBlocks = unfolded.split("BEGIN:VEVENT");
  for (let i = 1; i < veventBlocks.length; i++) {
    const block = veventBlocks[i];
    const dtStartMatch = block.match(/\nDTSTART[^:]*:(\S+)/);
    const dtEndMatch   = block.match(/\nDTEND[^:]*:(\S+)/);
    const summaryMatch = block.match(/\nSUMMARY[^:]*:(.*)/);
    if (!dtStartMatch) continue;
    const dtStart = dtStartMatch[1].trim();
    if (dtStart.length === 8) continue; // all-day event — skip
    const dtEnd   = dtEndMatch   ? dtEndMatch[1].trim()   : "";
    const summary = summaryMatch ? summaryMatch[1].trim() : "Termin";
    const startDt = parseDt(dtStart);
    if (!startDt) continue;
    // Filter by LOCAL date — fixes UTC midnight shift (toISOString was wrong)
    if (startDt.localDateStr !== dateStr) continue;
    const endDt   = parseDt(dtEnd);
    const startMins = startDt.mins;
    const endMins   = endDt ? endDt.mins : startMins + 60;
    if (endMins <= GRID_START_H * 60 || startMins >= GRID_END_H * 60) continue;
    events.push({
      id: "cal_" + i + "_" + dtStart,
      summary,
      startMins: Math.max(startMins, GRID_START_H * 60),
      endMins:   Math.min(endMins,   GRID_END_H   * 60),
    });
  }
  return events.sort((a, b) => a.startMins - b.startMins);
}

// ── Planner component ────────────────────────────────────────────────────────
function Planner() {
  const todayRaw = new Date().getDay();
  const todayIdx = todayRaw === 0 ? 6 : todayRaw - 1;

  // userPovs überschreiben hardcodierte POVs (gleiche ID = user gewinnt)
  const allPovs = React.useMemo(() => {
    try {
      const custom = JSON.parse(LS.getItem("lifeos_user_povs") || "[]");
      const userIds = new Set(custom.map(p => p.id));
      const base = POVS.filter(p => !userIds.has(p.id));
      return [...base, ...custom];
    } catch { return [...POVS]; }
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
      if (rb.recurrence === "biweekly") {
        if (rb.dayIndex !== selDay || !rb.startDateStr) return false;
        const diff = Math.round((new Date(dateStr + "T00:00:00") - new Date(rb.startDateStr + "T00:00:00")) / 86400000);
        return diff >= 0 && diff % 14 === 0;
      }
      if (rb.recurrence === "monthly") {
        const startDay = rb.startDateStr ? parseInt(rb.startDateStr.slice(8), 10) : 1;
        return parseInt(dateStr.slice(8), 10) === startDay;
      }
      if (rb.recurrence === "custom") {
        if (!rb.startDateStr) return false;
        const diff = Math.round((new Date(dateStr + "T00:00:00") - new Date(rb.startDateStr + "T00:00:00")) / 86400000);
        return diff >= 0 && diff % (rb.intervalDays || 7) === 0;
      }
      return false;
    }).map(rb => ({ ...rb, _recurring: true }));
  }, [recurring, selDay, dispWeek, weekBlocks]);

  const specificForDay = weekBlocks[selDay] || [];
  const dayBlocks = [...recurringForDay, ...specificForDay]
    .sort((a, b) => a.start.localeCompare(b.start));
  const selBlock = dayBlocks.find(b => b.id === selBlockId) || null;

  // ── Mission Generator ─────────────────────────────────────────────────────
  const [showMissionGen, setShowMissionGen] = React.useState(false);
  const [mgMode,      setMgMode]      = React.useState("new");
  const [mgEnergy,    setMgEnergy]    = React.useState(3);
  const [mgFocus,     setMgFocus]     = React.useState(3);
  const [mgStartTime, setMgStartTime] = React.useState("08:00");
  const [mgBlockDur,  setMgBlockDur]  = React.useState(60);  // minutes per block
  const [mgNumBlocks, setMgNumBlocks] = React.useState(3);
  const [mgAllPovs,   setMgAllPovs]   = React.useState(false);
  const [mgPovs,      setMgPovs]      = React.useState(() => [LS.getItem("lifeos_pov") || "founder"]);
  const [mgGoal,      setMgGoal]      = React.useState("");
  const [mgLoading,   setMgLoading]   = React.useState(false);
  const [mgError,     setMgError]     = React.useState(null);

  const toggleMgPov = (povId) => {
    setMgPovs(prev => prev.includes(povId) ? (prev.length > 1 ? prev.filter(p => p !== povId) : prev) : [...prev, povId]);
  };

  const runMissionGen = async () => {
    if (!window.AI) { setMgError("AI nicht verfuegbar"); return; }
    setMgLoading(true); setMgError(null);
    try {
      const selectedPovs = mgAllPovs ? allPovs.map(p => p.id) : mgPovs;
      const povLabels = selectedPovs.map(id => allPovs.find(p => p.id === id)?.label || id).join(", ");
      const dayStr = dispWeek.days[selDay]?.dateStr || "";
      const totalMins = mgNumBlocks * mgBlockDur;
      const result = await window.AI.generateDayPlan({
        pov: selectedPovs[0], povLabel: povLabels,
        energy: mgEnergy, focus: mgFocus,
        availableTime: `${Math.round(totalMins/60*10)/10}h`,
        goal: mgGoal, mode: mgMode, dayStr,
        startTime: mgStartTime, blockDuration: mgBlockDur, numBlocks: mgNumBlocks,
        multiPov: selectedPovs.length > 1, povs: selectedPovs,
      });
      const blocks = result.blocks || [];
      if (blocks.length === 0) { setMgError("Keine Bloecke generiert. Bitte nochmal versuchen."); setMgLoading(false); return; }
      // Compute start times from mgStartTime if AI didn't set them properly
      let cursor = minsFromStr(mgStartTime);
      const newBlocks = blocks.map((b, i) => {
        const dur = b.durationMins || mgBlockDur;
        const start = b.start && b.start.includes(":") ? b.start : strFromMins(clamp(cursor, GRID_START_H*60, GRID_END_H*60 - dur));
        const startM = minsFromStr(start);
        const end = b.end && b.end.includes(":") ? b.end : strFromMins(clamp(startM + dur, GRID_START_H*60 + 15, GRID_END_H*60));
        cursor = minsFromStr(end) + 15; // 15 min pause between blocks
        const bPov = selectedPovs.length > 1 ? (b.bucket || selectedPovs[i % selectedPovs.length]) : (b.bucket || selectedPovs[0]);
        return { id: `mg_${Date.now()}_${i}`, name: b.name || b.title || "Block", start, end, type: b.type || "deep-work", bucket: bPov };
      });
      if (mgMode === "new") {
        setWeekBlocks(prev => ({ ...prev, [selDay]: newBlocks }));
      } else {
        setWeekBlocks(prev => ({ ...prev, [selDay]: [...(prev[selDay] || []), ...newBlocks] }));
      }
      setShowMissionGen(false);
    } catch(e) {
      setMgError(e.message || "Fehler beim Generieren");
    } finally {
      setMgLoading(false);
    }
  };

  // ── Calendar import ────────────────────────────────────────────────────────
  const [calEvents, setCalEvents] = React.useState([]);

  React.useEffect(function() {
    var dateStr = dispWeek.days[selDay] && dispWeek.days[selDay].dateStr;
    if (!dateStr) return;
    // Load multi-feed array; fall back to legacy single URL
    var feeds = [];
    try {
      var stored = localStorage.getItem("lifeos_ical_feeds");
      if (stored) {
        feeds = JSON.parse(stored);
      } else {
        var legacy = localStorage.getItem("lifeos_ical_import_url");
        if (legacy) feeds = [{ id: "f_0", url: legacy, label: "Kalender" }];
      }
    } catch(e) { feeds = []; }
    if (!feeds.length) { setCalEvents([]); return; }
    var cancelled = false;
    Promise.all(feeds.map(function(feed, idx) {
      // webcal:// is identical to https:// — proxy only allows http/https
      var fetchUrl = feed.url.replace(/^webcal:\/\//i, "https://");
      return fetch("/api/ical-proxy?url=" + encodeURIComponent(fetchUrl))
        .then(function(r) { return r.text(); })
        .then(function(text) {
          return parseICS(text, dateStr).map(function(ev) {
            return Object.assign({}, ev, { colorIdx: idx % FEED_COLORS.length, feedLabel: feed.label });
          });
        })
        .catch(function() { return []; });
    })).then(function(results) {
      if (cancelled) return;
      setCalEvents([].concat.apply([], results));
    });
    return function() { cancelled = true; };
  }, [selDay, dispWeek]);

  // ── Modal ──────────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = React.useState(false);
  const [editId,    setEditId]    = React.useState(null);
  const [draft, setDraft] = React.useState({
    name:"", start:"09:00", end:"11:00", type:"deep-work", bucket:"alle",
    days:[0], recurrence:"none", intervalDays:7,
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
    window.TUTORIAL?.onAction?.('block-form-opened');
  };

  const openEdit = block => {
    setEditId(block.id);
    const isRec = !!block._recurring;
    setDraft({
      name: block.name, start: block.start, end: block.end,
      type: block.type, bucket: block.bucket,
      days: [selDay],
      recurrence: isRec ? (block.recurrence || "none") : "none",
      intervalDays: block.intervalDays || 7,
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
    if (!editId) window.TUTORIAL?.onAction?.('block-created');
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
        setSelBlockId(id => {
          const next = id===dr.blockId ? null : dr.blockId;
          if (next !== null) window.TUTORIAL?.onAction?.('block-selected');
          return next;
        });
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
    const seenIds  = new Set(); // deduplicate
    let customProjs = [];
    try { customProjs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]"); } catch {}

    // ── POV daily tasks: hardcoded POV_DATA + custom tasks from LS ──
    for (const { id:povId } of allPovs) {
      if (block.bucket !== "alle" && block.bucket !== povId) continue;
      (POV_DATA[povId]?.tasksToday || []).forEach(t => {
        if (!seenIds.has(t.id)) { seenIds.add(t.id); allTasks.push({ ...t, _pov: povId, _source: "daily" }); }
      });
      // Custom tasks added via Dashboard (main source for most users)
      try {
        JSON.parse(LS.getItem(`lifeos_tasks_${povId}`) || "[]").forEach(t => {
          if (!seenIds.has(t.id)) { seenIds.add(t.id); allTasks.push({ ...t, _pov: povId, _source: "daily" }); }
        });
      } catch {}
    }

    // ── Project KR tasks: saved in project + custom KR tasks from LS ──
    for (const proj of [...PROJECTS, ...customProjs]) {
      if (block.bucket !== "alle" && block.bucket !== proj.pov) continue;
      let customKRTasks = {};
      try { customKRTasks = JSON.parse(LS.getItem(`lifeos_proj_tasks_${proj.id}`) || "{}"); } catch {}
      (proj.objectives || []).forEach((obj, oi) => {
        (obj.krs || []).filter(k => k.status !== "locked").forEach(kr => {
          const krTasks = [...(kr.tasks || []), ...(customKRTasks[kr.id] || [])];
          krTasks.forEach(t => {
            if (!seenIds.has(t.id)) {
              seenIds.add(t.id);
              allTasks.push({ ...t, _pov: proj.pov, _source: proj.title, _objective: obj.title, _objIdx: oi, _kr: kr.label });
            }
          });
        });
      });
    }

    // ── Load done sets per POV (filter out completed tasks) ──
    const doneSets = {};
    allPovs.forEach(({ id: pid }) => {
      try { doneSets[pid] = new Set(JSON.parse(LS.getItem(`lifeos_done_${pid}`) || "[]")); } catch { doneSets[pid] = new Set(); }
    });

    // ── Filter by block type + exclude done tasks + exclude tutorial tasks ──
    return allTasks.filter(t => {
      if (t._tutorial) return false;
      if (doneSets[t._pov]?.has(t.id)) return false;
      const flow = t.flow ? t.flow.trim().toUpperCase() : null;
      if (block.type === "flex")      return true;
      if (block.type === "deep-work") return flow === "FLOW";
      if (block.type === "basic")     return flow === "QUICK" || flow === "EASY";
      return true;
    });
  };

  const [blockSelections, setBlockSelections] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_block_selections") || "{}"); } catch { return {}; }
  });
  React.useEffect(() => { LS.setItem("lifeos_block_selections", JSON.stringify(blockSelections)); }, [blockSelections]);

  // ── Promised vs. Delivered für die angezeigte Woche ──────────────────────────
  const weekPvdStats = React.useMemo(function() {
    var weekBlockIds = new Set();
    for (var d = 0; d < 7; d++) {
      var dateStr = (dispWeek.days[d] || {}).dateStr || "";
      var deleted = new Set(weekBlocks["del_" + d] || []);
      recurring.filter(function(rb) {
        if (deleted.has(rb.id)) return false;
        if (rb.startDateStr && rb.startDateStr > dateStr) return false;
        if (rb.recurrence === "daily") return true;
        if (rb.recurrence === "weekdays") return d <= 4;
        if (rb.recurrence === "weekly") return rb.dayIndex === d;
        return false;
      }).forEach(function(rb) { weekBlockIds.add(rb.id); });
      (weekBlocks[d] || []).forEach(function(b) { weekBlockIds.add(b.id); });
    }
    var promisedByPov = {};
    weekBlockIds.forEach(function(blockId) {
      (blockSelections[blockId] || []).forEach(function(tk) {
        var lastUnd = tk.lastIndexOf("_");
        if (lastUnd === -1) return;
        var povId  = tk.slice(lastUnd + 1);
        var taskId = tk.slice(0, lastUnd);
        if (!promisedByPov[povId]) promisedByPov[povId] = [];
        promisedByPov[povId].push(taskId);
      });
    });
    var stats = [];
    var totalP = 0, totalD = 0;
    Object.keys(promisedByPov).forEach(function(povId) {
      var doneSet = new Set();
      try { doneSet = new Set(JSON.parse(LS.getItem("lifeos_done_" + povId) || "[]")); } catch {}
      var taskIds = promisedByPov[povId];
      var done    = taskIds.filter(function(id) { return doneSet.has(id); }).length;
      var total   = taskIds.length;
      totalP += total; totalD += done;
      var povMeta = allPovs.find(function(p) { return p.id === povId; });
      stats.push({ povId: povId, label: povMeta ? povMeta.label : povId, color: povMeta ? povMeta.color : "var(--accent)", total: total, done: done, pct: total > 0 ? done / total : 0 });
    });
    return { stats: stats, totalPromised: totalP, totalDone: totalD, totalPct: totalP > 0 ? totalD / totalP : 0 };
  }, [weekBlocks, recurring, blockSelections, dispWeek, allPovs]);

  // ── Truth Loop distribution (per-project, per-day weights) ─────────────────
  const DIST_DEF = [0.2, 0.2, 0.2, 0.2, 0.2, 0, 0];
  const [projDayWeights, setProjDayWeights] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_proj_day_weights") || "{}"); } catch { return {}; }
  });
  React.useEffect(() => { LS.setItem("lifeos_proj_day_weights", JSON.stringify(projDayWeights)); }, [projDayWeights]);
  const [showDistModal, setShowDistModal] = React.useState(false);

  const getProjWeights = (projId) => projDayWeights[projId] || DIST_DEF;
  const setProjWeight  = (projId, dayIdx, val) => {
    setProjDayWeights(prev => {
      const cur  = [...(prev[projId] || DIST_DEF)];
      cur[dayIdx] = Math.max(0, Math.min(1, val));
      return { ...prev, [projId]: cur };
    });
  };
  const resetProjWeights = (projId) => {
    setProjDayWeights(prev => ({ ...prev, [projId]: [...DIST_DEF] }));
  };

  // Active non-archived projects for Truth Loop
  const distProjs = React.useMemo(() => {
    try {
      const projs    = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
      const archived = new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]"));
      return projs.filter(p => !archived.has(p.id) && (p.hoursPerWeek || 0) > 0);
    } catch { return []; }
  }, [showDistModal]); // refresh when modal opens

  // Plan hours per day = sum over projects of hoursPerWeek * weight[dayIdx]
  const planHoursPerDay = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) =>
      distProjs.reduce((s, p) => s + p.hoursPerWeek * getProjWeights(p.id)[i], 0)
    );
  }, [projDayWeights, distProjs]);

  const toggleTaskSel = (blockId, taskKey) => {
    setBlockSelections(prev => {
      const cur = new Set(prev[blockId]||[]);
      const adding = !cur.has(taskKey);
      adding ? cur.add(taskKey) : cur.delete(taskKey);
      if (adding) window.TUTORIAL?.onAction?.('task-assigned');
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

  const recurrenceLabels = { none:"Einmalig", daily:"Taeglich", weekdays:"Werktags Mo-Fr", weekly:"Woechentlich", biweekly:"Alle 2 Wochen", monthly:"Monatlich", custom:"Alle N Tage" };

  return (
    <div data-tutorial="planner-content-area" style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

      {/* ── TAGE VERTEILEN Modal ─────────────────────────────────────────── */}
      {showDistModal && (
        <div style={{ position:"fixed", inset:0, zIndex:900, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e=>e.target===e.currentTarget&&setShowDistModal(false)}>
          <div style={{ background:"var(--panel)", border:"1px solid var(--line)", width:"min(96vw,900px)", maxHeight:"85vh", display:"flex", flexDirection:"column", boxShadow:"0 0 80px rgba(0,0,0,0.6)" }}>
            {/* Header */}
            <div style={{ padding:"18px 24px 14px", borderBottom:"1px solid var(--line)", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
              <div>
                <div className="uppercase-label" style={{ color:"var(--accent)", marginBottom:3, display:"flex", alignItems:"center", gap:6 }}>
                  <Icon name="sliders" size={11} color="var(--accent)" />
                  Tage verteilen
                </div>
                <div style={{ fontSize:12, color:"var(--text-faint)" }}>Wochenpensum je Projekt auf Tage aufteilen</div>
              </div>
              <button onClick={()=>setShowDistModal(false)} style={{ background:"none", border:"none", color:"var(--text-faint)", cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            {/* Body */}
            <div style={{ overflowY:"auto", padding:"20px 24px", flex:1 }}>
              {distProjs.length === 0 && (
                <div style={{ textAlign:"center", color:"var(--text-faint)", fontSize:12, padding:40 }}>Keine aktiven Projekte mit Wochenpensum vorhanden.</div>
              )}
              {distProjs.map(proj => {
                const weights  = getProjWeights(proj.id);
                const total    = weights.reduce((s,w)=>s+w,0);
                const overBudget = total > 1.02;
                const daysLabel= ["MO","DI","MI","DO","FR","SA","SO"];
                return (
                  <div key={proj.id} style={{ marginBottom:20, padding:"14px 16px", background:"var(--panel-2)", border:"1px solid var(--line-soft)" }}>
                    {/* Project row header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <span style={{ fontSize:11.5, fontWeight:700, color:"var(--text)" }}>{proj.title}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:10, fontFamily:"'JetBrains Mono',monospace", color:overBudget?"var(--danger)":Math.abs(total-1)<0.02?"var(--good)":"var(--text-faint)" }}>
                          {(total*100).toFixed(0)}% von {proj.hoursPerWeek}h/Wo
                        </span>
                        <button onClick={()=>resetProjWeights(proj.id)} style={{ background:"transparent", border:"1px solid var(--line)", color:"var(--text-faint)", fontSize:9, letterSpacing:"0.1em", fontWeight:600, cursor:"pointer", padding:"3px 8px" }}>RESET</button>
                      </div>
                    </div>
                    {/* Sliders */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
                      {daysLabel.map((dk, di) => {
                        const w   = weights[di];
                        const hrs = (proj.hoursPerWeek * w);
                        const hrsLabel = hrs < 0.05 ? "–" : (hrs % 1 === 0 ? hrs.toFixed(0) : hrs.toFixed(1)) + "h";
                        return (
                          <div key={dk} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:9, letterSpacing:"0.1em", fontWeight:700, color:"var(--text-faint)" }}>{dk}</span>
                            <input
                              type="range" min={0} max={1} step={0.05} value={w}
                              onChange={e=>setProjWeight(proj.id, di, parseFloat(e.target.value))}
                              style={{ width:"100%", accentColor:"var(--accent)", cursor:"pointer" }}
                            />
                            <span style={{ fontSize:9.5, fontFamily:"'JetBrains Mono',monospace", color:w>0?"var(--accent)":"var(--text-faint)" }}>{hrsLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {/* Daily totals */}
              {distProjs.length > 0 && (
                <div style={{ padding:"12px 16px", background:"var(--bg)", border:"1px solid var(--line-soft)", marginTop:4 }}>
                  <div style={{ fontSize:9, letterSpacing:"0.14em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>GESAMT / TAG</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
                    {["MO","DI","MI","DO","FR","SA","SO"].map((dk,di)=>(
                      <div key={dk} style={{ textAlign:"center" }}>
                        <span style={{ display:"block", fontSize:9, letterSpacing:"0.1em", color:"var(--text-faint)", marginBottom:2 }}>{dk}</span>
                        <span style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:planHoursPerDay[di]>0?"var(--text)":"var(--text-faint)" }}>
                          {planHoursPerDay[di]>0?(planHoursPerDay[di]%1===0?planHoursPerDay[di].toFixed(0):planHoursPerDay[di].toFixed(1))+"h":"–"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{ padding:"14px 24px", borderTop:"1px solid var(--line)", display:"flex", justifyContent:"flex-end", flexShrink:0 }}>
              <button onClick={()=>setShowDistModal(false)} style={{ padding:"10px 28px", background:"var(--accent)", color:"#0a0a0c", border:"none", fontSize:11, letterSpacing:"0.16em", fontWeight:700, cursor:"pointer" }}>
                ÜBERNEHMEN ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mission Generator Modal ───────────────────────────────────────── */}
      {showMissionGen && (
        <div style={{ position:"fixed", inset:0, zIndex:120, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e=>e.target===e.currentTarget&&setShowMissionGen(false)}>
          <div style={{ background:"var(--panel)", border:"1px solid var(--accent-line)", padding:32, width:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 0 80px rgba(109,40,217,0.3)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div>
                <div className="uppercase-label" style={{ color:"var(--accent)", marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
                  <Icon name="wand" size={11} color="var(--accent)" />
                  Missions-Generator
                </div>
                <div style={{ fontSize:12, color:"var(--text-faint)" }}>{dispWeek.days[selDay]?.dateStr} — {DAY_KEYS[selDay]}</div>
              </div>
              <button onClick={()=>setShowMissionGen(false)} style={{ background:"none", border:"none", color:"var(--text-faint)", cursor:"pointer", fontSize:20, padding:0 }}>x</button>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>MODUS</div>
              <div style={{ display:"flex", gap:8 }}>
                {[{id:"new",label:"Neue Bloecke anlegen"},{id:"fill",label:"Bestehende auffuellen"}].map(m=>(
                  <button key={m.id} onClick={()=>setMgMode(m.id)} style={{
                    flex:1, padding:"9px 14px", background:"transparent",
                    border:`1px solid ${mgMode===m.id?"var(--accent)":"var(--line)"}`,
                    color:mgMode===m.id?"var(--accent)":"var(--text-faint)",
                    fontSize:10.5, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer",
                  }}>{m.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>ENERGIE {mgEnergy}/5</div>
              <div style={{ display:"flex", gap:6 }}>
                {[1,2,3,4,5].map(v=>(
                  <button key={v} onClick={()=>setMgEnergy(v)} style={{
                    flex:1, padding:"9px 0", background:mgEnergy>=v?"var(--accent-soft)":"transparent",
                    border:`1px solid ${mgEnergy>=v?"var(--accent-line)":"var(--line)"}`,
                    color:mgEnergy>=v?"var(--accent)":"var(--text-faint)",
                    fontSize:11, fontWeight:700, cursor:"pointer",
                  }}>{v}</button>
                ))}
              </div>
              <div style={{ fontSize:10, color:"var(--text-faint)", marginTop:5 }}>
                {mgEnergy<=2?"Niedrig — einfache Tasks bevorzugt":mgEnergy>=4?"Hoch — Deep Work moeglich":"Mittel — ausgewogener Mix"}
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>MENTALE FOKUS-KAPAZITAET {mgFocus}/5</div>
              <div style={{ display:"flex", gap:6 }}>
                {[1,2,3,4,5].map(v=>(
                  <button key={v} onClick={()=>setMgFocus(v)} style={{
                    flex:1, padding:"9px 0", background:mgFocus>=v?"rgba(16,185,129,0.12)":"transparent",
                    border:`1px solid ${mgFocus>=v?"rgba(16,185,129,0.35)":"var(--line)"}`,
                    color:mgFocus>=v?"var(--athlete)":"var(--text-faint)",
                    fontSize:11, fontWeight:700, cursor:"pointer",
                  }}>{v}</button>
                ))}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
              <div>
                <div style={{ fontSize:9.5, letterSpacing:"0.14em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>START</div>
                <input type="time" value={mgStartTime} onChange={e=>setMgStartTime(e.target.value)}
                  style={{ width:"100%", background:"var(--panel-2)", border:"1px solid var(--line)", color:"var(--text)", padding:"9px 10px", fontSize:13, outline:"none", fontFamily:"'JetBrains Mono',monospace", boxSizing:"border-box" }} />
              </div>
              <div>
                <div style={{ fontSize:9.5, letterSpacing:"0.14em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>DAUER/BLOCK</div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {[30,45,60,90,120].map(d=>(
                    <button key={d} onClick={()=>setMgBlockDur(d)} style={{
                      flex:1, padding:"8px 2px", background:mgBlockDur===d?"var(--accent-soft)":"transparent",
                      border:`1px solid ${mgBlockDur===d?"var(--accent)":"var(--line)"}`,
                      color:mgBlockDur===d?"var(--accent)":"var(--text-faint)",
                      fontSize:9.5, fontWeight:700, cursor:"pointer",
                    }}>{d}m</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:9.5, letterSpacing:"0.14em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>ANZAHL BLOECKE</div>
                <div style={{ display:"flex", gap:4 }}>
                  {[1,2,3,4,5,6].map(n=>(
                    <button key={n} onClick={()=>setMgNumBlocks(n)} style={{
                      flex:1, padding:"8px 0", background:mgNumBlocks===n?"var(--accent-soft)":"transparent",
                      border:`1px solid ${mgNumBlocks===n?"var(--accent)":"var(--line)"}`,
                      color:mgNumBlocks===n?"var(--accent)":"var(--text-faint)",
                      fontSize:11, fontWeight:700, cursor:"pointer",
                    }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginBottom:4, fontSize:10, color:"var(--text-faint)", letterSpacing:"0.04em" }}>
              Gesamt: {mgNumBlocks} x {mgBlockDur}min = ca. {Math.round(mgNumBlocks*mgBlockDur/60*10)/10}h · Start: {mgStartTime}
            </div>

            <div style={{ marginBottom:20, marginTop:16 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)" }}>POV</div>
                <button onClick={()=>setMgAllPovs(v=>!v)} style={{
                  padding:"4px 12px", background:mgAllPovs?"var(--accent-soft)":"transparent",
                  border:`1px solid ${mgAllPovs?"var(--accent)":"var(--line)"}`,
                  color:mgAllPovs?"var(--accent)":"var(--text-faint)",
                  fontSize:9, fontWeight:700, letterSpacing:"0.12em", cursor:"pointer",
                }}>ALLE POVs</button>
              </div>
              {!mgAllPovs && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {allPovs.map(p=>(
                    <button key={p.id} onClick={()=>toggleMgPov(p.id)} style={{
                      padding:"7px 14px", borderRadius:999,
                      border:`1px solid ${mgPovs.includes(p.id)?p.color:"var(--line)"}`,
                      color:mgPovs.includes(p.id)?p.color:"var(--text-faint)",
                      background:mgPovs.includes(p.id)?"transparent":"transparent",
                      fontWeight:700, fontSize:10.5, cursor:"pointer",
                      boxShadow:mgPovs.includes(p.id)?`0 0 0 1px ${p.color}33` :"none",
                    }}>{p.label.toUpperCase()}</button>
                  ))}
                </div>
              )}
              {mgAllPovs && (
                <div style={{ padding:"8px 12px", background:"var(--accent-soft)", border:"1px solid var(--accent-line)", fontSize:11, color:"var(--accent)" }}>
                  Alle {allPovs.length} POVs werden abgedeckt — Bloecke werden verteilt.
                </div>
              )}
            </div>

            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:9.5, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>TAGESZIEL (optional)</div>
              <input value={mgGoal} onChange={e=>setMgGoal(e.target.value)}
                placeholder="Was soll heute erreicht werden?"
                style={{ width:"100%", background:"var(--panel-2)", border:"1px solid var(--line)", color:"var(--text)", padding:"10px 14px", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
            </div>

            {mgError && <div style={{ marginBottom:16, padding:"10px 14px", background:"var(--danger-soft)", border:"1px solid rgba(214,50,74,0.4)", color:"var(--danger)", fontSize:12 }}>{mgError}</div>}

            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button onClick={()=>setShowMissionGen(false)} style={{ padding:"10px 18px", background:"transparent", border:"1px solid var(--line)", color:"var(--text-faint)", fontSize:11, cursor:"pointer" }}>ABBRECHEN</button>
              <button onClick={runMissionGen} disabled={mgLoading} style={{
                padding:"10px 24px", background:mgLoading?"var(--panel-2)":"var(--accent)",
                color:mgLoading?"var(--text-faint)":"#0a0a0c",
                border:"none", fontSize:11, letterSpacing:"0.16em", fontWeight:700, cursor:mgLoading?"default":"pointer",
              }}>{mgLoading?"GENERIERE...":"TAG PLANEN"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div data-tutorial="planner-block-form" style={{ background:"var(--panel)", border:"1px solid var(--line)", padding:32, width:460, boxShadow:"0 0 60px rgba(0,0,0,0.6)" }}>
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
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {Object.entries(recurrenceLabels).map(([val, lbl]) => (
                  <button key={val} onClick={()=>setDraft(d=>({...d,recurrence:val}))} style={{
                    padding:"6px 12px", cursor:"pointer", fontSize:9, fontWeight:700, letterSpacing:"0.08em",
                    background:draft.recurrence===val?"var(--accent-soft)":"var(--panel-2)",
                    border:`1px solid ${draft.recurrence===val?"var(--accent)":"var(--line)"}`,
                    color:draft.recurrence===val?"var(--accent)":"var(--text-faint)",
                    whiteSpace:"nowrap",
                  }}>{lbl}</button>
                ))}
              </div>
              {/* Custom interval input */}
              {draft.recurrence === "custom" && (
                <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
                  <span style={{ fontSize:10, color:"var(--text-faint)", letterSpacing:"0.1em" }}>{"ALLE"}</span>
                  <input type="number" min={1} max={365} value={draft.intervalDays || 7}
                    onChange={e=>setDraft(d=>({...d,intervalDays:Math.max(1,parseInt(e.target.value)||7)}))}
                    style={{ width:64, background:"var(--panel-2)", border:"1px solid var(--accent-line)", color:"var(--accent)", padding:"6px 10px", fontSize:14, outline:"none", fontFamily:"'JetBrains Mono',monospace", textAlign:"center", boxSizing:"border-box" }} />
                  <span style={{ fontSize:10, color:"var(--text-faint)", letterSpacing:"0.1em" }}>{"TAGE"}</span>
                </div>
              )}
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
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowDistModal(true)} style={{ padding:"9px 16px", background:"transparent", color:"var(--text-faint)", border:"1px solid var(--line)", fontSize:10.5, fontWeight:700, letterSpacing:"0.16em", cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
            <Icon name="sliders" size={13} strokeWidth={2} />
            TAGE VERTEILEN
          </button>
          <button onClick={()=>openAdd()} style={{ padding:"9px 16px", background:"var(--accent)", color:"#0a0a0c", border:"none", fontSize:10.5, fontWeight:700, letterSpacing:"0.16em", cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
            <Icon name="plus" size={13} color="#0a0a0c" strokeWidth={2.5} />
            BLOCK
          </button>
        </div>
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
              {planHoursPerDay[i]>0&&<span style={{ display:"block", fontSize:7, letterSpacing:0, marginTop:2, color:isSel?"rgba(16,185,129,0.8)":"var(--text-faint)", fontFamily:"'JetBrains Mono',monospace" }}>
                {planHoursPerDay[i]%1===0?planHoursPerDay[i].toFixed(0):planHoursPerDay[i].toFixed(1)}h
              </span>}
            </button>
          );
        })}
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"360px 1fr", overflow:"hidden" }}>

        {/* ── Left: Time grid ─────────────────────────────────────────────── */}
        <div data-grid-scroll="" onClick={()=>setSelBlockId(null)} style={{ borderRight:"1px solid var(--line)", overflowY:"auto", overflowX:"hidden", position:"relative" }}>

          {/* Sticky header */}
          <div style={{ position:"sticky", top:0, zIndex:20, background:"var(--panel)", borderBottom:"1px solid var(--line-soft)", padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:9, letterSpacing:"0.18em", fontWeight:700, color:"var(--text-faint)" }}>
              ZEITGRID · {DAY_KEYS[selDay]} {dispWeek.days[selDay]?.n}. {dispWeek.days[selDay]?.monthShort}
            </span>
            <button onClick={()=>openAdd()} style={{ background:"transparent", border:"1px dashed var(--line)", color:"var(--accent)", padding:"4px 12px", fontSize:9, letterSpacing:"0.14em", fontWeight:700, cursor:"pointer" }}>+ BLOCK</button>
          </div>

          {/* Grid */}
          <div style={{ padding:"8px 12px 24px", position:"relative" }}>
            <div data-tutorial="timeline" ref={gridRef} style={{ position:"relative", height:GRID_H, userSelect:"none" }}
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

              {/* Calendar event overlays (read-only) */}
              {calEvents.map(function(ev) {
                var top    = minsToY(ev.startMins);
                var height = Math.max(minsToY(ev.endMins) - top, 18);
                var c      = FEED_COLORS[ev.colorIdx != null ? ev.colorIdx : 0];
                return (
                  <div key={ev.id} style={{
                    position: "absolute", top: top, left: LABEL_W + 2, right: 4, height: height,
                    background: c.bg,
                    border: "1px solid " + c.border,
                    borderLeft: "3px solid " + c.left,
                    zIndex: 3, pointerEvents: "none", overflow: "hidden", boxSizing: "border-box",
                  }}>
                    <div style={{ padding: "3px 6px" }}>
                      <div style={{ fontSize: 8, color: c.label, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 1 }}>TERMIN</div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.summary}</div>
                      {height > 40 && (
                        <div className="mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                          {strFromMins(ev.startMins)} – {strFromMins(ev.endMins)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

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
                    onClick={e=>e.stopPropagation()}
                    style={{
                      position:"absolute", top, left:LABEL_W, right:4, height,
                      background: isSel ? "rgba(139,92,246,0.22)" : "rgba(26,26,32,0.88)",
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
                          <div style={{ fontSize:8, color:t.color, fontWeight:700, letterSpacing:"0.14em", marginBottom:2, display:"flex", alignItems:"center", gap:4, flexWrap:"nowrap" }}>
                            {isRec&&<span style={{ opacity:0.7 }}>{"↻"}</span>}
                            <span style={{ background:t.modeBg, color:t.modeColor, padding:"0 4px", borderRadius:2, fontSize:7, letterSpacing:"0.12em", fontWeight:800, flexShrink:0 }}>{t.mode}</span>
                            <span style={{ flexShrink:0 }}>{t.glyph}{" "}{t.label}</span>
                          </div>
                          <div style={{ fontSize:11, fontWeight:700, color:isSel?"var(--accent)":"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{block.name}</div>
                          {height>40&&<div className="mono" style={{ fontSize:9, color:"var(--text-faint)", marginTop:2 }}>{strFromMins(startMins)} – {strFromMins(endMins)}</div>}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, pointerEvents:"auto", marginLeft:4 }}>
                          <button
                            onMouseDown={e=>e.stopPropagation()}
                            onClick={e=>{e.stopPropagation();deleteBlock(block.id);}}
                            style={{ background:"none", border:"none", color:"var(--text)", cursor:"pointer", fontSize:12, padding:"0 2px", opacity:0.45, lineHeight:1 }}
                          >×</button>
                          <button
                            onMouseDown={e=>e.stopPropagation()}
                            onClick={e=>{e.stopPropagation();openEdit(block);}}
                            style={{ background:"none", border:"none", color:"var(--text-faint)", cursor:"pointer", fontSize:11, padding:"0 2px", opacity:0.6, lineHeight:1 }}
                          >✎</button>
                          {bPov&&<span style={{ fontSize:7.5, color:bPov.color, fontWeight:700, letterSpacing:"0.1em" }}>{bPov.label.toUpperCase()}</span>}
                        </div>
                      </div>
                    </div>
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
        <div data-tutorial="task-suggestions" style={{ overflow:"auto", padding:"20px 24px" }}>
          {!selBlock ? (
            <div>
              <div style={{ marginBottom:20 }}>
                <div className="uppercase-label" style={{ marginBottom:4 }}>Promised vs. Delivered</div>
                <div style={{ fontSize:11, color:"var(--text-faint)", marginBottom:2 }}>
                  Zugeteilte Tasks vs. tatsächlich abgehakt · KW {dispWeek.kw}
                </div>
              </div>

              {weekPvdStats.totalPromised === 0 ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"52px 0", color:"var(--text-faint)", textAlign:"center" }}>
                  <div style={{ fontSize:38, marginBottom:12, opacity:0.1 }}>◎</div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Keine zugeteilten Tasks</div>
                  <div style={{ fontSize:11 }}>Block auswählen → Tasks anhaken</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {weekPvdStats.stats.map(function(s) {
                    return (
                      <div key={s.povId}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
                          <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:s.color }}>{s.label.toUpperCase()}</span>
                          <span className="mono" style={{ fontSize:11.5, fontWeight:700, color:s.pct>=0.8?"var(--good)":s.pct>=0.4?"var(--warn)":"var(--danger)" }}>
                            {s.done}/{s.total} · {Math.round(s.pct*100)}%
                          </span>
                        </div>
                        <div style={{ height:8, background:"var(--line-soft)", overflow:"hidden" }}>
                          <div style={{ height:"100%", width:(s.pct*100)+"%", background:s.color, transition:"width .4s ease" }} />
                        </div>
                        <div style={{ display:"flex", gap:12, marginTop:5 }}>
                          <span style={{ fontSize:9.5, color:"var(--good)", letterSpacing:"0.08em" }}>✓ {s.done} erledigt</span>
                          <span style={{ fontSize:9.5, color:"var(--text-faint)", letterSpacing:"0.08em" }}>◯ {s.total - s.done} offen</span>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ paddingTop:14, borderTop:"1px solid var(--line-soft)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:10.5, letterSpacing:"0.12em", fontWeight:700, color:"var(--text-dim)" }}>GESAMT</span>
                      <span className="mono" style={{ fontSize:12, fontWeight:700, color:weekPvdStats.totalPct>=0.7?"var(--good)":"var(--danger)" }}>
                        {weekPvdStats.totalDone}/{weekPvdStats.totalPromised} · {Math.round(weekPvdStats.totalPct*100)}%
                      </span>
                    </div>
                    <div style={{ height:5, background:"var(--line-soft)" }}>
                      <div style={{ height:"100%", width:(weekPvdStats.totalPct*100)+"%", background:weekPvdStats.totalPct>=0.7?"var(--good)":"var(--danger)", transition:"width .4s ease" }} />
                    </div>
                  </div>

                  <div style={{ marginTop:4, padding:"10px 14px", background:"var(--panel)", border:"1px solid var(--line-soft)", fontSize:11, color:"var(--text-faint)", textAlign:"center" }}>
                    Block auswählen → Tasks zuteilen
                  </div>
                </div>
              )}

              {/* ── Tagesbudget Strip ── */}
              {distProjs.length > 0 && (
                <div style={{ marginTop:24 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div className="uppercase-label">Tagesbudget</div>
                    <span style={{ fontSize:9, color:"var(--text-faint)", fontFamily:"'JetBrains Mono',monospace" }}>
                      {DAY_KEYS[selDay]} {dispWeek.days[selDay] && dispWeek.days[selDay].n}. {dispWeek.days[selDay] && dispWeek.days[selDay].monthShort}
                    </span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {(function() {
                      var fmtH = function(h){ return h < 0.05 ? "0h" : h % 1 === 0 ? h.toFixed(0) + "h" : h.toFixed(1) + "h"; };
                      // Projects active today (have planned hours)
                      var activeProjs = distProjs.filter(function(p){ return getProjWeights(p.id)[selDay] * p.hoursPerWeek >= 0.05; });
                      var activeCount = activeProjs.length || 1;
                      // "Alle"-block minutes split equally among active projects
                      var alleMinsTotal = dayBlocks.reduce(function(s,b){
                        return b.bucket === "alle" ? s + minsFromStr(b.end) - minsFromStr(b.start) : s;
                      }, 0);
                      var alleMinsPerProj = alleMinsTotal / activeCount;

                      var totalPlanned = 0, totalBlocked = 0;
                      var rows = distProjs.map(function(proj) {
                        var w = getProjWeights(proj.id)[selDay];
                        var plannedHrs = proj.hoursPerWeek * w;
                        if (plannedHrs < 0.05) return null;
                        // Direct blocks for this project's POV
                        var directMins = dayBlocks.reduce(function(s,b){
                          return b.bucket === proj.pov ? s + minsFromStr(b.end) - minsFromStr(b.start) : s;
                        }, 0);
                        var blockedHrs = (directMins + alleMinsPerProj) / 60;
                        var pct = Math.min(1, blockedHrs / plannedHrs);
                        var over = blockedHrs > plannedHrs + 0.05;
                        totalPlanned += plannedHrs;
                        totalBlocked += blockedHrs;
                        var barColor = over ? "var(--warn)" : pct >= 0.8 ? "var(--good)" : "var(--accent)";
                        var valColor = over ? "var(--warn)" : pct >= 1 ? "var(--good)" : "var(--text)";
                        return (
                          <div key={proj.id} style={{ minWidth:0 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:3 }}>
                              <span style={{ fontSize:10.5, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, minWidth:0 }}>{proj.title}</span>
                              <span className="mono" style={{ fontSize:10.5, fontWeight:700, color:valColor, flexShrink:0, marginLeft:8 }}>
                                {fmtH(blockedHrs)}<span style={{ fontWeight:400, color:"var(--text-faint)" }}> / {fmtH(plannedHrs)}</span>
                              </span>
                            </div>
                            <div style={{ height:4, background:"var(--line-soft)", overflow:"hidden" }}>
                              <div style={{ height:"100%", width:(pct*100)+"%", background:barColor, transition:"width .3s ease" }} />
                            </div>
                          </div>
                        );
                      });

                      var totalPct = totalPlanned > 0 ? Math.min(1, totalBlocked / totalPlanned) : 0;
                      var totalOver = totalBlocked > totalPlanned + 0.05;
                      return (
                        <React.Fragment>
                          {rows}
                          <div style={{ paddingTop:8, borderTop:"1px solid var(--line-soft)" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
                              <span style={{ fontSize:9.5, letterSpacing:"0.12em", fontWeight:700, color:"var(--text-faint)" }}>GESAMT</span>
                              <span className="mono" style={{ fontSize:11.5, fontWeight:700, color: totalOver ? "var(--warn)" : totalPct >= 1 ? "var(--good)" : "var(--text)" }}>
                                {fmtH(totalBlocked)}<span style={{ fontSize:9, fontWeight:400, color:"var(--text-faint)" }}> / {fmtH(totalPlanned)}</span>
                              </span>
                            </div>
                            <div style={{ height:5, background:"var(--line-soft)", overflow:"hidden" }}>
                              <div style={{ height:"100%", width:(totalPct*100)+"%", background: totalOver ? "var(--warn)" : totalPct >= 0.8 ? "var(--good)" : "var(--accent)", transition:"width .3s ease" }} />
                            </div>
                            <div style={{ marginTop:4, fontSize:9, color: totalOver ? "var(--warn)" : totalPct >= 1 ? "var(--good)" : "var(--text-faint)", textAlign:"right" }}>
                              {totalOver ? "+" + fmtH(totalBlocked - totalPlanned) + " überbucht" : totalPct >= 1 ? "Pensum voll verplant" : fmtH(totalPlanned - totalBlocked) + " noch offen"}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })()}
                  </div>
                  <div style={{ marginTop:10, display:"flex", justifyContent:"flex-end" }}>
                    <button onClick={function(){setShowDistModal(true);}} style={{ background:"transparent", border:"1px solid var(--line)", color:"var(--text-faint)", fontSize:9, letterSpacing:"0.14em", fontWeight:700, cursor:"pointer", padding:"4px 10px", display:"flex", alignItems:"center", gap:5 }}>
                      <Icon name="sliders" size={10} strokeWidth={2} />
                      VERTEILEN
                    </button>
                  </div>
                </div>
              )}
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
                  <div style={{ fontSize:10.5 }}>Aendere Typ oder fuege Tasks in Mission Control hinzu.</div>
                </div>
              )}

              {/* ── Selected tasks pinned to top ── */}
              {selTaskKeys.length>0&&(
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:9, letterSpacing:"0.14em", color:"var(--good)", marginBottom:10, fontWeight:700 }}>
                    AUSGEWAEHLT — {selTaskKeys.length} TASK{selTaskKeys.length!==1?"S":""}
                  </div>
                  {selSuggs.map((t,i) => {
                    const taskKey = `${t.id}_${t._pov}`;
                    const povColor = allPovs.find(p=>p.id===(t._pov||t.pov))?.color||"var(--accent)";
                    const flow = (t.flow||"QUICK").toUpperCase();
                    const est  = t.est||30;
                    return (
                      <div key={`sel_${t.id}_${i}`} onClick={()=>toggleTaskSel(selBlock.id,taskKey)} style={{
                        display:"flex", alignItems:"center", gap:12, padding:"11px 14px", marginBottom:4,
                        background:"var(--good-soft)", border:"1px solid rgba(58,171,91,0.35)",
                        borderLeft:"3px solid var(--good)", cursor:"pointer", transition:"all .12s",
                      }}>
                        <div style={{ width:16, height:16, borderRadius:3, flexShrink:0, border:"2px solid var(--good)", background:"var(--good)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ color:"#0a0a0c", fontSize:10, fontWeight:900, lineHeight:1 }}>✓</span>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"var(--text)" }}>{t.title}</div>
                          {t.sub && <div style={{ fontSize:10.5, color:"var(--text-faint)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.sub}</div>}
                        </div>
                        <FlowTag kind={flow} />
                        <div className="mono" style={{ fontSize:13, fontWeight:700, color:"var(--good)", flexShrink:0 }}>{est}<span style={{ fontSize:8, fontWeight:400 }}>m</span></div>
                      </div>
                    );
                  })}
                  <div style={{ height:1, background:"var(--line)", margin:"14px 0 16px" }} />
                </div>
              )}

              {(() => {
                const filterHint = selBlock.type === "deep-work" ? "nur FLOW" : selBlock.type === "basic" ? "nur QUICK & EASY" : "alle";
                const openCount = suggestions.filter(t=>!selTaskKeys.includes(`${t.id}_${t._pov}`)).length;
                return (
                  <div style={{ fontSize:9, letterSpacing:"0.14em", color:"var(--text-faint)", marginBottom:12, fontWeight:600 }}>
                    {openCount} OFFENE AUFGABEN — ANHAKEN ZUM ZUTEILEN
                    <span style={{ marginLeft:10, color: selBlock.type==="deep-work"?"var(--accent)":selBlock.type==="basic"?"var(--text-dim)":"var(--warn)", background: selBlock.type==="deep-work"?"var(--accent-soft)":selBlock.type==="basic"?"rgba(255,255,255,0.05)":"rgba(212,162,60,0.1)", padding:"1px 7px", borderRadius:3 }}>
                      FILTER: {filterHint.toUpperCase()}
                    </span>
                  </div>
                );
              })()}
              {(() => {
                // Only show unselected tasks in the grouped view
                const unselSuggestions = suggestions.filter(t => !selTaskKeys.includes(`${t.id}_${t._pov}`));
                // Group by _pov → _source (project) → _objective → _kr
                const povOrder = [];
                const povGroups = {};
                unselSuggestions.forEach(t => {
                  const povKey = t._pov || "__none__";
                  if (!povGroups[povKey]) { povOrder.push(povKey); povGroups[povKey] = { _srcOrder: [], _srcs: {} }; }
                  const src = t._source || "daily";
                  if (!povGroups[povKey]._srcs[src]) {
                    povGroups[povKey]._srcOrder.push(src);
                    povGroups[povKey]._srcs[src] = { _objOrder: [], _objs: {} };
                  }
                  const obj = t._objective || "__none__";
                  if (!povGroups[povKey]._srcs[src]._objs[obj]) {
                    povGroups[povKey]._srcs[src]._objOrder.push(obj);
                    povGroups[povKey]._srcs[src]._objs[obj] = { _krOrder: [], _krs: {} };
                  }
                  const kr = t._kr || "__none__";
                  if (!povGroups[povKey]._srcs[src]._objs[obj]._krs[kr]) {
                    povGroups[povKey]._srcs[src]._objs[obj]._krOrder.push(kr);
                    povGroups[povKey]._srcs[src]._objs[obj]._krs[kr] = [];
                  }
                  povGroups[povKey]._srcs[src]._objs[obj]._krs[kr].push(t);
                });

                const renderTaskRow = (t, i) => {
                  const taskKey  = `${t.id}_${t._pov}`;
                  const isSel    = isTaskSel(selBlock.id, taskKey);
                  const povColor = allPovs.find(p=>p.id===(t._pov||t.pov))?.color||"var(--accent)";
                  const flow = (t.flow||"QUICK").toUpperCase();
                  const est  = t.est||30;
                  return (
                    <div key={`${t.id}_${i}`} onClick={()=>toggleTaskSel(selBlock.id,taskKey)} style={{
                      display:"flex", alignItems:"center", gap:12, padding:"11px 14px", marginBottom:4,
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
                        {t.sub && <div style={{ fontSize:10.5, color:"var(--text-faint)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.sub}</div>}
                      </div>
                      <FlowTag kind={flow} />
                      <div className="mono" style={{ fontSize:13, fontWeight:700, color:isSel?"var(--accent)":"var(--text-faint)", flexShrink:0 }}>{est}<span style={{ fontSize:8, fontWeight:400 }}>m</span></div>
                    </div>
                  );
                };

                return povOrder.map(povId => {
                  const povMeta = allPovs.find(p=>p.id===povId);
                  const povColor = povMeta?.color || "var(--accent)";
                  const { _srcOrder, _srcs } = povGroups[povId];
                  return (
                    <div key={povId} style={{ marginBottom:24 }}>
                      {/* POV header */}
                      <div style={{ fontSize:8.5, letterSpacing:"0.22em", fontWeight:800, color:povColor, padding:"4px 0 10px", borderBottom:`2px solid ${povColor}33`, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:povColor, flexShrink:0 }} />
                        {povMeta ? povMeta.label.toUpperCase() : povId.toUpperCase()}
                      </div>
                      {_srcOrder.map(src => {
                        const { _objOrder, _objs } = _srcs[src];
                        return (
                          <div key={src} style={{ marginBottom:16 }}>
                            {/* Project header */}
                            {src !== "daily" && (
                              <div style={{ fontSize:9, letterSpacing:"0.16em", fontWeight:700, color:"var(--accent)", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ opacity:0.5 }}>✦</span> {src.toUpperCase()}
                              </div>
                            )}
                            {src === "daily" && (
                              <div style={{ fontSize:9, letterSpacing:"0.16em", fontWeight:700, color:"var(--text-faint)", marginBottom:10 }}>TAEGLICH</div>
                            )}
                            {_objOrder.map(objKey => {
                              const { _krOrder, _krs } = _objs[objKey];
                              return (
                                <div key={objKey} style={{ marginBottom:12 }}>
                                  {/* Objective header */}
                                  {objKey !== "__none__" && (
                                    <div style={{ fontSize:11, fontWeight:700, color:"var(--text)", marginBottom:8, padding:"6px 10px", background:"rgba(255,255,255,0.04)", borderLeft:`2px solid ${povColor}` }}>
                                      {objKey}
                                    </div>
                                  )}
                                  {_krOrder.map(krKey => (
                                    <div key={krKey} style={{ marginBottom:8, paddingLeft: objKey !== "__none__" ? 8 : 0 }}>
                                      {/* KR header */}
                                      {krKey !== "__none__" && (
                                        <div style={{ fontSize:9.5, fontWeight:600, color:povColor, letterSpacing:"0.08em", marginBottom:5, display:"flex", alignItems:"center", gap:6, opacity:0.85 }}>
                                          <span style={{ opacity:0.5 }}>→</span> {krKey}
                                        </div>
                                      )}
                                      {_krs[krKey].map((t,i) => renderTaskRow(t, i))}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

window.Planner = Planner;
