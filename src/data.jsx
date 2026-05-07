// Life OS — seed data for the prototype. German throughout, mirrors Figma frames.

const POVS = [
  { id: "personal", label: "Personal", sub: "Life OS",                 color: "var(--personal)" },
  { id: "founder",  label: "Founder",  sub: "Vertrieb & Business",     color: "var(--founder)" },
  { id: "student",  label: "Student",  sub: "Wirtschaftspsychologie",  color: "var(--student)" },
  { id: "athlete",  label: "Athlete",  sub: "Bodybuilding",            color: "var(--athlete)" },
];

// Per-POV Main Quest, Quarterly Objective, KRs and Tasks-Today.
const POV_DATA = {
  personal: {
    mainQuest: { title: "Finanzielle Freiheit & eigene 4 Wände", progress: 0, period: "2026" },
    objective: {
      title: "Ausziehen und Fixkosten durch eigenes Einkommen decken",
      period: "Q2–Q3 2026 · Mai – September",
      keyResults: [
        { id: "kr1", label: "KR1: Eigene Wohnung gefunden",     value: 0.10, status: "active" },
        { id: "kr2", label: "KR2: Fixkosten durch Provision",   value: 0.30, status: "active" },
        { id: "kr3", label: "KR3: Sport Coach gestartet",       value: 0.00, status: "locked" },
        { id: "kr4", label: "KR4: Erster Millionär in Familie", value: 0.00, status: "locked" },
      ],
    },
    tasksToday: [
      { id: "t1", n: 1, title: "Wohnungsanzeigen checken",   sub: "Immoscout + WG-Gesucht",    kr: "kr1", elapsed: 0, pov: "personal", flow: "QUICK", est: 20 },
      { id: "t2", n: 2, title: "Monatsbudget reviewen",      sub: "Fixkosten vs. Einnahmen",   kr: "kr2", elapsed: 0, pov: "personal", flow: "QUICK", est: 30 },
      { id: "t3", n: 3, title: "Wochenreflexion",            sub: "Was lief gut, was nicht?",  kr: null,  elapsed: 0, pov: "personal", flow: "FLOW",  est: 45 },
    ],
  },
  founder: {
    mainQuest: { title: "Immobilienvertrieb aufbauen", progress: 0, period: "Q2 2026" },
    objective: {
      title: "20 qualifizierte Termine bis Quartalsende",
      period: "Q2 2026 · 1. Mai – 31. Juli",
      keyResults: [
        { id: "kr1", label: "KR1: 20 Termine eingebucht",   value: 0.30, status: "active" },
        { id: "kr2", label: "KR2: 5 Notarverträge",         value: 0.00, status: "active" },
        { id: "kr3", label: "KR3: Vollständige Beratung",   value: 0.00, status: "locked" },
        { id: "kr4", label: "KR4: Fixkosten durch Provision", value: 0.00, status: "locked" },
      ],
    },
    tasksToday: [
      { id: "t1", n: 1, title: "Leads abtelefonieren",   sub: "Opening & Setting · LeeFinance", kr: "kr1", elapsed: 0, pov: "founder", flow: "FLOW",  est: 90,  live: true },
      { id: "t2", n: 2, title: "Kaltakquise-Liste",      sub: "Neue Leads vorqualifizieren",    kr: "kr1", elapsed: 0, pov: "founder", flow: "QUICK", est: 30 },
      { id: "t3", n: 3, title: "Life OS Plugin",         sub: "Code weiterschreiben",           kr: null,  elapsed: 0, pov: "founder", flow: "FLOW",  est: 120 },
      { id: "t4", n: 4, title: "Wochenplanung",          sub: "OKR-Fortschritt tracken",        kr: null,  elapsed: 0, pov: "founder", flow: "QUICK", est: 20 },
    ],
  },
  student: {
    mainQuest: { title: "Semester 1 mit Schnitt < 2.0", progress: 0, period: "SoSe 2026" },
    objective: {
      title: "Wirtschaftspsychologie Sem 1 abschließen",
      period: "SoSe 2026 · 1. Apr – 31. Juli",
      keyResults: [
        { id: "kr1", label: "KR1: Statistik Klausur bestehen", value: 0.45, status: "active" },
        { id: "kr2", label: "KR2: Hausarbeit eingereicht",     value: 0.10, status: "active" },
        { id: "kr3", label: "KR3: Vorlesungen 100% besucht",   value: 0.60, status: "active" },
        { id: "kr4", label: "KR4: Lerngruppe etabliert",       value: 0.00, status: "locked" },
      ],
    },
    tasksToday: [
      { id: "t1", n: 1, title: "Grundlagen Psychologie",   sub: "Kapitel lesen + Notizen", kr: "kr1", elapsed: 0, pov: "student", flow: "FLOW",  est: 60 },
      { id: "t2", n: 2, title: "Hausarbeit Gliederung",    sub: "Outline + Quellen",       kr: "kr2", elapsed: 0, pov: "student", flow: "FLOW",  est: 90 },
      { id: "t3", n: 3, title: "Vorlesung WiPsy",          sub: "Live um 14:00",           kr: "kr3", elapsed: 0, pov: "student", flow: "FLOW",  est: 90 },
      { id: "t4", n: 4, title: "Karteikarten wiederholen", sub: "Anki-Deck pflegen",       kr: "kr1", elapsed: 0, pov: "student", flow: "QUICK", est: 20 },
    ],
  },
  athlete: {
    mainQuest: { title: "5kg Muskelmasse aufbauen", progress: 0, period: "Q2 2026" },
    objective: {
      title: "Bodybuilding — Push/Pull/Legs durchziehen",
      period: "Q2 2026 · 1. Mai – 31. Juli",
      keyResults: [
        { id: "kr1", label: "KR1: 12 Trainingseinheiten / Monat", value: 0.80, status: "active" },
        { id: "kr2", label: "KR2: Protein > 180g / Tag",          value: 0.65, status: "active" },
        { id: "kr3", label: "KR3: Schlaf > 7h Schnitt",           value: 0.40, status: "active" },
        { id: "kr4", label: "KR4: Bench 100kg x 5",               value: 0.00, status: "locked" },
      ],
    },
    tasksToday: [
      { id: "t1", n: 1, title: "Gym — Push Day",        sub: "Brust & Schultern",    kr: "kr1", elapsed: 0, pov: "athlete", flow: "FLOW",  est: 75 },
      { id: "t2", n: 2, title: "Meal Prep Sonntag",     sub: "5x Hähnchen + Reis",   kr: "kr2", elapsed: 0, pov: "athlete", flow: "QUICK", est: 30 },
      { id: "t3", n: 3, title: "Mobility Routine",      sub: "20 Min Stretching",    kr: "kr3", elapsed: 0, pov: "athlete", flow: "QUICK", est: 20 },
      { id: "t4", n: 4, title: "Schlaf-Log eintragen",  sub: "Whoop-Daten reviewen", kr: "kr3", elapsed: 0, pov: "athlete", flow: "QUICK", est: 10 },
    ],
  },
};

// Default exports for any code still importing the old globals.
const MAIN_QUEST = POV_DATA.founder.mainQuest;
const QUARTERLY_OBJECTIVE = POV_DATA.founder.objective;
const TASKS_TODAY = POV_DATA.founder.tasksToday;

// Truth Loop — Plan vs. Reality (in hours, Mo–So)
const TRUTH_LOOP = {
  plan:    [6, 8, 6, 6, 4, 2, 1],
  reality: [4.5, 6, 3, 2, 2, 0.5, 0],
  days: ["MO", "DI", "MI", "DO", "FR", "SA", "SO"],
};

// Each project supports multiple objectives + optional deadline tracking.
// startDate + deadline → on-track calculation in ProjectDetail.
const PROJECTS = [
  {
    id: "personal-life",
    pov: "personal",
    label: "PERSONAL",
    title: "Life OS — Ausziehen & Freiheit",
    realityH: 4, planH: 10, completion: 0.15,
    status: { kind: "danger", label: "BEHIND" },
    progress: 0.15,
    startDate: "2026-05-01",
    deadline: "2026-09-30",
    objectives: [
      {
        id: "obj1",
        title: "Ausziehen und Fixkosten durch eigenes Einkommen decken",
        period: "Q2–Q3 2026 · Mai – September",
        krs: [
          { id: "kr1", label: "KR1", title: "Eigene Wohnung gefunden", progress: 0.10, status: "active", tasks: [
            { id: "plk1t1", title: "Wohnungsanzeigen checken", kr: "KR1", flow: "QUICK", est: 20, elapsed: 0 },
          ]},
          { id: "kr2", label: "KR2", title: "Fixkosten durch Provision", progress: 0.30, status: "active", tasks: [
            { id: "plk2t1", title: "Monatsbudget reviewen", kr: "KR2", flow: "QUICK", est: 30, elapsed: 0 },
          ]},
          { id: "kr3", label: "KR3", title: "Sport Coach gestartet", progress: 0.00, status: "locked", tasks: [] },
          { id: "kr4", label: "KR4", title: "Erster Millionär in Familie", progress: 0.00, status: "locked", tasks: [] },
        ],
      },
    ],
    sideQuests: [],
  },
  {
    id: "flowos",
    pov: "founder",
    label: "FOUNDER",
    title: "Life OS — Produktentwicklung",
    realityH: 22.5, planH: 30, completion: 0.65,
    status: { kind: "active", label: "AKTIV" },
    progress: 0.65,
    startDate: "2026-04-01",
    deadline: "2026-07-31",
    objectives: [
      {
        id: "obj1",
        title: "Life OS V1 launchen und ersten zahlenden Kunden gewinnen",
        period: "Q2 2026 · Mai – Juli",
        krs: [
          {
            id: "kr1", label: "KR1", title: "Prototyp fertiggestellt", progress: 0.85, status: "active",
            tasks: [
              { id: "p1k1t1", title: "Plugin Code schreiben",        kr: "KR1", flow: "FLOW",  est: 120, elapsed: 8070, live: true },
              { id: "p1k1t2", title: "Figma Prototype finalisieren", kr: "KR1", flow: "FLOW",  est: 90,  elapsed: 0 },
            ],
          },
          {
            id: "kr2", label: "KR2", title: "10 Beta-Nutzer onboarded", progress: 0.20, status: "active",
            tasks: [
              { id: "p1k2t1", title: "Beta-Nutzer anschreiben", kr: "KR2", flow: "QUICK", est: 30, elapsed: 0 },
            ],
          },
          { id: "kr3", label: "KR3", title: "Ersten zahlenden Kunden", progress: 0.00, status: "locked", tasks: [] },
          { id: "kr4", label: "KR4", title: "MRR > 500€",             progress: 0.00, status: "locked", tasks: [] },
        ],
      },
      {
        id: "obj2",
        title: "Wachstum & Community — 100 aktive Nutzer bis Q3",
        period: "Q3 2026 · August – Oktober",
        krs: [
          { id: "kr5", label: "KR1", title: "100 aktive Nutzer",              progress: 0.00, status: "active", tasks: [] },
          { id: "kr6", label: "KR2", title: "Discord Community mit 50 Members", progress: 0.00, status: "active", tasks: [] },
          { id: "kr7", label: "KR3", title: "Produkthunt Launch",             progress: 0.00, status: "locked", tasks: [] },
        ],
      },
    ],
    sideQuests: [
      { id: "sq1", title: "Twitter / Social Media", note: "Warum machst du das?", status: "blocked" },
    ],
  },
  {
    id: "immo",
    pov: "founder",
    label: "FOUNDER",
    title: "Immobilienvertrieb Q2",
    realityH: 18, planH: 20, completion: 0.40,
    status: { kind: "active", label: "AKTIV" },
    progress: 0.40,
    startDate: "2026-05-01",
    deadline: "2026-07-31",
    objectives: [
      {
        id: "obj1",
        title: "20 qualifizierte Termine bis Quartalsende",
        period: "Q2 2026 · Mai – Juli",
        krs: [
          { id: "kr1", label: "KR1", title: "20 Termine eingebucht", progress: 0.55, status: "active", tasks: [
            { id: "p2k1t1", title: "Cold Calls Liste durcharbeiten", kr: "KR1", flow: "FLOW", est: 90, elapsed: 0 },
          ]},
          { id: "kr2", label: "KR2", title: "5 Notarverträge", progress: 0.20, status: "active", tasks: [] },
        ],
      },
      {
        id: "obj2",
        title: "Vollständige Beratung selbst übernehmen",
        period: "Q3 2026 · August – Oktober",
        krs: [
          { id: "kr3", label: "KR1", title: "10 eigenständige Abschlüsse", progress: 0.00, status: "active", tasks: [] },
          { id: "kr4", label: "KR2", title: "Provision > 3.000€ / Monat",  progress: 0.00, status: "active", tasks: [] },
        ],
      },
    ],
    sideQuests: [],
  },
  {
    id: "uni",
    pov: "student",
    label: "STUDENT",
    title: "Wirtschaftspsychologie Sem 1",
    realityH: 8, planH: 15, completion: 0.30,
    status: { kind: "danger", label: "BEHIND" },
    progress: 0.30,
    startDate: "2026-04-01",
    deadline: "2026-07-31",
    objectives: [
      {
        id: "obj1",
        title: "Semester 1 mit Schnitt < 2.0 abschließen",
        period: "SoSe 2026 · April – Juli",
        krs: [
          { id: "kr1", label: "KR1", title: "Statistik Klausur bestehen", progress: 0.45, status: "active", tasks: [
            { id: "p3k1t1", title: "Kapitel 3 lesen + Notizen", kr: "KR1", flow: "FLOW", est: 60, elapsed: 0 },
          ]},
          { id: "kr2", label: "KR2", title: "Hausarbeit eingereicht", progress: 0.10, status: "active", tasks: [] },
        ],
      },
    ],
    sideQuests: [],
  },
  {
    id: "gym",
    pov: "athlete",
    label: "ATHLETE",
    title: "Bodybuilding — Push/Pull/Legs",
    realityH: 12, planH: 12, completion: 0.60,
    status: { kind: "good", label: "ON TRACK" },
    progress: 0.60,
    startDate: "2026-05-01",
    deadline: "2026-07-31",
    objectives: [
      {
        id: "obj1",
        title: "5kg Muskelmasse aufbauen bis 31. Juli",
        period: "Q2 2026 · Mai – Juli",
        krs: [
          { id: "kr1", label: "KR1", title: "12 Trainingseinheiten / Monat", progress: 0.80, status: "active", tasks: [
            { id: "p4k1t1", title: "Push Day — Brust & Schultern", kr: "KR1", flow: "FLOW", est: 75, elapsed: 0 },
          ]},
          { id: "kr2", label: "KR2", title: "Protein-Intake > 180g/Tag", progress: 0.65, status: "active", tasks: [] },
        ],
      },
    ],
    sideQuests: [],
  },
];

// Planner: week of 5–11 May 2026 (KW 19) — swimlanes replaced by dynamic timeblocks in Planner UI.
const WEEK = {
  kw: 19,
  range: "5.–11. Mai 2026",
  days: [
    { k: "MO", n: "05" }, { k: "DI", n: "06" }, { k: "MI", n: "07" },
    { k: "DO", n: "08" }, { k: "FR", n: "09" }, { k: "SA", n: "10" }, { k: "SO", n: "11" },
  ],
  swimlanes: [],
};

// expose
Object.assign(window, {
  MAIN_QUEST, POVS, POV_DATA, QUARTERLY_OBJECTIVE, TASKS_TODAY, TRUTH_LOOP, PROJECTS, WEEK,
});
