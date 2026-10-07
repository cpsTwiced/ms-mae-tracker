// Cross-checks the optimizer against code written separately: every plan is
// re-scored (expectedRun for cost, a plain 2D chance table), the picks are
// re-solved as dense linear systems, and a dice-roll simulation spot-checks
// the chances. Slower than the unit tests (~1-2 s), so it covers a few
// representative climbs.
import { describe, it, expect } from 'vitest'
import { optimizeModes, reachChances } from './optimizer'
import {
  attemptOdds,
  attemptCost,
  expectedRun,
  maxStarForLevel,
} from './starforce'
import { BOOM_RESET_STARS, MAX_SPARES } from '@/data/starforce'

const K = MAX_SPARES
// The dense solver only checks the first spare counts; it grows fast.
const KD = 12

// Dense Gaussian elimination with partial pivoting.
function solve(A, y) {
  const n = y.length
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++)
      if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    ;[A[c], A[p]] = [A[p], A[c]]
    ;[y[c], y[p]] = [y[p], y[c]]
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c]
      if (!f) continue
      for (let j = c; j < n; j++) A[r][j] -= f * A[c][j]
      y[r] -= f * y[c]
    }
  }
  const x = new Array(n)
  for (let r = n - 1; r >= 0; r--) {
    let s = y[r]
    for (let j = r + 1; j < n; j++) s -= A[r][j] * x[j]
    x[r] = s / A[r][r]
  }
  return x
}

const stepOf = (s, opts) => (opts.eventPlusOne && s <= 10 ? 2 : 1)
const resetOf = (s) => BOOM_RESET_STARS[s] ?? 12

// Chance to reach `goal` from `from` with at most r booms, r = 0..K, as one
// linear system over (star, booms left).
function indepChances(level, from, goal, opts, modes) {
  const o = { ...opts, safeguard: false, modes }
  const n = goal * (KD + 1)
  const id = (s, r) => r * goal + s
  const A = Array.from({ length: n }, () => new Float64Array(n))
  const y = new Float64Array(n)
  for (let r = 0; r <= KD; r++)
    for (let s = 0; s < goal; s++) {
      const { success: p, boom: b } = attemptOdds(s, o)
      const i = id(s, r)
      A[i][i] = p + b
      const nx = s + stepOf(s, opts)
      if (nx >= goal) y[i] += p
      else A[i][id(nx, r)] -= p
      if (b > 0 && r > 0) A[i][id(resetOf(s), r - 1)] -= b
    }
  const x = solve(A, Array.from(y))
  return Array.from({ length: KD + 1 }, (_, r) =>
    from >= goal ? 1 : x[id(from, r)],
  )
}

function indepCost(level, from, goal, opts, modes) {
  const o = { ...opts, safeguard: false, modes }
  const A = Array.from({ length: goal }, () => new Float64Array(goal))
  const y = new Array(goal).fill(0)
  for (let s = 0; s < goal; s++) {
    const { success: p, boom: b } = attemptOdds(s, o)
    A[s][s] = p + b
    y[s] = attemptCost(level, s, o)
    const nx = s + stepOf(s, opts)
    if (nx < goal) A[s][nx] -= p
    if (b > 0) A[s][resetOf(s)] -= b
  }
  return from >= goal ? 0 : solve(A, y)[from]
}

// Straightforward 2D table V[r][s]: chance to reach goal from s with r
// booms left. No buffer swapping, written separately from the optimizer.
function tableChances(from, goal, opts, modes) {
  const o = { ...opts, safeguard: false, modes }
  const odds = []
  for (let s = 0; s < goal; s++) odds[s] = attemptOdds(s, o)
  const V = []
  for (let r = 0; r <= K; r++) {
    V[r] = []
    for (let s = goal - 1; s >= 0; s--) {
      const { success: p, boom: b } = odds[s]
      const nx = s + stepOf(s, opts)
      const up = nx >= goal ? 1 : V[r][nx]
      const down = b > 0 && r > 0 ? V[r - 1][resetOf(s)] : 0
      V[r][s] = (p * up + b * down) / (p + b)
    }
  }
  return V.map((row) => (from >= goal ? 1 : row[from]))
}

// Plain dice-roll climb.
function simulate(from, goal, opts, modes, spares, runs, seed) {
  let x = seed
  const rand = () => (x = (x * 1664525 + 1013904223) >>> 0) / 4294967296
  const o = { ...opts, safeguard: false, modes }
  const odds = []
  for (let s = 0; s < goal; s++) odds[s] = attemptOdds(s, o)
  let ok = 0
  for (let i = 0; i < runs; i++) {
    let s = from
    let booms = 0
    while (s < goal) {
      const u = rand()
      if (u < odds[s].success) s += stepOf(s, opts)
      else if (u < odds[s].success + odds[s].boom) {
        if (++booms > spares) break
        s = resetOf(s)
      }
    }
    if (s >= goal) ok++
  }
  return ok / runs
}

// [level, from, to, opts]: plain, MVP, Shining, both events,
// climbs starting inside and above the mode stars, and a short climb.
const SCENARIOS = [
  [200, 0, 22, {}],
  [200, 0, 22, { mvp: 'diamond', eventShining: true }],
  [150, 0, 22, { eventPlusOne: true, eventShining: true }],
  [200, 18, 22, {}],
  [200, 22, 24, {}],
  [250, 0, 25, {}],
  [200, 0, 19, { mvp: 'gold' }],
]
const CHANCES = [0.5, 0.9, 0.99]

const allPlans = (stars) =>
  Array.from({ length: 4 ** stars.length }, (_, i) =>
    Object.fromEntries(stars.map((s, j) => [s, ((i >> (2 * j)) & 3) + 1])),
  )

const close = (a, b, tol = 1e-8) =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(b))

describe('optimizer deep verification', () => {
  for (const [level, from, to, opts] of SCENARIOS)
    it(`Lv.${level} ${from}→${to} ${JSON.stringify(opts)}`, () => {
      const target = Math.min(to, maxStarForLevel(level))
      const results = CHANCES.map((c) =>
        optimizeModes(level, from, to, opts, c),
      )
      const { stars } = results[0]

      // Every plan scored by independent code paths: the calculator's
      // expectedRun for cost and reachChances for chance.
      const plans = allPlans(stars).map((modes) => ({
        modes,
        cost: expectedRun(level, from, target, {
          ...opts,
          safeguard: false,
          modes,
        }).cost,
        chances: tableChances(from, target, opts, modes),
      }))

      results.forEach((r, ci) => {
        const c = CHANCES[ci]
        expect(r.target).toBe(target)
        // Cheapest overall.
        const minCost = Math.min(...plans.map((p) => p.cost))
        expect(close(r.cheapest.cost, minCost)).toBe(true)

        for (let k = 0; k <= K; k++) {
          const row = r.rows[k]
          const meets = plans.filter((p) => p.chances[k] >= c - 1e-9)
          if (meets.length) {
            expect(row.unreachable).toBeUndefined()
            const best = Math.min(...meets.map((p) => p.cost))
            expect(close(row.cost, best)).toBe(true)
            expect(row.chance).toBeGreaterThanOrEqual(c - 1e-9)
          } else {
            expect(row.unreachable).toBe(true)
            const top = Math.max(...plans.map((p) => p.chances[k]))
            expect(close(row.best.chance, top, 1e-9)).toBe(true)
          }
          // The reported plan's numbers match its own modes.
          const shown = row.unreachable ? row.best : row
          const mine = plans.find((p) =>
            stars.every((s) => p.modes[s] === shown.modes[s]),
          )
          expect(close(shown.cost, mine.cost)).toBe(true)
          expect(
            close(shown.chance ?? r.rows[k].chance, mine.chances[k], 1e-9),
          ).toBe(true)
        }
      })

      // Independent linear-system solve on a few plans (incl. the picks).
      const sample = [
        results[1].rows[0],
        results[1].rows[3],
        results[2].rows[K],
      ].map((row) => (row.unreachable ? row.best : row).modes)
      sample.push(plans[0].modes, plans[plans.length - 1].modes)
      for (const modes of sample) {
        const lin = indepChances(level, from, target, opts, modes)
        const cost = indepCost(level, from, target, opts, modes)
        const mine = plans.find((p) =>
          stars.every((s) => p.modes[s] === modes[s]),
        )
        expect(close(mine.cost, cost, 1e-7)).toBe(true)
        for (let k = 0; k <= KD; k++)
          expect(close(mine.chances[k], lin[k], 1e-8)).toBe(true)
        // Reach for every intermediate star.
        const reach = reachChances(from, target, opts, modes, 3)
        for (let g = from + 1; g <= target; g++)
          expect(
            close(reach[g], indepChances(level, from, g, opts, modes)[3], 1e-8),
          ).toBe(true)
      }
    }, 120000)

  it('matches a dice-roll simulation', () => {
    const OPTS = {}
    for (const [from, to, k] of [
      [0, 22, 2],
      [15, 22, 0],
      [18, 22, 5],
      [0, 22, 10],
      [20, 23, 3],
    ]) {
      const r = optimizeModes(200, from, to, OPTS, 0.75)
      const row = r.rows[k].unreachable ? r.rows[k].best : r.rows[k]
      const runs = 100000
      const sim = simulate(from, r.target, OPTS, row.modes, k, runs, 12345 + k)
      const se = Math.sqrt((row.chance * (1 - row.chance)) / runs)
      expect(Math.abs(sim - row.chance)).toBeLessThan(4 * se + 1e-6)
    }
  })
})
