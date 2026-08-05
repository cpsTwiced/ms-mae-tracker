// Star Force math for the calculator. Everything is a pure function of the
// inputs — no state, no randomness. Expected values come from the exact
// closed-form recurrence (stars never drop on failure, so the chain is solved
// star by star); no simulation needed.
//
// `opts` shape (all optional):
//   starCatch  bool    Star Catch minigame on every attempt
//   safeguard  bool    Safeguard on 15-17★ attempts (boom 0, +200% base cost)
//   mode       1-4     Enhancement Mode for 15-21★ attempts (default 1)
//   mvp        string  'none' | 'silver' | 'gold' | 'diamond'
//   eventCost30      bool   30% off enhancement cost
//   eventBoom30      bool   30% reduced boom chance (attempts at ≤21★)
//   eventGuaranteed  bool   5/10/15★ attempts always succeed
//   eventPlusOne     bool   +1 extra star per success on attempts at ≤10★

import {
  SF_RATES,
  ENHANCEMENT_MODES,
  BOOM_RESET_STARS,
  COST_DIVISORS,
  DEFAULT_COST_DIVISOR,
  SAFEGUARD_STARS,
  SAFEGUARD_SURCHARGE,
  MVP_DISCOUNTS,
  MVP_MAX_STAR,
  GUARANTEED_STARS,
  BOOM_EVENT_MAX_STAR,
  PLUS_ONE_MAX_STAR,
  STAR_CATCH_MULT,
  MAX_STAR,
  maxStarForLevel,
} from '@/data/starforce'

export { maxStarForLevel, MAX_STAR }

export function boomResetStar(star) {
  return BOOM_RESET_STARS[star] ?? 12
}

// Per-attempt { success, maintain, boom } at `star` under the given options.
export function attemptOdds(star, opts = {}) {
  const { starCatch, safeguard, mode = 1, eventBoom30, eventGuaranteed } = opts
  const modeRow = ENHANCEMENT_MODES[star]
  let success =
    modeRow && mode > 1 ? modeRow.success[mode - 1] : SF_RATES[star].success
  let boom = modeRow && mode > 1 ? modeRow.boom[mode - 1] : SF_RATES[star].boom

  if (safeguard && SAFEGUARD_STARS.includes(star)) {
    // Safeguard overrides the mode (the game resets mode to 1 when it's on).
    success = SF_RATES[star].success
    boom = 0
  }
  if (eventGuaranteed && GUARANTEED_STARS.includes(star)) {
    success = 1
    boom = 0
  }
  if (eventBoom30 && star <= BOOM_EVENT_MAX_STAR) boom *= 0.7
  if (starCatch && success < 1) {
    const boosted = Math.min(success * STAR_CATCH_MULT, 1)
    // The extra success mass comes proportionally out of maintain and boom.
    boom *= (1 - boosted) / (1 - success)
    success = boosted
  }
  return { success, maintain: 1 - success - boom, boom }
}

// Meso cost of one attempt at `star` for an equip of `level`. GMS prices by
// the level floored to its tens (a Lv.287 item costs as Lv.280).
export function attemptCost(level, star, opts = {}) {
  const { safeguard, mode = 1, mvp = 'none', eventCost30 } = opts
  const lvl = Math.floor(level / 10) * 10
  const base =
    star < 10
      ? (lvl ** 3 * (star + 1)) / 2500
      : (lvl ** 3 * (star + 1) ** 2.7) /
        (COST_DIVISORS[star] ?? DEFAULT_COST_DIVISOR)
  const cost = 100 * (Math.round(base) + 10)

  let mult = 1
  if (star <= MVP_MAX_STAR) mult -= MVP_DISCOUNTS[mvp] ?? 0
  if (eventCost30) mult *= 0.7

  const modeRow = ENHANCEMENT_MODES[star]
  if (safeguard && SAFEGUARD_STARS.includes(star)) {
    mult += SAFEGUARD_SURCHARGE
  } else if (modeRow && mode > 1) {
    const costMult = modeRow.costMult[mode - 1]
    if (modeRow.boom[mode - 1] === 0 && SAFEGUARD_STARS.includes(star)) {
      // Mode 4 at 15-17★ is Safeguard by another name: same undiscounted
      // additive surcharge.
      mult += costMult - 1
    } else {
      mult *= costMult
    }
  }
  return Math.round(cost * mult)
}

// Stars gained by one success at `star` under the given options. The +1★
// event only reaches ≤10★ attempts, so jumps never interact with booms
// (checkpoints are all ≥12★) or the safeguard/mode range.
function successStep(star, opts) {
  return opts.eventPlusOne && star <= PLUS_ONE_MAX_STAR ? 2 : 1
}

// Expected meso, booms, and attempts to go fromStar → toStar. Solved star by
// star: with e_k = expected meso for k → k+1, an attempt at star s costs C_s,
// booms with chance b_s back to checkpoint c_s (re-climb = sum of e_k below
// s), so
//   e_s = (C_s + b_s × Σ e_k for k in [c_s, s)) / p_s
// and identically for boom/attempt counts with C_s replaced by that attempt's
// own tally. Returns { cost, booms, attempts, perStar } where perStar covers
// the stars actually attempted in [fromStar, toStar).
export function expectedRun(level, fromStar, toStar, opts = {}) {
  const cap = maxStarForLevel(level)
  const target = Math.min(toStar, cap, MAX_STAR)
  const from = Math.max(0, Math.min(fromStar, target))
  if (from >= target) return { cost: 0, booms: 0, attempts: 0, perStar: [] }

  // e/b/a for every star below target — booms can knock the run below
  // fromStar, so the re-climb terms need the full ladder. Re-climbs start at
  // ≥12★ and step one star at a time, so plus-one jumps never affect them.
  const e = []
  const b = []
  const a = []
  for (let s = 0; s < target; s++) {
    const odds = attemptOdds(s, opts)
    const cost = attemptCost(level, s, opts)
    if (odds.boom === 0) {
      e[s] = cost / odds.success
      b[s] = 0
      a[s] = 1 / odds.success
    } else {
      const reset = boomResetStar(s)
      let reclimbCost = 0
      let reclimbBooms = 0
      let reclimbAttempts = 0
      for (let k = reset; k < s; k++) {
        reclimbCost += e[k]
        reclimbBooms += b[k]
        reclimbAttempts += a[k]
      }
      e[s] = (cost + odds.boom * reclimbCost) / odds.success
      b[s] = (odds.boom * (1 + reclimbBooms)) / odds.success
      a[s] = (1 + odds.boom * reclimbAttempts) / odds.success
    }
  }

  const perStar = []
  let totalCost = 0
  let totalBooms = 0
  let totalAttempts = 0
  for (let s = from; s < target; s += successStep(s, opts)) {
    const odds = attemptOdds(s, opts)
    perStar.push({
      star: s,
      nextStar: s + successStep(s, opts),
      odds,
      attemptCost: attemptCost(level, s, opts),
      expectedCost: e[s],
      expectedBooms: b[s],
      expectedAttempts: a[s],
    })
    totalCost += e[s]
    totalBooms += b[s]
    totalAttempts += a[s]
  }
  return {
    cost: totalCost,
    booms: totalBooms,
    attempts: totalAttempts,
    perStar,
  }
}

// Typical-run estimates for climbs the simulation refuses. Total cost that
// deep is dominated by the final compound-geometric chokepoint, so its
// distribution is close to exponential around the mean. Validated against
// the Monte Carlo on every feasible range: median/mean lands at 0.67-0.73
// (exponential: ln 2 ≈ 0.69) and p90/mean at 2.15-2.33 (exponential:
// ln 10 ≈ 2.30). Present these as "≈" estimates, not exact figures.
export function estimateRunQuantiles(cost) {
  return { median: cost * Math.LN2, p90: cost * Math.log(10) }
}

// Deterministic PRNG so simulation results are stable across renders.
export function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

// Ranges whose closed-form expected attempts exceed this are refused by the
// simulation: near 29★-30★ the expectation grows into the millions of
// attempts per run (boom → 20★ checkpoint, and the re-climb booms
// recursively), which no interactive Monte Carlo can cover — a clipped
// simulation would report a false, near-identical median and p90.
export const SIM_MAX_EXPECTED_ATTEMPTS = 10000

// Per-run hard stop, two orders of magnitude above any tail the expected-
// attempts gate lets through — it exists so a pathological RNG stream can't
// hang the tab, not to shape results.
const MAX_ATTEMPTS_PER_RUN = 1000000

// Monte Carlo over full runs, for distribution stats the closed form can't
// give (median / unlucky percentiles). `rng` is injected for determinism.
// Returns { median, p90 } of total meso spent, or null when there is nothing
// to simulate — or when the range fails the SIM_MAX_EXPECTED_ATTEMPTS gate.
export function simulateRuns(level, fromStar, toStar, opts = {}, options = {}) {
  const { runs = 3000, rng = mulberry32(0x5f3759df) } = options
  const cap = maxStarForLevel(level)
  const target = Math.min(toStar, cap, MAX_STAR)
  const from = Math.max(0, Math.min(fromStar, target))
  if (from >= target) return null
  if (
    expectedRun(level, from, target, opts).attempts > SIM_MAX_EXPECTED_ATTEMPTS
  )
    return null

  // Odds and costs are constant per star for a given options tuple.
  const odds = []
  const costs = []
  for (let s = 0; s < target; s++) {
    odds[s] = attemptOdds(s, opts)
    costs[s] = attemptCost(level, s, opts)
  }

  const totals = new Array(runs)
  for (let i = 0; i < runs; i++) {
    let star = from
    let spent = 0
    let guard = 0
    while (star < target && guard < MAX_ATTEMPTS_PER_RUN) {
      guard++
      spent += costs[star]
      const roll = rng()
      if (roll < odds[star].success) {
        star += successStep(star, opts)
      } else if (roll >= odds[star].success + odds[star].maintain) {
        star = boomResetStar(star)
      }
    }
    totals[i] = spent
  }
  totals.sort((x, y) => x - y)
  const at = (q) => totals[Math.min(runs - 1, Math.floor(q * runs))]
  return { median: at(0.5), p90: at(0.9) }
}
