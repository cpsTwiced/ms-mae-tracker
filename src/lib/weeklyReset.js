const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

// getUTCDay(): Sunday = 0 ... Saturday = 6
const WEDNESDAY = 3
const THURSDAY = 4

function lastWeekdayReset(weekday, now = new Date()) {
  const daysSince = (now.getUTCDay() - weekday + 7) % 7
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSince,
  )
}

function nextWeekdayReset(weekday, now = new Date()) {
  return lastWeekdayReset(weekday, now) + WEEK_MS
}

// Daily reset: 00:00 UTC each day.
export function lastDailyReset(now = new Date()) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}
export function nextDailyReset(now = new Date()) {
  return lastDailyReset(now) + DAY_MS
}

// Weekly reset: Thursday 00:00 UTC.
// Since GMS v.264 Nexon unified weekly bosses and weekly quests/content onto the
// same Thursday reset, so boss, quest and weekly resets all share this boundary.
export function lastBossReset(now = new Date()) {
  return lastWeekdayReset(THURSDAY, now)
}
export function nextBossReset(now = new Date()) {
  return nextWeekdayReset(THURSDAY, now)
}

// Event weekly reset: Wednesday 00:00 UTC.
export function lastEventReset(now = new Date()) {
  return lastWeekdayReset(WEDNESDAY, now)
}
export function nextEventReset(now = new Date()) {
  return nextWeekdayReset(WEDNESDAY, now)
}

// Monthly reset (Black Mage): 1st of the month, 00:00 UTC.
export function lastMonthlyReset(now = new Date()) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
}
export function nextMonthlyReset(now = new Date()) {
  // Date.UTC rolls month 12 over to January of the next year.
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
}

// Weekly quest / dungeon reset — same Thursday 00:00 UTC since v.264.
export const lastQuestReset = lastBossReset
export const nextQuestReset = nextBossReset
