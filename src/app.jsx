// App shell — global state, routing, ticking active timer, Tweaks.

// Per-POV palettes. Each POV swaps ONLY the accent color — background stays neutral.
const POV_THEMES = {
  personal: { accent: "#8b5cf6" }, // lila — default
  founder:  { accent: "#2f8bff" }, // blau
  student:  { accent: "#e11d48" }, // rot
  athlete:  { accent: "#10b981" }, // grün
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#8b5cf6",
  "density": "comfortable",
  "fontPair": "inter-jet",
  "showTruthLoop": true
}/*EDITMODE-END*/;

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0,2), 16),
    g: parseInt(h.slice(2,4), 16),
    b: parseInt(h.slice(4,6), 16),
  };
}

function applyPovTheme(pov, accentOverride) {
  const t = POV_THEMES[pov] || POV_THEMES.personal;
  const accent = accentOverride || t.accent;
  const root = document.documentElement.style;
  // Reset background/text to neutral defaults — only the accent moves with POV.
  root.setProperty("--bg",         "#0a0a0c");
  root.setProperty("--panel",      "#141418");
  root.setProperty("--panel-2",    "#1a1a20");
  root.setProperty("--line",       "#26262d");
  root.setProperty("--line-soft",  "#1f1f25");
  root.setProperty("--text",       "#e8e8ec");
  root.setProperty("--text-dim",   "#8a8a95");
  root.setProperty("--text-faint", "#54545d");
  root.setProperty("--accent", accent);
  root.setProperty("--" + pov, accent);
  const { r, g, b } = hexToRgb(accent);
  root.setProperty("--accent-soft", `rgba(${r},${g},${b},0.12)`);
  root.setProperty("--accent-line", `rgba(${r},${g},${b},0.35)`);
}

function applyTweaks(t) {
  const dense = t.density === "dense";
  document.body.style.fontSize = dense ? "13px" : "14px";

  const pair = t.fontPair === "ibm" ? `'IBM Plex Sans', sans-serif` :
               t.fontPair === "system" ? `-apple-system, system-ui, sans-serif` :
               `'Inter', sans-serif`;
  document.body.style.fontFamily = pair;
}

function LoadingScreen() {
  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg)", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 22, height: 22, background: "#e8e8ec", borderRadius: 3 }} />
      <div style={{ fontSize: 9.5, letterSpacing: "0.22em", fontWeight: 700, color: "var(--text-faint)" }}>WIRD GELADEN…</div>
    </div>
  );
}

function LoginScreen({ onGuest }) {
  const [mode, setMode] = React.useState("login"); // "login" | "register"
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [confirmed, setConfirmed] = React.useState(false);

  const inputStyle = {
    width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)",
    color: "var(--text)", padding: "11px 14px", fontSize: 14,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10,
  };

  const submit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true); setErr(null);
    if (mode === "register") {
      const { error } = await window.sbAuth.signUp(email.trim(), password);
      setLoading(false);
      if (error) { setErr(error.message); return; }
      setConfirmed(true);
    } else {
      const { error } = await window.sbAuth.signIn(email.trim(), password);
      setLoading(false);
      if (error) { setErr(error.message === "Invalid login credentials" ? "E-Mail oder Passwort falsch." : error.message); return; }
      // onAuthStateChange in App handles the rest
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: 400, padding: "48px 40px", background: "var(--panel)", border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 22, height: 22, background: "#e8e8ec", borderRadius: 3 }} />
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.16em", color: "#e8e8ec" }}>LIFE OS</div>
        </div>

        {confirmed ? (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Bestätigungs-E-Mail gesendet ✓</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>
              Schau in dein Postfach und klick auf den Bestätigungslink.<br />
              Danach kannst du dich hier einloggen.
            </div>
            <button onClick={() => { setConfirmed(false); setMode("login"); }} style={{ marginTop: 24, background: "none", border: "none", color: "var(--text-faint)", fontSize: 11, cursor: "pointer", padding: 0, letterSpacing: "0.1em" }}>← Zum Login</button>
          </div>
        ) : (
          <div>
            {/* Tab toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: "1px solid var(--line)" }}>
              {[["login", "Anmelden"], ["register", "Registrieren"]].map(([m, label]) => (
                <button key={m} onClick={() => { setMode(m); setErr(null); }} style={{
                  flex: 1, padding: "10px 0", background: "none", border: "none",
                  borderBottom: mode === m ? "2px solid var(--accent)" : "2px solid transparent",
                  color: mode === m ? "var(--text)" : "var(--text-faint)",
                  fontWeight: mode === m ? 700 : 500, fontSize: 12.5, letterSpacing: "0.08em",
                  cursor: "pointer", marginBottom: -1,
                }}>{label}</button>
              ))}
            </div>

            <input autoFocus type="email" placeholder="E-Mail" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={inputStyle}
            />
            <input type="password" placeholder="Passwort" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={{ ...inputStyle, marginBottom: 14 }}
            />

            {err && <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}

            <button onClick={submit} disabled={loading || !email.trim() || !password} style={{
              width: "100%", padding: "12px", background: "var(--accent)", color: "#0a0a0c",
              border: "none", fontWeight: 700, fontSize: 12, letterSpacing: "0.16em",
              cursor: loading ? "default" : "pointer", opacity: (loading || !email.trim() || !password) ? 0.5 : 1, marginBottom: 16,
            }}>{loading ? "…" : mode === "login" ? "ANMELDEN →" : "ACCOUNT ERSTELLEN →"}</button>

            <div style={{ textAlign: "center" }}>
              <button onClick={onGuest} style={{
                background: "none", border: "none", color: "var(--text-faint)", fontSize: 11,
                cursor: "pointer", letterSpacing: "0.1em",
              }}>Ohne Account fortfahren</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  // Auth gate
  const [authStatus, setAuthStatus] = React.useState("loading");
  const [tutorialActive, setTutorialActive] = React.useState(false);

  const reloadPovsFromLS = () => {
    try { setUserPovs(JSON.parse(LS.getItem("lifeos_user_povs") || "[]")); } catch {}
  };

  React.useEffect(() => {
    (async () => {
      const session = await window.sbAuth.getSession();
      if (session?.user?.id) {
        const uid = session.user.id;
        const { data } = await window._supabase.from("user_data").select("key").limit(1);
        if (!data || data.length === 0) await window.sbAuth.pushLocal(uid);
        else { await window.sbAuth.syncDown(uid); reloadPovsFromLS(); }
        const done = LS.getItem("lifeos_onboarding_done") === "1";
        if (done && LS.getItem("lifeos_tutorial_done") !== "1") {
          if (window.injectTutorialSeedData) window.injectTutorialSeedData();
          setTutorialActive(true);
        }
        setAuthStatus(done ? "ready" : "onboarding");
      } else {
        if (LS.getItem("lifeos_guest") === "1") {
          // Guests always restart with onboarding so tutorial can be tested fresh
          localStorage.removeItem("lifeos_onboarding_done");
          localStorage.removeItem("lifeos_tutorial_done");
          setAuthStatus("onboarding");
        } else setAuthStatus("login");
      }
    })();

    const { data: { subscription } } = window._supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) {
        const uid = session.user.id;
        const { data } = await window._supabase.from("user_data").select("key").limit(1);
        if (!data || data.length === 0) await window.sbAuth.pushLocal(uid);
        else { await window.sbAuth.syncDown(uid); reloadPovsFromLS(); }
        const done = LS.getItem("lifeos_onboarding_done") === "1";
        if (done && LS.getItem("lifeos_tutorial_done") !== "1") {
          if (window.injectTutorialSeedData) window.injectTutorialSeedData();
          setTutorialActive(true);
        }
        setAuthStatus(done ? "ready" : "onboarding");
      } else if (event === "SIGNED_OUT") {
        setAuthStatus("login");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyTweaks(tweaks); }, [tweaks]);

  // Re-theme whenever POV changes. Founder accent is overridable via Tweaks;
  // Student/Athlete always use their own palette accent.
  // (Theme application below depends on `pov` state defined next.)

  // Inject IBM Plex if needed
  React.useEffect(() => {
    if (tweaks.fontPair === "ibm" && !document.getElementById("ibm-font")) {
      const l = document.createElement("link");
      l.id = "ibm-font";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
  }, [tweaks.fontPair]);

  const [route, setRoute] = React.useState("dashboard");
  const [pov, setPov] = React.useState(() => LS.getItem("lifeos_pov") || "personal");
  const [userPovs, setUserPovs] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_user_povs") || "[]"); } catch { return []; }
  });
  React.useEffect(() => { LS.setItem("lifeos_user_povs", JSON.stringify(userPovs)); }, [userPovs]);

  const [activeTaskId, setActiveTaskId] = React.useState(() => LS.getItem("lifeos_active") || null);
  // Tracks which task was last actively running — survives pausing (activeTaskId → null)
  const [focusTaskId, setFocusTaskId] = React.useState(() => LS.getItem("lifeos_active") || null);

  // Keep focusTaskId in sync whenever a task starts
  React.useEffect(() => {
    if (activeTaskId) setFocusTaskId(activeTaskId);
  }, [activeTaskId]);
  const [taskTimes, setTaskTimes] = React.useState(() => {
    try {
      const times = JSON.parse(localStorage.getItem("lifeos_times") || "{}");
      // Recover elapsed time for a timer that was running when the tab/browser closed
      const ts = JSON.parse(localStorage.getItem("lifeos_timer_start") || "null");
      if (ts?.taskId && ts?.startedAt != null && ts?.baseTime != null) {
        const recovered = ts.baseTime + Math.floor((Date.now() - ts.startedAt) / 1000);
        times[ts.taskId] = recovered;
        // Reset anchor so the next recovery won't double-count
        localStorage.setItem("lifeos_timer_start", JSON.stringify({ taskId: ts.taskId, startedAt: Date.now(), baseTime: recovered }));
      }
      return times;
    } catch { return {}; }
  });

  React.useEffect(() => { LS.setItem("lifeos_pov", pov); }, [pov]);
  React.useEffect(() => { LS.setItem("lifeos_active", activeTaskId || ""); }, [activeTaskId]);
  React.useEffect(() => { LS.setItem("lifeos_times", JSON.stringify(taskTimes)); }, [taskTimes]);

  const [krProgress, setKrProgress] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_kr_progress") || "{}"); } catch { return {}; }
  });
  const [taskNotes, setTaskNotes] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_task_notes") || "{}"); } catch { return {}; }
  });
  const [truthPlan, setTruthPlan] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_truth_plan") || "null") || TRUTH_LOOP.plan; } catch { return TRUTH_LOOP.plan; }
  });
  React.useEffect(() => { LS.setItem("lifeos_kr_progress", JSON.stringify(krProgress)); }, [krProgress]);
  React.useEffect(() => { LS.setItem("lifeos_task_notes", JSON.stringify(taskNotes)); }, [taskNotes]);
  React.useEffect(() => { LS.setItem("lifeos_truth_plan", JSON.stringify(truthPlan)); }, [truthPlan]);

  // Apply the per-POV theme on mount and whenever POV / accent tweak changes.
  React.useEffect(() => {
    let override = null;
    if (pov === "personal") override = tweaks.accent;
    else {
      const customPov = userPovs.find(p => p.id === pov);
      if (customPov) override = customPov.color;
    }
    applyPovTheme(pov, override);
  }, [pov, tweaks.accent, userPovs]);

  // When POV changes, drop active task if it doesn't belong to the new POV.
  React.useEffect(() => {
    const povData = POV_DATA[pov] || { tasksToday: [] };
    let custom = [];
    try { custom = JSON.parse(LS.getItem(`lifeos_tasks_${pov}`) || "[]"); } catch {}
    const ids = [...povData.tasksToday, ...custom].map(t => t.id);
    if (activeTaskId && !ids.includes(activeTaskId)) setActiveTaskId(null);
  }, [pov]);

  // Session tracking — log start/end whenever activeTaskId changes
  const sessionStartRef = React.useRef(null);
  const focusTaskIdRef  = React.useRef(focusTaskId);
  React.useEffect(() => { focusTaskIdRef.current = focusTaskId; }, [focusTaskId]);
  React.useEffect(() => {
    if (activeTaskId) {
      sessionStartRef.current = Date.now();
    } else if (sessionStartRef.current) {
      const dur = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      sessionStartRef.current = null;
      const tid = focusTaskIdRef.current;
      if (dur >= 5 && tid) {
        try {
          const all = JSON.parse(LS.getItem("lifeos_sessions") || "{}");
          if (!all[tid]) all[tid] = [];
          all[tid].push({ ts: new Date().toISOString(), dur });
          LS.setItem("lifeos_sessions", JSON.stringify(all));
        } catch {}
      }
    }
  }, [activeTaskId]);

  // Tick the active task across whole app
  React.useEffect(() => {
    if (!activeTaskId) {
      localStorage.removeItem("lifeos_timer_start");
      return;
    }
    // Save anchor: baseTime = elapsed so far, startedAt = wall clock now
    // On next load, recovered = baseTime + (now - startedAt) gives correct total
    const baseTime = taskTimes[activeTaskId] ?? 0;
    localStorage.setItem("lifeos_timer_start", JSON.stringify({ taskId: activeTaskId, startedAt: Date.now(), baseTime }));
    const id = setInterval(() => {
      setTaskTimes(prev => ({ ...prev, [activeTaskId]: (prev[activeTaskId] ?? 0) + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [activeTaskId]);

  // ── Push Notifications ──────────────────────────────────────────────────────
  // Runs every 60s: checks planner block starts + timer running too long
  const pushedBlocks = React.useRef(new Set()); // dedup: don't push same block twice
  const pushedTimerReminder = React.useRef(false);
  React.useEffect(() => {
    if (!window.Push?.isConfigured()) return;

    const check = () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const todayISO = now.toISOString().slice(0, 10);

      // ── Planner block start ──
      try {
        const allBlocks = JSON.parse(LS.getItem("lifeos_timeblocks_v2") || "{}");
        // Find today's weekKey — iterate all weeks to find today
        for (const [, dayBlocks] of Object.entries(allBlocks)) {
          if (typeof dayBlocks !== "object") continue;
          for (const [dayIdx, blocks] of Object.entries(dayBlocks)) {
            if (!Array.isArray(blocks)) continue;
            for (const block of blocks) {
              if (!block.start) continue;
              const [h, m] = block.start.split(":").map(Number);
              const blockMins = h * 60 + m;
              const key = `${todayISO}_${block.id || block.start}_${dayIdx}`;
              // Fire if block starts within the current minute and same day-of-week
              const todayDow = now.getDay(); // 0=Sun
              const blockDow = parseInt(dayIdx, 10);
              if (blockDow === todayDow && Math.abs(blockMins - nowMins) <= 1 && !pushedBlocks.current.has(key)) {
                pushedBlocks.current.add(key);
                window.Push.blockStart(block.label || block.title || "Block");
              }
            }
          }
        }
        // Also check recurring blocks
        const recurring = JSON.parse(LS.getItem("lifeos_recurring_blocks") || "[]");
        for (const block of recurring) {
          if (!block.start || !Array.isArray(block.days)) continue;
          const todayDow = now.getDay();
          if (!block.days.includes(todayDow)) continue;
          const [h, m] = block.start.split(":").map(Number);
          const blockMins = h * 60 + m;
          const key = `recurring_${todayISO}_${block.id || block.start}`;
          if (Math.abs(blockMins - nowMins) <= 1 && !pushedBlocks.current.has(key)) {
            pushedBlocks.current.add(key);
            window.Push.blockStart(block.label || block.title || "Block");
          }
        }
      } catch {}

      // ── Timer running > 2h without break ──
      if (activeTaskId) {
        const elapsed = taskTimes[activeTaskId] ?? 0;
        const minutes = Math.floor(elapsed / 60);
        if (minutes > 0 && minutes % 120 === 0 && !pushedTimerReminder.current) {
          pushedTimerReminder.current = true;
          setTimeout(() => { pushedTimerReminder.current = false; }, 65000); // reset after 65s
          window.Push.timerReminder(activeTaskId, minutes);
        }
      }
    };

    check(); // run immediately on mount
    const iv = setInterval(check, 60_000);
    return () => clearInterval(iv);
  }, [activeTaskId, taskTimes]);

  // Keyboard: ESC exits focus, SPACE toggles active timer in focus
  React.useEffect(() => {
    const onKey = (e) => {
      if (route === "focus" && e.key === "Escape") { setRoute("dashboard"); window.TUTORIAL?.onAction?.('route-dashboard'); }
      if (route === "focus" && e.key === " ") {
        e.preventDefault();
        setActiveTaskId(curr => curr ? null : focusTaskId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [route, focusTaskId]);

  // Inbox — quick capture, zero-friction
  const [inbox, setInbox] = React.useState(() => {
    try { return JSON.parse(LS.getItem("lifeos_inbox") || "[]"); } catch { return []; }
  });
  React.useEffect(() => { LS.setItem("lifeos_inbox", JSON.stringify(inbox)); }, [inbox]);
  const [captureOpen, setCaptureOpen] = React.useState(false);
  const [captureText, setCaptureText] = React.useState("");
  const saveCapture = () => {
    const t = captureText.trim();
    if (!t) return;
    setInbox(prev => [...prev, { id: `inbox_${Date.now()}`, text: t, ts: new Date().toISOString(), pov }]);
    setCaptureText(""); setCaptureOpen(false);
  };

  // Global task detail — modal overlay, works from any screen
  const [globalTask, setGlobalTask] = React.useState(null);

  const focusMode = route === "focus";

  if (authStatus === "loading") return <LoadingScreen />;
  if (authStatus === "login") return (
    <LoginScreen onGuest={() => {
      LS.setItem("lifeos_guest", "1");
      LS.removeItem("lifeos_onboarding_done");
      LS.removeItem("lifeos_tutorial_done");
      setAuthStatus("onboarding");
    }} />
  );
  if (authStatus === "onboarding") return (
    <OnboardingWizard onComplete={({ userName, userPovs: newPovs }) => {
      if (userName) LS.setItem("lifeos_user_name", userName);
      setUserPovs(newPovs || []);
      window.sbAuth.getSession().then(s => {
        if (s?.user?.id) window.sbAuth.pushLocal(s.user.id);
      });
      if (window.injectTutorialSeedData) window.injectTutorialSeedData();
      setAuthStatus("ready");
      setTutorialActive(true);
    }} />
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}
         data-screen-label={"Life OS · " + route}>
      {!focusMode && <Sidebar route={route} setRoute={setRoute} pov={pov} setPov={setPov} userPovs={userPovs} setUserPovs={setUserPovs} />}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
        {focusMode && (
          // tiny top bar with exit
          <div style={{
            position: "absolute", top: 16, left: 16, zIndex: 5,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <button data-tutorial="exit-focus-btn" onClick={() => { setRoute("dashboard"); window.TUTORIAL?.onAction?.('route-dashboard'); }} style={{
              padding: "8px 14px", background: "var(--panel)", border: "1px solid var(--line)",
              color: "var(--text-faint)", fontSize: 10.5, letterSpacing: "0.18em", fontWeight: 600,
              cursor: "pointer",
            }}>← EXIT FOCUS</button>
          </div>
        )}
        {route === "dashboard" && (
          <Dashboard pov={pov} activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
            taskTimes={taskTimes} setTaskTimes={setTaskTimes} setRoute={setRoute}
            krProgress={krProgress} setKrProgress={setKrProgress}
            taskNotes={taskNotes} setTaskNotes={setTaskNotes}
            truthPlan={truthPlan} setTruthPlan={setTruthPlan}
            inbox={inbox} setInbox={setInbox}
            onOpenTask={setGlobalTask} />
        )}
        {route === "focus" && (
          <FocusScreen pov={pov} activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
            taskTimes={taskTimes} setTaskTimes={setTaskTimes} focusTaskId={focusTaskId}
            onOpenTask={setGlobalTask} />
        )}
        {route === "missioncontrol" && (
          <MissionControl pov={pov} setPov={setPov} taskTimes={taskTimes} setTaskTimes={setTaskTimes}
            activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
            krProgress={krProgress} setKrProgress={setKrProgress}
            onOpenTask={setGlobalTask} userPovs={userPovs} />
        )}
        {route === "planner" && <Planner />}
        {route === "insights" && <Insights taskTimes={taskTimes} pov={pov} />}
      </main>

      {/* Tutorial overlay */}
      {tutorialActive && window.TutorialManager && React.createElement(window.TutorialManager, {
        setRoute,
        setPov,
        onDone: () => {
          setTutorialActive(false);
          LS.setItem("lifeos_tutorial_done", "1");
        },
      })}

      {/* Global task detail panel — slides in from right over any screen */}
      {globalTask && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setGlobalTask(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "stretch",
          }}
        >
          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setGlobalTask(null)} />
          <div style={{
            width: 680, maxWidth: "90vw",
            background: "var(--bg)", borderLeft: "1px solid var(--line)",
            overflow: "auto", display: "flex", flexDirection: "column",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
          }}>
            <TaskDetail
              task={globalTask}
              onBack={() => setGlobalTask(null)}
              breadcrumb="SCHLIESSEN ×"
              taskTimes={taskTimes} setTaskTimes={setTaskTimes}
              activeTaskId={activeTaskId} setActiveTaskId={setActiveTaskId}
            />
          </div>
        </div>
      )}

      {/* Quick Capture — floating button + overlay */}
      {!captureOpen && (
        <button
          onClick={() => setCaptureOpen(true)}
          title="Quick Capture (Idee festhalten)"
          style={{
            position: "fixed", bottom: 28, right: 28, zIndex: 200,
            width: 48, height: 48, borderRadius: "50%",
            background: "var(--accent)", color: "#0a0a0c",
            border: "none", fontSize: 26, fontWeight: 300, lineHeight: 1,
            cursor: "pointer", boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >+</button>
      )}
      {captureOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setCaptureText(""); setCaptureOpen(false); } }}
          style={{
            position: "fixed", inset: 0, zIndex: 250,
            display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
            padding: 28,
          }}
        >
          <div style={{
            background: "var(--panel)", border: "1px solid var(--accent-line)",
            padding: "20px 20px 16px", width: 380,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}>
            <div style={{ fontSize: 9.5, letterSpacing: "0.18em", fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
              QUICK CAPTURE — EINFACH EINTIPPEN
            </div>
            <input
              autoFocus
              value={captureText}
              onChange={e => setCaptureText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") saveCapture();
                if (e.key === "Escape") { setCaptureText(""); setCaptureOpen(false); }
              }}
              placeholder="Gedanke, Idee, Task…"
              style={{
                width: "100%", background: "var(--panel-2)",
                border: "1px solid var(--accent-line)", color: "var(--text)",
                padding: "10px 14px", fontSize: 14, outline: "none",
                fontFamily: "inherit", marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "var(--text-faint)" }}>Enter zum Speichern · Esc abbrechen</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setCaptureText(""); setCaptureOpen(false); }} style={{
                  background: "transparent", border: "1px solid var(--line)", color: "var(--text-faint)",
                  padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}>✕</button>
                <button onClick={saveCapture} style={{
                  background: "var(--accent)", border: "none", color: "#0a0a0c",
                  padding: "6px 18px", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
                  cursor: "pointer", fontFamily: "inherit",
                }}>SPEICHERN</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Personal Accent">
          <TweakColor label="Hauptfarbe (Personal)" value={tweaks.accent}
            onChange={(v) => setTweak("accent", v)} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {["#8b5cf6", "#a855f7", "#6366f1", "#06b6d4", "#f97316", "#ec4899"].map(c => (
              <button key={c} onClick={() => setTweak("accent", c)} style={{
                width: 24, height: 24, borderRadius: 4, background: c,
                border: tweaks.accent === c ? "2px solid #fff" : "1px solid var(--line)",
                cursor: "pointer", padding: 0,
              }} />
            ))}
          </div>
        </TweakSection>

        <TweakSection title="Layout">
          <TweakRadio label="Density" value={tweaks.density}
            options={[{ value: "comfortable", label: "Comfortable" }, { value: "dense", label: "Dense" }]}
            onChange={(v) => setTweak("density", v)} />
          <TweakRadio label="Font" value={tweaks.fontPair}
            options={[
              { value: "inter-jet", label: "Inter" },
              { value: "ibm", label: "IBM Plex" },
              { value: "system", label: "System" },
            ]}
            onChange={(v) => setTweak("fontPair", v)} />
        </TweakSection>

        <TweakSection title="Module">
          <TweakToggle label="The Truth Loop anzeigen"
            value={tweaks.showTruthLoop}
            onChange={(v) => setTweak("showTruthLoop", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
