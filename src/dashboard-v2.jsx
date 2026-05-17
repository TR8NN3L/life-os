// Dashboard V2 — Hero Bar + 2-column layout (60% tasks | 40% rings+habits)

// ── Activity Rings (Apple Watch Style) ─────────────────────────────────────
function ActivityRings({ pov, taskTimes }) {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = (() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0, 10);
  })();

  // Reload from localStorage whenever taskTimes changes (= every timer tick)
  const [dailyTimes, setDailyTimes] = React.useState(() => {
    try { return JSON.parse(LS.getItem(`lifeos_daily_${today}`) || "{}"); } catch { return {}; }
  });
  React.useEffect(() => {
    try { setDailyTimes(JSON.parse(LS.getItem(`lifeos_daily_${today}`) || "{}")); } catch {}
  }, [taskTimes]);
  // Refresh when a project is created/archived in Mission Control
  React.useEffect(() => {
    const handler = () => {
      try { setDailyTimes(JSON.parse(LS.getItem(`lifeos_daily_${today}`) || "{}")); } catch {}
    };
    window.addEventListener("lifeos-projects-updated", handler);
    return () => window.removeEventListener("lifeos-projects-updated", handler);
  }, [today]);

  const ringProjects = React.useMemo(() => {
    const povColors = { personal: "#8b5cf6", founder: "#2f8bff", student: "#e11d48", athlete: "#10b981" };
    const palette = ["#10b981", "#2f8bff", "#8b5cf6", "#f97316", "#ec4899", "#14b8a6"];
    let userPovs = [];
    try { userPovs = JSON.parse(LS.getItem("lifeos_user_povs") || "[]"); } catch {}
    const allPovColors = { ...povColors, ...Object.fromEntries(userPovs.map(p => [p.id, p.color])) };
    let archivedIds = new Set();
    try { archivedIds = new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]")); } catch {}
    let projs = [];
    try { projs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]"); } catch {}
    return projs
      .filter(p => !archivedIds.has(p.id) && (p.hoursPerWeek || 0) > 0)
      .slice(0, 4)
      .map((proj, i) => {
        const projTaskIds = new Set(
          (proj.objectives || []).flatMap(o => (o.krs || []).flatMap(kr => (kr.tasks || []).map(t => t.id)))
        );
        const todaySecs = [...projTaskIds].reduce((s, id) => s + (dailyTimes[id] || 0), 0);
        const dailyTargetSecs = ((proj.hoursPerWeek || 8) / 5) * 3600;
        const progress = Math.min(1.05, todaySecs / dailyTargetSecs);
        const color = allPovColors[proj.pov] || palette[i % palette.length];
        return { id: proj.id, title: proj.title, todaySecs, dailyTargetSecs, progress, color, hoursPerWeek: proj.hoursPerWeek || 8 };
      });
  }, [dailyTimes]);

  if (ringProjects.length === 0) return null;

  const SVG_SIZE = 152;
  const cx = SVG_SIZE / 2, cy = SVG_SIZE / 2;
  const RING_W = 13, GAP = 4;
  const baseRadius = (SVG_SIZE / 2) - RING_W / 2 - 3;

  const todayLabel = new Date().toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <div style={{ padding: "14px 28px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", gap: 24, background: "rgba(255,255,255,0.01)" }}>
      {/* SVG concentric rings — Apple Watch style */}
      <div style={{ flexShrink: 0, position: "relative" }}>
        <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
          <defs>
            <filter id="aw-tip-shadow-lg" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="rgba(0,0,0,0.9)" />
            </filter>
            <filter id="aw-glow-lg" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {ringProjects.map((proj, i) => {
            const r = baseRadius - i * (RING_W + GAP);
            if (r < RING_W) return null;
            const circ = 2 * Math.PI * r;
            const clampProg = Math.min(1, proj.progress);
            const offset = circ * (1 - clampProg);
            const tipAngle = -Math.PI / 2 + clampProg * 2 * Math.PI;
            const tipX = cx + r * Math.cos(tipAngle);
            const tipY = cy + r * Math.sin(tipAngle);
            const capR = RING_W / 2;
            return (
              <g key={proj.id}>
                {/* Track: color-tinted dark background */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={proj.color} strokeWidth={RING_W} opacity={0.12} />
                {/* Progress arc (butt caps — manual rounded caps below) */}
                {clampProg > 0.005 && (
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke={proj.color}
                    strokeWidth={RING_W} strokeLinecap="butt"
                    strokeDasharray={circ} strokeDashoffset={offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
                )}
                {/* Start cap at 12 o'clock */}
                {clampProg > 0.005 && (
                  <circle cx={cx} cy={cy - r} r={capR} fill={proj.color} />
                )}
                {/* Tip cap with shadow (Apple Watch depth illusion) */}
                {clampProg > 0.02 && clampProg < 0.999 && (
                  <circle cx={tipX} cy={tipY} r={capR} fill={proj.color} filter="url(#aw-tip-shadow-lg)" />
                )}
                {/* Complete ring: glow overlay */}
                {proj.progress >= 1 && (
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke={proj.color}
                    strokeWidth={RING_W * 0.5} opacity={0.18} filter="url(#aw-glow-lg)" />
                )}
              </g>
            );
          })}
          <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--text)" fontSize={15} fontWeight={700} fontFamily="'JetBrains Mono',monospace">
            {Math.round(Math.min(1, ringProjects[0]?.progress) * 100)}%
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-faint)" fontSize={8.5} fontFamily="'Inter',sans-serif" letterSpacing="1.5">
            HEUTE
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.18em", fontWeight: 700, color: "var(--text-faint)" }}>
            ACTIVITY RINGS
          </div>
          <div style={{ fontSize: 9, color: "var(--text-faint)", letterSpacing: "0.06em" }}>{todayLabel}</div>
        </div>
        {ringProjects.map(proj => {
          const hrs = (proj.todaySecs / 3600).toFixed(1);
          const target = (proj.dailyTargetSecs / 3600).toFixed(1);
          const pct = Math.round(Math.min(1, proj.progress) * 100);
          const done = proj.progress >= 1;
          return (
            <div key={proj.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: proj.color, flexShrink: 0, boxShadow: done ? `0 0 6px ${proj.color}` : "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: done ? proj.color : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                    {proj.title}
                  </span>
                  <span className="mono" style={{ fontSize: 9, color: done ? proj.color : "var(--text-faint)", fontWeight: done ? 700 : 400, flexShrink: 0 }}>
                    {done ? "✓ DONE" : `${hrs}h / ${target}h`}
                  </span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: proj.color, width: `${pct}%`, borderRadius: 2, transition: "width 0.5s ease", boxShadow: done ? `0 0 8px ${proj.color}` : "none" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

// ── Hero Bar ──────────────────────────────────────────────────────────────────
// Compact top bar: SAY-DO% | STREAK | DEBT | FOCUS button
function HeroBar({ taskTimes, pov, setRoute }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { setTick(t => t + 1); }, [taskTimes]);

  const today = new Date().toISOString().slice(0, 10);
  const todayDowIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

  // Week start (Monday)
  const weekStart = (() => {
    const d = new Date();
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() + diff); mon.setHours(0, 0, 0, 0);
    return mon;
  })();

  // Daily reality per weekday
  const realityPerDay = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      try {
        const log = JSON.parse(LS.getItem("lifeos_daily_" + key) || "{}");
        return Object.values(log).reduce((s, v) => s + v, 0) / 3600;
      } catch { return 0; }
    });
  }, [tick]);

  // Plan per day (projects × day weights)
  const { planPerDay, tableProjs, projDayWeights } = React.useMemo(() => {
    const DEFAULT_W = [0.2, 0.2, 0.2, 0.2, 0.2, 0, 0];
    let archivedIds = new Set(); try { archivedIds = new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]")); } catch {}
    let projs = []; try { projs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]"); } catch {}
    const active = projs.filter(p => !archivedIds.has(p.id) && (p.hoursPerWeek || 0) > 0);
    let pdw = {}; try { pdw = JSON.parse(LS.getItem("lifeos_proj_day_weights") || "{}"); } catch {}
    const plan = Array.from({ length: 7 }, (_, di) =>
      active.reduce((s, p) => s + (p.hoursPerWeek || 0) * ((pdw[p.id] || DEFAULT_W)[di] || 0), 0)
    );
    return { planPerDay: plan, tableProjs: active, projDayWeights: pdw };
  }, [tick]);

  // Say-Do Score
  const weekActual = realityPerDay.slice(0, todayDowIdx + 1).reduce((s, v) => s + v, 0);
  const weekPlan   = planPerDay.slice(0, todayDowIdx + 1).reduce((s, v) => s + v, 0);
  const sayDoScore = weekPlan > 0.1 ? Math.min(199, Math.round((weekActual / weekPlan) * 100)) : null;
  const sayDoColor = sayDoScore === null ? "var(--text-faint)"
    : sayDoScore >= 70 ? "#10b981" : sayDoScore >= 40 ? "#f59e0b" : "#d6324a";
  const sayDoLabel = sayDoScore === null ? "–"
    : sayDoScore >= 70 ? "ON TRACK" : sayDoScore >= 40 ? "BEHIND" : "CRITICAL";

  // Debt today
  const debtSoFar = planPerDay.slice(0, todayDowIdx + 1).reduce((s, v) => s + v, 0)
                  - realityPerDay.slice(0, todayDowIdx + 1).reduce((s, v) => s + v, 0);
  const debtOk = debtSoFar <= 0.05;

  // Streak
  const STREAK_THRESHOLD = 0.7;
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d2 = new Date(); d2.setDate(d2.getDate() - i);
    const key = d2.toISOString().slice(0, 10);
    const dowIdx = (d2.getDay() + 6) % 7;
    const DEFAULT_W = [0.2, 0.2, 0.2, 0.2, 0.2, 0, 0];
    const plannedSecs = tableProjs.reduce((s, p) => {
      const w = projDayWeights[p.id] || DEFAULT_W;
      return s + (p.hoursPerWeek || 0) * (w[dowIdx] || 0);
    }, 0) * 3600;
    if (plannedSecs < 60) continue;
    let actualSecs = 0;
    try { const log = JSON.parse(LS.getItem("lifeos_daily_" + key) || "{}"); actualSecs = Object.values(log).reduce((s, v) => s + v, 0); } catch {}
    if (actualSecs >= STREAK_THRESHOLD * plannedSecs) { streak++; }
    else if (i === 0) { /* today not done yet */ }
    else break;
  }

  const statBox = (label, value, color, sub) => (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "20px 48px", borderRight: "1px solid var(--line)",
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.2em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8, whiteSpace: "nowrap" }}>{label}</div>
      <div className="mono" style={{ fontSize: 40, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, letterSpacing: "0.16em", color, marginTop: 6, fontWeight: 700 }}>{sub}</div>}
    </div>
  );

  // Today's date label
  const todayLabel = (() => {
    const n = new Date();
    const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    return `${DAYS[n.getDay()]}, ${n.getDate()}. ${MONTHS[n.getMonth()]}`;
  })();

  return (
    <div style={{
      display: "flex", alignItems: "stretch", gap: 0,
      background: "var(--panel)", borderBottom: "2px solid var(--accent)",
      flexShrink: 0, minHeight: 120,
    }}>
      {/* Brand block */}
      <div style={{
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "20px 40px 20px 32px", borderRight: "1px solid var(--line)",
        minWidth: 180,
      }}>
        <div style={{ fontSize: 10, letterSpacing: "0.22em", fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>FLOW OS V2</div>
        <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{todayLabel}</div>
      </div>
      {/* SAY-DO */}
      {statBox("SAY-DO SCORE", sayDoScore !== null ? `${sayDoScore}%` : "–", sayDoColor, sayDoLabel)}
      {/* STREAK */}
      {statBox("STREAK", `${streak}d`, streak >= 7 ? "#f59e0b" : streak >= 3 ? "#10b981" : "var(--text-faint)", streak >= 7 ? "FIRE" : streak >= 1 ? "GOING" : "START")}
      {/* Spacer + FOCUS button */}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", padding: "0 36px" }}>
        <button onClick={() => setRoute("focus")} style={{
          padding: "16px 36px", background: "var(--accent)", color: "#0a0a0c",
          border: "none", fontWeight: 800, fontSize: 13, letterSpacing: "0.2em", cursor: "pointer",
        }}>FOCUS {"→"}</button>
      </div>
    </div>
  );
}

// ── V2 War Room Panel — cleaner: compact ring, inline debt, fixed chart ──────
function V2StatsPanel({ taskTimes, pov }) {
  const today = new Date().toISOString().slice(0, 10);
  const DAYS_LABEL = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];
  const todayDowIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

  const weekStart = React.useMemo(() => {
    const d = new Date();
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() + diff); mon.setHours(0, 0, 0, 0);
    return mon;
  }, [today]);

  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { setTick(t => t + 1); }, [taskTimes]);
  React.useEffect(() => {
    const h = () => setTick(t => t + 1);
    window.addEventListener("lifeos-projects-updated", h);
    return () => window.removeEventListener("lifeos-projects-updated", h);
  }, []);

  const realityPerDay = React.useMemo(() => DAYS_LABEL.map((_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    try { const l = JSON.parse(LS.getItem("lifeos_daily_" + d.toISOString().slice(0, 10)) || "{}"); return Object.values(l).reduce((s, v) => s + v, 0) / 3600; }
    catch { return 0; }
  }), [tick, weekStart]);

  const [projData, palette, povColors] = React.useMemo(() => {
    const pc = { personal: "#8b5cf6", founder: "#2f8bff", student: "#e11d48", athlete: "#10b981" };
    const pal = ["#10b981", "#2f8bff", "#8b5cf6", "#f97316", "#ec4899", "#f59e0b", "#6366f1", "#14b8a6"];
    let up = []; try { up = JSON.parse(LS.getItem("lifeos_user_povs") || "[]"); } catch {}
    const apc = { ...pc, ...Object.fromEntries(up.map(p => [p.id, p.color])) };
    let arch = new Set(); try { arch = new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]")); } catch {}
    let ps = []; try { ps = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]"); } catch {}
    return [ps.filter(p => !arch.has(p.id)), pal, apc];
  }, [tick]);

  const DEFAULT_W = [0.2, 0.2, 0.2, 0.2, 0.2, 0, 0];
  const [pdw] = React.useState(() => { try { return JSON.parse(LS.getItem("lifeos_proj_day_weights") || "{}"); } catch { return {}; } });

  const buildStats = (proj, i) => {
    const tids = new Set((proj.objectives || []).flatMap(o => (o.krs || []).flatMap(k => (k.tasks || []).map(t => t.id))));
    tids.add("free_" + proj.id);
    const perDay = DAYS_LABEL.map((_, di) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + di);
      try { const l = JSON.parse(LS.getItem("lifeos_daily_" + d.toISOString().slice(0, 10)) || "{}"); return [...tids].reduce((s, id) => s + (l[id] || 0), 0); }
      catch { return 0; }
    });
    return { ...proj, color: povColors[proj.pov] || palette[i % palette.length],
      todaySecs: perDay[todayDowIdx], weeklySecs: perDay.reduce((s, v) => s + v, 0), weeklyTarget: (proj.hoursPerWeek || 0) * 3600 };
  };

  const allProjs = React.useMemo(() => projData.map(buildStats), [tick, weekStart]);
  const ringProjs = allProjs.filter(p => (p.hoursPerWeek || 0) > 0).slice(0, 4);
  const tableProjs = allProjs.filter(p => (p.hoursPerWeek || 0) > 0);

  const planPerDay = DAYS_LABEL.map((_, i) =>
    tableProjs.reduce((s, p) => s + (p.hoursPerWeek || 0) * ((pdw[p.id] || DEFAULT_W)[i] || 0), 0)
  );

  const todaySoll = planPerDay[todayDowIdx];
  const todayIst  = realityPerDay[todayDowIdx];
  const weekSoll  = planPerDay.slice(0, todayDowIdx + 1).reduce((s, v) => s + v, 0);
  const weekIst   = realityPerDay.slice(0, todayDowIdx + 1).reduce((s, v) => s + v, 0);
  const debtSoFar = weekSoll - weekIst;
  const debtOk    = debtSoFar <= 0.05;

  // Ring geometry (compact: 100px)
  const SZ = 100, cx = 50, cy = 50, RW = 8, GAP = 3;
  const baseR = cx - RW / 2 - 2;
  const topProg = ringProjs.length > 0
    ? Math.min(1, ringProjs[0].todaySecs / (((ringProjs[0].hoursPerWeek || 0) * ((pdw[ringProjs[0].id] || DEFAULT_W)[todayDowIdx] || 0.2)) * 3600 || 1))
    : 0;
  const ringCol = (p, prog) => prog >= 0.7 ? p.color : prog >= 0.4 ? "#f59e0b" : prog > 0 ? "#d6324a" : p.color;

  // Chart geometry
  const maxChart = Math.max(4, ...planPerDay, ...realityPerDay) * 1.15;
  const CW = 360, CH = 90, pL = 24, pR = 4, pT = 8, pB = 18;
  const iW = CW - pL - pR, iH = CH - pT - pB;
  const bGap = 4, bw = (iW - bGap * 6) / 7;

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Icon name="activity" size={10} color="var(--text-faint)" />
        <span style={{ fontSize: 9, letterSpacing: "0.18em", fontWeight: 700, color: "var(--text-faint)" }}>WAR ROOM</span>
      </div>

      {/* ── Ring + Stats row ── */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 14 }}>

        {/* Ring SVG — compact 100px */}
        <svg width={SZ} height={SZ} viewBox={"0 0 " + SZ + " " + SZ} style={{ flexShrink: 0 }}>
          <defs>
            <filter id="v2-shadow" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="rgba(0,0,0,0.9)" />
            </filter>
          </defs>
          {ringProjs.length === 0 ? (
            <circle cx={cx} cy={cy} r={baseR} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={RW} />
          ) : ringProjs.map((proj, i) => {
            const r = baseR - i * (RW + GAP);
            if (r < RW / 2) return null;
            const dailySecs = (proj.hoursPerWeek || 0) * ((pdw[proj.id] || DEFAULT_W)[todayDowIdx] || 0.2) * 3600;
            const prog = Math.min(1, dailySecs > 60 ? proj.todaySecs / dailySecs : 0);
            const col = ringCol(proj, prog);
            const circ = 2 * Math.PI * r;
            const tipA = -Math.PI / 2 + prog * 2 * Math.PI;
            return (
              <g key={proj.id}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={RW} opacity={0.1} />
                {prog > 0.005 && (
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={RW}
                    strokeLinecap="butt" strokeDasharray={circ} strokeDashoffset={circ * (1 - prog)}
                    transform={"rotate(-90 " + cx + " " + cy + ")"} />
                )}
                {prog > 0.005 && <circle cx={cx} cy={cy - r} r={RW / 2} fill={col} />}
                {prog > 0.02 && prog < 0.999 && (
                  <circle cx={cx + r * Math.cos(tipA)} cy={cy + r * Math.sin(tipA)} r={RW / 2} fill={col} filter="url(#v2-shadow)" />
                )}
              </g>
            );
          })}
          <text x={cx} y={cy - 3} textAnchor="middle"
            fill={topProg >= 0.7 ? "#10b981" : topProg >= 0.4 ? "#f59e0b" : topProg > 0 ? "#d6324a" : "var(--text)"}
            fontSize={11} fontWeight={700} fontFamily="'JetBrains Mono',monospace">
            {Math.round(topProg * 100)}%
          </text>
          <text x={cx} y={cy + 9} textAnchor="middle" fill="var(--text-faint)" fontSize={7} fontFamily="'Inter',sans-serif" letterSpacing="1.5">HEUTE</text>
        </svg>

        {/* Stats: compact table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {tableProjs.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontStyle: "italic", paddingTop: 8 }}>Noch keine Projekte mit Wochenstunden.</div>
          ) : (
            <>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 40px", gap: "0 8px", paddingBottom: 5, borderBottom: "1px solid var(--line-soft)", marginBottom: 4 }}>
                <div />
                {[["SOLL","IST"]].map(([a,b]) => (
                  <React.Fragment key={a}>
                    <div style={{ fontSize: 7, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-faint)", textAlign: "right", lineHeight: 1.4 }}>HEUTE<br/>SOLL</div>
                    <div style={{ fontSize: 7, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-faint)", textAlign: "right", lineHeight: 1.4 }}>HEUTE<br/>IST</div>
                  </React.Fragment>
                ))}
              </div>
              {tableProjs.map((proj, i, arr) => {
                const dailyT = (proj.hoursPerWeek || 0) * ((pdw[proj.id] || DEFAULT_W)[todayDowIdx] || 0.2);
                const ist = proj.todaySecs / 3600;
                const ok = ist >= dailyT - 0.05;
                return (
                  <div key={proj.id} style={{
                    display: "grid", gridTemplateColumns: "1fr 40px 40px", gap: "0 8px",
                    alignItems: "center", padding: "5px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--line-soft)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: proj.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.title}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "right" }}>{dailyT.toFixed(1)}h</div>
                    <div className="mono" style={{ fontSize: 10, fontWeight: 700, color: ok ? proj.color : "var(--text)", textAlign: "right" }}>{ist.toFixed(1)}h</div>
                  </div>
                );
              })}
            </>
          )}

          {/* IGNORANCE DEBT — compact status row */}
          <div style={{
            marginTop: 12, padding: "8px 12px",
            background: debtOk ? "rgba(16,185,129,0.08)" : "rgba(214,50,74,0.08)",
            borderLeft: "3px solid " + (debtOk ? "#10b981" : "#d6324a"),
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 8.5, letterSpacing: "0.14em", fontWeight: 700, color: "var(--text-faint)" }}>IGNORANCE DEBT</span>
            <span className="mono" style={{ fontSize: 15, fontWeight: 800, color: debtOk ? "#10b981" : "#d6324a" }}>
              {debtOk ? "+" : "−"}{Math.abs(debtSoFar).toFixed(1)}h
            </span>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: debtOk ? "#10b981" : "#d6324a", letterSpacing: "0.1em" }}>
              {debtOk ? "AUF KURS" : "HINTER PLAN"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Truth Loop Chart — full width, fixed height ── */}
      <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
        <div style={{ fontSize: 8, letterSpacing: "0.14em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
          <span>TRUTH LOOP · Plan vs. Realität</span>
          <span style={{ display: "flex", gap: 8 }}>
            {[["var(--text-dim)", "Plan"], ["rgba(214,50,74,0.85)", "Ist"]].map(([c, l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ display: "inline-block", width: 8, height: 2, background: c }} />
                <span style={{ fontSize: 7.5, color: "var(--text-faint)" }}>{l}</span>
              </span>
            ))}
          </span>
        </div>
        <svg viewBox={"0 0 " + CW + " " + CH} style={{ width: "100%", height: CH, display: "block" }}>
          {[0, 2, 4].map(v => {
            if (v > maxChart) return null;
            const y = pT + iH - (v / maxChart) * iH;
            return (
              <g key={v}>
                <text x={2} y={y + 3} fontSize="6.5" fill="var(--text-faint)" fontFamily="JetBrains Mono,monospace">{v}h</text>
                <line x1={pL} x2={CW - pR} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth="0.5" />
              </g>
            );
          })}
          {DAYS_LABEL.map((day, i) => {
            const x = pL + i * (bw + bGap);
            const ph = (planPerDay[i] / maxChart) * iH;
            const rh = (realityPerDay[i] / maxChart) * iH;
            const isToday = i === todayDowIdx;
            const isFuture = i > todayDowIdx;
            return (
              <g key={i}>
                {planPerDay[i] > realityPerDay[i] && !isFuture && (
                  <rect x={x} y={pT + iH - ph} width={bw} height={Math.max(0, ph - rh)} fill="rgba(214,50,74,0.1)" />
                )}
                {realityPerDay[i] > 0 && (
                  <rect x={x} y={pT + iH - rh} width={bw} height={rh} fill="rgba(214,50,74,0.5)" />
                )}
                <rect x={x} y={pT + iH - Math.max(ph, 0.5)} width={bw} height={Math.max(ph, 0.5)}
                  fill="transparent"
                  stroke={isToday ? "var(--accent)" : isFuture ? "rgba(255,255,255,0.12)" : "var(--text-dim)"}
                  strokeWidth={isToday ? 1.5 : 0.8}
                  strokeDasharray={isFuture ? "3 2" : "none"} />
                <text x={x + bw / 2} y={CH - 3} fontSize="6.5" textAnchor="middle"
                  fill={isToday ? "var(--accent)" : "var(--text-faint)"}
                  fontFamily="JetBrains Mono,monospace" fontWeight={isToday ? 700 : 400}>{day}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function DashboardV2({ pov, activeTaskId, setActiveTaskId, taskTimes, setTaskTimes, tickActive, setRoute,
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
  const [openProjects, setOpenProjects] = React.useState(() => new Set());
  React.useEffect(() => {
    setAllObjectives(loadAllObjectives(pov));
    setOpenObjectives(new Set());
    setOpenProjects(new Set());
  }, [pov]);

  // Group projects with their objectives — for the hierarchy view
  const loadProjectsGrouped = (povId) => {
    const projects = [];
    const archivedIds = getArchivedIds();
    const d2 = POV_DATA[povId] || POV_DATA.founder;
    if (d2.objective && d2.objective.title) {
      projects.push({
        id: "povdata_default",
        title: d2.objective.title,
        isDefault: true,
        objectives: [{ id: "povdata_obj", title: d2.objective.title, period: d2.objective.period, krs: d2.objective.keyResults || [] }],
      });
    }
    try {
      const projs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
      projs.filter(p => p.pov === povId && !archivedIds.has(p.id)).forEach(proj => {
        projects.push({
          id: proj.id, title: proj.title,
          objectives: (proj.objectives || []).map(o => ({ id: o.id, title: o.title, period: o.period, krs: o.krs || [] })),
        });
      });
    } catch {}
    return projects;
  };
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
  // Reload when a project is created/updated/archived in Mission Control
  React.useEffect(() => {
    const handler = () => {
      setProjTasks(loadProjTasks(pov));
      setAllObjectives(loadAllObjectives(pov));
    };
    window.addEventListener("lifeos-projects-updated", handler);
    return () => window.removeEventListener("lifeos-projects-updated", handler);
  }, [pov]);

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
  const [missionEnergy, setMissionEnergy] = React.useState(null);
  const [missionTime, setMissionTime] = React.useState(null);
  const [inboxAssign, setInboxAssign] = React.useState({});
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
      const result = await window.AI.generateDailyMission(mqTitle, krs, povLabel, userName, missionEnergy, missionTime);
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

  const allFilteredTasks = activeKR
    ? orderedTasksToday.filter(t => t.kr === activeKR)
    : orderedTasksToday;
  // Split open vs done — done tasks move to archive section
  const filteredTasks = allFilteredTasks.filter(t => !doneTasks.has(t.id));
  const donedTasks    = allFilteredTasks.filter(t => doneTasks.has(t.id));
  const [showDone, setShowDone] = React.useState(false);

  const active = tasksToday.find(t => t.id === activeTaskId);
  const elapsedFor = (t) => taskTimes[t.id] ?? t.elapsed;
  const krOverrides = (() => { try { return JSON.parse(LS.getItem("lifeos_task_kr_overrides") || "{}"); } catch { return {}; } })();

  // ── Space-to-Start: Leertaste startet/pausiert den ersten offenen Task ───
  React.useEffect(() => {
    const handler = (e) => {
      // ignore wenn Eingabefeld fokussiert
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code !== "Space") return;
      e.preventDefault();
      if (activeTaskId) {
        // Timer läuft → pausieren
        setActiveTaskId(null);
      } else {
        // Ersten offenen Task starten
        const first = filteredTasks[0];
        if (first) { setActiveTaskId(first.id); setRoute("focus"); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTaskId, filteredTasks]);

  // ── Live-Elapsed für den aktiven Task (1s Tick) ──────────────────────────
  const [liveSecs, setLiveSecs] = React.useState(0);
  React.useEffect(() => {
    if (!activeTaskId) { setLiveSecs(0); return; }
    const base = taskTimes[activeTaskId] ?? active?.elapsed ?? 0;
    setLiveSecs(base);
    const iv = setInterval(() => setLiveSecs(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [activeTaskId]);

  // Projects → Objectives → KRs — three-level accordion
  const renderAnchor = () => {
    const projects = loadProjectsGrouped(pov);
    return (
    <div style={{
      width: 280, flex: "0 0 280px", borderRight: "1px solid var(--line)",
      overflow: "auto", display: "flex", flexDirection: "column",
    }}>


      {/* ── PROJEKTE ── */}
      <div style={{ padding: "20px 20px 0", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="uppercase-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="layers" size={11} color="var(--text-faint)" />
            Projekte
          </div>
          {activeKR && (
            <button onClick={() => setActiveKR(null)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 9.5, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer", padding: 0 }}>ALLE x</button>
          )}
        </div>

        {projects.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--text-faint)", fontStyle: "italic", lineHeight: 1.5 }}>
            Noch keine Projekte. OKR Wizard in Mission Control starten.
          </div>
        )}

        {projects.map(proj => {
          const isProjOpen = openProjects.has(proj.id);
          const projHasActiveKR = proj.objectives.some(o => (o.krs || []).some(k => k.id === activeKR));
          return (
            <div key={proj.id} style={{ marginBottom: 6 }}>
              <button onClick={() => setOpenProjects(prev => { const n = new Set(prev); n.has(proj.id) ? n.delete(proj.id) : n.add(proj.id); return n; })}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 12px",
                  background: projHasActiveKR ? "var(--accent-soft)" : isProjOpen ? "rgba(255,255,255,0.04)" : "transparent",
                  border: "1px solid " + (projHasActiveKR ? "var(--accent-line)" : isProjOpen ? "var(--line)" : "var(--line-soft)"),
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .15s",
                }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: projHasActiveKR ? "var(--accent)" : "var(--text)", lineHeight: 1.3, flex: 1, marginRight: 8 }}>{proj.title}</div>
                <span style={{ color: "var(--text-faint)", fontSize: 9, flexShrink: 0 }}>{isProjOpen ? "▲" : "▼"}</span>
              </button>

              {isProjOpen && (
                <div style={{ border: "1px solid var(--line-soft)", borderTop: "none" }}>
                  {proj.objectives.map(obj => {
                    const isObjOpen = openObjectives.has(obj.id);
                    const objHasActiveKR = (obj.krs || []).some(k => k.id === activeKR);
                    return (
                      <div key={obj.id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                        <button onClick={() => setOpenObjectives(prev => { const n = new Set(prev); n.has(obj.id) ? n.delete(obj.id) : n.add(obj.id); return n; })}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px", background: objHasActiveKR ? "var(--accent-soft)" : isObjOpen ? "rgba(255,255,255,0.03)" : "transparent",
                            border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                          }}>
                          <div style={{ flex: 1, marginRight: 6 }}>
                            {obj.period && <div style={{ fontSize: 8.5, letterSpacing: "0.1em", color: "var(--text-faint)", marginBottom: 2 }}>{obj.period}</div>}
                            <div style={{ fontSize: 11, fontWeight: 600, color: objHasActiveKR ? "var(--accent)" : "var(--text-dim)", lineHeight: 1.3 }}>{obj.title}</div>
                          </div>
                          <span style={{ color: "var(--text-faint)", fontSize: 9, flexShrink: 0 }}>{isObjOpen ? "▲" : "▼"}</span>
                        </button>

                        {isObjOpen && (
                          <div style={{ borderTop: "1px solid var(--line-soft)" }}>
                            {(obj.krs || []).length === 0 && (
                              <div style={{ padding: "8px 12px", fontSize: 10.5, color: "var(--text-faint)", fontStyle: "italic" }}>Keine Key Results</div>
                            )}
                            {(obj.krs || []).map(kr => {
                              const locked = kr.status === "locked";
                              const isFiltered = activeKR === kr.id;
                              const isEditing = editingKR === kr.id;
                              const taskCount = tasksToday.filter(t => t.kr === kr.id).length;
                              const krVal = getKRDisplayVal(kr.id, kr.value || 0);
                              return (
                                <div key={kr.id} style={{ padding: "9px 12px", background: isFiltered ? "var(--accent-soft)" : "transparent", borderBottom: "1px solid var(--line-soft)", opacity: locked ? 0.45 : 1 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                                    <span onClick={() => !locked && !isEditing && setActiveKR(isFiltered ? null : kr.id)}
                                      style={{ fontSize: 11, fontWeight: 600, cursor: locked ? "default" : "pointer", color: isFiltered ? "var(--accent)" : "var(--text-dim)", flex: 1, lineHeight: 1.3, marginRight: 6 }}>{kr.label}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                                      {taskCount > 0 && !locked && <span style={{ fontSize: 8.5, fontWeight: 700, color: isFiltered ? "var(--accent)" : "var(--text-faint)" }}>{taskCount}T</span>}
                                      <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{Math.round(krVal * 100)}%</span>
                                      {!locked && taskCount === 0 && (
                                        <button onClick={e => { e.stopPropagation(); setEditingKR(isEditing ? null : kr.id); }}
                                          style={{ background: "none", border: "none", color: isEditing ? "var(--accent)" : "var(--text-faint)", cursor: "pointer", fontSize: 10, padding: "0 2px", lineHeight: 1 }}>✎</button>
                                      )}
                                    </div>
                                  </div>
                                  <ProgressBar value={krVal} dim={locked} color={isFiltered ? "var(--accent)" : undefined} />
                                  {isEditing && taskCount === 0 && (
                                    <div onClick={e => e.stopPropagation()} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                                      <input type="range" min="0" max="100" step="1" value={Math.round(getKRVal(kr.id, kr.value || 0) * 100)}
                                        onChange={e => setKRVal(kr.id, parseInt(e.target.value) / 100)}
                                        style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }} />
                                      <button onClick={() => setEditingKR(null)} style={{ background: "var(--accent)", color: "#0a0a0c", border: "none", padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✓</button>
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
                </div>
              )}
            </div>
          );
        })}

        {activeKR && (
          <div style={{ marginTop: 8, padding: "8px 12px", border: "1px solid var(--accent-line)", background: "var(--accent-soft)", fontSize: 10.5, color: "var(--accent)", letterSpacing: "0.08em" }}>
            Filter aktiv — {filteredTasks.length} Task{filteredTasks.length !== 1 ? "s" : ""} sichtbar
          </div>
        )}
      </div>

    </div>
  ); };

  // Trial banner — shown to free users with trial_start set, 0–7 days remaining
  const trialBanner = (() => {
    if (window.__lifeos_hasAccess) return null;
    const ts = localStorage.getItem("lifeos_trial_start");
    if (!ts) return null;
    const msLeft = 7 * 24 * 3600 * 1000 - (Date.now() - Number(ts));
    if (msLeft <= 0) return null;
    const daysLeft = Math.ceil(msLeft / (24 * 3600 * 1000));
    const urgent = daysLeft <= 2;
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 20px",
        background: urgent ? "var(--danger-soft)" : "var(--accent-soft)",
        borderBottom: `1px solid ${urgent ? "var(--danger)" : "var(--accent-line)"}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="clock" size={13} color={urgent ? "var(--danger)" : "var(--accent)"} />
          <span style={{ fontSize: 11.5, color: urgent ? "var(--danger)" : "var(--accent)", fontWeight: 600 }}>
            {daysLeft === 1 ? "Letzter Trial-Tag" : `Trial läuft ab in ${daysLeft} Tagen`}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>—</span>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>danach Beta-Code oder Pro nötig</span>
        </div>
        <button onClick={() => window.__lifeos_openSettings?.("abo")} style={{
          background: urgent ? "var(--danger)" : "var(--accent)",
          color: "#0a0a0c", border: "none", padding: "4px 12px",
          fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer",
        }}>PRO FREISCHALTEN →</button>
      </div>
    );
  })();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
      {trialBanner}

      {/* V2: Hero Bar — full width, above everything */}
      <HeroBar taskTimes={taskTimes} pov={pov} setRoute={setRoute} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {renderAnchor()}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* V2: Two-column layout */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left 60%: Quick Start + Tasks */}
        <div style={{ flex: "0 0 60%", display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid var(--line)" }}>

        {/* Quick Start banner — fixed */}
        {(() => {
          // Quick debt: per-project plan (today slot) vs actual today
          let projs2 = []; try { projs2 = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]"); } catch {}
          let archived2 = new Set(); try { archived2 = new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]")); } catch {}
          let pdw2 = {}; try { pdw2 = JSON.parse(LS.getItem("lifeos_proj_day_weights") || "{}"); } catch {}
          const todayKey2 = new Date().toISOString().slice(0, 10);
          let todayLog2 = {}; try { todayLog2 = JSON.parse(LS.getItem(`lifeos_daily_${todayKey2}`) || "{}"); } catch {}
          const dow2 = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
          const DEF2 = [0.2, 0.2, 0.2, 0.2, 0.2, 0, 0];
          const activeP = projs2.filter(p => !archived2.has(p.id) && (p.hoursPerWeek || 0) > 0);
          const dailySollH = activeP.reduce((s, p) => s + (p.hoursPerWeek || 8) * ((pdw2[p.id] || DEF2)[dow2] || 0), 0);
          const dailyIstH  = Object.values(todayLog2).reduce((s, v) => s + v, 0) / 3600;
          const debt = dailySollH - dailyIstH;
          return (
            <div style={{
              background: "var(--panel)", color: "var(--text)",
              padding: "28px 36px", display: "flex", alignItems: "center", justifyContent: "space-between",
              borderBottom: "1px solid var(--line)",
              borderLeft: "4px solid var(--accent)",
            }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>
                  QUICK START — WAS IST DIE EINE SACHE, DIE JETZT ZÄHLT?
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15 }}>
                  {active ? active.title : "Wähle deine eine Sache"}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6 }}>
                  {active ? active.sub : "Tippe START bei einer Aufgabe unten."}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {debt > 0.05 && (
                  <div style={{ fontSize: 11, color: "var(--danger)", fontWeight: 700, letterSpacing: "0.08em" }}>
                    {"−"}{debt.toFixed(1)}h hinter Plan
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Tasks — scrollable middle section */}
        <div data-tutorial="task-list" style={{ flex: 1, overflowY: "auto", position: "relative" }}>

        {/* ── Sticky Active Task Banner ── */}
        {active && (
          <div style={{
            position: "sticky", top: 0, zIndex: 50,
            background: "var(--bg)", borderBottom: "2px solid var(--accent)",
            borderLeft: "4px solid var(--accent)",
            padding: "14px 28px",
            display: "flex", alignItems: "center", gap: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.55)",
          }}>
            {/* Pulsing dot */}
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0,
              boxShadow: "0 0 10px var(--accent)", animation: "lifeosPulse 1.5s ease-in-out infinite",
            }} />
            {/* Task info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.16em", fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>
                JETZT AKTIV — {["LEERTASTE", "SPACE"].includes("SPACE") ? "LEERTASTE zum Pausieren" : ""}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {active.title}
              </div>
            </div>
            {/* Live timer */}
            <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", letterSpacing: "0.04em", flexShrink: 0 }}>
              {(() => {
                const s = liveSecs;
                const h = Math.floor(s / 3600);
                const m = Math.floor((s % 3600) / 60);
                const sec = s % 60;
                return (h > 0 ? String(h).padStart(2,"0") + ":" : "") +
                  String(m).padStart(2,"0") + ":" + String(sec).padStart(2,"0");
              })()}
            </div>
            {/* Pause button */}
            <button
              onClick={() => setActiveTaskId(null)}
              style={{
                padding: "8px 18px", background: "var(--accent)", color: "#0a0a0c",
                border: "none", fontWeight: 800, fontSize: 10, letterSpacing: "0.18em",
                cursor: "pointer", flexShrink: 0,
              }}
            >PAUSE ▌▌</button>
          </div>
        )}

        {/* Tasks today */}
        <div style={{ padding: "20px 28px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="uppercase-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="list" size={11} color="var(--text-faint)" />
            Aufgaben Heute
            {activeKR && (
              <span style={{ marginLeft: 4, color: "var(--accent)" }}>
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

          {filteredTasks.length === 0 && !donedTasks.length && activeKR && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
              Keine Tasks fuer dieses Key Result.
            </div>
          )}

          {/* ── Erledigt-Archiv ── */}
          {donedTasks.length > 0 && (
            <div style={{ borderTop: "1px solid var(--line-soft)", marginTop: 8 }}>
              <button onClick={() => setShowDone(v => !v)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "transparent", border: "none", padding: "12px 0",
                cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 9, letterSpacing: "0.18em", fontWeight: 700, color: "var(--text-faint)" }}>ERLEDIGT</span>
                  <span style={{ padding: "1px 8px", background: "var(--good-soft)", border: "1px solid rgba(58,171,91,0.3)", fontSize: 9, fontWeight: 700, color: "var(--good)" }}>{donedTasks.length}</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-faint)", transform: showDone ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block" }}>▶</span>
              </button>
              {showDone && donedTasks.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid var(--line-soft)", opacity: 0.45 }}>
                  <button onClick={() => {
                    setDoneTasks(prev => { const n = new Set(prev); n.delete(t.id); return n; });
                  }} style={{
                    width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                    background: "var(--good)", border: "2px solid var(--good)",
                    color: "#0a0a0c", fontSize: 9, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}>✓</button>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text-dim)", textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                  <button onClick={() => {
                    const key = `lifeos_tasks_${t.pov || pov}`;
                    let ex = []; try { ex = JSON.parse(LS.getItem(key) || "[]"); } catch {}
                    LS.setItem(key, JSON.stringify(ex.filter(x => x.id !== t.id)));
                    setCustomTasks(prev => prev.filter(x => x.id !== t.id));
                    setDoneTasks(prev => { const n = new Set(prev); n.delete(t.id); return n; });
                  }} title="Loeschen" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: "0 4px", lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              ))}
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
        </div>{/* end scrollable tasks */}
        </div>{/* end left column */}

        {/* Right 40%: Rings + BehaviorStrip */}
        <div style={{ flex: "0 0 40%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <BehaviorStrip />
          <div style={{ flex: 1, overflowY: "auto", borderTop: "1px solid var(--line)" }}>
            <V2StatsPanel taskTimes={taskTimes} pov={pov} />
          </div>
        </div>{/* end right column */}
        </div>{/* end two-column row */}
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
    </div>
  );
}

// ─── Habit Strip ─────────────────────────────────────────────────────────────
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

  // Tutorial: auto-expand when tutorial reaches habit check-in step
  React.useEffect(() => {
    const expand = () => setExpanded(true);
    window.addEventListener("lifeos-tutorial-expand-habits", expand);
    return () => window.removeEventListener("lifeos-tutorial-expand-habits", expand);
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
  const getHabitColor = (h) => h.bucket ? `var(--${h.bucket})` : (h.color || "var(--accent)");
  const getHabitSoft  = (h) => h.bucket ? `var(--${h.bucket}-soft)` : "var(--accent-soft)";
  const getHabitLine  = (h) => h.bucket ? `var(--${h.bucket}-line)` : "var(--accent-line)";

  // Kein leerer State — Section nur zeigen wenn Habits vorhanden
  if (habits.length === 0) return null;

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
                background: h.log[todayISO] ? getHabitColor(h) : "var(--line)",
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
              Noch keine Habits — unter Insights → Habit Tracker hinzufügen.
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
                  background: done ? getHabitSoft(h) : "var(--panel-2)",
                  border: `1px solid ${done ? getHabitLine(h) : "var(--line-soft)"}`,
                  cursor: "pointer", transition: "all .15s",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                  background: done ? getHabitColor(h) : "transparent",
                  border: `2px solid ${done ? getHabitColor(h) : "var(--line)"}`,
                  color: "#0a0a0c", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
                }}>{done ? "✓" : ""}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: done ? getHabitColor(h) : "var(--text-dim)", flex: 1 }}>
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

// ── War Room Stats Panel ────────────────────────────────────────────────────
function StatsPanel({ taskTimes, pov }) {
  const today = new Date().toISOString().slice(0, 10);
  const DAYS_LABEL = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];

  // ── Week start (Monday) ──────────────────────────────────────────────────
  const weekStart = React.useMemo(() => {
    const d = new Date();
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }, [today]);

  const todayDowIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

  // ── Refresh trigger on timer tick or project change ─────────────────────
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { setTick(t => t + 1); }, [taskTimes]);
  React.useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener("lifeos-projects-updated", handler);
    return () => window.removeEventListener("lifeos-projects-updated", handler);
  }, []);

  // ── Daily times per weekday of current week ──────────────────────────────
  const realityPerDay = React.useMemo(() => {
    return DAYS_LABEL.map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      try {
        const log = JSON.parse(LS.getItem(`lifeos_daily_${key}`) || "{}");
        return Object.values(log).reduce((s, v) => s + v, 0) / 3600;
      } catch { return 0; }
    });
  }, [tick, weekStart]);

  // ── Project data ─────────────────────────────────────────────────────────
  // Helper: map project → stats object (shared by rings + table)
  const buildProjStats = (proj, i, weekStart, todayDowIdx, allPovColors, palette) => {
    const taskIds = new Set((proj.objectives || []).flatMap(o => (o.krs || []).flatMap(kr => (kr.tasks || []).map(t => t.id))));
    taskIds.add(`free_${proj.id}`); // include free-flow sessions
    const perDaySecs = DAYS_LABEL.map((_, di) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + di);
      const key = d.toISOString().slice(0, 10);
      try {
        const log = JSON.parse(LS.getItem(`lifeos_daily_${key}`) || "{}");
        return [...taskIds].reduce((s, id) => s + (log[id] || 0), 0);
      } catch { return 0; }
    });
    const todaySecs   = perDaySecs[todayDowIdx];
    const weeklySecs  = perDaySecs.reduce((s, v) => s + v, 0);
    const weeklyTarget = (proj.hoursPerWeek || 0) * 3600;
    const color = allPovColors[proj.pov] || palette[i % palette.length];
    return { id: proj.id, title: proj.title, color, hoursPerWeek: proj.hoursPerWeek || 0,
      todaySecs, weeklySecs, weeklyTarget };
  };

  const [_allProjStats, _palette, _allPovColors] = React.useMemo(() => {
    const povColors  = { personal: "#8b5cf6", founder: "#2f8bff", student: "#e11d48", athlete: "#10b981" };
    const palette    = ["#10b981", "#2f8bff", "#8b5cf6", "#f97316", "#ec4899", "#f59e0b", "#6366f1", "#14b8a6"];
    let userPovs = []; try { userPovs = JSON.parse(LS.getItem("lifeos_user_povs") || "[]"); } catch {}
    const allPovColors = { ...povColors, ...Object.fromEntries(userPovs.map(p => [p.id, p.color])) };
    let archivedIds = new Set(); try { archivedIds = new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]")); } catch {}
    let projs = []; try { projs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]"); } catch {}
    const active = projs.filter(p => !archivedIds.has(p.id));
    return [active, palette, allPovColors];
  }, [tick, weekStart]);

  // Rings: top 4 projects with hoursPerWeek > 0 (geometric SVG limit)
  const ringProjects = React.useMemo(() => {
    return _allProjStats
      .filter(p => (p.hoursPerWeek || 0) > 0)
      .slice(0, 4)
      .map((proj, i) => {
        return buildProjStats(proj, i, weekStart, todayDowIdx, _allPovColors, _palette);
      });
  }, [tick, weekStart]);

  // Table: ALL non-archived projects (no hoursPerWeek filter, no slice cap)
  const tableProjs = React.useMemo(() => {
    return _allProjStats.map((proj, i) => buildProjStats(proj, i, weekStart, todayDowIdx, _allPovColors, _palette));
  }, [tick, weekStart]);

  // ── Per-project per-day weights ──────────────────────────────────────────
  // { [projId]: [w0..w6] } where wi = fraction of that project's weekly hours
  const weeklyBudget = tableProjs.filter(p => p.hoursPerWeek > 0).reduce((s, p) => s + p.hoursPerWeek, 0);
  const DEFAULT_PROJ_WEIGHTS = [0.2, 0.2, 0.2, 0.2, 0.2, 0, 0]; // Mon–Fri equal
  const [projDayWeights, setProjDayWeights] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_proj_day_weights") || "{}"); } catch { return {}; }
  });
  React.useEffect(() => { LS.setItem("lifeos_proj_day_weights", JSON.stringify(projDayWeights)); }, [projDayWeights]);

  // ── Streak Freeze Tokens ──────────────────────────────────────────────────
  const STREAK_THRESHOLD = 0.70;  // 70 % des Tagesziels = Streak-Tag
  const FREEZE_PER_MONTH = 2;     // Freeze-Tokens pro Kalendermonat

  const [freezeMap, setFreezeMap] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_streak_freezes") || "{}"); } catch { return {}; }
  });
  const applyFreeze = (dateKey) => {
    const next = Object.assign({}, freezeMap);
    next[dateKey] = true;
    LS.setItem("lifeos_streak_freezes", JSON.stringify(next));
    setFreezeMap(next);
  };
  const nowMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const freezesUsed = Object.keys(freezeMap).filter(d => d.startsWith(nowMonth)).length;
  const freezesAvailable = Math.max(0, FREEZE_PER_MONTH - freezesUsed);

  const getProjWeights = (projId) => projDayWeights[projId] || DEFAULT_PROJ_WEIGHTS;
  const setProjWeight = (projId, dayIdx, pct) => {
    const v = Math.max(0, Math.min(1, pct));
    setProjDayWeights(prev => {
      const cur = prev[projId] || [...DEFAULT_PROJ_WEIGHTS];
      const next = [...cur]; next[dayIdx] = v;
      return { ...prev, [projId]: next };
    });
  };
  const resetProjWeights = (projId) => setProjDayWeights(prev => ({ ...prev, [projId]: [...DEFAULT_PROJ_WEIGHTS] }));

  // planPerDay: sum of ALL projects with hoursPerWeek set
  const planPerDay = DAYS_LABEL.map((_, i) =>
    tableProjs.filter(p => p.hoursPerWeek > 0).reduce((s, p) => s + p.hoursPerWeek * getProjWeights(p.id)[i], 0)
  );
  const planTotal = planPerDay.reduce((s, v) => s + v, 0);

  // Debt = plan so far this week vs actual so far
  const debtSoFar = planPerDay.slice(0, todayDowIdx + 1).reduce((s, v) => s + v, 0)
                  - realityPerDay.slice(0, todayDowIdx + 1).reduce((s, v) => s + v, 0);
  const debtOk = debtSoFar <= 0.05;

  // ── Say-Do Score (Wochenbasis: Plan vs. Ist bis heute) ───────────────────
  const weekActual = realityPerDay.slice(0, todayDowIdx + 1).reduce((s, v) => s + v, 0);
  const weekPlan   = planPerDay.slice(0, todayDowIdx + 1).reduce((s, v) => s + v, 0);
  const sayDoScore = weekPlan > 0.1 ? Math.min(199, Math.round((weekActual / weekPlan) * 100)) : null;
  const sayDoColor = sayDoScore === null ? "var(--text-faint)"
    : sayDoScore >= 70 ? "#10b981"
    : sayDoScore >= 40 ? "#f59e0b"
    : "#d6324a";
  const sayDoLabel = sayDoScore === null ? "–"
    : sayDoScore >= 70 ? "ON TRACK"
    : sayDoScore >= 40 ? "BEHIND"
    : "CRITICAL";

  // ── Streak Counter (70 % des Tagesziels, Freeze-Support) ────────────────
  const streakInfo = React.useMemo(() => {
    let count = 0;
    let yesterdayMissed = false;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dowIdx = (d.getDay() + 6) % 7; // Mo=0 … So=6

      // Tagesziel in Sekunden (alle Projekte mit hoursPerWeek)
      const plannedSecs = tableProjs
        .filter(p => (p.hoursPerWeek || 0) > 0)
        .reduce((s, p) => {
          const w = projDayWeights[p.id] || DEFAULT_PROJ_WEIGHTS;
          return s + p.hoursPerWeek * w[dowIdx];
        }, 0) * 3600;

      // Freier Tag (kein Plan) → nicht werten, Streak läuft weiter
      if (plannedSecs < 60) continue;

      // Tatsächlich geloggte Sekunden
      let actualSecs = 0;
      try {
        const log = JSON.parse(LS.getItem("lifeos_daily_" + key) || "{}");
        actualSecs = Object.values(log).reduce((s, v) => s + v, 0);
      } catch {}

      const hit = actualSecs >= STREAK_THRESHOLD * plannedSecs;

      if (hit) {
        count++;
      } else if (freezeMap[key]) {
        // Eingefroren → zählt nicht, bricht aber nicht
      } else if (i === 0) {
        // Heute noch nicht fertig → noch kein Break
      } else {
        if (i === 1) yesterdayMissed = true;
        break;
      }
    }
    return { streakDays: count, yesterdayMissed };
  }, [tick, tableProjs, projDayWeights, freezeMap]);
  const streakDays = streakInfo.streakDays;
  const yesterdayMissed = streakInfo.yesterdayMissed;

  // ── Ring-Farbe nach Tages-Fortschritt (Grün/Amber/Rot) ──────────────────
  const ringColor = (proj, progress, hasTarget) => {
    if (!hasTarget || progress === 0) return proj.color;
    if (progress >= 0.7) return proj.color;
    if (progress >= 0.4) return "#f59e0b";
    return "#d6324a";
  };

  // Ring SVG — Apple Watch geometry (4 rings comfortable)
  const SVG_SIZE = 130;
  const cx = SVG_SIZE / 2, cy = SVG_SIZE / 2;
  const RING_W = 10, GAP = 4;
  const baseRadius = cx - RING_W / 2 - 2;
  const topProgress = ringProjects.length > 0
    ? Math.min(1, ringProjects[0].todaySecs / ((ringProjects[0].hoursPerWeek / 5) * 3600))
    : 0;

  const [editMode, setEditMode] = React.useState(false);
  const [areaHover, setAreaHover] = React.useState(false);

  const maxChart = Math.max(6, ...planPerDay, ...realityPerDay) * 1.2;
  const W = 420, H = 110, padL = 28, padR = 6, padT = 12, padB = 20;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const barGap = 6;
  const bw = (innerW - barGap * (DAYS_LABEL.length - 1)) / DAYS_LABEL.length;

  return (
    <div onMouseEnter={() => setAreaHover(true)} onMouseLeave={() => setAreaHover(false)}
      style={{ padding: "16px 28px 20px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="uppercase-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="activity" size={11} color="var(--text-faint)" />
            War Room · Stats
          </div>
          {weeklyBudget > 0 && (
            <span style={{ fontSize: 9, color: "var(--text-faint)", letterSpacing: "0.06em" }}>
              {weeklyBudget}h/Woche aus Projekten · verteilt {planTotal.toFixed(1)}h
            </span>
          )}
        </div>

        {/* ── Say-Do Score + Streak ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>

          {/* Streak */}
          {(streakDays > 0 || yesterdayMissed) && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700,
                color: streakDays >= 7 ? "#f59e0b" : streakDays >= 3 ? "#10b981" : streakDays > 0 ? "var(--text)" : "#d6324a",
                lineHeight: 1 }}>
                {streakDays >= 3 ? "🔥" : ""}{streakDays}
              </div>
              <div style={{ fontSize: 8, letterSpacing: "0.18em", fontWeight: 700,
                color: "var(--text-faint)", marginTop: 2 }}>STREAK</div>
              {/* Freeze-Tokens */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 3 }}>
                {yesterdayMissed && freezesAvailable > 0 && (
                  <button onClick={() => {
                    const y = new Date(); y.setDate(y.getDate() - 1);
                    applyFreeze(y.toISOString().slice(0, 10));
                  }} title={"Freeze anwenden (" + freezesAvailable + " übrig)"} style={{
                    background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.35)",
                    color: "#60a5fa", fontSize: 9, fontWeight: 700, cursor: "pointer",
                    padding: "1px 5px", letterSpacing: "0.1em",
                  }}>{"❄️ " + freezesAvailable}</button>
                )}
                {!yesterdayMissed && freezesAvailable > 0 && (
                  <span style={{ fontSize: 8, color: "rgba(96,165,250,0.6)" }}>{"❄️ " + freezesAvailable}</span>
                )}
              </div>
            </div>
          )}

          {/* Say-Do Score */}
          {sayDoScore !== null && (
            <div style={{ textAlign: "center", borderLeft: "1px solid var(--line)", paddingLeft: 20 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700,
                color: sayDoColor, lineHeight: 1 }}>
                {sayDoScore}%
              </div>
              <div style={{ fontSize: 8, letterSpacing: "0.18em", fontWeight: 700,
                color: sayDoColor, marginTop: 2, opacity: 0.8 }}>{sayDoLabel}</div>
              <div style={{ fontSize: 7.5, color: "var(--text-faint)", marginTop: 1 }}>SAY-DO SCORE</div>
            </div>
          )}

          {/* TAGE VERTEILEN entfernt — nur im Planner */}
        </div>
      </div>

      {/* ── Main row: rings | table | spacer | debt ── */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 56px 148px", gap: "0 20px", alignItems: "start" }}>

        {/* ── Rings ── */}
        <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} style={{ flexShrink: 0 }}>
          <defs>
            <filter id="aw-tip-shadow-sm" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(0,0,0,0.92)" />
            </filter>
            <filter id="aw-glow-sm" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {ringProjects.length === 0 ? (
            <>
              <circle cx={cx} cy={cy} r={baseRadius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={RING_W} />
              <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--text-faint)" fontSize={9} fontFamily="'Inter',sans-serif">–</text>
            </>
          ) : ringProjects.map((proj, i) => {
            const r = baseRadius - i * (RING_W + GAP);
            if (r < RING_W / 2) return null;
            const dailyTargetSecs = proj.hoursPerWeek * getProjWeights(proj.id)[todayDowIdx] * 3600;
            const hasTarget = dailyTargetSecs > 60;
            const rawProg = hasTarget ? proj.todaySecs / dailyTargetSecs : 0;
            const clampProg = Math.min(1, rawProg);
            const activeColor = ringColor(proj, clampProg, hasTarget);
            const circ = 2 * Math.PI * r;
            const offset = circ * (1 - clampProg);
            const tipAngle = -Math.PI / 2 + clampProg * 2 * Math.PI;
            const tipX = cx + r * Math.cos(tipAngle);
            const tipY = cy + r * Math.sin(tipAngle);
            const capR = RING_W / 2;
            return (
              <g key={proj.id}>
                {/* Color-tinted track */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={activeColor} strokeWidth={RING_W} opacity={0.12} />
                {/* Progress arc (butt caps) */}
                {clampProg > 0.005 && (
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke={activeColor}
                    strokeWidth={RING_W} strokeLinecap="butt"
                    strokeDasharray={circ} strokeDashoffset={offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
                )}
                {/* Start cap at 12 o'clock */}
                {clampProg > 0.005 && (
                  <circle cx={cx} cy={cy - r} r={capR} fill={activeColor} />
                )}
                {/* Tip cap + Apple Watch shadow */}
                {clampProg > 0.02 && clampProg < 0.999 && (
                  <circle cx={tipX} cy={tipY} r={capR} fill={activeColor} filter="url(#aw-tip-shadow-sm)" />
                )}
                {/* Complete: glow overlay */}
                {rawProg >= 1 && (
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke={activeColor}
                    strokeWidth={RING_W * 0.5} opacity={0.2} filter="url(#aw-glow-sm)" />
                )}
              </g>
            );
          })}
          <text x={cx} y={cy - 4} textAnchor="middle"
            fill={topProgress >= 0.7 ? "#10b981" : topProgress >= 0.4 ? "#f59e0b" : topProgress > 0 ? "#d6324a" : "var(--text)"}
            fontSize={13} fontWeight={700} fontFamily="'JetBrains Mono',monospace">
            {Math.round(topProgress * 100)}%
          </text>
          <text x={cx} y={cy + 9} textAnchor="middle" fill="var(--text-faint)" fontSize={7.5} fontFamily="'Inter',sans-serif" letterSpacing="1.5">
            HEUTE
          </text>
        </svg>

        {/* ── Soll/Ist table — ALL active projects ── */}
        <div style={{ minWidth: 0 }}>
          {tableProjs.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontStyle: "italic", paddingTop: 10 }}>
              Noch keine Projekte erstellt.
            </div>
          ) : (
            <div>
              {/* Headers */}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 54px 54px 54px 54px", gap: "0 6px", paddingBottom: 7, borderBottom: "1px solid var(--line-soft)", marginBottom: 2 }}>
                <div />
                {[["HEUTE","SOLL"],["HEUTE","IST"],["WOCHE","SOLL"],["WOCHE","IST"]].map(([a,b],ii) => (
                  <div key={ii} style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 7, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-faint)", lineHeight: 1.3 }}>{a}</div>
                    <div style={{ fontSize: 7, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-faint)", lineHeight: 1.3 }}>{b}</div>
                  </div>
                ))}
              </div>
              {tableProjs.filter(p => p.hoursPerWeek > 0).map((proj, i, arr) => {
                const projWeights = getProjWeights(proj.id);
                const dailyTargetH = proj.hoursPerWeek * projWeights[todayDowIdx];
                const ds  = dailyTargetH.toFixed(1) + "h";
                const di  = (proj.todaySecs / 3600).toFixed(1) + "h";
                const ws  = proj.hoursPerWeek.toFixed(1) + "h";
                const wi  = (proj.weeklySecs / 3600).toFixed(1) + "h";
                const dayOk  = proj.todaySecs / 3600 >= dailyTargetH - 0.05;
                const weekOk = proj.weeklySecs >= proj.weeklyTarget;
                return (
                  <div key={proj.id} style={{
                    display: "grid", gridTemplateColumns: "minmax(0,1fr) 54px 54px 54px 54px",
                    gap: "0 6px", alignItems: "center",
                    padding: "7px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--line-soft)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: proj.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.title}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--text-faint)", textAlign: "right" }}>{ds}</div>
                    <div className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: dayOk ? proj.color : "var(--text)", textAlign: "right" }}>{di}{dayOk ? "✓" : ""}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--text-faint)", textAlign: "right" }}>{ws}</div>
                    <div className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: weekOk ? proj.color : "var(--text)", textAlign: "right" }}>{wi}{weekOk ? "✓" : ""}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Spacer ── */}
        <div />

        {/* ── Ignorance Debt ── */}
        <div style={{
          background: debtOk ? "var(--good-soft)" : "rgba(214,50,74,0.12)",
          border: `1px solid ${debtOk ? "var(--good)" : "var(--danger)"}`,
          color: debtOk ? "var(--good)" : "var(--danger)",
          padding: "12px 14px", textAlign: "center",
        }}>
          <div style={{ fontSize: 7.5, letterSpacing: "0.18em", fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>IGNORANCE DEBT</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
            {debtOk ? "+" : "−"}{Math.abs(debtSoFar).toFixed(1)}h
          </div>
          <div style={{ fontSize: 8.5, opacity: 0.75, marginTop: 7, letterSpacing: "0.06em", fontWeight: 600 }}>
            {debtOk ? "Auf Kurs ✓" : "Selbstbetrug"}
          </div>
          <div style={{ fontSize: 7.5, color: debtOk ? "var(--good)" : "var(--danger)", opacity: 0.55, marginTop: 4 }}>
            bis heute
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div style={{ marginTop: 14, borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
        <div style={{ fontSize: 8, letterSpacing: "0.14em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 6, display: "flex", gap: 14, alignItems: "center" }}>
          <span>THE TRUTH LOOP · Plan vs. Realität (KW)</span>
          <span style={{ display: "flex", gap: 10, opacity: 0.65 }}>
            {[["var(--text-dim)", "Plan"],["rgba(214,50,74,0.85)","Realität"],["rgba(214,50,74,0.18)","Debt-Gap"]].map(([c, l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ display: "inline-block", width: 10, height: 2, background: c }} />
                <span style={{ fontSize: 7.5, color: "var(--text-faint)" }}>{l}</span>
              </span>
            ))}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {[0, 2, 4, 6, 8].map(v => {
            if (v > maxChart) return null;
            const y = padT + innerH - (v / maxChart) * innerH;
            return (
              <g key={v}>
                <text x={2} y={y + 3} fontSize="7.5" fill="var(--text-faint)" fontFamily="JetBrains Mono,monospace">{v}h</text>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth="0.5" />
              </g>
            );
          })}
          {DAYS_LABEL.map((day, i) => {
            const x   = padL + i * (bw + barGap);
            const ph  = (planPerDay[i] / maxChart) * innerH;
            const rh  = (realityPerDay[i] / maxChart) * innerH;
            const py  = padT + innerH - ph;
            const ry  = padT + innerH - rh;
            const isToday = i === todayDowIdx;
            const isFuture = i > todayDowIdx;
            return (
              <g key={i}>
                {planPerDay[i] > realityPerDay[i] && !isFuture && (
                  <rect x={x} y={py} width={bw} height={Math.max(0, ph - rh)} fill="rgba(214,50,74,0.12)" />
                )}
                {realityPerDay[i] > 0 && (
                  <rect x={x} y={ry} width={bw} height={rh} fill="rgba(214,50,74,0.55)" stroke="rgba(214,50,74,0.75)" strokeWidth={0.8} />
                )}
                <rect x={x} y={padT + innerH - Math.max(ph, 0.5)} width={bw} height={Math.max(ph, 0.5)}
                  fill="transparent"
                  stroke={isToday ? "var(--accent)" : isFuture ? "rgba(255,255,255,0.15)" : "var(--text-dim)"}
                  strokeWidth={isToday ? 1.5 : 0.8}
                  strokeDasharray={isFuture ? "3 2" : "none"} />
                {planPerDay[i] > 0 && (
                  <text x={x + bw / 2} y={py - 3} fontSize="7" textAnchor="middle"
                    fontFamily="JetBrains Mono,monospace"
                    fill={isToday ? "var(--accent)" : isFuture ? "var(--text-faint)" : "var(--text-dim)"}>
                    {planPerDay[i].toFixed(1)}h
                  </text>
                )}
                <text x={x + bw / 2} y={H - 3} fontSize="7.5" textAnchor="middle"
                  fill={isToday ? "var(--accent)" : "var(--text-faint)"}
                  fontFamily="JetBrains Mono,monospace" fontWeight={isToday ? 700 : 400}>
                  {day}
                </text>
              </g>
            );
          })}
        </svg>

        {/* ── Pro-Projekt Tages-Verteilung — Modal ── */}
        {editMode && tableProjs.filter(p => p.hoursPerWeek > 0).length > 0 && (
          <div
            onClick={() => setEditMode(false)}
            style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: "var(--panel)", border: "1px solid var(--line)", width: "min(900px, 92vw)", maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              {/* Modal header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text)" }}>WOCHENPLAN AUFTEILEN</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 3 }}>
                    An welchem Tag arbeitest du wie viel % pro Projekt? · Gesamt: {weeklyBudget}h/Woche
                  </div>
                </div>
                <button
                  onClick={() => setEditMode(false)}
                  style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)", width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >✕</button>
              </div>

              {/* Scrollable body */}
              <div style={{ overflowY: "auto", padding: "20px 24px 24px" }}>

                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "200px repeat(7, 1fr) 80px", gap: "0 10px", marginBottom: 6, paddingBottom: 10, borderBottom: "1px solid var(--line-soft)" }}>
                  <div />
                  {DAYS_LABEL.map((d, i) => (
                    <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: i === todayDowIdx ? "var(--accent)" : "var(--text-faint)" }}>{d}</div>
                  ))}
                  <div style={{ textAlign: "right", fontSize: 8, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.08em" }}>GESAMT</div>
                </div>

                {/* Per-project rows — only projects with hoursPerWeek */}
                {tableProjs.filter(p => p.hoursPerWeek > 0).map(proj => {
                  const weights = getProjWeights(proj.id);
                  const totalPct = weights.reduce((s, w) => s + w, 0);
                  const overBudget = totalPct > 1.02;
                  const totalH = proj.hoursPerWeek * totalPct;
                  return (
                    <div key={proj.id} style={{ display: "grid", gridTemplateColumns: "200px repeat(7, 1fr) 80px", gap: "0 10px", alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--line-soft)" }}>

                      {/* Project label */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: proj.color, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.title}</div>
                          <div style={{ fontSize: 9.5, color: "var(--text-faint)", marginTop: 1 }}>{proj.hoursPerWeek}h / Woche</div>
                        </div>
                      </div>

                      {/* Day sliders */}
                      {DAYS_LABEL.map((_, i) => {
                        const pct = Math.round(weights[i] * 100);
                        const hrs = (proj.hoursPerWeek * weights[i]).toFixed(1);
                        const isToday = i === todayDowIdx;
                        return (
                          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: isToday ? "var(--accent)" : hrs === "0.0" ? "var(--text-faint)" : "var(--text)", lineHeight: 1 }}>
                              {hrs}h
                            </div>
                            <input
                              type="range" min={0} max={100} step={5} value={pct}
                              onChange={e => setProjWeight(proj.id, i, e.target.value / 100)}
                              style={{ width: "100%", accentColor: proj.color, cursor: "pointer" }}
                            />
                            <div style={{ fontSize: 8.5, color: isToday ? "var(--accent)" : "var(--text-faint)" }}>{pct}%</div>
                          </div>
                        );
                      })}

                      {/* Totals + Reset */}
                      <div style={{ textAlign: "right" }}>
                        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: overBudget ? "var(--danger)" : Math.abs(totalPct - 1) < 0.02 ? "var(--good)" : "var(--text)" }}>
                          {totalH.toFixed(1)}h
                        </div>
                        <div style={{ fontSize: 9, color: overBudget ? "var(--danger)" : "var(--text-faint)", marginTop: 1 }}>
                          {Math.round(totalPct * 100)}%{overBudget ? " ⚠" : ""}
                        </div>
                        <button onClick={() => resetProjWeights(proj.id)} title="Gleichmäßig zurücksetzen"
                          style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 10, cursor: "pointer", padding: "4px 0", letterSpacing: "0.06em", marginTop: 2 }}>
                          ↺ Reset
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Daily totals footer */}
                <div style={{ display: "grid", gridTemplateColumns: "200px repeat(7, 1fr) 80px", gap: "0 10px", alignItems: "center", paddingTop: 14, marginTop: 6 }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.12em" }}>GESAMT / TAG</div>
                  {DAYS_LABEL.map((_, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: i === todayDowIdx ? "var(--accent)" : planPerDay[i] > 0 ? "var(--text)" : "var(--text-faint)" }}>
                        {planPerDay[i].toFixed(1)}h
                      </div>
                    </div>
                  ))}
                  <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textAlign: "right" }}>
                    {planTotal.toFixed(1)}h
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 9.5, color: "var(--text-faint)" }}>Klick außerhalb oder ✕ zum Schließen · Änderungen werden automatisch gespeichert</div>
                <button onClick={() => setEditMode(false)}
                  style={{ padding: "8px 22px", background: "var(--accent)", border: "none", color: "#0a0a0c", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer" }}>
                  FERTIG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
        <div className="uppercase-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="trending-up" size={11} color="var(--text-faint)" />
          The Truth Loop
        </div>
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
