// Insights — echte Daten aus localStorage: Zeit pro KR, Promised vs. Delivered, Debt.

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

function Insights({ taskTimes, pov }) {
  const times = taskTimes || {};

  // ── Alle Tasks aller POVs zusammensammeln ──────────────────────────────────
  const allTasks = React.useMemo(() => {
    const result = [];
    let krOverrides = {};
    try { krOverrides = JSON.parse(LS.getItem("lifeos_task_kr_overrides") || "{}"); } catch {}
    for (const povId of Object.keys(POV_DATA)) {
      const data = POV_DATA[povId];
      const povColor = POVS.find(p => p.id === povId)?.color || "var(--accent)";
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
    return POVS.map(p => {
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

  return (
    <div data-tutorial="insights-content-area" style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
      <div className="uppercase-label" style={{ marginBottom: 20 }}>Insights</div>

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

      {/* ── Behavior Change Tracker ─────────────────────────────── */}
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
  };
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  const COLORS = ["var(--accent)", "var(--good)", "var(--warn)", "#06b6d4", "#ec4899", "var(--danger)"];
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
      color: COLORS[habits.length % COLORS.length], log: {},
    }]);
    setNewName(""); setAdding(false);
  };

  return (
    <div data-tutorial="behaviors-section" style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: habits.length > 0 ? 16 : 0 }}>
        <div>
          <div className="uppercase-label" style={{ marginBottom: 3 }}>Behavior Change Tracker</div>
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
                <span style={{ fontSize: 13, fontWeight: 600, color: h.color }}>{h.name}</span>
                {last7.map(iso => {
                  const done = !!h.log[iso];
                  const isToday = iso === todayISO;
                  return (
                    <button key={iso} onClick={() => toggleDay(h.id, iso)}
                      data-tutorial={h.id === "tutorial_habit_1" && isToday ? "tutorial-habit-checkbox" : undefined}
                      style={{
                      width: 24, height: 24, borderRadius: isToday ? 4 : "50%",
                      border: `2px solid ${done ? h.color : isToday ? "var(--line)" : "rgba(255,255,255,0.08)"}`,
                      background: done ? h.color : "transparent",
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
        <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line-soft)", alignItems: "center" }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addHabit(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
            placeholder="z.B. 1h Lernen · Kein Zucker · 10.000 Schritte · Kein Social Media…"
            style={{ flex: 1, background: "var(--panel-2)", border: "1px solid var(--accent-line)", color: "var(--text)", padding: "9px 14px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
          <button onClick={addHabit} style={{ padding: "9px 18px", background: "var(--accent)", color: "#0a0a0c", border: "none", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer" }}>HINZUFÜGEN ✓</button>
          <button onClick={() => { setAdding(false); setNewName(""); }} style={{ padding: "9px 14px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", fontSize: 11, cursor: "pointer" }}>ABBRECHEN</button>
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
