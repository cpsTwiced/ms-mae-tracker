import { describe, it, expect } from 'vitest'
import {
  lastBossReset,
  nextBossReset,
  nextEventReset,
  lastDailyReset,
  nextDailyReset,
  lastMonthlyReset,
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
    expect(nextBossReset(now) - lastBossReset(now)).toBe(WEEK_MS)
  })
})

describe('event reset (Wednesday)', () => {
  it('is a week out once Wednesday 00:00 UTC has passed', () => {
    // 2026-06-10 is a Wednesday.
    const now = new Date('2026-06-10T05:30:00Z')
    expect(nextEventReset(now)).toBe(Date.UTC(2026, 5, 17))
  })

  it('is the coming midnight late on a Tuesday', () => {
    const now = new Date('2026-06-09T23:59:59Z')
    expect(nextEventReset(now)).toBe(Date.UTC(2026, 5, 10))
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
  })

  it('returns the 1st even on the 1st of the month', () => {
    const now = new Date('2026-06-01T00:00:00Z')
    expect(lastMonthlyReset(now)).toBe(Date.UTC(2026, 5, 1))
  })
})
