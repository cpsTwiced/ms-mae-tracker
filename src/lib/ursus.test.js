import { describe, expect, it } from 'vitest'
import { ursusGoldenTime } from './ursus'

const at = (iso) => ursusGoldenTime(new Date(iso))

describe('ursusGoldenTime', () => {
  it('is active inside the early window (01:00–05:00 UTC)', () => {
    const r = at('2026-08-07T02:30:00Z')
    expect(r.active).toBe(true)
    expect(new Date(r.end).toISOString()).toBe('2026-08-07T05:00:00.000Z')
  })

  it('is active inside the evening window (18:00–22:00 UTC)', () => {
    const r = at('2026-08-07T21:59:59Z')
    expect(r.active).toBe(true)
    expect(new Date(r.end).toISOString()).toBe('2026-08-07T22:00:00.000Z')
  })

  it('starts exactly at the window boundary', () => {
    expect(at('2026-08-07T01:00:00Z').active).toBe(true)
    expect(at('2026-08-07T18:00:00Z').active).toBe(true)
  })

  it('ends exactly at the window boundary', () => {
    const r = at('2026-08-07T05:00:00Z')
    expect(r.active).toBe(false)
    expect(new Date(r.start).toISOString()).toBe('2026-08-07T18:00:00.000Z')
  })

  it('points at the evening window from mid-day', () => {
    const r = at('2026-08-07T12:00:00Z')
    expect(r.active).toBe(false)
    expect(new Date(r.start).toISOString()).toBe('2026-08-07T18:00:00.000Z')
  })

  it('points at the next morning window from before 01:00', () => {
    const r = at('2026-08-07T00:15:00Z')
    expect(r.active).toBe(false)
    expect(new Date(r.start).toISOString()).toBe('2026-08-07T01:00:00.000Z')
  })

  it('rolls over to tomorrow after the evening window ends', () => {
    const r = at('2026-08-07T23:00:00Z')
    expect(r.active).toBe(false)
    expect(new Date(r.start).toISOString()).toBe('2026-08-08T01:00:00.000Z')
  })

  it('rolls over across a month boundary', () => {
    const r = at('2026-08-31T23:00:00Z')
    expect(r.active).toBe(false)
    expect(new Date(r.start).toISOString()).toBe('2026-09-01T01:00:00.000Z')
  })
})
