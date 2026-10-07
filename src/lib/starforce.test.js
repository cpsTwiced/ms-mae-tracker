import { describe, it, expect } from 'vitest'
import {
  attemptOdds,
  attemptCost,
  boomResetStar,
  expectedRun,
  simulateRuns,
  mulberry32,
  maxStarForLevel,
  SIM_MAX_EXPECTED_ATTEMPTS,
  estimateRunQuantiles,
} from './starforce'
import { SF_RATES, ENHANCEMENT_MODES } from '@/data/starforce'

describe('maxStarForLevel', () => {
  it('follows the equip-level caps', () => {
    expect(maxStarForLevel(94)).toBe(5)
    expect(maxStarForLevel(95)).toBe(8)
    expect(maxStarForLevel(108)).toBe(10)
    expect(maxStarForLevel(118)).toBe(15)
    expect(maxStarForLevel(128)).toBe(20)
    expect(maxStarForLevel(137)).toBe(20)
    expect(maxStarForLevel(138)).toBe(30)
    expect(maxStarForLevel(250)).toBe(30)
  })
})

describe('attemptOdds', () => {
  it('keeps the base v.269 rates in the table', () => {
    expect(SF_RATES[15]).toMatchObject({ success: 0.3, boom: 0.021 })
    expect(SF_RATES[29].success).toBeCloseTo(0.01)
    expect(SF_RATES[29].boom).toBeCloseTo(0.198)
    expect(SF_RATES[10]).toMatchObject({ success: 0.5, boom: 0 })
    expect(attemptOdds(10)).toEqual({
      success: 0.525,
      maintain: 0.475,
      boom: 0,
    })
  })

  it('always applies the former Star Catch ×1.05 and redistributes boom', () => {
    // 15★: 30% → 31.5%, boom 2.1% → 2.055% (matches the published GMS table).
    const odds = attemptOdds(15)
    expect(odds.success).toBeCloseTo(0.315, 10)
    expect(odds.boom).toBeCloseTo(0.02055, 10)
  })

  it('applies enhancement modes at 15-21★', () => {
    // 20★ mode 3: success 30% → 20%, boom 10.5% → 4%.
    // Table: 20% / 4%; with the ×1.05: 21% / 3.95%, matching the published
    // GMS table.
    expect(ENHANCEMENT_MODES[20].success[2]).toBe(0.2)
    expect(ENHANCEMENT_MODES[20].boom[2]).toBe(0.04)
    const caught = attemptOdds(20, { mode: 3 })
    expect(caught.success).toBeCloseTo(0.21, 10)
    expect(caught.boom).toBeCloseTo(0.0395, 10)
    // Modes don't touch success below 18★.
    expect(attemptOdds(17, { mode: 2 }).success).toBe(attemptOdds(17).success)
    expect(ENHANCEMENT_MODES[17].boom[1]).toBeCloseTo(0.0425)
    // 20★ modes 2/4 use tadeucci's in-game-measured 25%/15%, not the
    // 24%/16% the other stars' relative-reduction pattern would predict.
    expect(ENHANCEMENT_MODES[20].success[1]).toBe(0.25)
    expect(ENHANCEMENT_MODES[20].success[3]).toBe(0.15)
    // Mode 4 never booms.
    expect(attemptOdds(21, { mode: 4 }).boom).toBe(0)
    // Modes don't exist outside 15-21★.
    expect(attemptOdds(22, { mode: 4 })).toEqual(attemptOdds(22))
  })

  it('safeguard zeroes boom at 15-17★ and overrides the mode', () => {
    expect(attemptOdds(16, { safeguard: true }).boom).toBe(0)
    // Mode 2 would lower success at 18★, but safeguard doesn't reach 18★.
    expect(attemptOdds(18, { safeguard: true }).boom).toBeCloseTo(0.0674, 4)
    // Safeguard forces mode-1 odds at covered stars.
    const odds = attemptOdds(17, { safeguard: true, mode: 3 })
    expect(odds.success).toBeCloseTo(0.1575)
    expect(odds.boom).toBe(0)
  })

  it('applies events', () => {
    expect(attemptOdds(17, { eventShining: true }).boom).toBeCloseTo(0.0476)
    // The boom event covers every attempt until the item reaches 22★
    // (21★→22★ included), and stops there.
    expect(attemptOdds(21, { eventShining: true }).boom).toBeCloseTo(0.08925)
    expect(attemptOdds(20, { eventShining: true }).boom).toBeCloseTo(0.0735)
    expect(attemptOdds(22, { eventShining: true }).boom).toBeCloseTo(0.17)
  })
})

describe('attemptCost', () => {
  it('uses the sub-10★ linear base with round-then-×100', () => {
    // 150³ × 1 / 2500 = 1350 → (1350 + 10) × 100.
    expect(attemptCost(150, 0)).toBe(136000)
  })

  it('floors the level to its tens before pricing', () => {
    expect(attemptCost(287, 17)).toBe(attemptCost(280, 17))
    expect(attemptCost(159, 15)).toBe(attemptCost(150, 15))
  })

  it('applies MVP discount only through 16★', () => {
    expect(attemptCost(150, 0, { mvp: 'diamond' })).toBe(136000 * 0.9)
    expect(attemptCost(200, 17, { mvp: 'diamond' })).toBe(attemptCost(200, 17))
  })

  it('applies the Shining 30% off', () => {
    expect(attemptCost(150, 0, { eventShining: true })).toBe(
      Math.round(136000 * 0.7),
    )
  })

  it('adds the safeguard surcharge on the undiscounted base', () => {
    const base = attemptCost(200, 15)
    const discounted = attemptCost(200, 15, { eventShining: true })
    expect(attemptCost(200, 15, { safeguard: true })).toBe(base * 3)
    expect(attemptCost(200, 15, { safeguard: true, eventShining: true })).toBe(
      Math.round(discounted + base * 2),
    )
    // Mode 4 at 15-17★ is priced exactly like safeguard.
    expect(attemptCost(200, 16, { mode: 4, eventShining: true })).toBe(
      attemptCost(200, 16, { safeguard: true, eventShining: true }),
    )
  })

  it('multiplies mode surcharges (and discounts them) elsewhere', () => {
    expect(attemptCost(200, 18, { mode: 4 })).toBe(
      Math.round(attemptCost(200, 18) * 6.5),
    )
    expect(attemptCost(200, 18, { mode: 4, eventShining: true })).toBe(
      Math.round(attemptCost(200, 18) * 0.7 * 6.5),
    )
    expect(attemptCost(200, 15, { mode: 2 })).toBe(
      Math.round(attemptCost(200, 15) * 1.5),
    )
  })

  it('charges more at the 17-19★ and 21★ divisor bumps', () => {
    // Divisor drops 20000 → 4500 from 18★ → 19★, so cost must jump far more
    // than the (star+1)^2.7 growth alone.
    expect(attemptCost(200, 19)).toBeGreaterThan(attemptCost(200, 18) * 1.5)
    expect(attemptCost(200, 21)).toBeGreaterThan(attemptCost(200, 20) * 1.5)
  })
})

describe('boomResetStar', () => {
  it('uses the v.269 checkpoints', () => {
    expect(boomResetStar(15)).toBe(12)
    expect(boomResetStar(19)).toBe(12)
    expect(boomResetStar(20)).toBe(15)
    expect(boomResetStar(21)).toBe(17)
    expect(boomResetStar(22)).toBe(17)
    expect(boomResetStar(25)).toBe(19)
    expect(boomResetStar(29)).toBe(20)
  })
})

describe('expectedRun', () => {
  it('is cost/success below boom range', () => {
    const { cost, booms, perStar } = expectedRun(200, 14, 15)
    expect(cost).toBeCloseTo(attemptCost(200, 14) / 0.315, 6)
    expect(booms).toBe(0)
    expect(perStar).toHaveLength(1)
    expect(perStar[0].star).toBe(14)
  })

  it('matches the hand-solved recurrence through a boom star', () => {
    // 15★ → 16★: a boom drops to 12★, so the re-climb is e12 + e13 + e14.
    const opts = {}
    // Rates include the ×1.05: 15★ is 31.5% success / 2.055% boom.
    const e12 = attemptCost(200, 12) / 0.42
    const e13 = attemptCost(200, 13) / 0.3675
    const e14 = attemptCost(200, 14) / 0.315
    const c15 = attemptCost(200, 15)
    const expected = (c15 + 0.02055 * (e12 + e13 + e14)) / 0.315
    const run = expectedRun(200, 15, 16, opts)
    expect(run.cost).toBeCloseTo(expected, 6)
    expect(run.booms).toBeCloseTo(0.02055 / 0.315, 10)
  })

  it('reduces to a geometric sum when safeguard removes booms', () => {
    const opts = { safeguard: true }
    const { cost, booms } = expectedRun(200, 15, 17, opts)
    const expected =
      attemptCost(200, 15, opts) / 0.315 + attemptCost(200, 16, opts) / 0.315
    expect(cost).toBeCloseTo(expected, 6)
    expect(booms).toBe(0)
  })

  it('counts booms picked up while re-climbing', () => {
    // 20★ → 21★ booms back to 15★, so the re-climb can itself boom.
    const { booms } = expectedRun(200, 20, 21)
    const reclimbBooms = [15, 16, 17, 18, 19].reduce(
      (sum, s) => sum + expectedRun(200, s, s + 1).booms,
      0,
    )
    // 20★: 31.5% success / 10.275% boom after the ×1.05.
    expect(booms).toBeCloseTo((0.10275 * (1 + reclimbBooms)) / 0.315, 6)
  })

  it('cheaper options cost less end to end', () => {
    const plain = expectedRun(160, 0, 17)
    const helped = expectedRun(160, 0, 17, {
      eventShining: true,
      mvp: 'diamond',
    })
    expect(helped.cost).toBeLessThan(plain.cost)
  })

  it('clamps the target to the equip star cap', () => {
    const run = expectedRun(130, 18, 25)
    expect(run.perStar.at(-1).star).toBe(19)
    expect(run.cost).toBeCloseTo(expectedRun(130, 18, 20).cost, 6)
  })

  it('returns zeros when there is nothing to do', () => {
    expect(expectedRun(200, 22, 22)).toEqual({
      cost: 0,
      booms: 0,
      attempts: 0,
      perStar: [],
    })
    expect(expectedRun(200, 25, 22).cost).toBe(0)
  })

  it('counts expected attempts', () => {
    // 14★ → 15★ is a plain geometric: 1/0.315 attempts.
    expect(expectedRun(200, 14, 15).attempts).toBeCloseTo(1 / 0.315, 10)
  })

  it('jumps two stars per success under the +1★ event', () => {
    const opts = { eventPlusOne: true }
    const run = expectedRun(200, 9, 12, opts)
    // 9★ jumps to 11★ (skipping 10★), then 11★ → 12★ normally.
    expect(run.perStar.map((r) => r.star)).toEqual([9, 11])
    expect(run.cost).toBeCloseTo(
      attemptCost(200, 9) / 0.5775 + attemptCost(200, 11) / 0.4725,
      6,
    )
    // Without the event all three stars are attempted.
    expect(expectedRun(200, 9, 12).perStar.map((r) => r.star)).toEqual([
      9, 10, 11,
    ])
  })

  it('perStar rows sum to the run totals', () => {
    // The table column is recovery-inclusive by design, so the per-step
    // figures must add up to the headline numbers exactly.
    const run = expectedRun(200, 17, 22, {})
    const sum = (key) => run.perStar.reduce((t, r) => t + r[key], 0)
    expect(sum('expectedCost')).toBeCloseTo(run.cost, 6)
    expect(sum('expectedBooms')).toBeCloseTo(run.booms, 6)
    expect(sum('expectedAttempts')).toBeCloseTo(run.attempts, 6)
  })
})

describe('simulateRuns', () => {
  it('is deterministic for a fixed seed and tracks the closed form', () => {
    const a = simulateRuns(200, 15, 17, {}, { runs: 2000, rng: mulberry32(1) })
    const b = simulateRuns(200, 15, 17, {}, { runs: 2000, rng: mulberry32(1) })
    expect(a).toEqual(b)
    const expected = expectedRun(200, 15, 17).cost
    // Median of a right-skewed cost distribution sits below the mean but in
    // the same ballpark.
    expect(a.median).toBeGreaterThan(expected * 0.2)
    expect(a.median).toBeLessThan(expected * 2)
    expect(a.p90).toBeGreaterThanOrEqual(a.median)
  })

  it('returns null when there is nothing to simulate', () => {
    expect(simulateRuns(200, 22, 22)).toBeNull()
  })

  it('estimates typical-run quantiles from the exponential model', () => {
    const { median, p90 } = estimateRunQuantiles(1000)
    expect(median).toBeCloseTo(1000 * Math.LN2, 6)
    expect(p90).toBeCloseTo(1000 * Math.log(10), 6)
    // The model matches the real simulation on a feasible range: the sim's
    // median/mean ratio sits near ln 2 and p90/mean near ln 10.
    const mean = expectedRun(200, 17, 22, {}).cost
    const sim = simulateRuns(
      200,
      17,
      22,
      {},
      { runs: 4000, rng: mulberry32(7) },
    )
    expect(sim.median / mean).toBeGreaterThan(0.6)
    expect(sim.median / mean).toBeLessThan(0.8)
    expect(sim.p90 / mean).toBeGreaterThan(1.9)
    expect(sim.p90 / mean).toBeLessThan(2.7)
  })

  it('refuses ranges too long to simulate honestly', () => {
    // 0→30 averages ~15M attempts per run; a clipped simulation would report
    // a false median ≈ p90, so the gate returns null instead.
    expect(expectedRun(200, 0, 30, {}).attempts).toBeGreaterThan(
      SIM_MAX_EXPECTED_ATTEMPTS,
    )
    expect(simulateRuns(200, 0, 30, {})).toBeNull()
    // Everyday ranges stay well inside the gate.
    expect(simulateRuns(200, 17, 22, {}, { runs: 200 })).not.toBeNull()
  })
})

describe('per-star modes', () => {
  it('lets a per-star mode override the single mode', () => {
    const opts = { mode: 1, modes: { 18: 3 } }
    expect(attemptOdds(18, opts)).toEqual(attemptOdds(18, { mode: 3 }))
    expect(attemptCost(200, 18, opts)).toBe(attemptCost(200, 18, { mode: 3 }))
    // Stars missing from the plan fall back to `mode`.
    expect(attemptOdds(19, opts)).toEqual(attemptOdds(19, { mode: 1 }))
  })

  it('prices a mixed plan star by star', () => {
    const modes = { 15: 4, 16: 4, 17: 4, 18: 1, 19: 1, 20: 1, 21: 1 }
    const run = expectedRun(200, 15, 18, { modes })
    expect(run.booms).toBe(0)
    expect(run.cost).toBeCloseTo(expectedRun(200, 15, 18, { mode: 4 }).cost, 6)
  })
})
