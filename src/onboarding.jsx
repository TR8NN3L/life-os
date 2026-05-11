// Onboarding Wizard — shown once on first login/guest start.
// Saves: lifeos_user_name, lifeos_user_povs, lifeos_pov_data, lifeos_onboarding_done

const OB_PRESET_POVS = [
  { id: "founder",  label: "Business",  sub: "Arbeit & Karriere",    color: "#2f8bff",  icon: "⚡" },
  { id: "student",  label: "Education", sub: "Lernen & Studium",     color: "#e11d48",  icon: "📚" },
  { id: "athlete",  label: "Health",    sub: "Sport & Fitness",      color: "#10b981",  icon: "💪" },
];

const QUEST_EXAMPLES = {
  personal:  ["Finanzielle Unabhängigkeit bis Ende 2026", "In die eigene Wohnung ziehen", "Familie finanziell absichern"],
  founder:   ["Erstes SaaS-Produkt auf 1.000€ MRR bringen", "Vertrieb auf 5 Abschlüsse / Monat skalieren", "Freelance-Einkommen auf Vollzeit-Niveau"],
  student:   ["Semester 1 mit Schnitt unter 2,0 abschließen", "Bachelor bis Juni 2027 abschließen", "Zertifizierung bis Q3 abschließen"],
  athlete:   ["5 kg Muskelmasse aufbauen bis September", "Ersten Halbmarathon unter 2h finishen", "Körperfettanteil auf 12 % senken"],
  default:   ["Klares Ziel mit messbarem Ergebnis formulieren", "Zeitraum definieren — ohne Deadline kein Druck", "Was genau soll sich verändert haben?"],
};

function OnboardingStep({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 36 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 3, flex: 1, borderRadius: 2,
          background: i <= current ? "var(--accent)" : "var(--line)",
          transition: "background .3s",
        }} />
      ))}
    </div>
  );
}

function OnboardingWizard({ onComplete }) {
  const [step, setStep]               = React.useState(0);
  const [name, setName]               = React.useState("");
  const [selectedPovIds, setSelectedPovIds] = React.useState(["personal"]);
  const [customPovs, setCustomPovs]   = React.useState([]);
  const [showCustomForm, setShowCustomForm] = React.useState(false);
  const [customLabel, setCustomLabel] = React.useState("");
  const [customSub, setCustomSub]     = React.useState("");
  const [customColor, setCustomColor] = React.useState("#8b5cf6");
  const [quests, setQuests]           = React.useState({});

  // All POVs the user will configure (personal always first)
  const allSelectedPovs = React.useMemo(() => {
    const presets = OB_PRESET_POVS.filter(p => selectedPovIds.includes(p.id));
    return [
      { id: "personal", label: "Personal", sub: "Persönliches Leben", color: "#8b5cf6", icon: "👤" },
      ...presets,
      ...customPovs,
    ];
  }, [selectedPovIds, customPovs]);

  const totalSteps = 2 + allSelectedPovs.length + 1; // +1 for push step

  const togglePreset = (id) => {
    setSelectedPovIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const addCustomPov = () => {
    if (!customLabel.trim()) return;
    const id = "pov_" + Date.now();
    setCustomPovs(prev => [...prev, { id, label: customLabel.trim(), sub: customSub.trim(), color: customColor, icon: "✦" }]);
    setShowCustomForm(false);
    setCustomLabel(""); setCustomSub(""); setCustomColor("#8b5cf6");
  };

  const canAddMore = selectedPovIds.filter(x => x !== "personal").length + customPovs.length < 4;

  const updateQuest = (povId, field, value) => {
    setQuests(prev => ({
      ...prev,
      [povId]: { ...(prev[povId] || { title: "", period: "" }), [field]: value },
    }));
  };

  const finish = () => {
    if (name.trim()) LS.setItem("lifeos_user_name", name.trim());

    // FIX: save ALL non-personal selected POVs (presets + customs) to user_povs
    const selectedPresets = OB_PRESET_POVS.filter(p => selectedPovIds.includes(p.id));
    const userPovsToSave = [...selectedPresets, ...customPovs];
    LS.setItem("lifeos_user_povs", JSON.stringify(userPovsToSave));

    // Save POV data (main quest only — KRs added later via OKR Generator)
    const povData = {};
    for (const pov of allSelectedPovs) {
      const q = quests[pov.id] || {};
      povData[pov.id] = {
        mainQuest: { title: q.title || "", progress: 0, period: q.period || "" },
        objective:  { title: q.title || "", period: q.period || "", keyResults: [] },
        tasksToday: [],
      };
      if (window.POV_DATA) window.POV_DATA[pov.id] = povData[pov.id];
    }
    LS.setItem("lifeos_pov_data", JSON.stringify(povData));

    for (const p of customPovs) {
      if (window.POV_DATA && !window.POV_DATA[p.id]) {
        window.POV_DATA[p.id] = povData[p.id] || (window.emptyPovData ? window.emptyPovData(p.id) : { mainQuest: { title: "", progress: 0, period: "" }, objective: { title: "", period: "", keyResults: [] }, tasksToday: [] });
      }
    }

    LS.setItem("lifeos_onboarding_done", "1");
    onComplete({ userName: name.trim(), userPovs: userPovsToSave });
  };

  // ── SHARED STYLES ──────────────────────────────────────
  const card = {
    width: "100%", maxWidth: 540,
    background: "var(--panel)", border: "1px solid var(--line)",
    padding: "44px 44px 40px",
  };
  const inputStyle = {
    width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)",
    color: "var(--text)", padding: "12px 16px", fontSize: 15, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box",
  };
  const btnPrimary = (disabled) => ({
    padding: "13px 32px", background: disabled ? "var(--line)" : "var(--accent)",
    color: disabled ? "var(--text-faint)" : "#0a0a0c",
    border: "none", fontWeight: 700, fontSize: 12, letterSpacing: "0.16em",
    cursor: disabled ? "default" : "pointer", fontFamily: "inherit",
  });
  const btnSecondary = {
    padding: "13px 24px", background: "transparent", border: "1px solid var(--line)",
    color: "var(--text-faint)", fontSize: 12, letterSpacing: "0.12em",
    cursor: "pointer", fontFamily: "inherit",
  };
  const wrap = (children) => (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={card}>{children}</div>
    </div>
  );

  // ── STEP 0: NAME ───────────────────────────────────────
  if (step === 0) return wrap(
    <>
      <OnboardingStep current={0} total={totalSteps} />
      <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--accent)", fontWeight: 700, marginBottom: 16 }}>WILLKOMMEN BEI LIFE OS</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, lineHeight: 1.1 }}>Wie heißt du?</div>
      <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 28, lineHeight: 1.6 }}>
        Wir richten dein persönliches System ein.<br />Das dauert ungefähr 2 Minuten.
      </div>
      <input autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && name.trim() && setStep(1)}
        placeholder="Dein Name…"
        style={{ ...inputStyle, marginBottom: 24, fontSize: 17 }} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setStep(1)} disabled={!name.trim()} style={btnPrimary(!name.trim())}>WEITER →</button>
      </div>
    </>
  );

  // ── STEP 1: POVs ───────────────────────────────────────
  if (step === 1) return wrap(
    <>
      <OnboardingStep current={1} total={totalSteps} />
      <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--accent)", fontWeight: 700, marginBottom: 16 }}>DEINE LEBENSBEREICHE</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, lineHeight: 1.1 }}>Was willst du tracken?</div>
      <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 24, lineHeight: 1.6 }}>
        Jeder Bereich bekommt eigene Ziele, Tasks und Fortschritt.
      </div>

      {/* Personal — locked */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
        border: "2px solid #8b5cf6", background: "rgba(139,92,246,0.08)", marginBottom: 8, opacity: 0.7,
      }}>
        <span style={{ fontSize: 20 }}>👤</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Personal</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Persönliches Leben · immer aktiv</div>
        </div>
        <div style={{ fontSize: 18, color: "#8b5cf6" }}>✓</div>
      </div>

      {OB_PRESET_POVS.map(p => {
        const active = selectedPovIds.includes(p.id);
        return (
          <div key={p.id} onClick={() => togglePreset(p.id)} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
            border: `2px solid ${active ? p.color : "var(--line)"}`,
            background: active ? p.color + "14" : "transparent",
            marginBottom: 8, cursor: "pointer", transition: "all .15s",
          }}>
            <span style={{ fontSize: 20 }}>{p.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{p.sub}</div>
            </div>
            <div style={{ fontSize: 18, color: active ? p.color : "var(--line)", transition: "color .15s" }}>
              {active ? "✓" : "+"}
            </div>
          </div>
        );
      })}

      {customPovs.map(p => (
        <div key={p.id} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
          border: `2px solid ${p.color}`, background: p.color + "14", marginBottom: 8,
        }}>
          <span style={{ fontSize: 20 }}>{p.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{p.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{p.sub || "Eigener Bereich"}</div>
          </div>
          <button onClick={() => setCustomPovs(prev => prev.filter(x => x.id !== p.id))} style={{
            background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 16,
          }}>×</button>
        </div>
      ))}

      {canAddMore && !showCustomForm && (
        <button onClick={() => setShowCustomForm(true)} style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "12px 16px", background: "transparent", border: "1px dashed var(--line)",
          color: "var(--text-faint)", fontSize: 11, letterSpacing: "0.1em",
          cursor: "pointer", fontFamily: "inherit", marginBottom: 8,
        }}>
          <span style={{ fontSize: 16 }}>+</span> EIGENEN BEREICH HINZUFÜGEN
        </button>
      )}

      {showCustomForm && (
        <div style={{ padding: 16, border: "1px solid var(--line)", background: "var(--panel-2)", marginBottom: 8 }}>
          <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
            placeholder="Name (z.B. Freelance, Podcast…)"
            style={{ ...inputStyle, marginBottom: 8, fontSize: 13 }} />
          <input value={customSub} onChange={e => setCustomSub(e.target.value)}
            placeholder="Untertitel (optional)"
            style={{ ...inputStyle, marginBottom: 10, fontSize: 13 }} />
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {["#8b5cf6","#2f8bff","#10b981","#e11d48","#f97316","#06b6d4","#a855f7","#eab308"].map(c => (
              <button key={c} onClick={() => setCustomColor(c)} style={{
                width: 24, height: 24, borderRadius: 3, background: c, border: "none",
                outline: customColor === c ? "2px solid #fff" : "none", outlineOffset: 2, cursor: "pointer",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowCustomForm(false)} style={{ ...btnSecondary, padding: "8px 16px", fontSize: 11 }}>ABBRECHEN</button>
            <button onClick={addCustomPov} disabled={!customLabel.trim()} style={{ ...btnPrimary(!customLabel.trim()), padding: "8px 20px", fontSize: 11 }}>HINZUFÜGEN</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button onClick={() => setStep(0)} style={btnSecondary}>← ZURÜCK</button>
        <button onClick={() => setStep(2)} style={btnPrimary(false)}>WEITER →</button>
      </div>
    </>
  );

  // ── STEP 2+N: MAIN QUEST PRO POV ──────────────────────
  if (step >= 2 && step < 2 + allSelectedPovs.length) {
    const idx = step - 2;
    const currentPov = allSelectedPovs[idx];
    const q = quests[currentPov.id] || { title: "", period: "" };
    const isLast = idx === allSelectedPovs.length - 1;
    const examples = QUEST_EXAMPLES[currentPov.id] || QUEST_EXAMPLES.default;

    return wrap(
      <>
        <OnboardingStep current={step} total={totalSteps} />

        {/* POV badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: currentPov.color }} />
          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: currentPov.color, fontWeight: 700 }}>
            {currentPov.label.toUpperCase()}
          </div>
        </div>

        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, lineHeight: 1.1 }}>
          Dein Main Quest
        </div>
        <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8, lineHeight: 1.6 }}>
          Das ist dein übergeordnetes Lebensziel für diesen Bereich — nicht eine einzelne Aufgabe, sondern der größte Gewinn den du in den nächsten 3–12 Monaten erreichen willst.
        </div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 20, lineHeight: 1.5 }}>
          Konkrete Projekte und OKRs richtest du danach im OKR-Wizard ein.
        </div>

        {/* Example box */}
        <div style={{
          background: "var(--panel-2)", border: "1px solid var(--line-soft)",
          borderLeft: `3px solid ${currentPov.color}`,
          padding: "14px 16px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", fontWeight: 700, color: "var(--text-faint)", marginBottom: 10 }}>
            BEISPIELE — SO KLINGT EIN GUTES ZIEL
          </div>
          {examples.map((ex, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < examples.length - 1 ? 6 : 0 }}>
              <span style={{ color: currentPov.color, fontSize: 11, flexShrink: 0, marginTop: 1 }}>→</span>
              <span style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.45,
                cursor: "pointer", transition: "color .15s" }}
                onClick={() => updateQuest(currentPov.id, "title", ex)}
              >{ex}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
            <div style={{ fontSize: 10, color: "var(--text-faint)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-dim)" }}>Gut:</strong> Spezifisch · Messbar · Mit Zeitraum<br />
              <strong style={{ color: "var(--text-dim)" }}>Vermeiden:</strong> Vage Formulierungen wie "mehr Sport" oder "besser werden"
            </div>
          </div>
        </div>

        {/* Main Quest input */}
        <div style={{ marginBottom: 16 }}>
          <div className="uppercase-label" style={{ marginBottom: 8 }}>Main Quest</div>
          <input autoFocus value={q.title}
            onChange={e => updateQuest(currentPov.id, "title", e.target.value)}
            onKeyDown={e => e.key === "Enter" && q.title.trim() && (isLast ? setStep(2 + allSelectedPovs.length) : setStep(s => s + 1))}
            placeholder="Dein übergeordnetes Ziel…"
            style={inputStyle} />
        </div>

        {/* Deadline */}
        <div style={{ marginBottom: 28 }}>
          <div className="uppercase-label" style={{ marginBottom: 8 }}>
            Zeitraum / Deadline
            <span style={{ color: "var(--text-faint)", fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>(optional)</span>
          </div>
          <input value={q.period}
            onChange={e => updateQuest(currentPov.id, "period", e.target.value)}
            placeholder="z.B. Q2 2026 · bis 31. Juli"
            style={inputStyle} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setStep(s => s - 1)} style={btnSecondary}>← ZURÜCK</button>
          <button
            onClick={() => isLast ? setStep(2 + allSelectedPovs.length) : setStep(s => s + 1)}
            disabled={!q.title.trim()}
            style={btnPrimary(!q.title.trim())}
          >
            {isLast ? "FERTIG →" : "WEITER →"}
          </button>
        </div>
      </>
    );
  }

  // ── STEP PUSH ──────────────────────────────────────────
  if (step === 2 + allSelectedPovs.length) {
    const device = window.Push?.deviceType?.() || "desktop";
    const isPWA  = window.Push?.isPWA?.() || false;
    const [pushState, setPushState] = React.useState(window.Push?.permissionState?.() || "default");
    const [installing, setInstalling] = React.useState(false);

    const handleAllow = async () => {
      setInstalling(true);
      const perm = await window.Push?.requestPermission?.();
      if (perm === "granted") {
        await window.Push?.subscribe?.();
        setPushState("granted");
      } else {
        setPushState(perm || "denied");
      }
      setInstalling(false);
    };

    const iosSteps = [
      { n: 1, text: "Tippe auf das Teilen-Symbol unten in Safari" },
      { n: 2, text: 'Wähle „Zum Home-Bildschirm“' },
      { n: 3, text: "Öffne Life OS vom Homescreen" },
      { n: 4, text: "Erlaubt dann Push-Notifications" },
    ];

    return wrap(
      <>
        <OnboardingStep current={totalSteps - 1} total={totalSteps} />
        <div style={{ fontSize: 36, marginBottom: 12, textAlign: "center" }}>🔔</div>
        <div style={{ fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8, letterSpacing: "-0.02em" }}>
          Bleib auf Kurs
        </div>
        <div style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "center", marginBottom: 28, lineHeight: 1.65 }}>
          Life OS erinnert dich wenn ein Block startet oder der Timer zu lange läuft — auf allen Geräten.
        </div>

        {device === "ios" && !isPWA ? (
          // iOS: must install as PWA first
          <div style={{ background: "var(--panel)", border: "1px solid var(--line-soft)", borderRadius: 12, padding: "20px 20px", marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent)", marginBottom: 14 }}>
              AUF HOMESCREEN INSTALLIEREN (iOS)
            </div>
            {iosSteps.map(s => (
              <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", color: "#0a0a0c", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</div>
                <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5, paddingTop: 2 }}>{s.text}</div>
              </div>
            ))}
          </div>
        ) : pushState === "granted" ? (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>✅</div>
            <div style={{ fontSize: 13, color: "var(--good)", fontWeight: 600 }}>Push Notifications aktiv!</div>
          </div>
        ) : pushState === "denied" ? (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--danger)" }}>Zugriff verweigert — in den Browser-Einstellungen freischalten.</div>
          </div>
        ) : (
          <button onClick={handleAllow} disabled={installing} style={{
            width: "100%", padding: "14px 0", marginBottom: 16,
            background: "var(--accent)", border: "none", borderRadius: 10,
            color: "#0a0a0c", fontWeight: 700, fontSize: 14,
            letterSpacing: "0.08em", cursor: "pointer", fontFamily: "inherit",
            opacity: installing ? 0.7 : 1,
          }}>
            {installing ? "WIRD AKTIVIERT…" : "🔔  PUSH ERLAUBEN"}
          </button>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={() => setStep(s => s - 1)} style={btnSecondary}>← ZURÜCK</button>
          <button onClick={finish} style={{ ...btnPrimary(false), flex: 1 }}>
            {pushState === "granted" ? "LIFE OS STARTEN →" : "ÜBERSPRINGEN →"}
          </button>
        </div>
      </>
    );
  }

  // ── FALLBACK FINAL ─────────────────────────────────────
  return wrap(
    <>
      <OnboardingStep current={totalSteps - 1} total={totalSteps} />
      <div style={{ fontSize: 36, marginBottom: 16, textAlign: "center" }}>✓</div>
      <div style={{ fontSize: 24, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>Alles bereit.</div>
      <div style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "center", marginBottom: 32, lineHeight: 1.6 }}>
        Dein System ist eingerichtet.<br />Du kannst alles jederzeit in den Einstellungen anpassen.
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={finish} style={btnPrimary(false)}>LIFE OS STARTEN →</button>
      </div>
    </>
  );
}

window.OnboardingWizard = OnboardingWizard;
