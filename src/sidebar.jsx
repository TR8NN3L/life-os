// Left rail — brand, Main Quest, POV toggle, nav, user.

function Sidebar({ route, setRoute, pov, setPov }) {
  const items = [
    { id: "dashboard",    label: "Dashboard" },
    { id: "focus",        label: "Focus" },
    { id: "missioncontrol", label: "Mission Control" },
    { id: "planner",      label: "Planner" },
    { id: "insights",     label: "Insights" },
  ];

  return (
    <aside style={{
      width: 220, flex: "0 0 220px", background: "var(--bg)",
      borderRight: "1px solid var(--line)",
      display: "flex", flexDirection: "column", padding: "20px 0",
    }}>
      {/* brand — fixed (logo + name don't theme with POV) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px 24px" }}>
        <div style={{ width: 22, height: 22, background: "#e8e8ec", borderRadius: 3 }} />
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.16em", color: "#e8e8ec" }}>LIFE OS</div>
      </div>

      {/* main quest — pov-aware, progress from done tasks */}
      {(() => {
        const mq = (POV_DATA[pov] || POV_DATA.founder).mainQuest;
        const hardcodedTasks = (POV_DATA[pov] || POV_DATA.founder).tasksToday || [];
        let customTasks = [];
        try { customTasks = JSON.parse(localStorage.getItem(`lifeos_tasks_${pov}`) || "[]"); } catch {}
        const allTasks = [...hardcodedTasks, ...customTasks];
        let done = new Set();
        try { done = new Set(JSON.parse(localStorage.getItem(`lifeos_done_${pov}`) || "[]")); } catch {}
        const computedProgress = allTasks.length > 0
          ? allTasks.filter(t => done.has(t.id)).length / allTasks.length
          : 0;
        return (
          <div style={{ padding: "0 20px 18px" }}>
            <div className="uppercase-label" style={{ color: "var(--accent)", marginBottom: 6 }}>Main Quest</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, lineHeight: 1.25 }}>{mq.title}</div>
            <ProgressBar value={computedProgress} color="var(--accent)" height={3} />
            <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 8, letterSpacing: "0.05em" }}>
              {Math.round(computedProgress * 100)}% · {mq.period}
            </div>
          </div>
        );
      })()}

      {/* POV toggle */}
      <div style={{ padding: "16px 12px 8px", borderTop: "1px solid var(--line-soft)" }}>
        <div className="uppercase-label" style={{ padding: "0 8px 8px" }}>POV Toggle</div>
        {POVS.map((p) => {
          const active = pov === p.id;
          return (
            <button key={p.id}
              onClick={() => { setPov(p.id); setRoute("dashboard"); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 12px", marginBottom: 2,
                background: active ? "var(--accent-soft)" : "transparent",
                border: "none", borderLeft: active ? `2px solid var(--accent)` : "2px solid transparent",
                color: active ? "var(--text)" : "var(--text-faint)",
                cursor: "pointer", transition: "all .15s",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--text-dim)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--text-faint)"; }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</div>
              <div style={{ fontSize: 10.5, color: active ? "var(--accent)" : "var(--text-faint)", letterSpacing: "0.04em", marginTop: 2 }}>{p.sub}</div>
            </button>
          );
        })}
      </div>

      {/* nav */}
      <nav style={{ padding: "16px 12px", borderTop: "1px solid var(--line-soft)", flex: 1 }}>
        {items.map((it) => {
          const active = route === it.id;
          return (
            <button key={it.id} onClick={() => setRoute(it.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "11px 12px", marginBottom: 2,
                background: active ? "var(--accent-soft)" : "transparent",
                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                color: active ? "var(--text)" : "var(--text-faint)",
                fontWeight: active ? 600 : 500, fontSize: 13,
                border: "none", cursor: "pointer", transition: "color .15s",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--text-dim)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--text-faint)"; }}
            >{it.label}</button>
          );
        })}
      </nav>

      {/* user — fixed (name doesn't theme with POV per spec) */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--line-soft)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "#e8e8ec",
          display: "grid", placeItems: "center", color: "#0a0a0c", fontWeight: 700, fontSize: 13,
        }}>L</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 12.5, color: "#e8e8ec" }}>Lennart</div>
          <div style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.05em" }}>Executive Mode</div>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
