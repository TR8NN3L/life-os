// AI helpers — Anthropic Claude Haiku for OKR Generator and Daily Mission.
(function () {
  // Attempt to repair truncated JSON by closing open structures
  function closeOpenBrackets(s) {
    const stack = [];
    let inStr = false, esc = false;
    for (const ch of s) {
      if (esc) { esc = false; continue; }
      if (ch === "\\" && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
    let out = s;
    if (inStr) out += '"';
    while (stack.length) out += stack.pop();
    return out;
  }

  function tryRepairJson(raw) {
    const match = raw.match(/\{[\s\S]*/);
    if (!match) return null;
    let s = match[0];
    try { return JSON.parse(s); } catch {}

    // Pass 1: close open string + open brackets
    try { return JSON.parse(closeOpenBrackets(s)); } catch {}

    // Pass 2: truncate at last complete object boundary and re-close
    // Walk backwards to find positions of "}", try each as a cut point
    for (let i = s.length - 1; i > s.length * 0.3; i--) {
      if (s[i] !== '}') continue;
      const candidate = closeOpenBrackets(s.slice(0, i + 1));
      try { return JSON.parse(candidate); } catch {}
      i -= 10; // skip ahead to avoid O(n²) on dense text
    }
    return null;
  }

  async function callAI(system, userMessage, { maxTokens = 800 } = {}) {
    const key = localStorage.getItem("lifeos_openai_key");
    if (!key) {
      const e = new Error("Kein API Key. Bitte in den Einstellungen (⚙) eintragen.");
      e.code = "NO_KEY";
      throw e;
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Fehler (${res.status})`);
    }
    const data = await res.json();
    const text = data.content[0].text;
    // Try direct parse, then repair truncated JSON
    const direct = text.match(/\{[\s\S]*\}/);
    try { return JSON.parse(direct ? direct[0] : text); } catch {}
    const repaired = tryRepairJson(text);
    if (repaired) return repaired;
    throw new Error("JSON Parse Fehler — Antwort war unvollständig. Bitte nochmal versuchen oder Komplexität reduzieren.");
  }

  window.AI = {
    async generateKRs(mainQuestTitle, povLabel, period) {
      return callAI(
        `Du bist ein OKR-Experte. Generiere 3-5 Key Results für ein gegebenes Hauptziel. Jeder KR muss spezifisch und messbar sein. Antworte NUR mit validem JSON ohne zusätzlichen Text: { "keyResults": [{ "label": "KR1", "title": "..." }, ...] }`,
        `POV: ${povLabel}\nHauptziel: ${mainQuestTitle}${period ? `\nZeitraum: ${period}` : ""}\n\nGeneriere 3-5 Key Results auf Deutsch. Jeder KR soll ein konkretes, messbares Ergebnis beschreiben — kein vages "verbessern" oder "mehr machen".`,
        { maxTokens: 600 }
      );
    },

    async generateDailyMission(mainQuestTitle, keyResults, povLabel, userName, energy, availableTime) {
      const krText = keyResults && keyResults.length > 0
        ? keyResults.map((kr, i) => `${kr.label || `KR${i + 1}`}: ${kr.title || kr}`).join("\n")
        : "(noch keine Key Results — basiere Tasks direkt auf dem Hauptziel)";
      const energyDesc = energy ? `Energie-Level heute: ${energy}/5 (${energy <= 2 ? "niedrig — einfache, routinierte Aufgaben bevorzugen" : energy >= 4 ? "hoch — tiefe Arbeit und komplexe Aufgaben möglich" : "mittel — ausgewogene Mischung"})` : "";
      const timeDesc = availableTime ? `Verfügbare Zeit: ${availableTime}` : "";
      const energyGuide = energy && energy <= 2
        ? "WICHTIG: Energie niedrig. Waehle einfache, mechanische Aufgaben (keine komplexen Entscheidungen, kein Deep Work). Zeitaufwaendige aber einfache Tasks bevorzugen."
        : energy && energy >= 4
        ? "WICHTIG: Energie hoch. Nutze das fuer Deep Work, komplexe Analyse, kreative Aufgaben. Herausfordernde Tasks bevorzugen."
        : "";
      return callAI(
        `Du bist ein Produktivitaets-Coach. Generiere genau 3 konkrete Aufgaben fuer heute passend zum Energie-Level. Aufgaben muessen realistisch in der verfuegbaren Zeit machbar sein. Antworte NUR mit validem JSON ohne zusaetzlichen Text: { "tasks": [{ "title": "...", "sub": "...", "krLabel": "KR1 oder null", "est": 30 }], "motivation": "Ein kurzer motivierender Satz auf Deutsch." }`,
        `${userName ? `Name: ${userName}\n` : ""}POV: ${povLabel}\nHauptziel: ${mainQuestTitle}\n${energyDesc ? energyDesc + "\n" : ""}${timeDesc ? timeDesc + "\n" : ""}\nKey Results:\n${krText}\n\n${energyGuide}\n\nGeneriere 3 passende Aufgaben fuer heute auf Deutsch. Konkret, umsetzbar. Est in Minuten anpassen an verfuegbare Zeit.`,
        { maxTokens: 500 }
      );
    },

    async generateDayPlan({ pov, povLabel, energy, focus, availableTime, goal, mode, dayStr, startTime, blockDuration, numBlocks, multiPov, povs }) {
      const energyDesc = energy <= 2 ? "niedrig (einfache, routinierte Aufgaben)" : energy >= 4 ? "hoch (Deep Work, komplexe Aufgaben)" : "mittel (ausgewogener Mix)";
      const focusDesc  = focus  <= 2 ? "niedrig (kurze Bloecke, viele Pausen)" : focus  >= 4 ? "hoch (lange Bloecke, wenig Pausen)" : "mittel";
      const blockSpec  = numBlocks && blockDuration ? `Exakt ${numBlocks} Bloecke, je ca. ${blockDuration} Minuten. Startzeit: ${startTime || "08:00"}.` : "";
      const povSpec    = multiPov && povs ? `Verteile die Bloecke auf diese POVs: ${povs.join(", ")}. Jeder Block bekommt einen bucket-Wert aus dieser Liste.` : `POV: ${povLabel}`;
      return callAI(
        `Du bist ein Tagesplaner-Experte. Generiere Zeitbloecke fuer einen Tagesplan. Antworte NUR mit validem JSON ohne Kommentare: { "blocks": [{ "name": "Aussagekraeftiger Blockname", "start": "HH:MM", "end": "HH:MM", "type": "deep-work|basic|flex", "bucket": "founder|personal|student|athlete", "durationMins": 60 }] }. Zeiten im Format HH:MM, keine Ueberschneidungen, keine Bloecke vor 06:00 oder nach 23:00.`,
        `${povSpec}\nEnergie: ${energyDesc}\nMentale Fokus-Kapazitaet: ${focusDesc}\nGesamtzeit: ${availableTime}\n${blockSpec}\n${goal ? `Tagesziel: ${goal}\n` : ""}${dayStr ? `Datum: ${dayStr}\n` : ""}Modus: ${mode === "fill" ? "Ergaenzende Bloecke" : "Kompletter Tagesplan"}\n\nBlocknamen sollen konkret und motivierend sein (z.B. "Leads abtelefonieren" statt "Arbeit"). Typ: deep-work fuer Konzentration/Flow, basic fuer kurze Erledigungen, flex fuer gemischtes.`,
        { maxTokens: 800 }
      );
    },

    async generateOKRProject(d) {
      const MOTIVATION_LABELS = {
        income: "Einkommen/Geld", growth: "Wachstum/Skalierung", recognition: "Anerkennung/Status",
        learning: "Lernen/Skills", freedom: "Freiheit/Autonomie", impact: "Impact/Wirkung",
        security: "Sicherheit/Stabilität", proof: "Selbstbeweis", fun: "Spaß/Freude",
      };
      const OBSTACLE_LABELS = {
        time: "Zeitmangel", money: "Geldmangel", knowledge: "fehlendes Wissen",
        discipline: "mangelnde Disziplin", dependencies: "externe Abhängigkeiten", unclear: "Unklarheit über den Weg",
      };
      const COMPLEXITY_GUIDE = {
        simple:  "1 Objective, genau 3 Key Results, 3 Tasks pro KR",
        medium:  "2 Objectives, je 3 Key Results, 3–4 Tasks pro KR",
        complex: `3 Objectives, je 4 Key Results, 4–5 Tasks pro KR${d.generateSubtasks ? ", 2–3 Subtasks pro Task" : ""}`,
      };

      const povLabel = (typeof POVS !== "undefined" && POVS.find(p => p.id === d.pov)?.label) || d.pov;
      const totalHours = (d.deadlineWeeks || 6) * (d.hoursPerWeek || 8);
      const allObstacles = [...(d.obstacles || []).map(id => OBSTACLE_LABELS[id] || id), d.obstacleCustom].filter(Boolean);
      const motivationStr = (d.motivationTypes || []).map(m => MOTIVATION_LABELS[m] || m).join(", ") || "Nicht angegeben";

      const system = `Du bist ein Elite-OKR-Coach. Erstelle präzise, psychologisch fundierte Projektpläne die Menschen schockieren wie gut ein Projekt durchdacht sein kann.

Antworte NUR mit validem JSON (kein Text außerhalb):
{
  "projectName": "...",
  "objectives": [
    {
      "id": "obj1",
      "title": "Konkretes, inspirierendes Objective",
      "period": "z.B. Mai–Jun 2026",
      "keyResults": [
        {
          "label": "KR1",
          "title": "Messbare Aussage mit Zahl/Prozent/Datum",
          "tasks": [
            {
              "title": "Konkreter Task-Name",
              "sub": "Kurze Erklärung was genau zu tun ist",
              "est": 30,
              "flow": "FLOW",
              "subtasks": ["Schritt 1", "Schritt 2"]
            }
          ]
        }
      ]
    }
  ],
  "firstDomino": "Die eine Aufgabe die alles andere leichter macht",
  "weeklyFocus": "Was jede Woche priorisiert werden soll"
}

PFLICHTREGELN:
- KRs MÜSSEN messbar sein (Zahlen, Prozente, konkrete Deliverables) — NIEMALS "verbessern", "steigern", "optimieren" ohne Messwert
- Tasks: ${d.generateTodos ? "IMMER generieren, 15–90 min machbar" : "LEERE Arrays [] für alle tasks-Felder"}
- Subtasks: ${d.generateSubtasks ? "3–4 pro Task generieren" : "IMMER leere Arrays [] für subtasks"}
- flow-Werte: "FLOW" (intensiv, >30min), "QUICK" (schnell, <15min), "EASY" (einfach, routine)
- Komplexität: ${COMPLEXITY_GUIDE[d.complexity] || COMPLEXITY_GUIDE.medium}
- Gesamtbudget ${totalHours}h — Tasks müssen realistisch darin passen`;

      const user = `PROJEKT:
Name: ${d.projectName}
POV/Bereich: ${povLabel}

ZIEL & MOTIVATION:
Großes Ziel: ${d.bigGoal}
Warum (Ebene 1): ${d.why1}
Warum (Ebene 2): ${d.why2 || "–"}
Antrieb: ${motivationStr}

ZEITPLANUNG (Parkinson's Law anwenden):
Zeitrahmen: ${d.deadlineWeeks ? `${d.deadlineWeeks} Wochen` : "offen"}
Budget: ${d.hoursPerWeek}h/Woche = ${totalHours}h gesamt

ERFOLGSDEFINITION → wird Objective:
"${d.successDefinition}"

HINDERNISSE & WOOP:
Haupthindernisse: ${allObstacles.join(", ") || "keine angegeben"}
Implementation Intention: "${d.implementationIntention || "–"}"

AUSGABE:
Komplexität: ${d.complexity} (${COMPLEXITY_GUIDE[d.complexity] || COMPLEXITY_GUIDE.medium})
Tasks generieren: ${d.generateTodos ? "JA" : "NEIN"}
Subtasks generieren: ${d.generateSubtasks ? "JA" : "NEIN"}

Erstelle jetzt den Projektplan. Alle KRs und Tasks müssen direkt aus dem Kontext (${d.bigGoal}) abgeleitet sein — keine generischen Placeholder.`;

      const maxT = d.complexity === "complex" ? 8192 : d.complexity === "medium" ? 8192 : 4096;
      return callAI(system, user, { maxTokens: maxT });
    },
  };
})();
