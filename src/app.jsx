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

  // Access gate (subscription or beta code)
  const [hasAccess, setHasAccess] = React.useState(() => localStorage.getItem("lifeos_access") === "1");
  const [authUser,  setAuthUser]  = React.useState(null); // { id, email }

  // Paywall launch date — accounts created before this date get automatic beta access
  const PAYWALL_LAUNCH = "2026-05-14";
  // Free trial after tutorial: 7 days
  const TRIAL_DAYS = 7;

  const checkAccess = React.useCallback(async (userId, createdAt) => {
    // Guests bypass paywall
    if (localStorage.getItem("lifeos_guest") === "1") { setHasAccess(true); return; }
    // Existing users (created before paywall launch) get automatic access
    if (createdAt && createdAt.slice(0, 10) < PAYWALL_LAUNCH) {
      localStorage.setItem("lifeos_access", "1");
      localStorage.setItem("lifeos_access_ts", String(Date.now()));
      setHasAccess(true); return;
    }
    // Free trial: 7 days from first post-tutorial app open (trial_start written in render gate)
    const trialStart = localStorage.getItem("lifeos_trial_start");
    if (trialStart && Date.now() - Number(trialStart) < TRIAL_DAYS * 24 * 3600 * 1000) {
      setHasAccess(true); return;
    }
    // Cache: valid 6h
    const cached   = localStorage.getItem("lifeos_access");
    const cachedTs = localStorage.getItem("lifeos_access_ts");
    if (cached === "1" && cachedTs && Date.now() - Number(cachedTs) < 6 * 3600 * 1000) {
      setHasAccess(true); return;
    }
    try {
      const r = await fetch(`/api/check-access?user_id=${userId}`);
      const d = await r.json();
      if (d.access) {
        localStorage.setItem("lifeos_access", "1");
        localStorage.setItem("lifeos_access_ts", String(Date.now()));
        setHasAccess(true);
      } else {
        localStorage.removeItem("lifeos_access");
        setHasAccess(false);
      }
    } catch {
      // Fail open — never lock out on network/server errors
      setHasAccess(true);
    }
  }, []);

  const reloadPovsFromLS = () => {
    try { setUserPovs(JSON.parse(LS.getItem("lifeos_user_povs") || "[]")); } catch {}
  };

  React.useEffect(() => {
    (async () => {
      const session = await window.sbAuth.getSession();
      if (session?.user?.id) {
        const uid = session.user.id;
        setAuthUser({ id: uid, email: session.user.email });
        const { data } = await window._supabase.from("user_data").select("key").limit(1);
        if (!data || data.length === 0) await window.sbAuth.pushLocal(uid);
        else { await window.sbAuth.syncDown(uid); reloadPovsFromLS(); }
        const done = LS.getItem("lifeos_onboarding_done") === "1";
        if (done && LS.getItem("lifeos_tutorial_done") !== "1") {
          if (window.injectTutorialSeedData) window.injectTutorialSeedData();
          setTutorialActive(true);
        }
        checkAccess(uid, session.user.created_at);
        setAuthStatus(done ? "ready" : "onboarding");
      } else {
        setAuthStatus("login");
      }
    })();

    const { data: { subscription } } = window._supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) {
        const uid = session.user.id;
        setAuthUser({ id: uid, email: session.user.email });
        const { data } = await window._supabase.from("user_data").select("key").limit(1);
        if (!data || data.length === 0) await window.sbAuth.pushLocal(uid);
        else { await window.sbAuth.syncDown(uid); reloadPovsFromLS(); }
        const done = LS.getItem("lifeos_onboarding_done") === "1";
        if (done && LS.getItem("lifeos_tutorial_done") !== "1") {
          if (window.injectTutorialSeedData) window.injectTutorialSeedData();
          setTutorialActive(true);
        }
        checkAccess(uid, session.user.created_at);
        window.posthog?.identify(uid, { email: session.user.email });
        window.posthog?.capture("user_logged_in");
        setAuthStatus(done ? "ready" : "onboarding");
      } else if (event === "SIGNED_OUT") {
        window.posthog?.reset();
        setAuthUser(null);
        localStorage.removeItem("lifeos_access");
        localStorage.removeItem("lifeos_access_ts");
        setHasAccess(false);
        setAuthStatus("login");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Push Scheduler — habit reminder at 21:00 + debt alarm over 5h ──────────
  React.useEffect(() => {
    if (!window.Push?.startScheduler) return;
    window.Push.startScheduler({
      getHabits: () => { try { return JSON.parse(LS.getItem("lifeos_habits") || "[]"); } catch { return []; } },
      getDebt: () => {
        try {
          const TRUTH_LOOP = window.TRUTH_LOOP_DATA || null;
          if (!TRUTH_LOOP) return null;
          const planKey = `lifeos_truth_plan`;
          const plan = JSON.parse(LS.getItem(planKey) || "null") || TRUTH_LOOP.plan;
          const reality = TRUTH_LOOP.reality;
          return plan.reduce((a, b) => a + b, 0) - reality.reduce((a, b) => a + b, 0);
        } catch { return null; }
      },
      debtThreshold: 5,
    });
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
  React.useEffect(() => {
    window.posthog?.capture("$pageview", { route, pov });
  }, [route]);
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

  // When POV changes, drop active task only if it doesn't belong to the new POV (includes project tasks).
  React.useEffect(() => {
    if (!activeTaskId) return;
    const povData = POV_DATA[pov] || { tasksToday: [] };
    let custom = [];
    try { custom = JSON.parse(LS.getItem(`lifeos_tasks_${pov}`) || "[]"); } catch {}
    let projIds = [];
    try {
      const projs = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
      projIds = projs.filter(p => p.pov === pov).flatMap(p =>
        (p.objectives || []).flatMap(o =>
          (o.krs || []).flatMap(kr => (kr.tasks || []).map(t => t.id))
        )
      );
    } catch {}
    const ids = new Set([...povData.tasksToday.map(t => t.id), ...custom.map(t => t.id), ...projIds]);
    if (!ids.has(activeTaskId)) setActiveTaskId(null);
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

  // Tick the active task across whole app — wall-clock accurate, immune to tab throttling
  React.useEffect(() => {
    if (!activeTaskId) {
      localStorage.removeItem("lifeos_timer_start");
      return;
    }
    // Anchor: baseTime = elapsed so far, startedAt = wall-clock now.
    // All time computed as: baseTime + floor((Date.now() - startedAt) / 1000)
    // This is correct even when the browser throttles setInterval in background tabs.
    const baseTime  = taskTimes[activeTaskId] ?? 0;
    const startedAt = Date.now();
    localStorage.setItem("lifeos_timer_start", JSON.stringify({ taskId: activeTaskId, startedAt, baseTime }));
    window.posthog?.capture("timer_started", { task_id: activeTaskId, pov });

    let lastDailyTotal = baseTime; // track how many secs already written to daily log

    const id = setInterval(() => {
      const nowElapsed = baseTime + Math.floor((Date.now() - startedAt) / 1000);
      setTaskTimes(prev => ({ ...prev, [activeTaskId]: nowElapsed }));

      // Daily time log — write delta (wall-clock accurate, not +1 per tick)
      try {
        const delta = nowElapsed - lastDailyTotal;
        if (delta > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const dk = `lifeos_daily_${today}`;
          const daily = JSON.parse(localStorage.getItem(dk) || "{}");
          daily[activeTaskId] = (daily[activeTaskId] || 0) + delta;
          localStorage.setItem(dk, JSON.stringify(daily));
          lastDailyTotal = nowElapsed;
        }
      } catch {}
    }, 500); // 2× per second for smooth display; accuracy comes from Date.now(), not tick rate
    return () => {
      clearInterval(id);
      const finalSecs = baseTime + Math.floor((Date.now() - startedAt) / 1000);
      window.posthog?.capture("timer_stopped", { task_id: activeTaskId, duration_secs: finalSecs, pov });
    };
  }, [activeTaskId]);

  // ── Push Notifications ──────────────────────────────────────────────────────
  // Runs every 60s — block lifecycle + timer checks
  const pushedBlocks   = React.useRef(new Set()); // dedup per event type per block per day
  const pushedTimerReminder  = React.useRef(false);
  const pushedEstExceeded    = React.useRef(false);
  const blockInactiveStart   = React.useRef(null); // timestamp when active block detected without timer

  React.useEffect(() => {
    if (!window.Push?.isConfigured()) return;

    // Helper: parse "HH:MM" → total minutes
    const toMins = (str) => { if (!str) return -1; const [h, m] = str.split(":").map(Number); return h * 60 + m; };

    // Helper: find task title by ID (searches all POVs + custom projects)
    const getTaskName = (taskId) => {
      if (!taskId) return null;
      try {
        // POV tasks
        for (const povKey of Object.keys(POV_DATA)) {
          const hardcoded = POV_DATA[povKey].tasksToday || [];
          let custom = [];
          try { custom = JSON.parse(LS.getItem(`lifeos_tasks_${povKey}`) || "[]"); } catch {}
          const t = [...hardcoded, ...custom].find(t => t.id === taskId);
          if (t?.title) return t.title;
        }
        // Project KR tasks
        const projects = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
        for (const proj of projects) {
          let customKRTasks = {};
          try { customKRTasks = JSON.parse(LS.getItem(`lifeos_proj_tasks_${proj.id}`) || "{}"); } catch {}
          for (const obj of (proj.objectives || [])) {
            for (const kr of (obj.krs || [])) {
              const allTasks = [...(kr.tasks || []), ...(customKRTasks[kr.id] || [])];
              const t = allTasks.find(t => t.id === taskId);
              if (t?.title) return t.title;
            }
          }
        }
      } catch {}
      return taskId; // fallback to ID
    };

    // Helper: collect all today's blocks (one-off + recurring)
    const getTodayBlocks = (now) => {
      const todayDow = now.getDay();
      const todayISO = now.toISOString().slice(0, 10);
      const result = [];
      try {
        const allBlocks = JSON.parse(LS.getItem("lifeos_timeblocks_v2") || "{}");
        for (const [, dayBlocks] of Object.entries(allBlocks)) {
          if (typeof dayBlocks !== "object") continue;
          for (const [dayIdx, blocks] of Object.entries(dayBlocks)) {
            if (!Array.isArray(blocks) || parseInt(dayIdx, 10) !== todayDow) continue;
            for (const b of blocks) {
              if (b.start && b.end) result.push({ ...b, _key: `${todayISO}_${b.id || b.start}_${dayIdx}` });
            }
          }
        }
      } catch {}
      try {
        const recurring = JSON.parse(LS.getItem("lifeos_recurring_blocks") || "[]");
        for (const b of recurring) {
          if (!b.start || !b.end || !Array.isArray(b.days) || !b.days.includes(todayDow)) continue;
          result.push({ ...b, _key: `rec_${todayISO}_${b.id || b.start}` });
        }
      } catch {}
      return result;
    };

    const check = () => {
      const now    = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      const blocks = getTodayBlocks(now);
      let currentBlock = null; // block running right now

      for (const block of blocks) {
        const name      = block.label || block.name || block.title || "Block";
        const startMins = toMins(block.start);
        const endMins   = toMins(block.end);
        if (startMins < 0 || endMins < 0) continue;

        const diffToStart = startMins - nowMins; // positive = future
        const diffToEnd   = endMins   - nowMins;

        // ── 30 min vor Start ──
        const prepKey = `prep_${block._key}`;
        if (diffToStart === 30 && !pushedBlocks.current.has(prepKey)) {
          pushedBlocks.current.add(prepKey);
          window.Push.blockPrepare(name);
        }

        // ── Start (±1 min) ──
        const startKey = `start_${block._key}`;
        if (Math.abs(diffToStart) <= 1 && !pushedBlocks.current.has(startKey)) {
          pushedBlocks.current.add(startKey);
          window.Push.blockStart(name);
        }

        // ── 15 min vor Ende ──
        const endingSoonKey = `endingsoon_${block._key}`;
        if (diffToEnd === 15 && !pushedBlocks.current.has(endingSoonKey)) {
          pushedBlocks.current.add(endingSoonKey);
          window.Push.blockEndingSoon(name, 15);
        }

        // ── Ende (±1 min) ──
        const endKey = `end_${block._key}`;
        if (Math.abs(diffToEnd) <= 1 && !pushedBlocks.current.has(endKey)) {
          pushedBlocks.current.add(endKey);
          window.Push.blockEnded(name);
        }

        // Track current running block (for inactive check)
        if (nowMins >= startMins && nowMins < endMins) currentBlock = block;
      }

      // ── Kein Timer aktiv nach 10 Min in laufendem Block ──
      if (currentBlock && !activeTaskId) {
        if (!blockInactiveStart.current) {
          blockInactiveStart.current = Date.now();
        } else {
          const idleMs = Date.now() - blockInactiveStart.current;
          const inactiveKey = `inactive_${currentBlock._key}`;
          if (idleMs >= 10 * 60 * 1000 && !pushedBlocks.current.has(inactiveKey)) {
            pushedBlocks.current.add(inactiveKey);
            window.Push.inactiveReminder(currentBlock.label || currentBlock.name || currentBlock.title);
          }
        }
      } else {
        blockInactiveStart.current = null; // reset when timer active or no block
      }

      // ── Timer > 2h am Stück ──
      if (activeTaskId) {
        const elapsed  = taskTimes[activeTaskId] ?? 0;
        const minutes  = Math.floor(elapsed / 60);
        if (minutes > 0 && minutes % 120 === 0 && !pushedTimerReminder.current) {
          pushedTimerReminder.current = true;
          setTimeout(() => { pushedTimerReminder.current = false; }, 65000);
          window.Push.timerReminder(getTaskName(activeTaskId), minutes);
        }

        // ── Zeitschätzung überschritten ──
        // Tasks in POV_DATA have est in minutes; check taskTimes vs est
        try {
          let estMins = null;
          for (const povKey of Object.keys(POV_DATA)) {
            const tasks = [...(POV_DATA[povKey].tasksToday || [])];
            let custom = [];
            try { custom = JSON.parse(LS.getItem(`lifeos_tasks_${povKey}`) || "[]"); } catch {}
            const all = [...tasks, ...custom];
            const t = all.find(t => t.id === activeTaskId);
            if (t?.est) { estMins = typeof t.est === "number" ? t.est : parseFloat(t.est) * 60; break; }
          }
          if (estMins && minutes > estMins && !pushedEstExceeded.current) {
            pushedEstExceeded.current = true;
            const over = Math.round(minutes - estMins);
            window.Push.taskEstExceeded(getTaskName(activeTaskId), over);
          }
          if (!activeTaskId) pushedEstExceeded.current = false;
        } catch {}
      } else {
        pushedEstExceeded.current = false;
      }

      // ── OKR / Projekt Deadlines ──
      try {
        const projects = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
        const archived = new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]"));
        for (const proj of projects) {
          if (!proj.deadline || archived.has(proj.id)) continue;
          const end      = new Date(proj.deadline + "T23:59:59");
          const msLeft   = end - now;
          if (msLeft < 0) continue; // already past
          const daysLeft  = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
          const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
          const name = proj.title || "Projekt";
          for (const d of [10, 5, 3, 2, 1]) {
            const key = `deadline_${proj.id}_${d}d`;
            if (daysLeft === d && !pushedBlocks.current.has(key)) {
              pushedBlocks.current.add(key);
              window.Push.deadlineReminder(name, d, d === 1 ? "Tag" : "Tage");
            }
          }
          const key12h = `deadline_${proj.id}_12h`;
          if (hoursLeft <= 12 && !pushedBlocks.current.has(key12h)) {
            pushedBlocks.current.add(key12h);
            window.Push.deadlineReminder(name, hoursLeft, "Stunden");
          }
        }
      } catch {}

      // ── Habit Reminder ab 20:00 ──
      try {
        if (now.getHours() >= 20) {
          const todayISO  = now.toISOString().slice(0, 10);
          const habitKey  = `habitreminder_${todayISO}`;
          if (!pushedBlocks.current.has(habitKey)) {
            const habits  = JSON.parse(LS.getItem("lifeos_habits") || "[]");
            const unchecked = habits.filter(h => !h.log?.[todayISO]);
            if (unchecked.length > 0) {
              pushedBlocks.current.add(habitKey);
              window.Push.habitReminder(unchecked.length);
            }
          }
        }
      } catch {}
    };

    check();
    const iv = setInterval(check, 60_000);
    return () => clearInterval(iv);
  }, [activeTaskId, taskTimes]);

  // ── 50% / 100% Milestone Notifications ──────────────────────────────────────
  const prevKrProgress   = React.useRef({});
  const prevProjProgress = React.useRef({}); // keyed by proj.id
  const prevObjProgress  = React.useRef({}); // keyed by `${proj.id}_${objIdx}`

  React.useEffect(() => {
    if (!window.Push?.isConfigured()) return;

    const getVal = (pov, krId, fallback = 0) =>
      krProgress[`${pov}_${krId}`] ?? fallback;

    const checkMilestone = (prevVal, newVal, name) => {
      if (prevVal < 0.5 && newVal >= 0.5 && newVal < 1.0)
        window.Push.milestone(50, name);
      if (prevVal < 1.0 && newVal >= 1.0)
        window.Push.milestone(100, name);
    };

    try {
      const projects = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
      const archived  = new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]"));

      for (const proj of projects) {
        if (archived.has(proj.id)) continue;
        const pov = proj.pov || "personal";

        // ── KR-level ──
        for (const obj of (proj.objectives || [])) {
          (obj.krs || []).forEach(kr => {
            const key     = `${pov}_${kr.id}`;
            const newVal  = krProgress[key] ?? (kr.progress || 0);
            const prevVal = prevKrProgress.current[key] ?? (kr.progress || 0);
            checkMilestone(prevVal, newVal, kr.title || null);
          });

          // ── Objective-level (avg of active KRs) ──
          const activeKRs = (obj.krs || []).filter(k => k.status !== "locked");
          if (activeKRs.length > 0) {
            const objKey    = `${proj.id}_${obj.id || obj.title || "obj"}`;
            const newObjVal = activeKRs.reduce((s, k) => s + (krProgress[`${pov}_${k.id}`] ?? (k.progress || 0)), 0) / activeKRs.length;
            const prevObjVal = prevObjProgress.current[objKey] ?? 0;
            checkMilestone(prevObjVal, newObjVal, obj.title || obj.period || "Objective");
            prevObjProgress.current[objKey] = newObjVal;
          }
        }

        // ── Project-level (avg across all objectives' active KRs) ──
        const allActiveKRs = (proj.objectives || []).flatMap(o => (o.krs || []).filter(k => k.status !== "locked"));
        if (allActiveKRs.length > 0) {
          const newProjVal  = allActiveKRs.reduce((s, k) => s + (krProgress[`${pov}_${k.id}`] ?? (k.progress || 0)), 0) / allActiveKRs.length;
          const prevProjVal = prevProjProgress.current[proj.id] ?? 0;
          checkMilestone(prevProjVal, newProjVal, proj.title || "Projekt");
          prevProjProgress.current[proj.id] = newProjVal;
        }
      }
    } catch {}

    prevKrProgress.current = { ...krProgress };
  }, [krProgress]);

  // ── Sunday Weekly Check ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!window.Push?.isConfigured()) return;
    const today = new Date();
    if (today.getDay() !== 0) return; // nur Sonntags
    const weekKey  = getWeekKey(WEEK.mon);
    const checkKey = `lifeos_sunday_check_${weekKey}`;
    if (LS.getItem(checkKey)) return; // diese Woche schon gefeuert

    try {
      const projs    = JSON.parse(LS.getItem("lifeos_custom_projects") || "[]");
      const archived = new Set(JSON.parse(LS.getItem("lifeos_archived_projects") || "[]"));
      const pdw      = (() => { try { return JSON.parse(LS.getItem("lifeos_proj_day_weights") || "{}"); } catch { return {}; } })();
      const DEF_W    = [0.2, 0.2, 0.2, 0.2, 0.2, 0, 0];
      const active   = projs.filter(p => !archived.has(p.id) && (p.hoursPerWeek || 0) > 0);
      const behind   = [];

      for (const proj of active) {
        const taskIds = new Set((proj.objectives || []).flatMap(o =>
          (o.krs || []).flatMap(kr => (kr.tasks || []).map(t => t.id))
        ));
        let weeklySecs = 0;
        for (let i = 0; i < 7; i++) {
          const d   = new Date(WEEK.mon);
          d.setDate(WEEK.mon.getDate() + i);
          const dk  = `lifeos_daily_${d.toISOString().slice(0, 10)}`;
          try {
            const log = JSON.parse(LS.getItem(dk) || "{}");
            weeklySecs += [...taskIds].reduce((s, id) => s + (log[id] || 0), 0);
          } catch {}
        }
        const actualH = weeklySecs / 3600;
        const targetH = proj.hoursPerWeek;
        if (actualH < targetH * 0.9)
          behind.push({ title: proj.title || proj.id, actual: actualH.toFixed(1), target: targetH });
      }

      if (behind.length > 0) {
        const names = behind.map(p => `${p.title} (${p.actual}h/${p.target}h)`).join(", ");
        window.Push.send({ title: "⚠ Wochenziel nicht erreicht", message: `${names} — Pensum erhöhen oder Ziel anpassen?`, tag: "sunday-check" });
        LS.setItem(checkKey, "1");
      }
    } catch {}
  }, []);

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
    setInbox(prev => [...prev, { id: `inbox_${Date.now()}`, text: t, ts: new Date().toISOString(), pov: null }]);
    setCaptureText(""); setCaptureOpen(false);
    window.TUTORIAL?.onAction?.("capture-saved");
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
      setHasAccess(true); // guests bypass paywall
      setAuthStatus("onboarding");
    }} />
  );
  // Start free trial clock on first post-tutorial open
  if (authStatus === "ready" && !localStorage.getItem("lifeos_trial_start")) {
    localStorage.setItem("lifeos_trial_start", String(Date.now()));
  }

  if (authStatus === "ready" && !hasAccess) return (
    <PaywallScreen
      userId={authUser?.id || ""}
      email={authUser?.email || ""}
      onAccessGranted={() => {
        localStorage.setItem("lifeos_access", "1");
        localStorage.setItem("lifeos_access_ts", String(Date.now()));
        setHasAccess(true);
      }}
    />
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
            onOpenTask={setGlobalTask} userPovs={userPovs}
            inbox={inbox} setInbox={setInbox} />
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
          // Auto-delete tutorial seed tasks + habits
          try {
            const tasks = JSON.parse(LS.getItem("lifeos_tasks_personal") || "[]");
            LS.setItem("lifeos_tasks_personal", JSON.stringify(tasks.filter(t => !t._tutorial)));
          } catch {}
          try {
            const habits = JSON.parse(LS.getItem("lifeos_habits") || "[]");
            LS.setItem("lifeos_habits", JSON.stringify(habits.filter(h => !h._tutorial)));
          } catch {}
          window.dispatchEvent(new CustomEvent("lifeos-tasks-updated", { detail: { pov: "personal" } }));
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
          data-tutorial="quick-capture-btn"
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
