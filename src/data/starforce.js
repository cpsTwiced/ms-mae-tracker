// Star Force numbers for GMS v.269+ (June 2026 "Ride the Lightning"), which
// reorganized enhancement: stars never decrease on failure, booms drop the item
// to a checkpoint star, and stars 15-21 offer Enhancement Modes 1-4 that trade
// higher cost for lower (or zero) boom chance.
//
// Provenance (cross-checked 2026-07-30):
// - Official GMS v.269 patch notes: Enhancement Mode exists for 15-21★, mode 4
//   booms 0%, mode 4 is redundant with Safeguard for 15→17★, higher modes cost
//   more. The notes don't publish the full per-star tables.
// - KMS 1.2.401 reorganization notes (via Orange Mushroom): base success/boom
//   rates for 15★+, Safeguard raised to +200% cost, cost up at 17-19★ and 21★+.
// - Community (NamuWiki GMS tables + starforce.tadeucci.dev): per-mode boom
//   rates and cost multipliers, boom checkpoint stars. The two agree exactly,
//   and their star-catch-adjusted numbers derive cleanly from the KMS base
//   rates, but they are NOT official — keep the in-UI "community-sourced" note.
// - blushiemagic/Maplestory-Starforce-Calculator: cost divisors and the
//   round-then-×100 cost formula shape (community; its divisors match the
//   direction of the official "17-19★ and 21★+ got pricier" note).

export const MAX_STAR = 30

// Highest star by equip level. Lv.138+ equips go to the 30★ cap.
const STAR_CAPS = [
  [138, 30],
  [128, 20],
  [118, 15],
  [108, 10],
  [95, 8],
  [0, 5],
]

export function maxStarForLevel(level) {
  for (const [min, cap] of STAR_CAPS) if (level >= min) return cap
  return 5
}

// Base per-attempt odds, indexed by current star (an entry is the attempt
// star → star+1). Failure never drops a star; `1 - success - boom` maintains.
// Booms exist only at 15★-29★.
export const SF_RATES = [
  { success: 0.95, boom: 0 },
  { success: 0.9, boom: 0 },
  { success: 0.85, boom: 0 },
  { success: 0.85, boom: 0 },
  { success: 0.8, boom: 0 },
  { success: 0.75, boom: 0 },
  { success: 0.7, boom: 0 },
  { success: 0.65, boom: 0 },
  { success: 0.6, boom: 0 },
  { success: 0.55, boom: 0 },
  { success: 0.5, boom: 0 },
  { success: 0.45, boom: 0 },
  { success: 0.4, boom: 0 },
  { success: 0.35, boom: 0 },
  { success: 0.3, boom: 0 },
  { success: 0.3, boom: 0.021 },
  { success: 0.3, boom: 0.021 },
  { success: 0.15, boom: 0.068 },
  { success: 0.15, boom: 0.068 },
  { success: 0.15, boom: 0.085 },
  { success: 0.3, boom: 0.105 },
  { success: 0.15, boom: 0.1275 },
  { success: 0.15, boom: 0.17 },
  { success: 0.1, boom: 0.18 },
  { success: 0.1, boom: 0.18 },
  { success: 0.1, boom: 0.18 },
  { success: 0.07, boom: 0.186 },
  { success: 0.05, boom: 0.19 },
  { success: 0.03, boom: 0.194 },
  { success: 0.01, boom: 0.198 },
]

// Enhancement Modes 1-4 (GMS v.269, stars 15-21 only). Arrays are indexed by
// mode - 1. For 15-17★ the modes only reduce boom (success unchanged, the
// Safeguard-flavored group); for 18-21★ they also lower success.
export const ENHANCEMENT_MODES = {
  15: {
    success: [0.3, 0.3, 0.3, 0.3],
    boom: [0.021, 0.014, 0.007, 0],
    costMult: [1, 1.5, 2.5, 3],
  },
  16: {
    success: [0.3, 0.3, 0.3, 0.3],
    boom: [0.021, 0.014, 0.007, 0],
    costMult: [1, 1.5, 2.5, 3],
  },
  17: {
    success: [0.15, 0.15, 0.15, 0.15],
    boom: [0.068, 0.0425, 0.017, 0],
    costMult: [1, 1.5, 2.5, 3],
  },
  18: {
    success: [0.15, 0.12, 0.1, 0.08],
    boom: [0.068, 0.044, 0.018, 0],
    costMult: [1, 2, 3.5, 6.5],
  },
  19: {
    success: [0.15, 0.12, 0.1, 0.08],
    boom: [0.085, 0.0616, 0.036, 0],
    costMult: [1, 2, 3.5, 6.5],
  },
  20: {
    success: [0.3, 0.24, 0.2, 0.16],
    boom: [0.105, 0.075, 0.04, 0],
    costMult: [1, 2, 3.5, 6.5],
  },
  21: {
    success: [0.15, 0.12, 0.1, 0.08],
    boom: [0.1275, 0.088, 0.045, 0],
    costMult: [1, 2, 3.5, 6.5],
  },
}

// Star the item falls to when it booms at a given star (v.269 checkpoints).
export const BOOM_RESET_STARS = {
  15: 12,
  16: 12,
  17: 12,
  18: 12,
  19: 12,
  20: 15,
  21: 17,
  22: 17,
  23: 19,
  24: 19,
  25: 19,
  26: 20,
  27: 20,
  28: 20,
  29: 20,
}

// Meso cost: below 10★ the base is level³ × (star+1) / 2500; from 10★ it is
// level³ × (star+1)^2.7 / divisor. The base is then rounded, +10, ×100.
export const COST_DIVISORS = {
  10: 40000,
  11: 22000,
  12: 15000,
  13: 11000,
  14: 7500,
  17: 15000,
  18: 7000,
  19: 4500,
  21: 12500,
}
export const DEFAULT_COST_DIVISOR = 20000

// Safeguard (15★-17★ attempts): boom → 0 at +200% of the base cost. The
// surcharge is applied on the undiscounted base — MVP/event discounts don't
// touch it. Enabling Safeguard overrides any Enhancement Mode selection.
export const SAFEGUARD_STARS = [15, 16, 17]
export const SAFEGUARD_SURCHARGE = 2

// MVP meso discount, applied only to attempts at 16★ and below.
export const MVP_DISCOUNTS = { none: 0, silver: 0.03, gold: 0.05, diamond: 0.1 }
export const MVP_MAX_STAR = 16

// "5/10/15★ guaranteed success" event: attempts at these stars always land.
// Retired from the current GMS event lineup — engine support only, no UI
// toggle.
export const GUARANTEED_STARS = [5, 10, 15]

// Shining Star Force's 30% destruction reduction applies below 21★ only
// (attempts at 20★ and under — 21★→22★ is excluded).
export const BOOM_EVENT_MAX_STAR = 20

// 1+1 Star Force event: attempts at 10★ and under grant 2 stars per success,
// which naturally caps the boost at 12★.
export const PLUS_ONE_MAX_STAR = 10

// Star Catch minigame: success ×1.05, the gain drawn proportionally from the
// remaining maintain/boom mass.
export const STAR_CATCH_MULT = 1.05
