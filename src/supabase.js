// Supabase client + LS storage wrapper.
// Loaded as plain JS before all Babel scripts — window.LS available everywhere.

(function () {
  const SUPA_URL = "https://sogifllxeanbvazfzlbf.supabase.co";
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvZ2lmbGx4ZWFuYnZhemZ6bGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzY4MDksImV4cCI6MjA5MzgxMjgwOX0.ud6ieegP-JJLFeIyvOajShorQOVtfTcrSCJLFLBrABo";

  const _sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  let _uid = null;
  let _jwt = null;
  const _q = {};
  const _dirty = new Set(); // keys written locally but not yet confirmed in Supabase

  // Keys that must never leave the browser
  const LOCAL_ONLY = new Set([
    "lifeos_openai_key",  // API key — security
    "lifeos_guest",       // device-specific flag
    "lifeos_active",      // which task is running — device-specific to avoid cross-device auto-start
  ]);

  // Keys that sync to cloud but with a longer debounce (5s) to avoid write storms
  const SLOW_SYNC = new Set([
    "lifeos_times",       // timer seconds — sync on pause/idle, not every tick
  ]);

  async function _write(key, valueStr) {
    if (!_uid || LOCAL_ONLY.has(key)) return;
    let value;
    try { value = JSON.parse(valueStr); } catch { value = valueStr; }
    try {
      await _sb.from("user_data").upsert({ user_id: _uid, key, value, updated_at: new Date().toISOString() });
      _dirty.delete(key);
    } catch (e) { console.warn("[LS]", key, e.message); }
  }

  // Flush all dirty keys on page unload using keepalive fetch (request outlives navigation)
  window.addEventListener("beforeunload", () => {
    if (!_uid || !_jwt || _dirty.size === 0) return;
    _dirty.forEach(k => {
      clearTimeout(_q[k]);
      const v = localStorage.getItem(k);
      if (!v) return;
      let value;
      try { value = JSON.parse(v); } catch { value = v; }
      fetch(`${SUPA_URL}/rest/v1/user_data`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${_jwt}`,
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify([{ user_id: _uid, key: k, value, updated_at: new Date().toISOString() }]),
      });
    });
    _dirty.clear();
  });

  // Drop-in localStorage replacement — same API, adds debounced Supabase sync.
  const LS = {
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => {
      localStorage.setItem(k, v);
      if (_uid && !LOCAL_ONLY.has(k)) {
        _dirty.add(k);
        clearTimeout(_q[k]);
        const delay = SLOW_SYNC.has(k) ? 5000 : 300;
        _q[k] = setTimeout(() => _write(k, v), delay);
      }
    },
    removeItem: (k) => {
      localStorage.removeItem(k);
      _dirty.delete(k);
      if (_uid && !LOCAL_ONLY.has(k))
        _sb.from("user_data").delete().eq("user_id", _uid).eq("key", k).then(() => {});
    },
  };

  // Pull all cloud rows into localStorage.
  // Arrays: merge cloud + local-only items so unsynced saves survive a fast reload.
  async function syncDown(uid) {
    _uid = uid;
    try {
      const { data, error } = await _sb.from("user_data").select("key, value");
      if (error) { console.warn("[LS] syncDown:", error.message); return; }
      for (const row of (data || [])) {
        if (Array.isArray(row.value)) {
          let local;
          try { local = JSON.parse(localStorage.getItem(row.key) || "[]"); } catch { local = []; }
          if (Array.isArray(local) && local.length > 0) {
            const cloudIds = new Set((row.value || []).map(item => item && item.id).filter(Boolean));
            const localOnly = local.filter(item => item && item.id && !cloudIds.has(item.id));
            if (localOnly.length > 0) {
              const merged = [...row.value, ...localOnly];
              localStorage.setItem(row.key, JSON.stringify(merged));
              _write(row.key, JSON.stringify(merged));
              continue;
            }
          }
        }
        // Strings stay as plain strings — only objects/arrays need JSON.stringify
        if (typeof row.value === "string") {
          localStorage.setItem(row.key, row.value);
        } else {
          localStorage.setItem(row.key, JSON.stringify(row.value));
        }
      }
    } catch (e) { console.warn("[LS] syncDown:", e.message); }
  }

  // Push all local lifeos_ keys to cloud (first-time login on new device).
  async function pushLocal(uid) {
    _uid = uid;
    const keys = Object.keys(localStorage).filter(k => k.startsWith("lifeos_") && !LOCAL_ONLY.has(k));
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v) await _write(k, v);
    }
  }

  // Track uid + jwt on every auth change; also init from existing session on load.
  _sb.auth.onAuthStateChange((_, session) => {
    _uid = session?.user?.id || null;
    _jwt = session?.access_token || null;
  });
  // Eagerly read existing session so _jwt is set before any beforeunload fires
  _sb.auth.getSession().then(({ data }) => {
    if (data?.session) {
      _uid = data.session.user.id;
      _jwt = data.session.access_token;
    }
  });

  window.LS = LS;
  window._supabase = _sb;
  window.sbAuth = {
    signUp: (email, password) => _sb.auth.signUp({ email, password }),
    signIn: (email, password) => _sb.auth.signInWithPassword({ email, password }),
    signOut: () => { _uid = null; _jwt = null; return _sb.auth.signOut(); },
    getSession: async () => { const { data } = await _sb.auth.getSession(); return data.session; },
    syncDown,
    pushLocal,
    // Wipe all user_data rows from Supabase (used before full reset so syncDown on reload finds nothing)
    resetCloud: async () => {
      if (!_uid) return;
      try { await _sb.from("user_data").delete().eq("user_id", _uid); } catch (e) { console.warn("[LS] resetCloud:", e.message); }
    },
  };
})();
