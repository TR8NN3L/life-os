// Supabase client + LS storage wrapper.
// Loaded as plain JS before all Babel scripts — window.LS available everywhere.

(function () {
  const SUPA_URL = "https://sogifllxeanbvazfzlbf.supabase.co";
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvZ2lmbGx4ZWFuYnZhemZ6bGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzY4MDksImV4cCI6MjA5MzgxMjgwOX0.ud6ieegP-JJLFeIyvOajShorQOVtfTcrSCJLFLBrABo";

  const _sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  let _uid = null;
  const _q = {};

  async function _write(key, valueStr) {
    if (!_uid) return;
    let value;
    try { value = JSON.parse(valueStr); } catch { value = valueStr; }
    try {
      await _sb.from("user_data").upsert({ user_id: _uid, key, value, updated_at: new Date().toISOString() });
    } catch (e) { console.warn("[LS]", key, e.message); }
  }

  // Drop-in localStorage replacement — same API, adds debounced Supabase sync.
  const LS = {
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => {
      localStorage.setItem(k, v);
      clearTimeout(_q[k]);
      _q[k] = setTimeout(() => _write(k, v), 800);
    },
    removeItem: (k) => {
      localStorage.removeItem(k);
      if (_uid) _sb.from("user_data").delete().eq("user_id", _uid).eq("key", k).then(() => {});
    },
  };

  // Pull all cloud rows into localStorage (cloud wins).
  async function syncDown(uid) {
    _uid = uid;
    try {
      const { data, error } = await _sb.from("user_data").select("key, value");
      if (error) { console.warn("[LS] syncDown:", error.message); return; }
      for (const row of (data || [])) {
        localStorage.setItem(row.key, JSON.stringify(row.value));
      }
    } catch (e) { console.warn("[LS] syncDown:", e.message); }
  }

  // Push all lifeos_ localStorage keys to cloud (first-time login).
  async function pushLocal(uid) {
    _uid = uid;
    const keys = Object.keys(localStorage).filter(k => k.startsWith("lifeos_"));
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v) await _write(k, v);
    }
  }

  // On every auth change just track the uid for writes.
  _sb.auth.onAuthStateChange((_, session) => { _uid = session?.user?.id || null; });

  window.LS = LS;
  window._supabase = _sb;
  window.sbAuth = {
    signUp: (email, password) => _sb.auth.signUp({ email, password }),
    signIn: (email, password) => _sb.auth.signInWithPassword({ email, password }),
    signOut: () => { _uid = null; return _sb.auth.signOut(); },
    getSession: async () => { const { data } = await _sb.auth.getSession(); return data.session; },
    syncDown,
    pushLocal,
  };
})();
