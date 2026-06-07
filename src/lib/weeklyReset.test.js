import { describe, it, expect } from 'vitest'
import {
  lastWeeklyReset,
  nextWeeklyReset,
  lastBossReset,
  lastQuestReset,
  nextQuestReset,
  lastEventReset,
  nextEventReset,
  lastDailyReset,
  nextDailyReset,
  lastMonthlyReset,
  nextMonthlyReset,
} from './weeklyReset'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

describe('boss reset (Thursday)', () => {
  it('returns todays Thursday 00:00 UTC when it is Thursday', () => {
    // 2026-06-04 is a Thursday.
    const now = new Date('2026-06-04T05:30:00Z')
    expect(lastBossReset(now)).toBe(Date.UTC(2026, 5, 4))
  })

  it('returns the previous Thursday on a Wednesday', () => {
    const now = new Date('2026-06-10T23:59:59Z')
    expect(lastBossReset(now)).toBe(Date.UTC(2026, 5, 4))
  })

  it('next boss reset is exactly one week after the last', () => {
    const now = new Date('2026-06-06T12:00:00Z')
    expect(nextWeeklyReset(now) - lastWeeklyReset(now)).toBe(WEEK_MS)
  })

  it('lastWeeklyReset is an alias for lastBossReset', () => {
    const now = new Date('2026-06-06T12:00:00Z')
    expect(lastWeeklyReset(now)).toBe(lastBossReset(now))
  })
})

describe('quest reset (unified onto Thursday in v.264)', () => {
  it('shares the Thursday boss reset', () => {
    const now = new Date('2026-06-05T10:00:00Z')
    expect(lastQuestReset(now)).toBe(lastBossReset(now))
  })

  it('next quest reset is the upcoming Thursday', () => {
    // 2026-06-05 is a Friday; the upcoming Thursday is 2026-06-11.
    const now = new Date('2026-06-05T10:00:00Z')
    expect(nextQuestReset(now)).toBe(Date.UTC(2026, 5, 11))
  })
})

describe('event reset (Wednesday)', () => {
  it('returns todays Wednesday 00:00 UTC when it is Wednesday', () => {
    // 2026-06-10 is a Wednesday.
    const now = new Date('2026-06-10T05:30:00Z')
    expect(lastEventReset(now)).toBe(Date.UTC(2026, 5, 10))
  })

  it('returns the previous Wednesday before the next event reset', () => {
    const now = new Date('2026-06-09T23:59:59Z')
    expect(lastEventReset(now)).toBe(Date.UTC(2026, 5, 3))
  })

  it('next event reset is the upcoming Wednesday', () => {
    // 2026-06-05 is a Friday; the upcoming Wednesday is 2026-06-10.
    const now = new Date('2026-06-05T10:00:00Z')
    expect(nextEventReset(now)).toBe(Date.UTC(2026, 5, 10))
  })
})

describe('daily reset', () => {
  it('uses 00:00 UTC of the current and next day', () => {
    const now = new Date('2026-06-05T10:00:00Z')
    expect(lastDailyReset(now)).toBe(Date.UTC(2026, 5, 5))
    expect(nextDailyReset(now)).toBe(Date.UTC(2026, 5, 6))
  })
})

describe('monthly reset (Black Mage)', () => {
  it('uses the 1st of the current month at 00:00 UTC', () => {
    const now = new Date('2026-06-05T10:00:00Z')
    expect(lastMonthlyReset(now)).toBe(Date.UTC(2026, 5, 1))
    expect(nextMonthlyReset(now)).toBe(Date.UTC(2026, 6, 1))
  })

  it('rolls December over into the next January', () => {
    const now = new Date('2026-12-20T00:00:00Z')
    expect(lastMonthlyReset(now)).toBe(Date.UTC(2026, 11, 1))
    expect(nextMonthlyReset(now)).toBe(Date.UTC(2027, 0, 1))
  })

  it('returns the 1st even on the 1st of the month', () => {
    const now = new Date('2026-06-01T00:00:00Z')
    expect(lastMonthlyReset(now)).toBe(Date.UTC(2026, 5, 1))
  })
})
