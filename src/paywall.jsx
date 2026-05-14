// Paywall screen — shown to logged-in users without active subscription.
// Tab "code":  beta / friend / family code → redeem-beta API → instant access.
// Tab "pay":   Stripe Checkout → subscription (monthly or yearly).

function PaywallScreen({ userId, email, onAccessGranted }) {
  const [tab,       setTab]       = React.useState("code"); // "code" | "pay"
  const [plan,      setPlan]      = React.useState("monthly");
  const [code,      setCode]      = React.useState("");
  const [promoCode, setPromoCode] = React.useState("");
  const [loading,   setLoading]   = React.useState(false);
  const [err,       setErr]       = React.useState(null);
  const [success,   setSuccess]   = React.useState(false);

  // Track paywall view once on mount
  React.useEffect(() => {
    window.posthog?.capture("paywall_viewed");
  }, []);

  // Handle redirect back from Stripe with ?checkout=success
  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("checkout") === "success") {
      // Clear param and re-check access
      window.history.replaceState({}, "", window.location.pathname);
      onAccessGranted();
    }
  }, []);

  const redeemCode = async () => {
    const c = code.trim();
    if (!c || loading) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/redeem-beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, email, code: c }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unbekannter Fehler");
      setSuccess(true);
      window.posthog?.capture("paywall_code_redeemed");
      // Cache access locally
      localStorage.setItem("lifeos_access", "1");
      localStorage.setItem("lifeos_access_ts", String(Date.now()));
      setTimeout(onAccessGranted, 1400);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startCheckout = async () => {
    if (loading) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, email, plan, promo_code: promoCode || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unbekannter Fehler");
      window.posthog?.capture("paywall_checkout_started", { plan });
      window.location.href = d.url;
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };

  const features = [
    ["zap",           "Focus Mode & Reality Timer"],
    ["crosshair",     "Mission Control — OKRs & Projekte"],
    ["calendar",      "Wochenplaner mit Stundenverteilung"],
    ["activity",      "War Room Stats & Apple Watch Ringe"],
    ["bar-chart-2",   "Insights & The Truth Loop"],
    ["layers",        "Unbegrenzte Projekte & POVs"],
  ];

  return (
    <div style={{
      display: "flex", height: "100vh", background: "var(--bg)",
      alignItems: "center", justifyContent: "center", padding: "0 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 460 }}>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
          <div style={{
            width: 28, height: 28, background: "var(--accent)", borderRadius: 5,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon name="layers" size={14} color="#0a0a0c" strokeWidth={2.2} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.18em", color: "var(--text)" }}>LIFE OS</div>
        </div>

        {/* Heading */}
        <h1 style={{ margin: "0 0 8px", fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--text)", lineHeight: 1.1 }}>
          Zugang aktivieren
        </h1>
        <p style={{ margin: "0 0 32px", fontSize: 13, color: "var(--text-faint)", lineHeight: 1.6 }}>
          Beta-Code einlösen oder direkt abonnieren.
        </p>

        {/* Tab toggle */}
        <div style={{ display: "flex", background: "var(--panel)", border: "1px solid var(--line)", padding: 4, marginBottom: 28 }}>
          {[["code", "Beta-Code"], ["pay", "Abonnement"]].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setErr(null); }} style={{
              flex: 1, padding: "9px 0", border: "none", cursor: "pointer",
              fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em",
              background: tab === id ? "var(--accent)" : "transparent",
              color: tab === id ? "#0a0a0c" : "var(--text-faint)",
              transition: "all .15s",
            }}>{label.toUpperCase()}</button>
          ))}
        </div>

        {/* ── Beta Code Tab ── */}
        {tab === "code" && !success && (
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-faint)", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 8 }}>ZUGANGSCODE</div>
            <input
              autoFocus value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && redeemCode()}
              placeholder="z.B. BETA100"
              style={{
                width: "100%", background: "var(--panel)", border: "1px solid var(--line)",
                borderLeft: "2px solid var(--accent)",
                color: "var(--text)", padding: "13px 16px", fontSize: 16,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em",
                outline: "none", boxSizing: "border-box", marginBottom: 12,
              }}
            />
            {err && (
              <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="x" size={12} color="var(--danger)" />
                {err}
              </div>
            )}
            <button onClick={redeemCode} disabled={loading || !code.trim()} style={{
              width: "100%", padding: "14px",
              background: code.trim() && !loading ? "var(--accent)" : "var(--panel)",
              color: code.trim() && !loading ? "#0a0a0c" : "var(--text-faint)",
              border: `1px solid ${code.trim() ? "var(--accent)" : "var(--line)"}`,
              fontWeight: 700, fontSize: 11, letterSpacing: "0.2em",
              cursor: code.trim() && !loading ? "pointer" : "default", transition: "all .2s",
            }}>{loading ? "WIRD GEPRÜFT…" : "EINLÖSEN →"}</button>
            <div style={{ marginTop: 14, fontSize: 10.5, color: "var(--text-faint)", letterSpacing: "0.04em" }}>
              Hast du einen Beta-Code erhalten? Hier eingeben — sofortiger Zugang, kein Zahlungsmittel nötig.
            </div>
          </div>
        )}

        {tab === "code" && success && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="check" size={26} color="#0a0a0c" strokeWidth={2.5} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.16em", color: "var(--accent)" }}>ZUGANG AKTIVIERT</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8, letterSpacing: "0.06em" }}>Wird geladen…</div>
          </div>
        )}

        {/* ── Subscription Tab ── */}
        {tab === "pay" && (
          <div>
            {/* Plan cards */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[
                { id: "monthly", label: "MONATLICH", price: "9,99 €", sub: "pro Monat", badge: null },
                { id: "yearly",  label: "JÄHRLICH",  price: "79,99 €", sub: "pro Jahr", badge: "33% SPAREN" },
              ].map(p => (
                <button key={p.id} onClick={() => setPlan(p.id)} style={{
                  flex: 1, padding: "16px 14px", cursor: "pointer", textAlign: "left",
                  position: "relative", background: plan === p.id ? "var(--accent-soft)" : "var(--panel)",
                  border: `1px solid ${plan === p.id ? "var(--accent-line)" : "var(--line)"}`,
                  transition: "all .15s",
                }}>
                  {p.badge && (
                    <span style={{
                      position: "absolute", top: -9, right: 10,
                      background: "var(--accent)", color: "#0a0a0c",
                      fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", padding: "2px 8px",
                    }}>{p.badge}</span>
                  )}
                  <div style={{ fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, color: plan === p.id ? "var(--accent)" : "var(--text-faint)", marginBottom: 8 }}>{p.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>{p.price}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 2 }}>{p.sub}</div>
                </button>
              ))}
            </div>

            {/* Optional promo code */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, color: "var(--text-faint)", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 8 }}>PROMO-CODE (OPTIONAL)</div>
              <input
                value={promoCode} onChange={e => setPromoCode(e.target.value)}
                placeholder="Stripe Promo-Code…"
                style={{
                  width: "100%", background: "var(--panel)", border: "1px solid var(--line)",
                  color: "var(--text)", padding: "11px 14px", fontSize: 13,
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {err && (
              <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="x" size={12} color="var(--danger)" />
                {err}
              </div>
            )}

            <button onClick={startCheckout} disabled={loading} style={{
              width: "100%", padding: "14px", background: loading ? "var(--panel)" : "var(--accent)",
              color: loading ? "var(--text-faint)" : "#0a0a0c",
              border: "none", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em",
              cursor: loading ? "default" : "pointer", transition: "all .2s",
            }}>{loading ? "WIRD GELADEN…" : "ZU STRIPE →"}</button>

            <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--text-faint)", textAlign: "center", letterSpacing: "0.04em" }}>
              Jederzeit kündbar · Sichere Zahlung via Stripe
            </div>
          </div>
        )}

        {/* Feature list */}
        <div style={{ marginTop: 36, borderTop: "1px solid var(--line-soft)", paddingTop: 24 }}>
          <div style={{ fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 14 }}>ENTHALTEN</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {features.map(([icon, label]) => (
              <div key={icon} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name={icon} size={13} color="var(--accent)" />
                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.PaywallScreen = PaywallScreen;
