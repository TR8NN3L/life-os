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
function SettingsModal({ onClose, userName, setUserName, apiKey, setApiKey, pushStatus, setPushStatus, pushLoading, setPushLoading, signOut, resetAllData, onOpenPaywall, initialTab, onAccessGranted }) {
  const [editingName,    setEditingName]    = React.useState(false);
  const [nameInput,      setNameInput]      = React.useState(userName);
  const [activeTab,      setActiveTab]      = React.useState(initialTab || "profile");
  const [calUserId,      setCalUserId]      = React.useState(null);
  const [calCopied,      setCalCopied]      = React.useState(false);
  const [userEmail,      setUserEmail]      = React.useState(null);
  const [pwResetSent,    setPwResetSent]    = React.useState(false);
  const [pwResetLoading, setPwResetLoading] = React.useState(false);
  const [pwResetError,   setPwResetError]   = React.useState(null);
  const [signingOut, setSigningOut] = React.useState(false);
  // Abo-Tab state
  const [aboSubTab,  setAboSubTab]  = React.useState("code");
  const [aboCode,    setAboCode]    = React.useState("");
  const [aboLoading, setAboLoading] = React.useState(false);
  const [aboErr,     setAboErr]     = React.useState(null);
  const [aboSuccess, setAboSuccess] = React.useState(false);
  const [aboPlan,    setAboPlan]    = React.useState("monthly");
  const [langfusePk, setLangfusePk]       = React.useState(function() { return localStorage.getItem("lifeos_langfuse_pk") || ""; });
  const [langfuseSk, setLangfuseSk]       = React.useState(function() { return localStorage.getItem("lifeos_langfuse_sk") || ""; });
  const [icalFeeds, setIcalFeeds]         = React.useState(function() {
    try {
      var stored = localStorage.getItem("lifeos_ical_feeds");
      if (stored) return JSON.parse(stored);
      var old = localStorage.getItem("lifeos_ical_import_url");
      if (old) return [{ id: "f_0", url: old, label: "Mein Kalender" }];
      return [];
    } catch(e) { return []; }
  });
  const [icalNewUrl,   setIcalNewUrl]     = React.useState("");
  const [icalNewLabel, setIcalNewLabel]   = React.useState("");
  const [icalSubTab, setIcalSubTab]       = React.useState("url");
  const [icalImportOpen, setIcalImportOpen] = React.useState(true);
  const [icalAboOpen, setIcalAboOpen]       = React.useState(false);

  React.useEffect(() => {
    window._supabase?.auth?.getSession().then(({ data }) => {
      if (data?.session?.user?.id) setCalUserId(data.session.user.id);
      if (data?.session?.user?.email) setUserEmail(data.session.user.email);
    });
  }, []);

  const sendPasswordReset = async () => {
    if (!userEmail || pwResetLoading) return;
    setPwResetLoading(true);
    setPwResetError(null);
    try {
      const { error } = await window._supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (error) throw error;
      setPwResetSent(true);
    } catch (e) {
      setPwResetError(e.message || "Fehler beim Senden.");
    } finally {
      setPwResetLoading(false);
    }
  };

  const calUrl = calUserId
    ? `https://life-os-wine-eight.vercel.app/api/calendar?uid=${calUserId}`
    : null;

  const copyCalUrl = () => {
    if (!calUrl) return;
    navigator.clipboard.writeText(calUrl).then(() => {
      setCalCopied(true);
      setTimeout(() => setCalCopied(false), 2500);
    });
  };

  const saveName = () => {
    const v = nameInput.trim();
    setUserName(v);
    LS.setItem("lifeos_user_name", v);
    setEditingName(false);
  };

  const tabs = [
    { id: "profile",       label: "Profil" },
    { id: "abo",           label: "Abo & Zugang" },
    { id: "ai",            label: "KI" },
    { id: "notifications", label: "Push" },
    { id: "kalender",      label: "Kalender" },
    { id: "system",        label: "System" },
  ];

  const redeemAboCode = async () => {
    const c = aboCode.trim();
    if (!c || aboLoading) return;
    setAboLoading(true); setAboErr(null);
    try {
      const r = await fetch("/api/redeem-beta", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: calUserId, email: userEmail, code: c }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ungültiger Code");
      setAboSuccess(true);
      localStorage.setItem("lifeos_access", "1");
      localStorage.setItem("lifeos_access_ts", String(Date.now()));
      window.posthog?.capture("paywall_code_redeemed", { source: "settings" });
      setTimeout(() => { onAccessGranted && onAccessGranted(); onClose(); }, 1400);
    } catch (e) { setAboErr(e.message); } finally { setAboLoading(false); }
  };

  const startAboCheckout = async () => {
    if (aboLoading) return;
    setAboLoading(true); setAboErr(null);
    try {
      const r = await fetch("/api/create-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: calUserId, email: userEmail, plan: aboPlan }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      window.posthog?.capture("paywall_checkout_started", { plan: aboPlan, source: "settings" });
      window.location.href = d.url;
    } catch (e) { setAboErr(e.message); setAboLoading(false); }
  };

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
    <div onClick={onClose} data-tutorial="settings-modal-container" style={{
      position: "fixed", inset: 0, zIndex: 600,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} data-tutorial="settings-modal" style={{
        width: 580, maxWidth: "calc(100vw - 40px)",
        height: 520, maxHeight: "calc(100vh - 60px)",
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
              <div>
                {renderRow("Dein Name", "Wird im Interface angezeigt.",
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
                )}
                {renderRow("E-Mail", "Dein Account.",
                  <div style={{ padding: "8px 12px", background: "var(--panel-2)", border: "1px solid var(--line)", fontSize: 13, color: "var(--text-dim)", wordBreak: "break-all" }}>
                    {userEmail || "—"}
                  </div>
                )}
                {renderRow("Passwort", "Reset-Link an deine E-Mail senden.",
                  pwResetSent ? (
                    <div style={{ fontSize: 12, color: "var(--good)", padding: "8px 0" }}>✓ Reset-Link gesendet an {userEmail}</div>
                  ) : (
                    <div>
                      <button onClick={sendPasswordReset} disabled={!userEmail || pwResetLoading} style={{
                        width: "100%", padding: "8px 12px", background: "transparent",
                        border: "1px solid var(--line)", color: pwResetLoading ? "var(--text-faint)" : "var(--text-dim)",
                        fontSize: 12, letterSpacing: "0.1em", fontWeight: 600, cursor: userEmail ? "pointer" : "default",
                        fontFamily: "inherit", transition: "all .15s",
                      }}>{pwResetLoading ? "WIRD GESENDET…" : "PASSWORT ZURÜCKSETZEN"}</button>
                      {pwResetError && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>{pwResetError}</div>}
                    </div>
                  )
                )}
              </div>
            )}

            {/* ── KI ── */}
            {activeTab === "ai" && renderSection("Künstliche Intelligenz",
              <div>
                <div style={{ padding: "16px 0", borderBottom: "1px solid var(--line-soft)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Anthropic API Key</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.55, marginBottom: 12 }}>
                    Fuer KI-Funktionen (OKR-Wizard, Daily Missions, Tagesplan). Wird nur lokal gespeichert.
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-faint)", background: "var(--panel-2)", border: "1px solid var(--line-soft)", padding: "8px 10px", lineHeight: 1.55, marginBottom: 12 }}>
                    {"DATENSCHUTZ: Deine Eingaben (OKR-Titel, Ziele, Aufgaben) werden zur KI-Generierung direkt an Anthropic-Server (USA) uebertragen. Anthropic verarbeitet diese Daten gemaess DSGVO-konformem Auftragsverarbeitungsvertrag. Keine Speicherung durch Hormetic."}
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => { const v = e.target.value; setApiKey(v); LS.setItem("lifeos_openai_key", v.trim()); if (v.trim()) window.TUTORIAL?.onAction?.("api-key-set"); }}
                    placeholder="sk-ant-..."
                    style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                  {apiKey
                    ? <div style={{ fontSize: 11, color: "var(--good)", marginTop: 8, letterSpacing: "0.06em" }}>&#x2713; Key gespeichert</div>
                    : <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8, lineHeight: 1.5 }}>Key unter console.anthropic.com / API Keys / Create Key.</div>}
                </div>
                <div style={{ padding: "16px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Langfuse Observability</div>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, color: (langfusePk && langfuseSk) ? "var(--good)" : "var(--text-faint)", background: (langfusePk && langfuseSk) ? "var(--good-soft)" : "var(--panel-2)", padding: "2px 7px" }}>
                      {(langfusePk && langfuseSk) ? "AKTIV" : "OPTIONAL"}
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.55, marginBottom: 12 }}>
                    Trackt alle KI-Aufrufe (Latenz, Token, Prompts). Dashboard auf cloud.langfuse.com / EU-Region / Project Keys.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4, letterSpacing: "0.06em" }}>PUBLIC KEY</div>
                      <input
                        type="text"
                        value={langfusePk}
                        onChange={e => { const v = e.target.value.trim(); setLangfusePk(v); localStorage.setItem("lifeos_langfuse_pk", v); }}
                        placeholder="pk-lf-..."
                        style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4, letterSpacing: "0.06em" }}>SECRET KEY</div>
                      <input
                        type="password"
                        value={langfuseSk}
                        onChange={e => { const v = e.target.value.trim(); setLangfuseSk(v); localStorage.setItem("lifeos_langfuse_sk", v); }}
                        placeholder="sk-lf-..."
                        style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  {(langfusePk && langfuseSk) && <div style={{ fontSize: 11, color: "var(--good)", marginTop: 8, letterSpacing: "0.06em" }}>&#x2713; Alle KI-Calls werden getrackt</div>}
                </div>
              </div>
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
                <div style={{ padding: "14px 0", borderBottom: "1px solid var(--line-soft)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Automatische Trigger</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 10, lineHeight: 1.5 }}>Läuft im Hintergrund solange die App offen ist.</div>
                  <div style={{ background: "var(--panel-2)", border: "1px solid var(--line-soft)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                    {[
                      ["🔁", "21:00", "Habit-Erinnerung (wenn nicht alle gecheckt)"],
                      ["🚨", "Debt > 5h", "Ignorance Debt Alarm"],
                      ["⚡", "Block-Start", "Beim Starten eines Planner-Blocks"],
                    ].map(([emoji, key, desc]) => (
                      <div key={key} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 13, flexShrink: 0 }}>{emoji}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-dim)", flexShrink: 0, minWidth: 72 }}>{key}</span>
                        <span style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.45 }}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── FOCUS LOCK ── */}
            {activeTab === "notifications" && (
              <div style={{ marginTop: 20 }}>
                <div className="uppercase-label" style={{ marginBottom: 14, color: "var(--text-faint)", letterSpacing: "0.18em" }}>Focus Lock — iPhone Setup</div>
                <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.6, marginBottom: 14 }}>
                  PWAs können Apps nicht direkt sperren. Screen Time manuell einrichten — dauert 2 Minuten.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Einstellungen → Bildschirmzeit → App-Limits → Limit hinzufügen",
                    "Kategorie: Soziale Netzwerke + Unterhaltung → 0 Min / Tag",
                    "Einstellungen → Fokus → Arbeit → Apps: nur Life OS + Telefon erlauben",
                    "Fokus-Automation: Standort oder Zeit → Arbeit-Fokus automatisch aktivieren",
                    "Passcode für Screen Time setzen → niemand kann Limits umgehen",
                  ].map((text, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: "var(--panel-2)", border: "1px solid var(--line-soft)" }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        background: "var(--accent-soft)", border: "1px solid var(--accent-line)",
                        color: "var(--accent)", fontSize: 10, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{i + 1}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)", lineHeight: 1.5 }}>{text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ABO & ZUGANG ── */}
            {activeTab === "abo" && (
              <div style={{ padding: "4px 0" }}>
                {/* Sub-tabs */}
                <div style={{ display: "flex", background: "var(--bg)", border: "1px solid var(--line)", padding: 3, marginBottom: 24 }}>
                  {[["code", "Beta-Code"], ["pay", "Pro freischalten"]].map(function(item) {
                    return React.createElement("button", {
                      key: item[0],
                      onClick: function() { setAboSubTab(item[0]); setAboErr(null); },
                      style: {
                        flex: 1, padding: "8px 0", border: "none", cursor: "pointer",
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
                        background: aboSubTab === item[0] ? "var(--accent)" : "transparent",
                        color: aboSubTab === item[0] ? "#0a0a0c" : "var(--text-faint)",
                        transition: "all .15s", fontFamily: "inherit",
                      }
                    }, item[1].toUpperCase());
                  })}
                </div>

                {/* Beta-Code */}
                {aboSubTab === "code" && !aboSuccess && (
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--text-faint)", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 8 }}>ZUGANGSCODE</div>
                    <input
                      autoFocus value={aboCode}
                      onChange={function(e) { setAboCode(e.target.value); }}
                      onKeyDown={function(e) { if (e.key === "Enter") redeemAboCode(); }}
                      placeholder="z.B. LifeOS BETA 2026"
                      style={{
                        width: "100%", background: "var(--bg)", border: "1px solid var(--line)",
                        borderLeft: "2px solid var(--accent)", color: "var(--text)",
                        padding: "11px 14px", fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: "0.06em", outline: "none", boxSizing: "border-box", marginBottom: 10,
                      }}
                    />
                    {aboErr && (
                      <div style={{ fontSize: 11.5, color: "var(--danger)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="x" size={12} color="var(--danger)" />
                        {aboErr}
                      </div>
                    )}
                    <button onClick={redeemAboCode} disabled={aboLoading || !aboCode.trim()} style={{
                      width: "100%", padding: "12px",
                      background: aboCode.trim() && !aboLoading ? "var(--accent)" : "var(--panel)",
                      color: aboCode.trim() && !aboLoading ? "#0a0a0c" : "var(--text-faint)",
                      border: "1px solid " + (aboCode.trim() ? "var(--accent)" : "var(--line)"),
                      fontWeight: 700, fontSize: 11, letterSpacing: "0.18em",
                      cursor: aboCode.trim() && !aboLoading ? "pointer" : "default",
                      fontFamily: "inherit",
                    }}>{aboLoading ? "WIRD GEPRÜFT…" : "EINLÖSEN →"}</button>
                    <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--text-faint)", letterSpacing: "0.04em" }}>
                      Beta-Code erhalten? Hier eingeben — sofortiger Zugang, kein Zahlungsmittel nötig.
                    </div>
                  </div>
                )}

                {aboSubTab === "code" && aboSuccess && (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent)", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="check" size={22} color="#0a0a0c" strokeWidth={2.5} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.16em", color: "var(--accent)" }}>ZUGANG AKTIVIERT</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 6 }}>Wird geladen…</div>
                  </div>
                )}

                {/* Pro freischalten */}
                {aboSubTab === "pay" && (
                  <div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                      {[
                        { id: "monthly", label: "MONATLICH", price: "9,99 €", sub: "pro Monat", badge: null },
                        { id: "yearly",  label: "JÄHRLICH",  price: "79,99 €", sub: "pro Jahr",  badge: "33% SPAREN" },
                      ].map(function(p) {
                        return React.createElement("button", {
                          key: p.id,
                          onClick: function() { setAboPlan(p.id); },
                          style: {
                            flex: 1, padding: "14px 12px", cursor: "pointer", textAlign: "left",
                            position: "relative",
                            background: aboPlan === p.id ? "var(--accent-soft)" : "var(--bg)",
                            border: "1px solid " + (aboPlan === p.id ? "var(--accent-line)" : "var(--line)"),
                            fontFamily: "inherit",
                          }
                        },
                          p.badge && React.createElement("span", { style: {
                            position: "absolute", top: -8, right: 8,
                            background: "var(--accent)", color: "#0a0a0c",
                            fontSize: 7.5, fontWeight: 800, letterSpacing: "0.12em", padding: "2px 6px",
                          }}, p.badge),
                          React.createElement("div", { style: { fontSize: 9, letterSpacing: "0.16em", fontWeight: 700, color: aboPlan === p.id ? "var(--accent)" : "var(--text-faint)", marginBottom: 6 }}, p.label),
                          React.createElement("div", { style: { fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}, p.price),
                          React.createElement("div", { style: { fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}, p.sub)
                        );
                      })}
                    </div>
                    {aboErr && (
                      <div style={{ fontSize: 11.5, color: "var(--danger)", marginBottom: 10 }}>{aboErr}</div>
                    )}
                    <button onClick={startAboCheckout} disabled={aboLoading} style={{
                      width: "100%", padding: "12px",
                      background: aboLoading ? "var(--panel)" : "var(--accent)",
                      color: aboLoading ? "var(--text-faint)" : "#0a0a0c",
                      border: "none", fontWeight: 700, fontSize: 11, letterSpacing: "0.18em",
                      cursor: aboLoading ? "default" : "pointer", fontFamily: "inherit",
                    }}>{aboLoading ? "WIRD GELADEN…" : "ZU STRIPE →"}</button>
                    <div style={{ marginTop: 10, fontSize: 10, color: "var(--text-faint)", textAlign: "center" }}>
                      Sichere Zahlung via Stripe · Jederzeit kündbar
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── KALENDER ── */}
            {activeTab === "kalender" && (
              <div>

                {/* Accordion: Kalender importieren */}
                <div style={{ marginBottom: 8, border: "1px solid var(--line)", background: "var(--panel-2)" }}>
                  <button onClick={function() { setIcalImportOpen(function(v) { return !v; }); }} style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase" }}>Kalender importieren</span>
                    <span style={{ fontSize: 10, color: "var(--text-faint)", marginLeft: 8 }}>{icalImportOpen ? "▲" : "▼"}</span>
                  </button>
                  {icalImportOpen && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ display: "flex", background: "var(--bg)", border: "1px solid var(--line)", padding: 3, marginBottom: 16 }}>
                        {[["url", "URL eingeben"], ["guide", "Anleitung"]].map(function(item) {
                          return React.createElement("button", {
                            key: item[0],
                            onClick: function() { setIcalSubTab(item[0]); },
                            style: {
                              flex: 1, padding: "7px 0", border: "none", cursor: "pointer",
                              fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
                              background: icalSubTab === item[0] ? "var(--accent)" : "transparent",
                              color: icalSubTab === item[0] ? "#0a0a0c" : "var(--text-faint)",
                              transition: "all .15s", fontFamily: "inherit",
                            }
                          }, item[1].toUpperCase());
                        })}
                      </div>
                      {icalSubTab === "url" && (
                        <div>
                          {/* Existing feeds */}
                          {icalFeeds.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                              {icalFeeds.map(function(feed, idx) {
                                var dotColors = ["#2f8bff","#8b5cf6","#069465","#d4a23c"];
                                return React.createElement("div", {
                                  key: feed.id,
                                  style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--bg)", border: "1px solid var(--line-soft)", marginBottom: 6 }
                                },
                                  React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: dotColors[idx % 4], flexShrink: 0 } }),
                                  React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                                    React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 2 } }, feed.label || "Kalender"),
                                    React.createElement("div", { style: { fontSize: 10, color: "var(--text-faint)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, feed.url)
                                  ),
                                  React.createElement("button", {
                                    onClick: function() {
                                      var next = icalFeeds.filter(function(f) { return f.id !== feed.id; });
                                      setIcalFeeds(next);
                                      localStorage.setItem("lifeos_ical_feeds", JSON.stringify(next));
                                    },
                                    style: { background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: "0 4px", lineHeight: 1, flexShrink: 0 }
                                  }, "x")
                                );
                              })}
                            </div>
                          )}
                          {/* Add new feed */}
                          <div style={{ fontSize: 10, letterSpacing: "0.14em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 8 }}>
                            {icalFeeds.length === 0 ? "KALENDER HINZUFUEGEN" : "WEITEREN KALENDER HINZUFUEGEN"}
                          </div>
                          <input
                            type="text"
                            value={icalNewLabel}
                            onChange={function(e) { setIcalNewLabel(e.target.value); }}
                            placeholder="Name (z.B. Privat, Arbeit)"
                            style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 10px", fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              type="text"
                              value={icalNewUrl}
                              onChange={function(e) { setIcalNewUrl(e.target.value); }}
                              placeholder="webcal://..."
                              style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 10px", fontSize: 12, outline: "none", fontFamily: "monospace", boxSizing: "border-box" }}
                            />
                            <button
                              onClick={function() {
                                var url = icalNewUrl.trim();
                                if (!url) return;
                                var feed = { id: "f_" + Date.now(), url: url, label: icalNewLabel.trim() || "Kalender" };
                                var next = icalFeeds.concat([feed]);
                                setIcalFeeds(next);
                                localStorage.setItem("lifeos_ical_feeds", JSON.stringify(next));
                                setIcalNewUrl("");
                                setIcalNewLabel("");
                              }}
                              disabled={!icalNewUrl.trim()}
                              style={{ padding: "8px 14px", background: icalNewUrl.trim() ? "var(--accent)" : "var(--panel-2)", border: "1px solid " + (icalNewUrl.trim() ? "var(--accent)" : "var(--line)"), color: icalNewUrl.trim() ? "#0a0a0c" : "var(--text-faint)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", cursor: icalNewUrl.trim() ? "pointer" : "default", fontFamily: "inherit", flexShrink: 0 }}
                            >+ ADD</button>
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 8 }}>
                            {icalFeeds.length > 0 ? (icalFeeds.length + " Kalender aktiv. URLs lokal gespeichert.") : "URLs werden lokal gespeichert, nie in die Cloud uebertragen."}
                          </div>
                        </div>
                      )}
                      {icalSubTab === "guide" && (
                        <div>
                          {[
                            { name: "Apple Kalender (Mac)",          steps: ["Kalender-App oeffnen", "Rechtsklick auf Kalender in linker Spalte", "Kalenderinformationen... / Link kopieren", "URL oben einfuegen"] },
                            { name: "Apple Kalender (iPhone / iPad)", steps: ["Kalender-App / Kalender (unten) antippen", "Kalender-Name / Kalender teilen", "Oeffentlicher Kalender aktivieren / Link kopieren", "URL oben einfuegen"] },
                            { name: "Google Calendar",                steps: ["calendar.google.com oeffnen", "Kalender-Name (links) / drei Punkte / Einstellungen", "Privatadresse im iCal-Format kopieren", "URL oben einfuegen"] },
                            { name: "Outlook (Web)",                  steps: ["outlook.com / Kalender oeffnen", "Einstellungen / Kalender veroeffentlichen", "ICS-Link kopieren", "URL oben einfuegen"] },
                            { name: "Samsung / Android",              steps: ["Google Calendar App nutzen", "Dann wie Google Calendar oben"] },
                          ].map(function(p) {
                            return React.createElement("div", { key: p.name, style: { marginBottom: 10, padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--line-soft)" } },
                              React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 6 } }, p.name),
                              p.steps.map(function(s, i) {
                                return React.createElement("div", { key: i, style: { display: "flex", gap: 8, marginBottom: 3 } },
                                  React.createElement("span", { style: { fontSize: 10, color: "var(--accent)", fontWeight: 700, flexShrink: 0 } }, (i + 1) + "."),
                                  React.createElement("span", { style: { fontSize: 11, color: "var(--text-dim)", lineHeight: 1.45 } }, s)
                                );
                              })
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Accordion: Kalender-Abo */}
                <div style={{ marginBottom: 8, border: "1px solid var(--line)", background: "var(--panel-2)" }}>
                  <button onClick={function() { setIcalAboOpen(function(v) { return !v; }); }} style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase" }}>Kalender-Abo</span>
                    <span style={{ fontSize: 10, color: "var(--text-faint)", marginLeft: 8 }}>{icalAboOpen ? "▲" : "▼"}</span>
                  </button>
                  {icalAboOpen && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 16 }}>
                        Planner-Bloecke als iCal-Feed abonnieren. Funktioniert in Apple, Google, Outlook, Samsung.
                      </div>
                      {calUrl ? (
                        <div>
                          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                            <div style={{ flex: 1, padding: "9px 12px", background: "var(--bg)", border: "1px solid var(--line)", fontSize: 10.5, color: "var(--text-faint)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{calUrl}</div>
                            <button onClick={copyCalUrl} style={{ padding: "9px 14px", background: calCopied ? "var(--good)" : "var(--accent-soft)", border: "1px solid " + (calCopied ? "var(--good)" : "var(--accent-line)"), color: calCopied ? "#0a0a0c" : "var(--accent)", fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>{calCopied ? "&#x2713; KOPIERT" : "KOPIEREN"}</button>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 10 }}>ANLEITUNG:</div>
                          {[
                            { name: "Apple Kalender (Mac)",          steps: ["Kalender-App / Ablage / Neues Kalenderabonnement", "URL einfuegen / Abonnieren"] },
                            { name: "Apple Kalender (iPhone / iPad)", steps: ["Einstellungen / Kalender / Accounts / Account hinzufuegen", "Andere / Kalenderabo / URL einfuegen / Sichern"] },
                            { name: "Google Calendar",                steps: ["calendar.google.com / + neben Weitere Kalender / Per URL", "URL einfuegen / Kalender hinzufuegen"] },
                            { name: "Outlook (Web / Desktop)",        steps: ["Kalender / Kalender hinzufuegen / Aus dem Internet", "URL einfuegen / Importieren"] },
                            { name: "Samsung / Android",              steps: ["Google Calendar App nutzen", "Dann wie Google Calendar oben"] },
                          ].map(function(p) {
                            return React.createElement("div", { key: p.name, style: { marginBottom: 10, padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--line-soft)" } },
                              React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 6 } }, p.name),
                              p.steps.map(function(s, i) {
                                return React.createElement("div", { key: i, style: { display: "flex", gap: 8, marginBottom: 3 } },
                                  React.createElement("span", { style: { fontSize: 10, color: "var(--accent)", fontWeight: 700, flexShrink: 0 } }, (i + 1) + "."),
                                  React.createElement("span", { style: { fontSize: 11, color: "var(--text-dim)", lineHeight: 1.45 } }, s)
                                );
                              })
                            );
                          })}
                          <div style={{ fontSize: 10.5, color: "var(--text-faint)", lineHeight: 1.6, marginTop: 10 }}>
                            Kalender-Apps synchronisieren alle paar Stunden automatisch.
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>Lade Benutzerdaten...</div>
                      )}
                    </div>
                  )}
                </div>

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
                  <button onClick={async function() {
                    if (signingOut) return;
                    setSigningOut(true);
                    try {
                      var isGuest = LS.getItem("lifeos_guest") === "1";
                      if (isGuest) {
                        LS.removeItem("lifeos_guest");
                      } else {
                        await Promise.race([
                          window.sbAuth.signOut(),
                          new Promise(function(r) { setTimeout(r, 4000); }),
                        ]);
                      }
                    } catch(e) {}
                    window.location.reload();
                  }} disabled={signingOut} style={{
                    width: "100%", padding: "9px 0",
                    background: signingOut ? "var(--panel)" : "var(--danger-soft)",
                    border: "1px solid var(--danger)",
                    color: signingOut ? "var(--text-faint)" : "var(--danger)",
                    fontSize: 11, letterSpacing: "0.1em", fontWeight: 700,
                    cursor: signingOut ? "default" : "pointer", fontFamily: "inherit",
                    opacity: signingOut ? 0.7 : 1,
                  }}>{signingOut ? "WIRD ABGEMELDET…" : "ABMELDEN"}</button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ route, setRoute, pov, setPov, userPovs, setUserPovs, inbox, onOpenPaywall, onAccessGranted }) {
  const [settingsOpen,      setSettingsOpen]      = React.useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = React.useState("profile");

  React.useEffect(function() {
    window.__lifeos_openSettings = function(tab) {
      setSettingsInitialTab(tab || "profile");
      setSettingsOpen(true);
    };
    return function() { delete window.__lifeos_openSettings; };
  }, []);
  const [povModal, setPovModal]         = React.useState(null); // null | "add" | {id,...}
  const [userName, setUserName]         = React.useState(() => {
    const raw = LS.getItem("lifeos_user_name") || "";
    try { const p = JSON.parse(raw); return typeof p === "string" ? p : raw; } catch { return raw; }
  });
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

  var inboxCount = (inbox || []).filter(function(t) { return !t.done; }).length;

  const navItems = [
    { id: "dashboard",      label: "Dashboard",      icon: "layout-dashboard", badge: 0 },
    { id: "focus",          label: "Focus",           icon: "zap",             badge: 0 },
    { id: "missioncontrol", label: "Mission Control", icon: "crosshair",       badge: 0 },
    { id: "planner",        label: "Planner",         icon: "calendar",        badge: 0 },
    { id: "insights",       label: "Insights",        icon: "bar-chart-2",     badge: 0 },
    { id: "inbox",          label: "Inbox",           icon: "list",            badge: inboxCount },
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
          <div style={{ width: 26, height: 26, background: "var(--accent)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="layers" size={14} color="#0a0a0c" strokeWidth={2.2} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.18em", color: "#e8e8ec" }}>LIFE OS</div>
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
              >
                <span style={{ display: "flex", alignItems: "center", gap: 9, width: "100%" }}>
                  <Icon name={it.icon} size={14} strokeWidth={active ? 2.2 : 1.75} color={active ? "var(--accent)" : "currentColor"} />
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {it.badge > 0 && (
                    <span style={{
                      background: "var(--accent)", color: "#0a0a0c",
                      fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 2, lineHeight: "1.5",
                    }}>{it.badge}</span>
                  )}
                </span>
              </button>
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
          onOpenPaywall={onOpenPaywall}
          initialTab={settingsInitialTab}
          onAccessGranted={onAccessGranted}
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
