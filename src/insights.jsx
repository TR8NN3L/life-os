// Insights — echte Daten aus localStorage: Zeit pro KR, Promised vs. Delivered, Debt.

// ── Weekly helpers ────────────────────────────────────────────────────────────
function getMonday(weekOffset) {
  const now = new Date();
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mo … 6=So
  const mon = new Date(now);
  mon.setDate(now.getDate() - day + weekOffset * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function localDateStr(d) {
  var pad = function(n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

// ── Weekly bar chart ─────────────────────────────────────────────────────────
function WeeklyBarChart({ days }) {
  // days = [{label, dateStr, totalH, isToday, isFuture}]
  var W = 560, H = 140;
  var PAD = { top: 10, right: 12, bottom: 30, left: 38 };
  var cW = W - PAD.left - PAD.right;
  var cH = H - PAD.top - PAD.bottom;
  var maxH = Math.max.apply(null, days.map(function(d) { return d.totalH; }).concat([1]));
  var scale = maxH < 4 ? Math.ceil(maxH + 1) : maxH < 8 ? Math.ceil(maxH * 1.25) : Math.ceil(maxH * 1.2);
  var barW = Math.floor(cW / days.length * 0.55);
  var gap  = cW / days.length;

  var yTicks = [];
  var step = scale <= 4 ? 1 : scale <= 8 ? 2 : 4;
  for (var v = 0; v <= scale; v += step) yTicks.push(v);

  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", height: "auto", overflow: "visible", display: "block" }}>
      {yTicks.map(function(v) {
        var y = PAD.top + cH * (1 - v / scale);
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={PAD.left - 5} y={y + 3.5} textAnchor="end" fill="var(--text-faint)" fontSize={8.5} fontFamily="'JetBrains Mono',monospace">{v + "h"}</text>
          </g>
        );
      })}
      {days.map(function(day, i) {
        var x = PAD.left + gap * i + gap / 2;
        var barH = Math.max(cH * (day.totalH / scale), day.totalH > 0 ? 2 : 0);
        var barX = x - barW / 2;
        var barY = PAD.top + cH - barH;
        var col = day.isToday ? "var(--accent)" : day.isFuture ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.22)";
        return (
          <g key={day.dateStr}>
            {day.totalH > 0 && (
              <rect x={barX} y={barY} width={barW} height={barH} fill={col} rx={2} />
            )}
            {day.totalH > 0 && (
              <text x={x} y={barY - 4} textAnchor="middle" fill={day.isToday ? "var(--accent)" : "var(--text-faint)"} fontSize={8.5} fontFamily="'JetBrains Mono',monospace">
                {day.totalH.toFixed(1) + "h"}
              </text>
            )}
            <text x={x} y={H - 13} textAnchor="middle" fill={day.isToday ? "var(--accent)" : "var(--text-faint)"} fontSize={9} fontWeight={day.isToday ? 700 : 400} fontFamily="inherit">
              {day.label}
            </text>
            <text x={x} y={H - 3} textAnchor="middle" fill="var(--text-faint)" fontSize={7.5} fontFamily="'JetBrains Mono',monospace">
              {day.dateStr.slice(5).replace("-", ".")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Grafana-inspired SVG Time Series Chart ─────────────────────────────────
function TruthLoopChart({ days, plan, reality }) {
  const W = 560, H = 160;
  const PAD = { top: 12, right: 12, bottom: 28, left: 38 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxY = Math.max(...plan, ...reality, 1) * 1.3;
  const n = days.length;
  const xStep = cW / (n - 1);
  const toX = i => PAD.left + i * xStep;
  const toY = v => PAD.top + cH * (1 - v / maxY);

  const polyline = arr => arr.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const area = arr => {
    const pts = arr.map((v, i) => `${toX(i)},${toY(v)}`).join(' L ');
    return `M ${toX(0)},${toY(0)} L ${pts} L ${toX(n-1)},${toY(0)} Z`;
  };

  const step = maxY <= 4 ? 1 : maxY <= 8 ? 2 : 4;
  const yTicks = [];
  for (let v = 0; v <= maxY; v += step) yTicks.push(v);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', overflow:'visible', display:'block' }}>
      <defs>
        <linearGradient id="tlAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* horizontal grid lines */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={PAD.left - 5} y={toY(v) + 3.5} textAnchor="end"
            fill="var(--text-faint)" fontSize={8.5} fontFamily="'JetBrains Mono',monospace">
            {v}h
          </text>
        </g>
      ))}

      {/* reality area fill */}
      <path d={area(reality)} fill="url(#tlAreaGrad)" />

      {/* plan — dashed */}
      <polyline points={polyline(plan)} fill="none"
        stroke="var(--text-dim)" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.6} />

      {/* reality — solid */}
      <polyline points={polyline(reality)} fill="none"
        stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />

      {/* dots + delta connectors + labels */}
      {days.map((day, i) => {
        const x = toX(i);
        const yr = toY(reality[i]);
        const yp = toY(plan[i]);
        const delta = reality[i] - plan[i];
        const dc = delta >= 0 ? 'var(--good)' : 'var(--danger)';
        return (
          <g key={day}>
            <line x1={x} y1={yr} x2={x} y2={yp} stroke={dc} strokeWidth={1} opacity={0.55} />
            <circle cx={x} cy={yr} r={3.5} fill={dc} />
            <circle cx={x} cy={yp} r={2.5} fill="var(--text-faint)" opacity={0.7} />
            <text x={x} y={H - 5} textAnchor="middle"
              fill="var(--text-faint)" fontSize={9} fontFamily="inherit">{day}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Grafana-inspired Gauge Ring ─────────────────────────────────────────────
function GaugeRing({ pct, color, label, size = 96 }) {
  const r = (size - 14) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(Math.max(pct, 0), 1);
  return (
    <svg width={size} height={size} style={{ overflow:'visible' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-soft)" strokeWidth={8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="butt"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition:'stroke-dasharray .6s ease' }}
      />
      <text x={cx} y={cy + 5} textAnchor="middle"
        fill={color} fontSize={14} fontWeight={700}
        fontFamily="'JetBrains Mono',monospace">
        {pct !== null ? `${Math.round(pct * 100)}%` : '—'}
      </text>
      {label && (
        <text x={cx} y={cy + 17} textAnchor="middle"
          fill="var(--text-faint)" fontSize={7.5} fontFamily="inherit" letterSpacing="0.12em">
          {label}
        </text>
      )}
    </svg>
  );
}

// ── Weekly Report Modal ────────────────────────────────────────────────────
function WeeklyReportModal({ onClose }) {
  var [rOffset, setROffset] = React.useState(0);
  var [okrPromptShown, setOkrPromptShown] = React.useState(false);

  var mon = React.useMemo(function() { return getMonday(rOffset); }, [rOffset]);
  var pad = function(n) { return String(n).padStart(2, "0"); };
  var fmtDate = function(d) { return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear(); };
  var sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  var todayIso = localDateStr(new Date());

  // KW number
  var thu = new Date(mon); thu.setDate(mon.getDate() + 3);
  var yr = thu.getFullYear();
  var jan4 = new Date(yr, 0, 4);
  var jan4Mo = new Date(jan4); jan4Mo.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1));
  var kw = Math.round((mon - jan4Mo) / 604800000) + 1;

  // Day data
  var days = React.useMemo(function() {
    var DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    return Array.from({ length: 7 }, function(_, i) {
      var d = new Date(mon); d.setDate(mon.getDate() + i);
      var ds = localDateStr(d);
      var daily = {};
      try { daily = JSON.parse(LS.getItem("lifeos_daily_" + ds) || "{}"); } catch {}
      var totalSec = Object.keys(daily).reduce(function(s, k) { return s + (daily[k] || 0); }, 0);
      return { label: DAY_LABELS[i], ds: ds, totalH: totalSec / 3600, isFuture: ds > todayIso };
    });
  }, [mon]);

  // Planned hours from timeblocks
  var plannedH = React.useMemo(function() {
    try {
      var allBlocks = JSON.parse(LS.getItem("lifeos_timeblocks_v2") || "{}");
      var recurring = JSON.parse(LS.getItem("lifeos_recurring_blocks") || "[]");
      var total = 0;
      for (var di = 0; di < 7; di++) {
        var ds = days[di].ds;
        // Find matching week key
        var wkKey = null;
        Object.keys(allBlocks).forEach(function(k) {
          var wkBlocks = allBlocks[k];
          if (wkBlocks && wkBlocks[di] && wkBlocks[di].length > 0) {
            // check if this week contains our ds
            var firstBlock = wkBlocks[di][0];
            if (firstBlock) wkKey = k;
          }
        });
        // Just sum all specific blocks for this week
        Object.keys(allBlocks).forEach(function(k) {
          var wb = allBlocks[k];
          var specific = wb[di] || [];
          // For the correct week, check if the week key matches our date range
          // Simple heuristic: include if specific blocks exist (they'll be in the right week)
          specific.forEach(function(b) {
            var sm = b.start ? (parseInt(b.start.split(":")[0]) * 60 + parseInt(b.start.split(":")[1])) : 0;
            var em = b.end   ? (parseInt(b.end.split(":")[0])   * 60 + parseInt(b.end.split(":")[1]))   : 0;
            total += Math.max(0, em - sm) / 60;
          });
        });
      }
      // Add recurring blocks (rough estimate)
      recurring.forEach(function(rb) {
        var durMins = 0;
        if (rb.start && rb.end) {
          var sm = parseInt(rb.start.split(":")[0]) * 60 + parseInt(rb.start.split(":")[1]);
          var em = parseInt(rb.end.split(":")[0])   * 60 + parseInt(rb.end.split(":")[1]);
          durMins = Math.max(0, em - sm);
        }
        for (var di = 0; di < 7; di++) {
          var ds = days[di].ds;
          var applies = false;
          if (rb.recurrence === "daily") applies = true;
          else if (rb.recurrence === "weekdays") applies = di <= 4;
          else if (rb.recurrence === "weekly" && rb.dayIndex === di) applies = true;
          else if (rb.recurrence === "biweekly" && rb.dayIndex === di && rb.startDateStr) {
            var diff = Math.round((new Date(ds + "T00:00:00") - new Date(rb.startDateStr + "T00:00:00")) / 86400000);
            applies = diff >= 0 && diff % 14 === 0;
          }
          else if (rb.recurrence === "monthly" && rb.startDateStr) {
            applies = parseInt(ds.slice(8), 10) === parseInt(rb.startDateStr.slice(8), 10);
          }
          else if (rb.recurrence === "custom" && rb.startDateStr) {
            var diff2 = Math.round((new Date(ds + "T00:00:00") - new Date(rb.startDateStr + "T00:00:00")) / 86400000);
            applies = diff2 >= 0 && diff2 % (rb.intervalDays || 7) === 0;
          }
          if (applies && !days[di].isFuture) total += durMins / 60;
        }
      });
      return total;
    } catch { return 0; }
  }, [days]);

  // Actual hours
  var actualH = days.filter(function(d) { return !d.isFuture; }).reduce(function(s, d) { return s + d.totalH; }, 0);

  // Say-Do: block selections vs done
  var sayDo = React.useMemo(function() {
    try {
      var selections = JSON.parse(LS.getItem("lifeos_block_selections") || "{}");
      var promised = 0, delivered = 0;
      Object.keys(selections).forEach(function(blockId) {
        var taskKeys = selections[blockId] || [];
        taskKeys.forEach(function(tk) {
          var lastUnd = tk.lastIndexOf("_");
          if (lastUnd === -1) return;
          var povId = tk.slice(lastUnd + 1);
          var taskId = tk.slice(0, lastUnd);
          promised++;
          try {
            var doneSet = new Set(JSON.parse(LS.getItem("lifeos_done_" + povId) || "[]"));
            if (doneSet.has(taskId)) delivered++;
          } catch {}
        });
      });
      return { promised: promised, delivered: delivered, pct: promised > 0 ? Math.round(delivered / promised * 100) : null };
    } catch { return { promised: 0, delivered: 0, pct: null }; }
  }, []);

  // Streak days this week
  var streakDaysThisWeek = days.filter(function(d) { return !d.isFuture && d.totalH > 0; }).length;

  var sayDoColor = sayDo.pct === null ? "var(--text-faint)" : sayDo.pct >= 80 ? "var(--good)" : sayDo.pct >= 60 ? "var(--accent)" : sayDo.pct >= 40 ? "var(--warn)" : "var(--danger)";
  var effPct = plannedH > 0 ? Math.min(100, Math.round(actualH / plannedH * 100)) : null;

  // OKR-Review-Trigger: mark as prompted when score hits 70%+ for first time
  React.useEffect(function() {
    if (sayDo.pct !== null && sayDo.pct >= 70 && !LS.getItem("lifeos_okr_review_prompted")) {
      LS.setItem("lifeos_okr_review_prompted", "1");
      setOkrPromptShown(true);
    }
  }, [sayDo.pct]);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--panel)", border:"1px solid var(--line)", width:"min(96vw,680px)", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 0 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ padding:"22px 28px 18px", borderBottom:"1px solid var(--line)", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div className="uppercase-label" style={{ color:"var(--accent)", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
              <Icon name="bar-chart-2" size={11} color="var(--accent)" />
              {"Weekly Report"}
            </div>
            <div style={{ fontSize:18, fontWeight:700 }}>{"KW " + kw + " · " + fmtDate(mon) + " – " + fmtDate(sun)}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={function() { setROffset(function(o) { return o - 1; }); }} style={{ background:"var(--panel-2)", border:"1px solid var(--line)", color:"var(--text-faint)", padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{"< PREV"}</button>
            {rOffset !== 0 && <button onClick={function() { setROffset(0); }} style={{ background:"none", border:"1px solid var(--line)", color:"var(--text-faint)", padding:"5px 10px", fontSize:10, cursor:"pointer", letterSpacing:"0.1em" }}>{"AKTUELL"}</button>}
            <button onClick={function() { setROffset(function(o) { return o + 1; }); }} disabled={rOffset >= 0} style={{ background:"var(--panel-2)", border:"1px solid var(--line)", color:"var(--text-faint)", opacity: rOffset >= 0 ? 0.35 : 1, padding:"5px 12px", fontSize:11, cursor: rOffset >= 0 ? "default" : "pointer", fontFamily:"inherit" }}>{"NEXT >"}</button>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-faint)", cursor:"pointer", fontSize:20, padding:"0 4px", lineHeight:1 }}>{"x"}</button>
          </div>
        </div>

        <div style={{ padding:"24px 28px" }}>

          {/* Big 3 stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:24 }}>
            <div style={{ background:"var(--bg)", border:"1px solid var(--line-soft)", padding:"18px 20px" }}>
              <div style={{ fontSize:9, letterSpacing:"0.18em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>{"GELIEFERT"}</div>
              <div className="mono" style={{ fontSize:30, fontWeight:700, color:"var(--accent)", lineHeight:1 }}>{actualH.toFixed(1) + "h"}</div>
              <div style={{ fontSize:10, color:"var(--text-faint)", marginTop:6 }}>{"Geplant: " + plannedH.toFixed(1) + "h"}</div>
              {effPct !== null && <div style={{ fontSize:10, color: effPct >= 80 ? "var(--good)" : effPct >= 50 ? "var(--warn)" : "var(--danger)", marginTop:2, fontWeight:700 }}>{effPct + "% erledigt"}</div>}
            </div>
            <div style={{ background:"var(--bg)", border:"1px solid var(--line-soft)", padding:"18px 20px" }}>
              <div style={{ fontSize:9, letterSpacing:"0.18em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>{"SAY-DO SCORE"}</div>
              <div className="mono" style={{ fontSize:30, fontWeight:700, color:sayDoColor, lineHeight:1 }}>{sayDo.pct !== null ? sayDo.pct + "%" : "--"}</div>
              <div style={{ fontSize:10, color:"var(--text-faint)", marginTop:6 }}>{sayDo.promised + " promised / " + sayDo.delivered + " done"}</div>
            </div>
            <div style={{ background:"var(--bg)", border:"1px solid var(--line-soft)", padding:"18px 20px" }}>
              <div style={{ fontSize:9, letterSpacing:"0.18em", fontWeight:700, color:"var(--text-faint)", marginBottom:8 }}>{"STREAK-TAGE"}</div>
              <div className="mono" style={{ fontSize:30, fontWeight:700, color: streakDaysThisWeek >= 5 ? "var(--good)" : streakDaysThisWeek >= 3 ? "var(--accent)" : "var(--warn)", lineHeight:1 }}>{streakDaysThisWeek + "/7"}</div>
              <div style={{ fontSize:10, color:"var(--text-faint)", marginTop:6 }}>{"Tage mit Time geloggt"}</div>
            </div>
          </div>

          {/* Per-day bar */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:9, letterSpacing:"0.18em", fontWeight:700, color:"var(--text-faint)", marginBottom:12 }}>{"TAGES-BREAKDOWN"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
              {days.map(function(day) {
                var maxH = Math.max.apply(null, days.map(function(d) { return d.totalH; }).concat([1]));
                var barPct = Math.min(100, (day.totalH / maxH) * 100);
                return (
                  <div key={day.ds} style={{ textAlign:"center" }}>
                    <div style={{ height:80, display:"flex", flexDirection:"column", justifyContent:"flex-end", marginBottom:6 }}>
                      <div style={{
                        width:"100%", borderRadius:2,
                        height: day.isFuture ? 2 : Math.max(barPct * 0.8, day.totalH > 0 ? 4 : 1) + "%",
                        background: day.isFuture ? "var(--line)" : day.totalH > 0 ? "var(--accent)" : "var(--line-soft)",
                        transition:"height .3s",
                      }} />
                    </div>
                    <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:"0.1em", color:day.ds === todayIso ? "var(--accent)" : "var(--text-faint)" }}>{day.label}</div>
                    <div className="mono" style={{ fontSize:9, color:day.totalH > 0 ? "var(--text-dim)" : "var(--text-faint)", marginTop:2 }}>{day.totalH > 0 ? day.totalH.toFixed(1) + "h" : "--"}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verdict */}
          {(function() {
            var verdict = "";
            var verdictColor = "var(--text-faint)";
            if (effPct !== null && sayDo.pct !== null) {
              if (effPct >= 80 && sayDo.pct >= 80) { verdict = "Exzellente Woche. Vollgas."; verdictColor = "var(--good)"; }
              else if (effPct >= 60 && sayDo.pct >= 60) { verdict = "Solide. Identifiziere eine Sache die naechste Woche besser wird."; verdictColor = "var(--accent)"; }
              else if (effPct < 40 || sayDo.pct < 40) { verdict = "Kritisch. Zu viel Drift. Weniger planen, mehr liefern."; verdictColor = "var(--danger)"; }
              else { verdict = "Mittelmaessig. Erhoehe dein Say-Do auf 80%."; verdictColor = "var(--warn)"; }
            } else {
              verdict = "Starte Tasks im Planner um Daten zu sehen.";
            }
            return (
              <div style={{ background:"var(--bg)", border:"1px solid var(--line-soft)", borderLeft:"3px solid " + verdictColor, padding:"14px 18px" }}>
                <div style={{ fontSize:9, letterSpacing:"0.18em", fontWeight:700, color:verdictColor, marginBottom:6 }}>{"VERDICT"}</div>
                <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.5 }}>{verdict}</div>
              </div>
            );
          })()}

          {/* OKR-Review-Trigger — erscheint einmalig wenn Say-Do >= 70% */}
          {okrPromptShown && (
            <div style={{ marginTop:16, background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.3)", borderLeft:"3px solid var(--accent)", padding:"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
              <div>
                <div style={{ fontSize:9, letterSpacing:"0.18em", fontWeight:700, color:"var(--accent)", marginBottom:4 }}>{"OKR-REVIEW EMPFOHLEN"}</div>
                <div style={{ fontSize:12, color:"var(--text)", lineHeight:1.5 }}>{"Say-Do Score >= 70%. Du lieferst. Jetzt ist der richtige Moment deine OKRs zu schaerfen."}</div>
              </div>
              <button onClick={function() {
                onClose();
                window.dispatchEvent(new CustomEvent("lifeos-nav", { detail: { view: "okr-wizard" } }));
              }} style={{
                flexShrink:0, background:"var(--accent)", border:"none", color:"#0a0a0c",
                fontSize:10, fontWeight:700, letterSpacing:"0.12em", padding:"9px 16px", cursor:"pointer", fontFamily:"inherit",
              }}>{"OKR WIZARD"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Insights({ taskTimes, pov, userPovs }) {
  // userPovs überschreiben hardcodierte POVs (gleiche ID = user gewinnt)
  const allPovsMeta = React.useMemo(function() {
    var ups = userPovs || [];
    var userIds = new Set(ups.map(function(p) { return p.id; }));
    var base = (window.POVS || []).filter(function(p) { return !userIds.has(p.id); });
    return base.concat(ups);
  }, [userPovs]);
  const times = taskTimes || {};

  // ── Week navigation ────────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = React.useState(0);
  const monday = React.useMemo(function() { return getMonday(weekOffset); }, [weekOffset]);

  const todayIso = localDateStr(new Date());

  const weeklyDays = React.useMemo(function() {
    var days = [];
    var DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    for (var i = 0; i < 7; i++) {
      var d = new Date(monday);
      d.setDate(monday.getDate() + i);
      var ds = localDateStr(d);
      var daily = {};
      try { daily = JSON.parse(LS.getItem("lifeos_daily_" + ds) || "{}"); } catch {}
      var totalSec = Object.values(daily).reduce(function(s, v) { return s + v; }, 0);
      days.push({
        label: DAY_LABELS[i],
        dateStr: ds,
        totalH: parseFloat((totalSec / 3600).toFixed(2)),
        totalSec: totalSec,
        isToday: ds === todayIso,
        isFuture: ds > todayIso,
        daily: daily,
      });
    }
    return days;
  }, [monday, todayIso]);

  const weeklyTotalH = weeklyDays.reduce(function(s, d) { return s + d.totalH; }, 0);
  const weeklyTrackedDays = weeklyDays.filter(function(d) { return d.totalH > 0 && !d.isFuture; }).length;
  const weeklyBestDay = weeklyDays.reduce(function(best, d) { return d.totalH > (best ? best.totalH : 0) ? d : best; }, null);
  const weeklyAvgH = weeklyTrackedDays > 0 ? weeklyTotalH / weeklyTrackedDays : 0;

  // Weekly KR breakdown: merge all task IDs from this week's daily logs, look up KR
  const weeklyKrTimes = React.useMemo(function() {
    var taskSecs = {};
    weeklyDays.forEach(function(day) {
      Object.entries(day.daily).forEach(function(entry) {
        var id = entry[0], sec = entry[1];
        taskSecs[id] = (taskSecs[id] || 0) + sec;
      });
    });
    // Find KR label for each task ID
    var krMap = {};
    var krOverrides = {};
    try { krOverrides = JSON.parse(LS.getItem("lifeos_task_kr_overrides") || "{}"); } catch {}
    for (var povId of Object.keys(POV_DATA)) {
      var data = POV_DATA[povId];
      var customTasks = [];
      try { customTasks = JSON.parse(LS.getItem("lifeos_tasks_" + povId) || "[]"); } catch {}
      var allPovTasks = [].concat(data.tasksToday, customTasks);
      allPovTasks.forEach(function(t) {
        if (!taskSecs[t.id]) return;
        var krId = t.kr || krOverrides[t.id];
        var kr = data.objective.keyResults.find(function(k) { return k.id === krId; });
        var label = kr ? kr.label : "Side Quest";
        if (!krMap[label]) krMap[label] = { label: label, sec: 0, isSideQuest: !kr };
        krMap[label].sec += taskSecs[t.id];
      });
    }
    // Also include uncategorised project tasks
    try {
      var projects = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
      projects.forEach(function(proj) {
        (proj.objectives || []).forEach(function(obj) {
          (obj.krs || []).forEach(function(kr) {
            (kr.tasks || []).forEach(function(t) {
              if (!taskSecs[t.id]) return;
              var label = kr.title || "KR";
              if (!krMap[label]) krMap[label] = { label: label, sec: 0, isSideQuest: false };
              krMap[label].sec += taskSecs[t.id];
            });
          });
        });
      });
    } catch {}
    return Object.values(krMap).filter(function(k) { return k.sec > 0; }).sort(function(a, b) { return b.sec - a.sec; });
  }, [weeklyDays]);

  var weeklyOkrSec = weeklyKrTimes.filter(function(k) { return !k.isSideQuest; }).reduce(function(s, k) { return s + k.sec; }, 0);
  var weeklyTotalSec = weeklyDays.reduce(function(s, d) { return s + d.totalSec; }, 0);
  var weeklyFocusPct = weeklyTotalSec > 0 ? Math.round((weeklyOkrSec / weeklyTotalSec) * 100) : null;

  // Week label
  var weekStart = monday;
  var weekEnd = new Date(monday); weekEnd.setDate(monday.getDate() + 6);
  var pad2 = function(n) { return String(n).padStart(2, "0"); };
  var weekLabel = pad2(weekStart.getDate()) + "." + pad2(weekStart.getMonth() + 1) + ". – " + pad2(weekEnd.getDate()) + "." + pad2(weekEnd.getMonth() + 1) + "." + weekEnd.getFullYear();

  // ── Alle Tasks aller POVs zusammensammeln ──────────────────────────────────
  const allTasks = React.useMemo(() => {
    const result = [];
    let krOverrides = {};
    try { krOverrides = JSON.parse(LS.getItem("lifeos_task_kr_overrides") || "{}"); } catch {}
    for (const povId of Object.keys(POV_DATA)) {
      const data = POV_DATA[povId];
      const povColor = allPovsMeta.find(p => p.id === povId)?.color || "var(--accent)";
      let custom = [];
      try { custom = JSON.parse(LS.getItem(`lifeos_tasks_${povId}`) || "[]"); } catch {}
      const doneSet = (() => {
        try { return new Set(JSON.parse(LS.getItem(`lifeos_done_${povId}`) || "[]")); } catch { return new Set(); }
      })();
      for (const t of [...data.tasksToday, ...custom]) {
        const effectiveKrId = t.kr || krOverrides[t.id];
        const kr = data.objective.keyResults.find(k => k.id === effectiveKrId);
        result.push({
          ...t,
          povId, povColor,
          krLabel: kr?.label || (effectiveKrId ? effectiveKrId : null),
          elapsed: times[t.id] ?? t.elapsed ?? 0,
          done: doneSet.has(t.id),
        });
      }
    }
    return result;
  }, [times]);

  // ── Zeit pro KR ────────────────────────────────────────────────────────────
  const krTimes = React.useMemo(() => {
    const map = {};
    for (const t of allTasks) {
      const key = t.krLabel || "⚠ Side Quest";
      if (!map[key]) map[key] = { label: key, sec: 0, isSideQuest: !t.krLabel, color: t.povColor };
      map[key].sec += t.elapsed;
    }
    return Object.values(map).sort((a, b) => b.sec - a.sec);
  }, [allTasks]);

  const maxKrSec = Math.max(...krTimes.map(k => k.sec), 1);
  const totalTrackedSec = allTasks.reduce((s, t) => s + t.elapsed, 0);

  // ── Promised vs. Delivered per POV ─────────────────────────────────────────
  const povStats = React.useMemo(() => {
    return allPovsMeta.map(p => {
      const tasks = allTasks.filter(t => t.povId === p.id);
      const done  = tasks.filter(t => t.done).length;
      const timeSec = tasks.reduce((s, t) => s + t.elapsed, 0);
      return {
        pov: p,
        total: tasks.length,
        done,
        open: tasks.length - done,
        pct: tasks.length > 0 ? done / tasks.length : 0,
        timeSec,
      };
    });
  }, [allTasks]);

  // ── Side Quest Drift ────────────────────────────────────────────────────────
  const sideQuestCount   = allTasks.filter(t => !t.krLabel).length;
  const sideQuestPct     = allTasks.length > 0 ? Math.round((sideQuestCount / allTasks.length) * 100) : 0;
  const sideQuestTimeSec = allTasks.filter(t => !t.krLabel).reduce((s, t) => s + t.elapsed, 0);

  // ── Efficiency Score ────────────────────────────────────────────────────────
  const deepWorkSec  = allTasks.filter(t =>  t.krLabel).reduce((s, t) => s + t.elapsed, 0);
  const busyWorkSec  = sideQuestTimeSec;
  const effScore     = totalTrackedSec > 0 ? Math.round((deepWorkSec / totalTrackedSec) * 100) : null;
  const effColor     = effScore === null ? "var(--text-faint)"
                     : effScore >= 80    ? "var(--good)"
                     : effScore >= 60    ? "var(--accent)"
                     : effScore >= 40    ? "var(--warn)"
                     :                    "var(--danger)";
  const effLabel     = effScore === null ? "—"
                     : effScore >= 80    ? "High Performance"
                     : effScore >= 60    ? "Solide"
                     : effScore >= 40    ? "Zu viel Drift"
                     :                    "Kritisch — mehr Deep Work";

  // ── Truth Loop — editierbar, localStorage-persistent ───────────────────────
  const [tlPlan, setTlPlan] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_tl_plan") || "null") || TRUTH_LOOP.plan; }
    catch { return TRUTH_LOOP.plan; }
  });
  const [tlReality, setTlReality] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_tl_reality") || "null") || TRUTH_LOOP.reality; }
    catch { return TRUTH_LOOP.reality; }
  });
  React.useEffect(() => { LS.setItem("lifeos_tl_plan", JSON.stringify(tlPlan)); }, [tlPlan]);
  React.useEffect(() => { LS.setItem("lifeos_tl_reality", JSON.stringify(tlReality)); }, [tlReality]);

  const updateTl = (which, i, raw) => {
    const v = Math.max(0, Math.min(24, parseFloat(raw) || 0));
    if (which === "plan")    setTlPlan(arr    => arr.map((x, j) => j === i ? v : x));
    else                     setTlReality(arr => arr.map((x, j) => j === i ? v : x));
  };

  // ── Ignorance Debt (Truth Loop) ─────────────────────────────────────────────
  const debt = (tlPlan.reduce((a, b) => a + b, 0) - tlReality.reduce((a, b) => a + b, 0));

  const secToH = (s) => (s / 3600).toFixed(1) + "h";

  const [showReport, setShowReport] = React.useState(false);
  const [reviewDismissed, setReviewDismissed] = React.useState(false);
  const [reviewCopied, setReviewCopied] = React.useState(false);

  // App-Review-Trigger: mark once when OKR focus >= 70% in current week
  React.useEffect(function() {
    if (weekOffset === 0 && weeklyFocusPct !== null && weeklyFocusPct >= 70) {
      if (!LS.getItem("lifeos_review_prompted")) {
        LS.setItem("lifeos_review_prompted", "1");
      }
    }
  }, [weeklyFocusPct, weekOffset]);

  var showReviewBanner = !reviewDismissed && weekOffset === 0
    && weeklyFocusPct !== null && weeklyFocusPct >= 70
    && !!LS.getItem("lifeos_review_prompted");

  return (
    <div data-tutorial="insights-content-area" style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
      {showReport && <WeeklyReportModal onClose={function() { setShowReport(false); }} />}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 20 }}>
        <div className="uppercase-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="bar-chart-2" size={11} color="var(--text-faint)" />
          {"Insights"}
        </div>
        <button onClick={function() { setShowReport(true); }} style={{
          padding:"8px 18px", background:"var(--accent-soft)", border:"1px solid var(--accent-line)",
          color:"var(--accent)", fontSize:10, fontWeight:700, letterSpacing:"0.16em", cursor:"pointer",
          display:"flex", alignItems:"center", gap:7,
        }}>
          <Icon name="file-text" size={12} color="var(--accent)" />
          {"WEEKLY REPORT"}
        </button>
      </div>

      {/* ── App-Review-Banner — einmalig wenn OKR-Fokus >= 70% ── */}
      {showReviewBanner && (
        <div style={{ background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.25)", padding:"12px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ flex:1 }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", color:"var(--accent)" }}>{"LIFE OS HILFT DIR"}</span>
            <span style={{ fontSize:12, color:"var(--text-dim)", marginLeft:12 }}>{"70%+ OKR-Fokus diese Woche. Teile Life OS mit jemandem dem es helfen wuerde."}</span>
          </div>
          <button onClick={function() {
            try { navigator.clipboard.writeText("https://life-os-wine-eight.vercel.app"); } catch {}
            setReviewCopied(true);
            setTimeout(function() { setReviewCopied(false); }, 2500);
          }} style={{
            flexShrink:0, background:"var(--accent)", border:"none", color:"#0a0a0c",
            fontSize:10, fontWeight:700, letterSpacing:"0.12em", padding:"7px 14px", cursor:"pointer", fontFamily:"inherit",
          }}>{reviewCopied ? "KOPIERT!" : "LINK KOPIEREN"}</button>
          <button onClick={function() { setReviewDismissed(true); }} style={{
            flexShrink:0, background:"none", border:"none", color:"var(--text-faint)", cursor:"pointer", padding:"4px 6px", fontSize:16, lineHeight:1,
          }}>{"x"}</button>
        </div>
      )}

      {/* ── Weekly Section ─────────────────────────────────────── */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", padding: "20px 24px", marginBottom: 20 }}>
        {/* Header + week nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div className="uppercase-label" style={{ marginBottom: 3 }}>{"Weekly Breakdown"}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>{weekLabel}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={function() { setWeekOffset(function(o) { return o - 1; }); }} style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text-faint)", padding: "5px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>{"< PREV"}</button>
            {weekOffset !== 0 && (
              <button onClick={function() { setWeekOffset(0); }} style={{ background: "none", border: "1px solid var(--line)", color: "var(--text-faint)", padding: "5px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em" }}>{"HEUTE"}</button>
            )}
            <button onClick={function() { setWeekOffset(function(o) { return o + 1; }); }} disabled={weekOffset >= 0} style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: weekOffset >= 0 ? "var(--text-faint)" : "var(--text-faint)", opacity: weekOffset >= 0 ? 0.35 : 1, padding: "5px 12px", fontSize: 11, cursor: weekOffset >= 0 ? "default" : "pointer", fontFamily: "inherit", fontWeight: 600 }}>{"NEXT >"}</button>
          </div>
        </div>

        {/* 4 mini stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "GESAMT", value: weeklyTotalH.toFixed(1) + "h", sub: "diese Woche" },
            { label: "SCHNITT", value: weeklyAvgH > 0 ? weeklyAvgH.toFixed(1) + "h" : "--", sub: "pro aktivem Tag" },
            { label: "BESTER TAG", value: weeklyBestDay && weeklyBestDay.totalH > 0 ? weeklyBestDay.label : "--", sub: weeklyBestDay && weeklyBestDay.totalH > 0 ? weeklyBestDay.totalH.toFixed(1) + "h" : "noch kein Tag" },
            { label: "OKR FOKUS", value: weeklyFocusPct !== null ? weeklyFocusPct + "%" : "--", sub: weeklyFocusPct !== null ? (weeklyFocusPct >= 70 ? "stark" : weeklyFocusPct >= 50 ? "ok" : "zu viel drift") : "keine Daten" },
          ].map(function(s) {
            return (
              <div key={s.label} style={{ background: "var(--bg)", border: "1px solid var(--line-soft)", padding: "12px 14px" }}>
                <div style={{ fontSize: 8.5, letterSpacing: "0.16em", color: "var(--text-faint)", fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)", lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{s.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Bar chart */}
        <WeeklyBarChart days={weeklyDays} />

        {/* KR breakdown for this week */}
        {weeklyKrTimes.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line-soft)" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.16em", fontWeight: 600, color: "var(--text-faint)", marginBottom: 12 }}>{"ZEIT PRO KEY RESULT — DIESE WOCHE"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {weeklyKrTimes.slice(0, 6).map(function(kr) {
                var maxSec = weeklyKrTimes[0].sec;
                var pct = Math.max((kr.sec / maxSec) * 100, 1);
                var ofWeek = weeklyTotalSec > 0 ? Math.round((kr.sec / weeklyTotalSec) * 100) : 0;
                var col = kr.isSideQuest ? "var(--warn)" : "var(--accent)";
                return (
                  <div key={kr.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: kr.isSideQuest ? "var(--warn)" : "var(--text)", maxWidth: "72%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kr.label}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--text-faint)" }}>{(kr.sec / 3600).toFixed(1) + "h · " + ofWeek + "%"}</span>
                    </div>
                    <div style={{ height: 6, background: "var(--line-soft)", position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: pct + "%", background: col, transition: "width .4s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Hero Stats ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
        <StatCard label="TOTAL TRACKED" value={secToH(totalTrackedSec)} color="var(--accent)" sub="über alle Tasks" />
        <StatCard label="IGNORANCE DEBT" value={`−${debt.toFixed(1)}h`} color="var(--accent)" sub="diese Woche" />
        <StatCard label="SIDE QUEST DRIFT" value={`${sideQuestPct}%`} color="var(--accent)" sub={`${sideQuestCount} Tasks ohne KR`} />
        <StatCard label="TASKS ERLEDIGT" value={`${allTasks.filter(t => t.done).length} / ${allTasks.length}`} color="var(--accent)" sub="gesamt" />
      </div>

      {/* ── Efficiency Score (Gauge) ───────────────────────────── */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <GaugeRing pct={effScore !== null ? effScore / 100 : null} color={effColor} size={100} />
          <div style={{ flex: 1 }}>
            <div className="uppercase-label" style={{ marginBottom: 4 }}>Efficiency Score</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: effColor, marginBottom: 4 }}>{effLabel}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 14 }}>Deep Work % vs. Busy Work — aus echten Timer-Daten</div>
            {totalTrackedSec > 0 ? (
              <>
                {/* Stacked bar */}
                <div style={{ height: 6, display: "flex", overflow: "hidden", background: "var(--line-soft)", marginBottom: 8 }}>
                  {deepWorkSec > 0 && <div style={{ width: `${(deepWorkSec / totalTrackedSec) * 100}%`, background: effColor, transition: "width .5s ease" }} />}
                  {busyWorkSec > 0 && <div style={{ flex: 1, background: "var(--warn)" }} />}
                </div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--text-dim)" }}>
                    <span style={{ width: 8, height: 8, background: effColor, display: "inline-block" }} />
                    Deep Work — {secToH(deepWorkSec)}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--text-dim)" }}>
                    <span style={{ width: 8, height: 8, background: "var(--warn)", display: "inline-block" }} />
                    Busy Work — {secToH(busyWorkSec)}
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>Gesamt {secToH(totalTrackedSec)}</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Noch keine Timer-Daten. Starte Tasks im Dashboard.</div>
            )}
          </div>
          {/* POV gauge rings */}
          {totalTrackedSec > 0 && (
            <div style={{ display: "flex", gap: 16 }}>
              {povStats.filter(s => s.total > 0).map(({ pov: p, pct }) => (
                <GaugeRing key={p.id} pct={pct} color={p.color} label={p.label.toUpperCase()} size={72} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column grid ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* ZEIT PRO KR */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", padding: "20px 24px" }}>
          <div className="uppercase-label" style={{ marginBottom: 4 }}>Zeit pro Key Result</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 18 }}>
            Wo fließt tatsächlich Zeit rein?
          </div>

          {krTimes.length === 0 || totalTrackedSec === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 12 }}>
              Noch keine Timer-Daten. Starte Tasks im Dashboard.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {krTimes.map((kr) => {
                const pct = Math.max((kr.sec / maxKrSec) * 100, 1);
                const ofTotal = totalTrackedSec > 0 ? Math.round((kr.sec / totalTrackedSec) * 100) : 0;
                return (
                  <div key={kr.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600,
                        color: kr.isSideQuest ? "var(--warn)" : "var(--text)",
                        maxWidth: "72%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{kr.label}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                        {secToH(kr.sec)} · {ofTotal}%
                      </span>
                    </div>
                    <div style={{ height: 8, background: "var(--line-soft)", position: "relative" }}>
                      <div style={{
                        position: "absolute", left: 0, top: 0, height: "100%",
                        width: `${pct}%`,
                        background: kr.isSideQuest ? "var(--warn)" : "#60a5fa",
                        transition: "width .4s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PROMISED VS DELIVERED */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", padding: "20px 24px" }}>
          <div className="uppercase-label" style={{ marginBottom: 4 }}>Promised vs. Delivered</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 18 }}>
            Geplante Tasks vs. tatsächlich abgehakt
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {povStats.map(({ pov: p, total, done, pct, timeSec }) => {
              if (total === 0) return null;
              return (
                <div key={p.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: p.color }}>{p.label.toUpperCase()}</span>
                      <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>{secToH(timeSec)}</span>
                    </div>
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: pct >= 0.8 ? "var(--good)" : pct >= 0.4 ? "var(--warn)" : "var(--danger)" }}>
                      {done}/{total} · {Math.round(pct * 100)}%
                    </span>
                  </div>
                  {/* stacked bar */}
                  <div style={{ height: 10, background: "var(--line-soft)", display: "flex", overflow: "hidden" }}>
                    <div style={{ width: `${pct * 100}%`, background: "#60a5fa", transition: "width .4s ease" }} />
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 5 }}>
                    <span style={{ fontSize: 9.5, color: "var(--good)", letterSpacing: "0.08em" }}>✓ {done} erledigt</span>
                    <span style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.08em" }}>◯ {total - done} offen</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* gesamt */}
          {(() => {
            const total = allTasks.length;
            const done  = allTasks.filter(t => t.done).length;
            const pct   = total > 0 ? done / total : 0;
            return (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10.5, letterSpacing: "0.12em", fontWeight: 700, color: "var(--text-dim)" }}>GESAMT</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: pct >= 0.7 ? "var(--good)" : "var(--danger)" }}>
                    {done}/{total} · {Math.round(pct * 100)}%
                  </span>
                </div>
                <div style={{ height: 6, background: "var(--line-soft)" }}>
                  <div style={{ height: "100%", width: `${pct * 100}%`, background: pct >= 0.7 ? "var(--good)" : "var(--danger)", transition: "width .4s ease" }} />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Side Quest Analyse ───────────────────────────────────── */}
      {sideQuestTimeSec > 0 && (
        <div style={{ padding: "16px 20px", background: "var(--warn-soft)", border: "1px solid rgba(212,162,60,.4)", marginBottom: 20 }}>
          <div className="uppercase-label" style={{ color: "var(--warn)", marginBottom: 6 }}>⚠ Side Quest Drift</div>
          <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.5 }}>
            Du hast <b>{secToH(sideQuestTimeSec)}</b> in Tasks ohne Key-Result-Bezug investiert
            ({sideQuestPct}% deiner erfassten Zeit).{" "}
            {sideQuestPct > 20
              ? "Das ist signifikanter Drift — Side Quests fressen dein Kapital."
              : "Hält sich in Grenzen, aber beobachten."}
          </div>
        </div>
      )}

      {/* ── Habit Tracker ─────────────────────────────────────── */}
      <BehaviorTracker />

      {/* ── Wochen-Delta (Truth Loop — Time Series Chart) ──────── */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div className="uppercase-label" style={{ marginBottom: 4 }}>Wochen-Delta — Truth Loop</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Plan vs. Realität pro Tag dieser Woche</div>
          </div>
          {/* Chart legend */}
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
              <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="var(--text-dim)" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.6} /></svg>
              <span style={{ color: "var(--text-faint)", letterSpacing: "0.1em" }}>PLAN</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
              <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="var(--accent)" strokeWidth={2} /></svg>
              <span style={{ color: "var(--text-faint)", letterSpacing: "0.1em" }}>REALITÄT</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
              <svg width={8} height={8}><circle cx={4} cy={4} r={3.5} fill="var(--good)" /></svg>
              <span style={{ color: "var(--text-faint)", letterSpacing: "0.1em" }}>ÜBER PLAN</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
              <svg width={8} height={8}><circle cx={4} cy={4} r={3.5} fill="var(--danger)" /></svg>
              <span style={{ color: "var(--text-faint)", letterSpacing: "0.1em" }}>UNTER PLAN</span>
            </span>
          </div>
        </div>

        <TruthLoopChart days={TRUTH_LOOP.days} plan={tlPlan} reality={tlReality} />

        {/* Editable input grid */}
        <div style={{ marginTop: 16, borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
          {[
            { label: "PLAN", arr: tlPlan,    which: "plan",    color: "var(--text-dim)" },
            { label: "REAL", arr: tlReality, which: "reality", color: "var(--accent)" },
          ].map(({ label, arr, which, color }) => (
            <div key={which} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span className="mono" style={{ width: 36, fontSize: 8.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.14em", flexShrink: 0 }}>
                {label}
              </span>
              {TRUTH_LOOP.days.map((day, i) => (
                <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <input
                    type="number" min="0" max="24" step="0.5"
                    value={arr[i]}
                    onChange={e => updateTl(which, i, e.target.value)}
                    style={{
                      width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)",
                      color, padding: "5px 0", fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
                      fontWeight: 700, textAlign: "center", outline: "none", boxSizing: "border-box",
                      appearance: "textfield", MozAppearance: "textfield",
                    }}
                  />
                  {which === "plan" && (
                    <span style={{ fontSize: 8, color: "var(--text-faint)", letterSpacing: "0.1em" }}>{day}</span>
                  )}
                </div>
              ))}
              <div style={{ width: 64, textAlign: "right", paddingLeft: 8, borderLeft: "1px solid var(--line-soft)", flexShrink: 0 }}>
                <div className="mono" style={{ fontSize: 11, fontWeight: 700, color }}>
                  {arr.reduce((s, v) => s + v, 0).toFixed(1)}h
                </div>
                <div style={{ fontSize: 8, color: "var(--text-faint)", letterSpacing: "0.1em" }}>TOTAL</div>
              </div>
            </div>
          ))}

          {/* Delta summary */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
            <span className="mono" style={{ width: 36, fontSize: 8.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.14em", flexShrink: 0 }}>
              DELTA
            </span>
            {TRUTH_LOOP.days.map((day, i) => {
              const d = tlReality[i] - tlPlan[i];
              const c = d >= 0 ? "var(--good)" : "var(--danger)";
              return (
                <div key={day} style={{ flex: 1, textAlign: "center" }}>
                  <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: c }}>{fmtH(d)}</span>
                </div>
              );
            })}
            <div style={{ width: 64, textAlign: "right", paddingLeft: 8, borderLeft: "1px solid var(--line-soft)", flexShrink: 0 }}>
              <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: debt <= 0 ? "var(--good)" : "var(--danger)" }}>
                {fmtH(-debt)}
              </div>
              <div style={{ fontSize: 8, color: "var(--text-faint)", letterSpacing: "0.1em" }}>GESAMT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BehaviorTracker() {
  const [habits, setHabits] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_habits") || "[]"); } catch { return []; }
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
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newBucket, setNewBucket] = React.useState(() => LS.getItem("lifeos_pov") || "personal");

  // Derive habit color from bucket (POV), fall back to stored color for old habits
  const getHabitColor = (h) => h.bucket ? `var(--${h.bucket})` : (h.color || "var(--accent)");
  const getHabitSoft  = (h) => h.bucket ? `var(--${h.bucket}-soft)` : "var(--accent-soft)";
  const getHabitLine  = (h) => h.bucket ? `var(--${h.bucket}-line)` : "var(--accent-line)";

  const todayISO = new Date().toISOString().slice(0, 10);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const DE_DAYS_S = ["So","Mo","Di","Mi","Do","Fr","Sa"];

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

  const toggleDay = (habitId, iso) => {
    saveHabits(habits.map(h => {
      if (h.id !== habitId) return h;
      const log = { ...h.log };
      log[iso] ? delete log[iso] : (log[iso] = true);
      if (iso === todayISO && log[iso]) window.TUTORIAL?.onAction?.('habit-checked-' + habitId);
      return { ...h, log };
    }));
  };

  const addHabit = () => {
    if (!newName.trim()) return;
    saveHabits([...habits, {
      id: `h_${Date.now()}`, name: newName.trim(),
      bucket: newBucket, log: {},
    }]);
    setNewName(""); setAdding(false);
    setNewBucket(LS.getItem("lifeos_pov") || "personal");
  };

  return (
    <div data-tutorial="behaviors-section" style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: habits.length > 0 ? 16 : 0 }}>
        <div>
          <div className="uppercase-label" style={{ marginBottom: 3 }}>Habit Tracker</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Täglich einchecken · Streaks aufbauen · Drift sichtbar machen</div>
        </div>
        <button onClick={() => setAdding(v => !v)} style={{
          background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent)",
          padding: "7px 16px", fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700, cursor: "pointer",
        }}>+ GEWOHNHEIT</button>
      </div>

      {habits.length === 0 && !adding && (
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 12, fontStyle: "italic" }}>
          Noch keine Gewohnheiten — füge eine hinzu.
        </div>
      )}

      {habits.length > 0 && (
        <>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr repeat(7, 30px) 56px 28px", gap: 6, alignItems: "center", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
            <span style={{ fontSize: 8.5, letterSpacing: "0.14em", color: "var(--text-faint)" }}>GEWOHNHEIT</span>
            {last7.map(iso => {
              const d = new Date(iso + "T12:00:00");
              const isToday = iso === todayISO;
              return (
                <span key={iso} style={{ textAlign: "center", fontSize: 8.5, color: isToday ? "var(--accent)" : "var(--text-faint)", fontWeight: isToday ? 700 : 400, letterSpacing: "0.06em" }}>
                  {DE_DAYS_S[d.getDay()]}
                </span>
              );
            })}
            <span style={{ fontSize: 8.5, color: "var(--text-faint)", textAlign: "center", letterSpacing: "0.1em" }}>STREAK</span>
            <span />
          </div>

          {/* Habit rows */}
          {habits.map(h => {
            const streak = getStreak(h.log);
            const streakColor = streak >= 14 ? "var(--good)" : streak >= 7 ? "var(--accent)" : streak >= 3 ? "var(--warn)" : "var(--text-faint)";
            return (
              <div key={h.id} style={{ display: "grid", gridTemplateColumns: "1fr repeat(7, 30px) 56px 28px", gap: 6, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line-soft)" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: getHabitColor(h) }}>{h.name}</span>
                {last7.map(iso => {
                  const done = !!h.log[iso];
                  const isToday = iso === todayISO;
                  return (
                    <button key={iso} onClick={() => toggleDay(h.id, iso)}
                      data-tutorial={h.id === "tutorial_habit_1" && isToday ? "tutorial-habit-checkbox" : undefined}
                      style={{
                      width: 24, height: 24, borderRadius: isToday ? 4 : "50%",
                      border: `2px solid ${done ? getHabitColor(h) : isToday ? "var(--line)" : "rgba(255,255,255,0.08)"}`,
                      background: done ? getHabitColor(h) : "transparent",
                      cursor: "pointer", margin: "0 auto", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#0a0a0c",
                      opacity: !done && !isToday ? 0.4 : 1,
                      transition: "all .15s", padding: 0, flexShrink: 0,
                    }}>{done ? "✓" : ""}</button>
                  );
                })}
                <div style={{ textAlign: "center" }}>
                  <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: streakColor }}>
                    {streak > 0 ? streak : "—"}
                  </span>
                  {streak >= 3 && <span style={{ fontSize: 11, marginLeft: 2 }}>🔥</span>}
                </div>
                <button onClick={() => saveHabits(habits.filter(x => x.id !== h.id))}
                  style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 15, padding: 0, opacity: 0.45, lineHeight: 1 }}>×</button>
              </div>
            );
          })}
        </>
      )}

      {adding && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
          {/* POV bucket selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
            <span style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--text-faint)", fontWeight: 700, marginRight: 4 }}>POV</span>
            {allPovsMeta.map(p => (
              <button key={p.id} onClick={() => setNewBucket(p.id)} style={{
                padding: "4px 12px", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em",
                background: newBucket === p.id ? p.color : "transparent",
                border: `1px solid ${newBucket === p.id ? p.color : "var(--line)"}`,
                color: newBucket === p.id ? "#0a0a0c" : "var(--text-faint)",
                cursor: "pointer", transition: "all .15s",
              }}>{p.label.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addHabit(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
              placeholder="z.B. 1h Lernen · Kein Zucker · 10.000 Schritte · Kein Social Media"
              style={{ flex: 1, background: "var(--panel-2)", border: `1px solid var(--${newBucket}-line)`, color: "var(--text)", padding: "9px 14px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
            <button onClick={addHabit} style={{ padding: "9px 18px", background: `var(--${newBucket})`, color: "#0a0a0c", border: "none", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer" }}>HINZUFÜGEN ✓</button>
            <button onClick={() => { setAdding(false); setNewName(""); }} style={{ padding: "9px 14px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 11, cursor: "pointer" }}>ABBRECHEN</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", padding: "16px 20px" }}>
      <div className="uppercase-label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

window.Insights = Insights;
