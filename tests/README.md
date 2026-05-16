# Life OS UX Tests — Stagehand

Automatisierter UX-Audit mit Stagehand + Playwright (lokal, kein Browserbase-Key nötig).

## Setup (einmalig)

```bash
cd tests
npm install
npx playwright install chromium
cp .env.example .env
# .env öffnen und ANTHROPIC_API_KEY eintragen
```

## Ausführen

```bash
# Vollständiger Audit (alle 6 Views + Details)
npm test

# Nur Smoke-Test (Views erreichbar?)
npm run test:smoke
```

## Was wird getestet

| View | Checks |
|---|---|
| **Dashboard** | POV-Tiles, War Room, Ignorance Debt, broken Elements |
| **Heute** | Header "HEUTE", Quick-Capture, Task-Liste, Zuteilen-Button |
| **Focus** | Breadcrumb (kein roher ID wie OBJ1_KR1), Timer, Tabs |
| **Mission Control** | POV-Count, Labels (Business nicht Professional), OKR |
| **Planner** | Zeitgrid, Tages-Tabs, TAGE VERTEILEN, + BLOCK |
| **Insights** | Weekly Chart, PvD-Stats, POV-Labels korrekt |

## Output

```
🔴 Critical — Blocker (funktioniert nicht)
🟡 Warn     — UX-Problem (suboptimal)
🔵 Info     — Beobachtung
```
