// Insights — echte Daten aus localStorage: Zeit pro KR, Promised vs. Delivered, Debt.

function Insights({ taskTimes, pov }) {
  const times = taskTimes || {};

  // ── Alle Tasks aller POVs zusammensammeln ──────────────────────────────────
  const allTasks = React.useMemo(() => {
    const result = [];
    for (const povId of Object.keys(POV_DATA)) {
      const data = POV_DATA[povId];
      const povColor = POVS.find(p => p.id === povId)?.color || "var(--accent)";
      let custom = [];
      try { custom = JSON.parse(localStorage.getItem(`lifeos_tasks_${povId}`) || "[]"); } catch {}
      const doneSet = (() => {
        try { return new Set(JSON.parse(localStorage.getItem(`lifeos_done_${povId}`) || "[]")); } catch { return new Set(); }
      })();
      for (const t of [...data.tasksToday, ...custom]) {
        const kr = data.objective.keyResults.find(k => k.id === t.kr);
        result.push({
          ...t,
          povId, povColor,
          krLabel: kr?.label || (t.kr ? t.kr : null),
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

  // ── Ignorance Debt (Truth Loop) ─────────────────────────────────────────────
  const debt = (TRUTH_LOOP.plan.reduce((a, b) => a + b, 0) - TRUTH_LOOP.reality.reduce((a, b) => a + b, 0));

  const secToH = (s) => (s / 3600).toFixed(1) + "h";

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
      <div className="uppercase-label" style={{ marginBottom: 20 }}>Insights</div>

      {/* ── Hero Stats ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
        <StatCard label="TOTAL TRACKED" value={secToH(totalTrackedSec)} color="var(--accent)" sub="über alle Tasks" />
        <StatCard label="IGNORANCE DEBT" value={`−${debt.toFixed(1)}h`} color="var(--danger)" sub="diese Woche" />
        <StatCard label="SIDE QUEST DRIFT" value={`${sideQuestPct}%`} color="var(--warn)" sub={`${sideQuestCount} Tasks ohne KR`} />
        <StatCard label="TASKS ERLEDIGT" value={`${allTasks.filter(t => t.done).length} / ${allTasks.length}`} color="var(--good)" sub="gesamt" />
      </div>

      {/* ── Efficiency Score ───────────────────────────────────── */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div className="uppercase-label" style={{ marginBottom: 4 }}>Efficiency Score</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Deep Work % vs. Busy Work — aus echten Timer-Daten</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: 42, fontWeight: 700, color: effColor, lineHeight: 1 }}>
              {effScore !== null ? `${effScore}%` : "—"}
            </div>
            <div style={{ fontSize: 11, color: effColor, letterSpacing: "0.1em", fontWeight: 700, marginTop: 4 }}>{effLabel}</div>
          </div>
        </div>

        {totalTrackedSec > 0 ? (
          <>
            {/* Split bar */}
            <div style={{ height: 24, display: "flex", overflow: "hidden", marginBottom: 10, background: "var(--line-soft)" }}>
              {deepWorkSec > 0 && (
                <div style={{
                  width: `${(deepWorkSec / totalTrackedSec) * 100}%`,
                  background: effColor, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: "#0a0a0c",
                  transition: "width .5s ease", minWidth: 32,
                }}>
                  {Math.round((deepWorkSec / totalTrackedSec) * 100)}%
                </div>
              )}
              {busyWorkSec > 0 && (
                <div style={{
                  flex: 1, background: "var(--warn)", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: "#0a0a0c",
                }}>
                  {Math.round((busyWorkSec / totalTrackedSec) * 100)}%
                </div>
              )}
            </div>
            {/* Legend */}
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 12, height: 12, background: effColor }} />
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  Deep Work — {secToH(deepWorkSec)} ({Math.round((deepWorkSec / totalTrackedSec) * 100)}%)
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 12, height: 12, background: "var(--warn)" }} />
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  Busy Work / Side Quests — {secToH(busyWorkSec)} ({Math.round((busyWorkSec / totalTrackedSec) * 100)}%)
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 12, height: 12, background: "var(--line-soft)", border: "1px solid var(--line)" }} />
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Gesamt — {secToH(totalTrackedSec)}</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 12 }}>
            Noch keine Timer-Daten. Starte Tasks im Dashboard und komm zurück.
          </div>
        )}
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
                        background: kr.isSideQuest ? "var(--warn)" : kr.color,
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
                    <div style={{ width: `${pct * 100}%`, background: p.color, transition: "width .4s ease" }} />
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

      {/* ── Wochen-Delta (Truth Loop static) ───────────────────── */}
      <div className="uppercase-label" style={{ marginBottom: 10 }}>Wochen-Delta (Truth Loop)</div>
      <div style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 80px 100px", padding: "10px 18px", borderBottom: "1px solid var(--line-soft)" }}>
          {["TAG", "PLAN VS REALITÄT", "PLAN", "REAL", "DELTA"].map(h => (
            <span key={h} className="uppercase-label" style={{ textAlign: h === "TAG" ? "left" : "right" }}>{h}</span>
          ))}
        </div>
        {TRUTH_LOOP.days.map((day, i) => {
          const plan = TRUTH_LOOP.plan[i];
          const real = TRUTH_LOOP.reality[i];
          const delta = real - plan;
          const maxV = Math.max(...TRUTH_LOOP.plan);
          return (
            <div key={day} style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 80px 100px", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--line-soft)" }}>
              <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{day}</span>
              <div style={{ position: "relative", height: 20, margin: "0 8px" }}>
                <div style={{ position: "absolute", inset: "8px 0", background: "var(--line-soft)" }} />
                <div style={{ position: "absolute", top: 4, left: 0, height: 5, width: `${(plan / maxV) * 100}%`, background: "var(--text-faint)" }} />
                <div style={{ position: "absolute", bottom: 4, left: 0, height: 5, width: `${(real / maxV) * 100}%`, background: delta < 0 ? "rgba(214,50,74,0.7)" : "var(--good)" }} />
              </div>
              <span className="mono" style={{ textAlign: "right", color: "var(--text-dim)", fontSize: 12 }}>{plan}h</span>
              <span className="mono" style={{ textAlign: "right", fontSize: 12 }}>{real}h</span>
              <span className="mono" style={{ textAlign: "right", fontWeight: 700, fontSize: 12, color: delta < 0 ? "var(--danger)" : "var(--good)" }}>{fmtH(delta)}</span>
            </div>
          );
        })}
      </div>
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
