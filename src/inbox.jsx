// Inbox — Quick Capture + Daily Task List + POV/KR-Assign
// Route: "inbox"

function InboxPage({ inbox, setInbox, userPovs }) {
  const [input,       setInput]       = React.useState("");
  const [assigningId, setAssigningId] = React.useState(null);
  const [pickPov,     setPickPov]     = React.useState("personal");

  // ── Helpers ────────────────────────────────────────────────────────────
  const addTask = function() {
    var txt = input.trim();
    if (!txt) return;
    setInbox(function(prev) {
      return prev.concat([{
        id: "inbox_" + Date.now(),
        text: txt,
        ts: new Date().toISOString(),
        done: false,
        doneTs: null,
      }]);
    });
    setInput("");
  };

  const toggleDone = function(id) {
    var now = new Date().toISOString();
    setInbox(function(prev) {
      return prev.map(function(t) {
        return t.id === id
          ? Object.assign({}, t, { done: !t.done, doneTs: t.done ? null : now })
          : t;
      });
    });
  };

  const deleteTask = function(id) {
    setInbox(function(prev) { return prev.filter(function(t) { return t.id !== id; }); });
  };

  const assignTask = function(taskId, povId, krId, krTitle) {
    var found = null;
    for (var i = 0; i < inbox.length; i++) { if (inbox[i].id === taskId) { found = inbox[i]; break; } }
    if (!found) return;

    // Save to lifeos_tasks_${povId}
    var existing = [];
    try { existing = JSON.parse(LS.getItem("lifeos_tasks_" + povId) || "[]"); } catch {}
    var newTask = { id: "t_" + Date.now(), text: found.text, krId: krId || null, elapsed: 0, done: false };
    LS.setItem("lifeos_tasks_" + povId, JSON.stringify(existing.concat([newTask])));
    window.dispatchEvent(new CustomEvent("lifeos-projects-updated"));

    // Remove from inbox
    setInbox(function(prev) { return prev.filter(function(t) { return t.id !== taskId; }); });
    setAssigningId(null);
  };

  // ── POVs ───────────────────────────────────────────────────────────────
  var basePovs = [
    { id: "personal", label: "Personal",     color: "#8b5cf6" },
    { id: "founder",  label: "Professional", color: "#2f8bff" },
    { id: "student",  label: "Education",    color: "#e11d48" },
    { id: "athlete",  label: "Health",       color: "#10b981" },
  ];
  var allPovs = basePovs.concat(userPovs || []);

  var getKRs = function(povId) {
    try {
      var krs = window.POV_DATA && window.POV_DATA[povId] && window.POV_DATA[povId].objective && window.POV_DATA[povId].objective.keyResults;
      return krs || [];
    } catch { return []; }
  };

  // ── Computed lists ─────────────────────────────────────────────────────
  var todayStr = new Date().toISOString().slice(0, 10);

  var fmtTime = function(ts) {
    try {
      var d = new Date(ts);
      return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
    } catch { return "--:--"; }
  };

  var isOverdue = function(task) {
    if (!task.ts) return false;
    return task.ts.slice(0, 10) < todayStr;
  };

  var pending   = inbox.filter(function(t) { return !t.done; });
  var doneToday = inbox.filter(function(t) { return t.done && t.doneTs && t.doneTs.slice(0, 10) === todayStr; });
  var pickKRs   = getKRs(pickPov);

  // ── Styles ─────────────────────────────────────────────────────────────
  var rowStyle = {
    display: "flex", alignItems: "center", gap: 14,
    padding: "10px 0", borderBottom: "1px solid var(--line-soft)",
  };
  var monoTimeStyle = {
    fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
    letterSpacing: "0.04em", flexShrink: 0, minWidth: 38,
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>

      {/* Header + Quick Capture */}
      <div style={{ padding: "28px 48px 20px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 20 }}>
          <div className="uppercase-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="list" size={11} color="var(--text-faint)" />
            {"Inbox"}
          </div>
          {pending.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "'JetBrains Mono',monospace" }}>
              {pending.length + " offen"}
            </span>
          )}
        </div>

        {/* Input row */}
        <div style={{ display: "flex" }}>
          <input
            value={input}
            onChange={function(e) { setInput(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
            placeholder={"Task hinzufuegen — Enter zum Speichern"}
            autoFocus
            style={{
              flex: 1, background: "var(--panel)", border: "1px solid var(--line)",
              borderRight: "none", color: "var(--text)", padding: "10px 16px",
              fontSize: 14, outline: "none", fontFamily: "inherit",
            }}
          />
          <button onClick={addTask} style={{
            background: "var(--accent)", border: "none", color: "#0a0a0c",
            padding: "10px 20px", cursor: "pointer",
            fontSize: 18, lineHeight: 1, fontFamily: "inherit",
          }}>{" + "}</button>
        </div>
      </div>

      {/* List area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 48px 48px" }}>

        {/* ── OFFEN ── */}
        {pending.length > 0 && (
          <div style={{ paddingTop: 24 }}>
            <div className="uppercase-label" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              {"OFFEN"}
              <span style={{
                background: "var(--panel-2)", color: "var(--text-faint)",
                fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 2,
              }}>{pending.length}</span>
            </div>

            {pending.map(function(task) {
              var over   = isOverdue(task);
              var isAss  = assigningId === task.id;
              return (
                <div key={task.id}>
                  <div style={rowStyle}>
                    {/* Checkbox */}
                    <button onClick={function() { toggleDone(task.id); }} style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      background: "transparent",
                      border: "1.5px solid " + (over ? "var(--warn)" : "var(--line)"),
                      cursor: "pointer", padding: 0,
                    }} />

                    {/* Time */}
                    <span style={Object.assign({}, monoTimeStyle, { color: over ? "var(--warn)" : "var(--text-faint)" })}>
                      {fmtTime(task.ts)}
                    </span>

                    {/* Text */}
                    <span style={{
                      flex: 1, fontSize: 13, lineHeight: 1.4,
                      color: over ? "var(--warn)" : "var(--text)",
                    }}>{task.text}</span>

                    {/* Overdue tag */}
                    {over && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--warn)", flexShrink: 0 }}>
                        {"UEBERFAELLIG"}
                      </span>
                    )}

                    {/* Delete */}
                    <button onClick={function() { deleteTask(task.id); }} style={{
                      background: "none", border: "none", color: "var(--text-faint)",
                      cursor: "pointer", padding: "4px 2px", flexShrink: 0, opacity: 0.45,
                    }}>
                      <Icon name="x" size={12} />
                    </button>

                    {/* Assign */}
                    <button onClick={function() { setAssigningId(isAss ? null : task.id); setPickPov("personal"); }} style={{
                      background: isAss ? "var(--accent-soft)" : "transparent",
                      border: "1px solid " + (isAss ? "var(--accent-line)" : "var(--line)"),
                      color: isAss ? "var(--accent)" : "var(--text-faint)",
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                      padding: "4px 12px", cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
                    }}>{"-> ZUTEILEN"}</button>
                  </div>

                  {/* Assign picker */}
                  {isAss && (
                    <div style={{
                      marginLeft: 32, marginBottom: 8,
                      background: "var(--panel)", border: "1px solid var(--line)",
                      padding: "14px 16px",
                    }}>
                      {/* POV tabs */}
                      <div className="uppercase-label" style={{ marginBottom: 8 }}>{"POV"}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {allPovs.map(function(p) {
                          var isActive = pickPov === p.id;
                          return (
                            <button key={p.id} onClick={function() { setPickPov(p.id); }} style={{
                              padding: "4px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                              background: isActive ? (p.color || "var(--accent)") : "transparent",
                              border: "1px solid " + (isActive ? (p.color || "var(--accent)") : "var(--line)"),
                              color: isActive ? "#0a0a0c" : "var(--text-faint)",
                              cursor: "pointer", fontFamily: "inherit",
                            }}>{p.label.toUpperCase()}</button>
                          );
                        })}
                      </div>

                      {/* KR label */}
                      <div className="uppercase-label" style={{ marginBottom: 6 }}>{"KEY RESULT (optional)"}</div>

                      {/* No KR */}
                      <button onClick={function() { assignTask(task.id, pickPov, null, null); }} style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "7px 12px", marginBottom: 4,
                        background: "transparent", border: "1px solid var(--line-soft)",
                        color: "var(--text-dim)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      }}>{"Kein Key Result — direkt zu " + (allPovs.find(function(p) { return p.id === pickPov; }) || {}).label + " hinzufuegen"}</button>

                      {/* KR options */}
                      {pickKRs.map(function(kr) {
                        return (
                          <button key={kr.id} onClick={function() { assignTask(task.id, pickPov, kr.id, kr.title); }} style={{
                            display: "block", width: "100%", textAlign: "left",
                            padding: "7px 12px", marginBottom: 4,
                            background: "transparent", border: "1px solid var(--line-soft)",
                            color: "var(--text)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                          }}>
                            <span style={{ color: "var(--accent)", marginRight: 8 }}>{"KR:"}</span>
                            {kr.title}
                          </button>
                        );
                      })}

                      {pickKRs.length === 0 && (
                        <div style={{ fontSize: 11, color: "var(--text-faint)", fontStyle: "italic", padding: "4px 12px" }}>
                          {"Keine Key Results fuer diesen POV konfiguriert."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ERLEDIGT HEUTE ── */}
        {doneToday.length > 0 && (
          <div style={{ paddingTop: 32 }}>
            <div className="uppercase-label" style={{ marginBottom: 10, opacity: 0.5 }}>{"ERLEDIGT HEUTE"}</div>
            {doneToday.map(function(task) {
              return (
                <div key={task.id} style={Object.assign({}, rowStyle, { opacity: 0.45 })}>
                  <button onClick={function() { toggleDone(task.id); }} style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    background: "var(--accent)", border: "1.5px solid var(--accent)",
                    cursor: "pointer", padding: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="check" size={11} color="#0a0a0c" strokeWidth={3} />
                  </button>
                  <span style={Object.assign({}, monoTimeStyle, { color: "var(--text-faint)" })}>
                    {fmtTime(task.doneTs || task.ts)}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text-faint)", textDecoration: "line-through" }}>{task.text}</span>
                  <button onClick={function() { deleteTask(task.id); }} style={{
                    background: "none", border: "none", color: "var(--text-faint)",
                    cursor: "pointer", padding: "4px 2px", flexShrink: 0,
                  }}>
                    <Icon name="x" size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {pending.length === 0 && doneToday.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", paddingTop: 100, gap: 12,
          }}>
            <Icon name="list" size={36} color="var(--text-faint)" strokeWidth={1} />
            <div style={{ fontSize: 13, color: "var(--text-faint)" }}>{"Inbox ist leer."}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", opacity: 0.6 }}>
              {"Task eingeben und Enter druecken."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
