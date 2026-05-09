// Life OS — generic seed data. All personal content is user-configured via Onboarding.

// POV IDs are fixed (personal/founder/student/athlete) — CSS vars + localStorage keys depend on them.
// Labels/subs are generic; users customize via Onboarding.
const POVS = [
  { id: "personal", label: "Personal",     sub: "Persönliches Leben", color: "var(--personal)" },
  { id: "founder",  label: "Professional", sub: "Beruf & Business",   color: "var(--founder)" },
  { id: "student",  label: "Education",    sub: "Lernen & Studium",   color: "var(--student)" },
  { id: "athlete",  label: "Health",       sub: "Sport & Gesundheit", color: "var(--athlete)" },
];

// Empty POV structure — all data is user-configured via Onboarding or Mission Control.
function emptyPovData(povId) {
  return {
    mainQuest: { title: "", progress: 0, period: "" },
    objective: { title: "", period: "", keyResults: [] },
    tasksToday: [],
  };
}

const POV_DATA = {
  personal: emptyPovData("personal"),
  founder:  emptyPovData("founder"),
  student:  emptyPovData("student"),
  athlete:  emptyPovData("athlete"),
};

// Load user-defined POV data and register custom POVs in POV_DATA.
(function mergeSavedPovData() {
  try {
    const saved = JSON.parse(LS.getItem("lifeos_pov_data") || "{}");
    for (const [povId, data] of Object.entries(saved)) {
      POV_DATA[povId] = { ...emptyPovData(povId), ...data };
    }
  } catch {}
  // Ensure custom user POVs have an entry in POV_DATA
  try {
    const userPovs = JSON.parse(LS.getItem("lifeos_user_povs") || "[]");
    for (const p of userPovs) {
      if (!POV_DATA[p.id]) POV_DATA[p.id] = emptyPovData(p.id);
    }
  } catch {}
})();

// Legacy globals — kept so unchanged files don't break.
const MAIN_QUEST         = POV_DATA.personal.mainQuest;
const QUARTERLY_OBJECTIVE = POV_DATA.personal.objective;
const TASKS_TODAY        = [];

// Truth Loop — Plan vs. Reality (in hours, Mo–So). Starts at zero.
const TRUTH_LOOP = {
  plan:    [0, 0, 0, 0, 0, 0, 0],
  reality: [0, 0, 0, 0, 0, 0, 0],
  days: ["MO", "DI", "MI", "DO", "FR", "SA", "SO"],
};

// No hardcoded projects — all user-created via Mission Control.
const PROJECTS = [];

// Planner: dynamisch berechnet — immer aktuelle Woche
const WEEK = (() => {
  const now   = new Date();
  const dow   = now.getDay();
  const diff  = dow === 0 ? -6 : 1 - dow;
  const mon   = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);

  const thu   = new Date(mon); thu.setDate(mon.getDate() + 3);
  const jan4  = new Date(thu.getFullYear(), 0, 4);
  const jan4Mo = new Date(jan4);
  jan4Mo.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1));
  const kw    = Math.round((mon - jan4Mo) / 604800000) + 1;

  const sun   = new Date(mon); sun.setDate(mon.getDate() + 6);
  const DE_MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  const DE_MONTHS_SHORT = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  const range = `${mon.getDate()}.–${sun.getDate()}. ${DE_MONTHS[sun.getMonth()]} ${sun.getFullYear()}`;

  const DAY_LABELS = ["MO","DI","MI","DO","FR","SA","SO"];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return {
      k:    DAY_LABELS[i],
      n:    String(d.getDate()).padStart(2, "0"),
      date: d,
      monthShort: DE_MONTHS_SHORT[d.getMonth()],
    };
  });

  return { kw, range, days, mon, sun, swimlanes: [] };
})();

Object.assign(window, {
  MAIN_QUEST, POVS, POV_DATA, QUARTERLY_OBJECTIVE, TASKS_TODAY, TRUTH_LOOP, PROJECTS, WEEK,
  emptyPovData,
});
