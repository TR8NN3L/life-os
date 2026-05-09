// AI helpers — Anthropic Claude Haiku for OKR Generator and Daily Mission.
(function () {
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
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : text);
  }

  window.AI = {
    async generateKRs(mainQuestTitle, povLabel, period) {
      return callAI(
        `Du bist ein OKR-Experte. Generiere 3-5 Key Results für ein gegebenes Hauptziel. Jeder KR muss spezifisch und messbar sein. Antworte NUR mit validem JSON ohne zusätzlichen Text: { "keyResults": [{ "label": "KR1", "title": "..." }, ...] }`,
        `POV: ${povLabel}\nHauptziel: ${mainQuestTitle}${period ? `\nZeitraum: ${period}` : ""}\n\nGeneriere 3-5 Key Results auf Deutsch. Jeder KR soll ein konkretes, messbares Ergebnis beschreiben — kein vages "verbessern" oder "mehr machen".`,
        { maxTokens: 600 }
      );
    },

    async generateDailyMission(mainQuestTitle, keyResults, povLabel, userName) {
      const krText = keyResults && keyResults.length > 0
        ? keyResults.map((kr, i) => `${kr.label || `KR${i + 1}`}: ${kr.title || kr}`).join("\n")
        : "(noch keine Key Results — basiere Tasks direkt auf dem Hauptziel)";
      return callAI(
        `Du bist ein Produktivitäts-Coach. Generiere genau 3 konkrete Aufgaben für heute. Aufgaben müssen in 15-90 min machbar sein und das Hauptziel direkt voranbringen. Antworte NUR mit validem JSON ohne zusätzlichen Text: { "tasks": [{ "title": "...", "sub": "...", "krLabel": "KR1 oder null", "est": 30 }], "motivation": "Ein motivierender Satz auf Deutsch." }`,
        `${userName ? `Name: ${userName}\n` : ""}POV: ${povLabel}\nHauptziel: ${mainQuestTitle}\n\nKey Results:\n${krText}\n\nGeneriere 3 Aufgaben für heute auf Deutsch. Konkret, umsetzbar, kein Fuzzy.`,
        { maxTokens: 500 }
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
        medium:  "2 Objectives, je 4 Key Results, 4–5 Tasks pro KR",
        complex: `3–4 Objectives, je 5–6 Key Results, 6–8 Tasks pro KR${d.generateSubtasks ? ", 3–4 Subtasks pro Task" : ""}`,
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

      const maxT = d.complexity === "complex" ? 8000 : d.complexity === "medium" ? 5000 : 2500;
      return callAI(system, user, { maxTokens: maxT });
    },
  };
})();
