// Mode optimizer for the Star Force Lab. It tries every combination of
// Enhancement Mode levels on stars 15-21 (at most 4^7 = 16,384 plans),
// computes each plan's expected cost and its chance of reaching the target
// with at most N booms, and keeps, per spare count, the cheapest plan that
// meets the wanted chance. Spare counts past the point where the cheapest
// plan overall already meets the chance aren't searched: they all pick it.
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

// `opts` carries what the Lab exposes (mvp, eventShining,
// eventPlusOne). Safeguard is forced off: Level 4 at 15-17★ already is
// Safeguard. `chance` is a fraction (0.9). Returns null when there's no climb
// (from ≥ target once the target is clamped to the level's cap).
// ponytail: main-thread brute force (~20-60 ms at 22 ★, ~100 ms when no spare
// count up to 50 is enough); move to a Web Worker if phones lag.
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
  const setPick = (i) => {
    for (let j = 0, x = i; j < stars.length; j++, x >>= 2) {
      pick[stars[j]] = table[stars[j]][x & 3]
    }
  }
  const e = new Float64Array(target)

  // Expected cost: the same recurrence as expectedRun. The re-climb is summed
  // directly (not via prefix sums) so plans that differ only on stars they
  // never reach tie exactly, and the tie-break keeps Level 1.
  const costOfPick = () => {
    for (let s = 0; s < target; s++) {
      const t = pick[s]
      let reclimb = 0
      if (t.b > 0) for (let k = reset[s]; k < s; k++) reclimb += e[k]
      e[s] = (t.cost + t.b * reclimb) / t.p
    }
    let cost = 0
    for (let s = from; s < target; s += step[s]) cost += e[s]
    return cost
  }

  const P = new Float64Array(target)
  const prev = new Float64Array(target)
  const chancesOfPick = (maxK) =>
    chancesBySpares(pick, reset, step, from, target, maxK, P, prev)

  // Pass 1: every plan's cost, and the cheapest plan overall.
  const n = 4 ** stars.length
  const costs = new Float64Array(n)
  let cheapestI = 0
  for (let i = 0; i < n; i++) {
    setPick(i)
    costs[i] = costOfPick()
    if (costs[i] < costs[cheapestI]) cheapestI = i
  }
  setPick(cheapestI)
  const cheapChances = chancesOfPick(MAX_SPARES)

  // Once the cheapest plan meets the chance, every larger spare count picks
  // it too, so the search stops there (`enough`; null if it never does).
  const found = cheapChances.findIndex((c) => c >= chance - EPS)
  const enough = found === -1 ? null : found
  const maxK = enough ?? MAX_SPARES

  // Pass 2: per spare count, the cheapest plan that meets the chance, and the
  // likeliest plan for counts none can meet.
  const hit = []
  const best = []
  for (let i = 0; i < n; i++) {
    setPick(i)
    const chances = chancesOfPick(maxK)
    const cost = costs[i]
    const plan = { i, cost, chances }
    for (let k = 0; k <= maxK; k++) {
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
    const plan =
      k > maxK
        ? { i: cheapestI, cost: costs[cheapestI], chances: cheapChances }
        : hit[k]
    rows.push(
      plan
        ? {
            spares: k,
            chance: plan.chances[k],
            cost: plan.cost,
            modes: modesOf(plan.i),
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
    enough,
    cheapest: {
      cost: costs[cheapestI],
      modes: modesOf(cheapestI),
      chanceBySpares: cheapChances,
    },
  }
}

// P[s] = chance to reach `target` from s with at most k booms left, solved
// one k at a time; `prev` holds k − 1 (a boom spends one). Returns the chance
// from `from` for k = 0…maxK. P and prev are scratch buffers (≥ target long)
// so the search doesn't allocate per plan.
function chancesBySpares(pick, reset, step, from, target, maxK, P, prev) {
  const chances = []
  for (let k = 0; k <= maxK; k++) {
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
  return chances
}
