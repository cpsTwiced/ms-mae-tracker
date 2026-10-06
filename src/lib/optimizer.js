// Mode optimizer for the Star Force Lab. It tries every combination of
// Enhancement Mode levels on stars 15-21 (at most 4^7 = 16,384 plans),
// computes each plan's expected cost and its chance of reaching the target
// with at most N booms, and keeps, per spare count, the cheapest plan that
// meets the wanted chance.
//
// A plan is one level per star, keyed by star ({ 15: 4, 16: 3, … }), and
// doesn't change as spares run out.

import {
  attemptOdds,
  attemptCost,
  boomResetStar,
  successStep,
  maxStarForLevel,
  MAX_STAR,
} from './starforce'
import { MAX_SPARES } from '@/data/starforce'

const MODE_STARS = [15, 16, 17, 18, 19, 20, 21]

// A chance this close to the wanted one counts as meeting it, so float noise
// can't drop a plan that sits exactly on 90%.
const EPS = 1e-9

// `opts` carries what the Lab exposes (starCatch, mvp, eventShining,
// eventPlusOne). Safeguard is forced off: Level 4 at 15-17★ already is
// Safeguard. `chance` is a fraction (0.9). Returns null when there's no climb
// (from ≥ target once the target is clamped to the level's cap).
// ponytail: main-thread brute force (~20-30 ms); move to a Web Worker if
// phones lag.
export function optimizeModes(level, fromStar, toStar, opts, chance) {
  const target = Math.min(toStar, maxStarForLevel(level), MAX_STAR)
  const from = Math.max(0, Math.min(fromStar, target))
  if (from >= target) return null
  // Booms at 15-19★ drop to 12★ and every higher checkpoint leads there, so
  // any climb past 15★ can attempt every mode star below the target.
  const stars = MODE_STARS.filter((s) => s < target)

  // Odds and cost per star per level, built once; the search reads only these.
  const table = []
  const reset = []
  const step = []
  for (let s = 0; s < target; s++) {
    const levels = stars.includes(s) ? [1, 2, 3, 4] : [1]
    table[s] = levels.map((mode) => {
      const o = { ...opts, safeguard: false, mode }
      const { success, boom } = attemptOdds(s, o)
      return { p: success, b: boom, cost: attemptCost(level, s, o) }
    })
    reset[s] = boomResetStar(s)
    step[s] = successStep(s, opts)
  }

  const pick = table.map((levels) => levels[0])
  const e = new Float64Array(target)
  let P = new Float64Array(target)
  let prev = new Float64Array(target)
  const hit = []
  const best = []
  let cheapest = null

  for (let i = 0; i < 4 ** stars.length; i++) {
    for (let j = 0, x = i; j < stars.length; j++, x >>= 2) {
      pick[stars[j]] = table[stars[j]][x & 3]
    }

    // Expected cost: the same recurrence as expectedRun. The re-climb is
    // summed directly (not via prefix sums) so plans that differ only on
    // stars they never reach tie exactly, and the tie-break keeps Level 1.
    for (let s = 0; s < target; s++) {
      const t = pick[s]
      let reclimb = 0
      if (t.b > 0) for (let k = reset[s]; k < s; k++) reclimb += e[k]
      e[s] = (t.cost + t.b * reclimb) / t.p
    }
    let cost = 0
    for (let s = from; s < target; s += step[s]) cost += e[s]

    // P[s] = chance to reach the target from s with at most k booms left,
    // solved one k at a time; `prev` holds k − 1 (a boom spends one).
    const chances = []
    for (let k = 0; k <= MAX_SPARES; k++) {
      for (let s = target - 1; s >= 0; s--) {
        const t = pick[s]
        const next = s + step[s]
        const up = next >= target ? 1 : P[next]
        const down = k > 0 && t.b > 0 ? prev[reset[s]] : 0
        P[s] = (t.p * up + t.b * down) / (t.p + t.b)
      }
      chances.push(P[from])
      ;[prev, P] = [P, prev]
    }

    const plan = { i, cost, chances }
    if (!cheapest || cost < cheapest.cost) cheapest = plan
    for (let k = 0; k <= MAX_SPARES; k++) {
      const c = chances[k]
      if (c >= chance - EPS && (!hit[k] || cost < hit[k].cost)) hit[k] = plan
      const b = best[k]?.chances[k]
      if (
        b === undefined ||
        c > b + EPS ||
        (c >= b - EPS && cost < best[k].cost)
      )
        best[k] = plan
    }
  }

  const modesOf = (i) =>
    Object.fromEntries(stars.map((s, j) => [s, ((i >> (2 * j)) & 3) + 1]))
  const rows = []
  for (let k = 0; k <= MAX_SPARES; k++) {
    rows.push(
      hit[k]
        ? {
            spares: k,
            chance: hit[k].chances[k],
            cost: hit[k].cost,
            modes: modesOf(hit[k].i),
          }
        : {
            spares: k,
            unreachable: true,
            best: {
              chance: best[k].chances[k],
              cost: best[k].cost,
              modes: modesOf(best[k].i),
            },
          },
    )
  }
  return {
    target,
    stars,
    rows,
    cheapest: {
      cost: cheapest.cost,
      modes: modesOf(cheapest.i),
      chanceBySpares: cheapest.chances,
    },
  }
}
