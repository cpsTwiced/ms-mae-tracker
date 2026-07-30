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
//   eventBoom30      bool   30% reduced boom chance
//   eventGuaranteed  bool   5/10/15★ attempts always succeed

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
  if (eventBoom30) boom *= 0.7
  if (starCatch && success < 1) {
    const boosted = Math.min(success * STAR_CATCH_MULT, 1)
    // The extra success mass comes proportionally out of maintain and boom.
    boom *= (1 - boosted) / (1 - success)
    success = boosted
  }
  return { success, maintain: 1 - success - boom, boom }
}

// Meso cost of one attempt at `star` for an equip of `level`.
export function attemptCost(level, star, opts = {}) {
  const { safeguard, mode = 1, mvp = 'none', eventCost30 } = opts
  const base =
    star < 10
      ? (level ** 3 * (star + 1)) / 2500
      : (level ** 3 * (star + 1) ** 2.7) /
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

// Expected meso and booms to go fromStar → toStar. Solved star by star:
// with e_k = expected meso for k → k+1, an attempt at star s costs C_s, booms
// with chance b_s back to checkpoint c_s (re-climb = sum of e_k below s), so
//   e_s = (C_s + b_s × Σ e_k for k in [c_s, s)) / p_s
// and identically for boom counts with C_s replaced by b_s's own count.
// Returns { cost, booms, perStar } where perStar covers [fromStar, toStar).
export function expectedRun(level, fromStar, toStar, opts = {}) {
  const cap = maxStarForLevel(level)
  const target = Math.min(toStar, cap, MAX_STAR)
  const from = Math.max(0, Math.min(fromStar, target))
  if (from >= target) return { cost: 0, booms: 0, perStar: [] }

  // e/b for every star below target — booms can knock the run below fromStar,
  // so the re-climb terms need the full ladder.
  const e = []
  const b = []
  for (let s = 0; s < target; s++) {
    const odds = attemptOdds(s, opts)
    const cost = attemptCost(level, s, opts)
    if (odds.boom === 0) {
      e[s] = cost / odds.success
      b[s] = 0
    } else {
      const reset = boomResetStar(s)
      let reclimbCost = 0
      let reclimbBooms = 0
      for (let k = reset; k < s; k++) {
        reclimbCost += e[k]
        reclimbBooms += b[k]
      }
      e[s] = (cost + odds.boom * reclimbCost) / odds.success
      b[s] = (odds.boom * (1 + reclimbBooms)) / odds.success
    }
  }

  const perStar = []
  let totalCost = 0
  let totalBooms = 0
  for (let s = from; s < target; s++) {
    const odds = attemptOdds(s, opts)
    perStar.push({
      star: s,
      odds,
      attemptCost: attemptCost(level, s, opts),
      expectedCost: e[s],
      expectedBooms: b[s],
    })
    totalCost += e[s]
    totalBooms += b[s]
  }
  return { cost: totalCost, booms: totalBooms, perStar }
}
