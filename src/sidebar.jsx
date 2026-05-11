// Left rail — brand, Main Quest, POV toggle, nav, user/settings.

const POV_COLORS = ["#8b5cf6","#2f8bff","#10b981","#e11d48","#f97316","#06b6d4","#a855f7","#eab308","#ec4899","#14b8a6"];

function PovModal({ initial, onSave, onDelete, onClose }) {
  const isEdit = !!initial;
  const [label, setLabel] = React.useState(initial?.label || "");
  const [sub,   setSub]   = React.useState(initial?.sub   || "");
  const [color, setColor] = React.useState(initial?.color || POV_COLORS[1]);

  const valid = label.trim().length > 0;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 360, background: "var(--panel)", border: "1px solid var(--line)",
        padding: "28px 28px 24px",
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.12em", marginBottom: 20 }}>
          {isEdit ? "POV BEARBEITEN" : "NEUEN POV HINZUFÜGEN"}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="uppercase-label" style={{ marginBottom: 6 }}>Name</div>
          <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
            placeholder="z.B. Business, Studium, Sport…"
            style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)",
              color: "var(--text)", padding: "9px 12px", fontSize: 13, outline: "none",
              fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="uppercase-label" style={{ marginBottom: 6 }}>Untertitel</div>
          <input value={sub} onChange={e => setSub(e.target.value)}
            placeholder="z.B. Q2 2026 · Vertrieb"
            style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)",
              color: "var(--text)", padding: "9px 12px", fontSize: 13, outline: "none",
              fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div className="uppercase-label" style={{ marginBottom: 8 }}>Farbe</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {POV_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 28, height: 28, borderRadius: 4, background: c, border: "none",
                outline: color === c ? `2px solid #fff` : "2px solid transparent",
                outlineOffset: 2, cursor: "pointer", padding: 0,
              }} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {isEdit && (
            <button onClick={onDelete} style={{
              padding: "9px 16px", background: "var(--danger-soft)", border: "1px solid var(--danger)",
              color: "var(--danger)", fontSize: 11, letterSpacing: "0.1em", cursor: "pointer", fontFamily: "inherit",
            }}>LÖSCHEN</button>
          )}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button onClick={onClose} style={{
              padding: "9px 16px", background: "transparent", border: "1px solid var(--line)",
              color: "var(--text-faint)", fontSize: 11, letterSpacing: "0.1em", cursor: "pointer", fontFamily: "inherit",
            }}>ABBRECHEN</button>
            <button onClick={() => valid && onSave({ label: label.trim(), sub: sub.trim(), color })}
              disabled={!valid}
              style={{
                padding: "9px 20px", background: "var(--accent)", border: "none",
                color: "#0a0a0c", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                cursor: valid ? "pointer" : "default", opacity: valid ? 1 : 0.4, fontFamily: "inherit",
              }}>SPEICHERN</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ onClose, userName, setUserName, apiKey, setApiKey, pushStatus, setPushStatus, pushLoading, setPushLoading, signOut, resetAllData }) {
  const [editingName, setEditingName] = React.useState(false);
  const [nameInput,   setNameInput]   = React.useState(userName);
  const [activeTab,   setActiveTab]   = React.useState("profile"); // profile | ai | notifications | system

  const saveName = () => {
    const v = nameInput.trim();
    setUserName(v);
    LS.setItem("lifeos_user_name", v);
    setEditingName(false);
  };

  const tabs = [
    { id: "profile",       label: "Profil" },
    { id: "ai",            label: "KI" },
    { id: "notifications", label: "Notifications" },
    { id: "system",        label: "System" },
  ];

  const renderSection = (title, children) => (
    <div style={{ marginBottom: 28 }}>
      <div className="uppercase-label" style={{ marginBottom: 14, color: "var(--text-faint)", letterSpacing: "0.18em" }}>{title}</div>
      {children}
    </div>
  );

  const renderRow = (label, description, children) => (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, padding: "14px 0", borderBottom: "1px solid var(--line-soft)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: description ? 3 : 0 }}>{label}</div>
        {description && <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.5 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0, minWidth: 180 }}>{children}</div>
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 600,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 580, maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 60px)",
        background: "var(--panel)", border: "1px solid var(--line)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.14em" }}>EINSTELLUNGEN</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 18, cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Sidebar tabs */}
          <div style={{ width: 140, borderRight: "1px solid var(--line)", padding: "16px 0", flexShrink: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 20px", background: "none", border: "none",
                borderLeft: activeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                color: activeTab === t.id ? "var(--text)" : "var(--text-faint)",
                fontWeight: activeTab === t.id ? 600 : 400,
                fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>{t.label}</button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>

            {/* ── PROFIL ── */}
            {activeTab === "profile" && renderSection("Profil",
              renderRow("Dein Name", "Wird im Interface angezeigt.",
                editingName ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input autoFocus value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                      style={{ flex: 1, background: "var(--panel-2)", border: "1px solid var(--accent-line)", color: "var(--text)", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    <button onClick={saveName} style={{ background: "var(--accent)", border: "none", color: "#0a0a0c", padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>✓</button>
                  </div>
                ) : (
                  <button onClick={() => { setNameInput(userName); setEditingName(true); }} style={{
                    width: "100%", textAlign: "left", background: "var(--panel-2)",
                    border: "1px solid var(--line)", color: userName ? "var(--text)" : "var(--text-faint)",
                    padding: "8px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}>{userName || "Name eingeben…"}</button>
                )
              )
            )}

            {/* ── KI ── */}
            {activeTab === "ai" && renderSection("Künstliche Intelligenz",
              renderRow("Anthropic API Key", "Für KI-Funktionen (OKR-Wizard, Insights). Wird lokal gespeichert, nie übertragen.",
                <div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => { const v = e.target.value; setApiKey(v); LS.setItem("lifeos_openai_key", v.trim()); if (v.trim()) window.TUTORIAL?.onAction?.("api-key-set"); }}
                    placeholder="sk-ant-..."
                    style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                  {apiKey
                    ? <div style={{ fontSize: 11, color: "var(--good)", marginTop: 6, letterSpacing: "0.06em" }}>✓ Key gespeichert</div>
                    : <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6, lineHeight: 1.5 }}>Key unter <b>console.anthropic.com</b> → API Keys erstellen.</div>}
                </div>
              )
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeTab === "notifications" && renderSection("Push Notifications",
              <div>
                {renderRow("Web Push", "Benachrichtigungen für Block-Start, Deadlines, Habits u.v.m. Funktioniert wenn der Tab offen ist, auf iOS/Android als PWA auch im Hintergrund.",
                  pushStatus === "granted" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--good)" }} />
                        <span style={{ fontSize: 12, color: "var(--good)", fontWeight: 600, letterSpacing: "0.06em" }}>AKTIV</span>
                      </div>
                      <button onClick={async () => {
                        setPushLoading(true);
                        await window.Push?.send({ title: "✅ Life OS", message: "Push funktioniert!" });
                        setPushLoading(false);
                      }} style={{
                        background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)",
                        padding: "8px 14px", fontSize: 11, letterSpacing: "0.1em", fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit", width: "100%",
                      }}>{pushLoading ? "SENDE…" : "TEST SENDEN"}</button>
                    </div>
                  ) : pushStatus === "denied" ? (
                    <div style={{ fontSize: 12, color: "var(--danger)", lineHeight: 1.6 }}>
                      Zugriff verweigert. Browser → 🔒 → Benachrichtigungen → Erlauben, dann Seite neu laden.
                    </div>
                  ) : (
                    <button onClick={async () => {
                      setPushLoading(true);
                      const perm = await window.Push?.requestPermission?.();
                      if (perm === "granted") await window.Push?.subscribe?.();
                      setPushStatus(perm || "denied");
                      setPushLoading(false);
                    }} disabled={pushLoading} style={{
                      width: "100%", padding: "10px 0",
                      background: "var(--accent-soft)", border: "1px solid var(--accent-line)",
                      color: "var(--accent)", fontSize: 12, letterSpacing: "0.1em",
                      fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      opacity: pushLoading ? 0.6 : 1,
                    }}>{pushLoading ? "WIRD AKTIVIERT…" : "🔔  PUSH AKTIVIEREN"}</button>
                  )
                )}
                {renderRow("PWA Status", "Für Hintergrund-Pushs auf iOS/Android: App zum Homescreen hinzufügen.",
                  <div style={{ fontSize: 12, color: window.Push?.isPWA?.() ? "var(--good)" : "var(--text-faint)", fontWeight: window.Push?.isPWA?.() ? 600 : 400 }}>
                    {window.Push?.isPWA?.() ? "✓ Läuft als PWA" : "Nicht installiert"}
                  </div>
                )}
              </div>
            )}

            {/* ── SYSTEM ── */}
            {activeTab === "system" && renderSection("System",
              <div>
                {renderRow("Tutorial", "Setzt den Onboarding-Fortschritt zurück und startet das Tutorial neu.",
                  <button onClick={() => { LS.removeItem("lifeos_tutorial_done"); window.location.reload(); }} style={{
                    width: "100%", padding: "9px 0", background: "transparent",
                    border: "1px solid var(--accent-line)", color: "var(--accent)",
                    fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>TUTORIAL NEU STARTEN</button>
                )}
                {renderRow("Alle Daten löschen", "Löscht Tasks, Fortschritte, Einstellungen und POVs. Nicht rückgängig machbar.",
                  <button onClick={() => { if (confirm("Alle Daten löschen? Das kann nicht rückgängig gemacht werden.")) { resetAllData(); onClose(); } }} style={{
                    width: "100%", padding: "9px 0", background: "transparent",
                    border: "1px solid var(--line)", color: "var(--text-faint)",
                    fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>DATEN ZURÜCKSETZEN</button>
                )}
                {renderRow("Account", "Meldet dich aus diesem Gerät ab.",
                  <button onClick={() => { signOut(); onClose(); }} style={{
                    width: "100%", padding: "9px 0", background: "var(--danger-soft)",
                    border: "1px solid var(--danger)", color: "var(--danger)",
                    fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>ABMELDEN</button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ route, setRoute, pov, setPov, userPovs, setUserPovs }) {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [povModal, setPovModal]         = React.useState(null); // null | "add" | {id,...}
  const [userName, setUserName]         = React.useState(() => LS.getItem("lifeos_user_name") || "");
  const [apiKey, setApiKey]             = React.useState(() => LS.getItem("lifeos_openai_key") || "");
  const [pushStatus, setPushStatus]     = React.useState(() => window.Push?.permissionState?.() || "default");
  const [pushLoading, setPushLoading]   = React.useState(false);

  const allPovs = [
    { id: "personal", label: "Personal", sub: "Persönliches Leben", color: "#8b5cf6" },
    ...userPovs,
  ];

  const canAddPov = userPovs.length < 4;

  const addPov = ({ label, sub, color }) => {
    const id = "pov_" + Date.now();
    // Register in global POV_DATA so components don't crash
    if (window.POV_DATA) window.POV_DATA[id] = window.emptyPovData ? window.emptyPovData(id) : { mainQuest: { title: "", progress: 0, period: "" }, objective: { title: "", period: "", keyResults: [] }, tasksToday: [] };
    const next = [...userPovs, { id, label, sub, color }];
    setUserPovs(next);
    LS.setItem("lifeos_user_povs", JSON.stringify(next));
    setPovModal(null);
  };

  const editPov = (id, { label, sub, color }) => {
    const next = userPovs.map(p => p.id === id ? { ...p, label, sub, color } : p);
    setUserPovs(next);
    LS.setItem("lifeos_user_povs", JSON.stringify(next));
    setPovModal(null);
  };

  const deletePov = (id) => {
    if (!confirm("Möchtest du diesen POV wirklich löschen?\nDas kann nicht rückgängig gemacht werden.")) return;
    const next = userPovs.filter(p => p.id !== id);
    setUserPovs(next);
    LS.setItem("lifeos_user_povs", JSON.stringify(next));
    if (pov === id) setPov("personal");
    setPovModal(null);
  };

  const resetAllData = async () => {
    // 1. Clear localStorage immediately
    const keys = Object.keys(localStorage).filter(k => k.startsWith("lifeos_"));
    keys.forEach(k => { if (k !== "lifeos_guest") localStorage.removeItem(k); });
    // 2. Wipe Supabase cloud rows so syncDown on reload finds nothing
    if (window.sbAuth?.resetCloud) await window.sbAuth.resetCloud();
    window.location.reload();
  };

  const signOut = async () => {
    const isGuest = LS.getItem("lifeos_guest") === "1";
    if (isGuest) LS.removeItem("lifeos_guest");
    else await window.sbAuth.signOut();
    window.location.reload();
  };

  const activePov = allPovs.find(p => p.id === pov) || allPovs[0];
  const initials = userName ? userName.slice(0, 2).toUpperCase() : "?";

  const navItems = [
    { id: "dashboard",      label: "Dashboard" },
    { id: "focus",          label: "Focus" },
    { id: "missioncontrol", label: "Mission Control" },
    { id: "planner",        label: "Planner" },
    { id: "insights",       label: "Insights" },
  ];

  return (
    <>
      <aside style={{
        width: 220, flex: "0 0 220px", background: "var(--bg)",
        borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column", padding: "20px 0",
      }}>
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px 24px" }}>
          <div style={{ width: 22, height: 22, background: "#e8e8ec", borderRadius: 3 }} />
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.16em", color: "#e8e8ec" }}>LIFE OS</div>
        </div>

        {/* main quest */}
        {(() => {
          // data-tutorial added to wrapper below
          const mq = (POV_DATA[pov] || POV_DATA.personal).mainQuest;
          const hardcodedTasks = (POV_DATA[pov] || POV_DATA.personal).tasksToday || [];
          let customTasks = [];
          try { customTasks = JSON.parse(LS.getItem(`lifeos_tasks_${pov}`) || "[]"); } catch {}
          const allTasks = [...hardcodedTasks, ...customTasks];
          let done = new Set();
          try { done = new Set(JSON.parse(LS.getItem(`lifeos_done_${pov}`) || "[]")); } catch {}
          const computedProgress = allTasks.length > 0
            ? allTasks.filter(t => done.has(t.id)).length / allTasks.length : 0;
          const mqTitle = mq.title || (activePov.label + " · Main Quest");
          return (
            <div data-tutorial="main-quest-sidebar" style={{ padding: "0 20px 18px" }}>
              <div className="uppercase-label" style={{ color: activePov.color, marginBottom: 6 }}>Main Quest</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, lineHeight: 1.25, color: "var(--text-dim)" }}>
                {mq.title || <span style={{ fontStyle: "italic", opacity: 0.5 }}>Noch nicht konfiguriert</span>}
              </div>
              <ProgressBar value={computedProgress} color={activePov.color} height={3} />
              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 8, letterSpacing: "0.05em" }}>
                {Math.round(computedProgress * 100)}% · {mq.period || "–"}
              </div>
            </div>
          );
        })()}

        {/* POV toggle */}
        <div data-tutorial="pov-section" style={{ padding: "16px 12px 8px", borderTop: "1px solid var(--line-soft)" }}>
          <div className="uppercase-label" style={{ padding: "0 8px 8px" }}>POV</div>
          {allPovs.map((p) => {
            const active = pov === p.id;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={() => { setPov(p.id); setRoute("dashboard"); }}
                  style={{
                    flex: 1, textAlign: "left",
                    padding: "10px 12px", marginBottom: 2,
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: "none", borderLeft: active ? `2px solid ${p.color}` : "2px solid transparent",
                    color: active ? "var(--text)" : "var(--text-faint)",
                    cursor: "pointer", transition: "all .15s",
                    "--accent-soft": p.color + "20",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--text-dim)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--text-faint)"; }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</div>
                  <div style={{ fontSize: 10.5, color: active ? p.color : "var(--text-faint)", letterSpacing: "0.04em", marginTop: 2 }}>{p.sub}</div>
                </button>
                {p.id !== "personal" && active && (
                  <button onClick={() => setPovModal(p)} style={{
                    background: "none", border: "none", color: "var(--text-faint)",
                    fontSize: 13, cursor: "pointer", padding: "4px 6px", lineHeight: 1,
                    opacity: 0.6,
                  }} title="Bearbeiten">✎</button>
                )}
              </div>
            );
          })}
          {canAddPov && (
            <button onClick={() => setPovModal("add")} style={{
              display: "flex", alignItems: "center", gap: 6,
              width: "100%", padding: "8px 12px", marginTop: 2,
              background: "transparent", border: "1px dashed var(--line)",
              color: "var(--text-faint)", fontSize: 11, letterSpacing: "0.1em",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 16, lineHeight: 1, marginBottom: 1 }}>+</span> POV HINZUFÜGEN
            </button>
          )}
        </div>

        {/* nav */}
        <nav style={{ padding: "16px 12px", borderTop: "1px solid var(--line-soft)", flex: 1 }}>
          {navItems.map((it) => {
            const active = route === it.id;
            return (
              <button key={it.id} data-tutorial={`nav-${it.id}`} onClick={() => { setRoute(it.id); window.TUTORIAL?.onAction?.(`route-${it.id}`); }}
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

        {/* Ignorance Debt */}
        {(() => {
          let plan = TRUTH_LOOP.plan;
          try { plan = JSON.parse(LS.getItem("lifeos_truth_plan") || "null") || TRUTH_LOOP.plan; } catch {}
          const reality = TRUTH_LOOP.reality;
          const planH  = plan.reduce((a, b) => a + b, 0);
          const realH  = reality.reduce((a, b) => a + b, 0);
          const debt   = planH - realH;
          if (planH === 0) return null;
          const debtPct = Math.min(1, Math.abs(debt) / planH);
          const isOk    = debt <= 0;
          const color   = isOk ? "var(--good)" : debt < 5 ? "var(--warn)" : "var(--danger)";
          return (
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line-soft)" }}>
              <div className="uppercase-label" style={{ marginBottom: 8 }}>Ignorance Debt</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span className="mono" style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>
                  {isOk ? "+" : "−"}{Math.abs(debt).toFixed(1)}h
                </span>
                <span style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                  {realH.toFixed(1)} / {planH.toFixed(1)}h
                </span>
              </div>
              <div style={{ height: 3, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: color, width: isOk ? "100%" : `${(1 - debtPct) * 100}%` }} />
              </div>
              <div style={{ fontSize: 9.5, color: "var(--text-faint)", marginTop: 6, letterSpacing: "0.06em" }}>
                {isOk ? "✓ Auf Kurs" : debt < 2 ? "△ Leichter Rückstand" : "✕ Kritischer Rückstand"}
              </div>
            </div>
          );
        })()}

        {/* user + settings toggle */}
        <div data-tutorial="settings-area" style={{ borderTop: "1px solid var(--line-soft)" }}>
          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: activePov.color,
              display: "grid", placeItems: "center", color: "#0a0a0c", fontWeight: 700, fontSize: 12,
              flexShrink: 0,
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: "#e8e8ec", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName || "Kein Name"}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.05em" }}>Life OS</div>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              title="Einstellungen"
              data-tutorial="settings-btn"
              style={{
                background: "none", border: "none", color: settingsOpen ? "var(--accent)" : "var(--text-faint)",
                fontSize: 16, cursor: "pointer", padding: "4px", lineHeight: 1,
                transition: "color .15s",
              }}
            >⚙</button>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          userName={userName}
          setUserName={setUserName}
          apiKey={apiKey}
          setApiKey={setApiKey}
          pushStatus={pushStatus}
          setPushStatus={setPushStatus}
          pushLoading={pushLoading}
          setPushLoading={setPushLoading}
          signOut={signOut}
          resetAllData={resetAllData}
        />
      )}

      {/* POV Modal */}
      {povModal && (
        <PovModal
          initial={povModal === "add" ? null : povModal}
          onSave={(data) => {
            if (povModal === "add") addPov(data);
            else editPov(povModal.id, data);
          }}
          onDelete={povModal !== "add" ? () => deletePov(povModal.id) : undefined}
          onClose={() => setPovModal(null)}
        />
      )}
    </>
  );
}

window.Sidebar = Sidebar;
