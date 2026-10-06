import { describe, it, expect } from 'vitest'
import { optimizeModes } from './optimizer'
import { MAX_SPARES } from '@/data/starforce'
import { attemptOdds, expectedRun } from './starforce'

const SC = { starCatch: true }
const ALL = (level) =>
  Object.fromEntries([15, 16, 17, 18, 19, 20, 21].map((s) => [s, level]))

describe('optimizeModes', () => {
  it('finds the cheapest plan meeting the chance (mockup spot-check)', () => {
    const row = optimizeModes(200, 0, 22, SC, 0.9).rows[2]
    expect(row.modes).toEqual({
      15: 4,
      16: 3,
      17: 4,
      18: 3,
      19: 1,
      20: 4,
      21: 4,
    })
    expect(row.chance).toBeCloseTo(0.906, 3)
    expect(row.cost / 1e9).toBeCloseTo(55.9, 1)
  })

  it('prices plans exactly like expectedRun', () => {
    const r = optimizeModes(200, 0, 22, SC, 0.9)
    for (const row of [r.rows[0], r.rows[2], r.rows[5]]) {
      const run = expectedRun(200, 0, 22, { ...SC, modes: row.modes })
      expect(row.cost).toBeCloseTo(run.cost, 0)
    }
  })

  it('finds all Level 1 cheapest overall', () => {
    const { cheapest } = optimizeModes(200, 0, 22, SC, 0.9)
    expect(cheapest.modes).toEqual(ALL(1))
    expect(cheapest.cost).toBeCloseTo(
      expectedRun(200, 0, 22, { ...SC, mode: 1 }).cost,
      0,
    )
    expect(cheapest.chanceBySpares).toHaveLength(MAX_SPARES + 1)
  })

  it('solves the chance exactly on a hand-checkable climb', () => {
    // 15→16★: a boom drops to 12★ and 12-14★ never boom, so each spare buys
    // exactly one more try at 15★.
    const { success: p, boom: b } = attemptOdds(15, { mode: 1 })
    const r = optimizeModes(200, 15, 16, {}, 0.5)
    const p0 = p / (p + b)
    expect(r.rows[0].modes).toEqual({ 15: 1 })
    expect(r.rows[0].chance).toBeCloseTo(p0, 12)
    expect(r.rows[1].chance).toBeCloseTo((p + b * p0) / (p + b), 12)
  })

  it('reaches 22★ for sure with Level 4 everywhere and no spares', () => {
    const row = optimizeModes(200, 0, 22, SC, 0.99).rows[0]
    expect(row.modes).toEqual(ALL(4))
    expect(row.chance).toBe(1)
  })

  it('has no mode stars when the target is 15★ or below', () => {
    expect(optimizeModes(200, 0, 15, SC, 0.9).stars).toEqual([])
    // Lv.120 caps at 15★, so a 22★ target clamps to it.
    const capped = optimizeModes(120, 0, 22, SC, 0.9)
    expect(capped.target).toBe(15)
    expect(capped.stars).toEqual([])
  })

  it('returns null when there is nothing to climb', () => {
    expect(optimizeModes(200, 22, 22, SC, 0.9)).toBeNull()
    expect(optimizeModes(120, 15, 22, SC, 0.9)).toBeNull()
  })

  it('still plans 15–21★ for climbs that start above them', () => {
    expect(optimizeModes(200, 22, 24, SC, 0.5).stars).toEqual([
      15, 16, 17, 18, 19, 20, 21,
    ])
  })

  it('marks rows no plan can reach and keeps the best plan', () => {
    const { rows } = optimizeModes(200, 0, 25, SC, 0.9)
    expect(rows.every((row) => row.unreachable)).toBe(true)
    const last = rows[MAX_SPARES]
    expect(last.best.modes).toEqual(ALL(4))
    expect(last.best.chance).toBeCloseTo(0.528, 2)
  })

  it('ignores Safeguard and the calculator-wide mode', () => {
    const plain = optimizeModes(200, 0, 22, SC, 0.9)
    const leaky = optimizeModes(
      200,
      0,
      22,
      { ...SC, safeguard: true, mode: 3 },
      0.9,
    )
    expect(leaky).toEqual(plain)
  })
})
