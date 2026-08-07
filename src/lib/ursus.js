const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

// Ursus Golden Time (2x mesos): two fixed windows every day, in UTC.
// Hours sourced from the community MapleStory Wiki / DigitalTQ Ursus guides —
// there is no official GMS listing.
export const GOLDEN_TIME_WINDOWS = [
  { startHour: 1, endHour: 5 },
  { startHour: 18, endHour: 22 },
]

// A window's concrete { start, end } timestamps on "now"'s UTC day — also
// what the UI uses to print a window's hours in the viewer's local timezone.
export function windowTimes(w, now = new Date()) {
  const dayStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )
  return {
    start: dayStart + w.startHour * HOUR_MS,
    end: dayStart + w.endHour * HOUR_MS,
  }
}

// Where "now" sits relative to Ursus Golden Time.
// Active:   { active: true, start, end }        — end is when 2x mesos stops.
// Inactive: { active: false, start, end }       — the next upcoming window.
export function ursusGoldenTime(now = new Date()) {
  const ts = now.getTime()

  // Today's windows plus tomorrow's first, so a late-night "now" still finds
  // an upcoming window.
  const windows = GOLDEN_TIME_WINDOWS.map((w) => windowTimes(w, now))
  windows.push({
    start: windows[0].start + DAY_MS,
    end: windows[0].end + DAY_MS,
  })

  for (const w of windows) {
    if (ts >= w.start && ts < w.end) return { active: true, ...w }
    if (ts < w.start) return { active: false, ...w }
  }
}
