// GET /api/calendar?uid=USER_ID
// Returns an iCalendar (.ics) feed of all planner blocks for the given user.
// Subscribe in Apple Calendar, Google Calendar, Outlook, etc.

const SUPA_URL = "https://sogifllxeanbvazfzlbf.supabase.co";

function pad2(n) { return String(n).padStart(2, "0"); }

function dateToIcal(dateStr, timeStr) {
  // dateStr: "2026-05-12", timeStr: "09:00"
  const [y, m, d] = dateStr.split("-");
  const [hh, mm]  = timeStr.split(":");
  return `${y}${m}${d}T${hh}${mm}00`;
}

function mondayOfISOWeek(weekKey) {
  // weekKey: "2026-W19"  →  Monday as Date
  const [yearStr, wStr] = weekKey.split("-W");
  const y = parseInt(yearStr);
  const w = parseInt(wStr);
  const jan4   = new Date(y, 0, 4);
  const jan4Mo = new Date(jan4);
  jan4Mo.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1));
  const monday = new Date(jan4Mo.getTime() + (w - 1) * 7 * 24 * 3600 * 1000);
  return monday;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// iCalendar line folding (RFC 5545: lines > 75 octets must be folded)
function foldLine(line) {
  if (line.length <= 75) return line;
  const chunks = [];
  let pos = 0;
  chunks.push(line.slice(0, 75));
  pos = 75;
  while (pos < line.length) {
    chunks.push(" " + line.slice(pos, pos + 74));
    pos += 74;
  }
  return chunks.join("\r\n");
}

export default async function handler(req, res) {
  const userId = Array.isArray(req.query.uid) ? req.query.uid[0] : req.query.uid;

  if (!userId) return res.status(400).send("Missing userId");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).send("Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY");

  const headers = {
    "apikey":        serviceKey,
    "Authorization": `Bearer ${serviceKey}`,
  };

  // Fetch timeblocks_v2 and recurring_blocks in parallel
  const [tbRes, rbRes] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/user_data?user_id=eq.${userId}&key=eq.lifeos_timeblocks_v2&select=value`, { headers }),
    fetch(`${SUPA_URL}/rest/v1/user_data?user_id=eq.${userId}&key=eq.lifeos_recurring_blocks&select=value`, { headers }),
  ]);

  const tbData = await tbRes.json();
  const rbData = await rbRes.json();

  const allBlocks = tbData?.[0]?.value || {};
  const recurring = rbData?.[0]?.value || [];

  const events = [];
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

  // ── One-off blocks from lifeos_timeblocks_v2 ──────────────────────────────
  for (const [weekKey, dayMap] of Object.entries(allBlocks)) {
    if (!/^\d{4}-W\d{2}$/.test(weekKey)) continue;
    let monday;
    try { monday = mondayOfISOWeek(weekKey); } catch { continue; }

    for (const [dayIdxStr, blocks] of Object.entries(dayMap)) {
      if (dayIdxStr.startsWith("del_")) continue;
      const dayIdx = parseInt(dayIdxStr);
      if (isNaN(dayIdx) || dayIdx < 0 || dayIdx > 6) continue;
      const date = addDays(monday, dayIdx);
      const dateStr = date.toISOString().slice(0, 10);

      for (const b of (Array.isArray(blocks) ? blocks : [])) {
        if (!b || !b.name || !b.start || !b.end) continue;
        events.push({
          uid:     `${b.id}@life-os`,
          summary: b.name,
          dtstart: dateToIcal(dateStr, b.start),
          dtend:   dateToIcal(dateStr, b.end),
          stamp,
        });
      }
    }
  }

  // ── Recurring blocks — expand for -4 weeks to +12 weeks ──────────────────
  const rangeStart = addDays(now, -28);
  const rangeEnd   = addDays(now, 84);

  for (const rb of (Array.isArray(recurring) ? recurring : [])) {
    if (!rb || !rb.name || !rb.start || !rb.end || !rb.recurrence) continue;
    const rbStart = rb.startDateStr ? new Date(rb.startDateStr) : rangeStart;

    const cur = new Date(Math.max(rangeStart.getTime(), rbStart.getTime()));
    cur.setHours(0, 0, 0, 0);

    while (cur <= rangeEnd) {
      // dayIdx: Mon=0 … Sun=6 (same convention as planner)
      const jsDay = cur.getDay(); // 0=Sun,1=Mon…
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1;

      let match = false;
      if      (rb.recurrence === "daily")    match = true;
      else if (rb.recurrence === "weekdays") match = dayIdx <= 4;
      else if (rb.recurrence === "weekly")   match = rb.dayIndex === dayIdx;

      if (match) {
        const dateStr = cur.toISOString().slice(0, 10);
        events.push({
          uid:     `${rb.id}_${dateStr}@life-os`,
          summary: rb.name,
          dtstart: dateToIcal(dateStr, rb.start),
          dtend:   dateToIcal(dateStr, rb.end),
          stamp,
        });
      }

      cur.setDate(cur.getDate() + 1);
    }
  }

  // ── Build .ics ─────────────────────────────────────────────────────────────
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Life OS//Planner Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Life OS – Planner",
    "X-WR-TIMEZONE:Europe/Berlin",
    "X-WR-CALDESC:Automatisch generiert von Life OS",
  ];

  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      foldLine(`UID:${ev.uid}`),
      `DTSTAMP:${ev.stamp}`,
      `DTSTART;TZID=Europe/Berlin:${ev.dtstart}`,
      `DTEND;TZID=Europe/Berlin:${ev.dtend}`,
      foldLine(`SUMMARY:${ev.summary}`),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="life-os.ics"');
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.send(lines.join("\r\n"));
}
