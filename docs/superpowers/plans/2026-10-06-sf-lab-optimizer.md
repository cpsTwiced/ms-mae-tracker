# Star Force Lab Optimizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Lab view to the Star Force page that finds the cheapest per-star Enhancement Mode plan for a chosen number of spares and a chosen chance, plus a table of every option.

**Architecture:** A pure `lib/optimizer.js` brute-forces all 4⁷ mode plans for stars 15–21, computing each plan's expected cost (closed form) and its chance of reaching the target with ≤ N booms (exact DP). `StarForceLab.jsx` renders the result; `StarForcePanel.jsx` gains a `Calculator | Lab` switch over the shared inputs; `App.jsx` maps `/lab` to the Star Force tab's Lab view.

**Tech Stack:** React 19, Mantine 9, Vite, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-06-sf-lab-optimizer-design.md`

## Global Constraints

- JS style: 2-space indent, single quotes, no semicolons, trailing commas. Same-folder imports relative, cross-layer via `@/`.
- Component tests wrap render in `<MantineProvider>` and call `cleanup()` in `afterEach`.
- Stick with what is already in the app: reuse `.sfTable`, `.sfTableCard`, `.sfHero`/`.sfHeroCost`, `.sfEyebrow`, `.sfHeroValue`, `.sfNumInput`, `.appTabs`/`.appTab`, Mantine `TextInput`/`Select`/`Tooltip`, `SELECT_CHEVRON`. Number fields 40px / 16px / 600 mono, ★ suffix `size="xs"`. Selects `styles={{ input: { height: 40, fontSize: 16 } }}`. No chips, meters or new control shapes.
- `modes` is always keyed by star number: `{ 15: 4, 16: 3, … }`.
- Optimizer `chance` is a fraction (`0.9`); stored input `chance` is a whole-percent string (`'90'`).
- Spares range 0–10 (`MAX_SPARES = 10`). Chance options `'50' '75' '90' '95' '99'`.
- Lab never uses Safeguard or the calculator's single mode.
- Never `git push`. Commits: Conventional Commits, no `Co-Authored-By`.
- Update `README.md` in the same branch (Features, routes, Status / scope).

## Review Focus

1. Direct load of `/lab` (no hero card on screen) must not throw: the phone-bar observer must skip a null ref. Test in Task 5.
2. Hidden Safeguard on / mode 3 left over from the Calculator must not change Lab numbers. Tests in Task 2 (optimizer) and Task 5 (panel).
3. A high target (0→25★ at 90%) where every row is unreachable must still render a full table with "best" chances and a summary. Test in Task 4.
4. An empty Spares field (user cleared it) must select the 0-spares row, not crash. Test in Task 4.
5. A low-level item (Lv.120, cap 15★) with a 22★ target must show the cap message, not an empty table. Test in Task 4.

---

### Task 1: Per-star modes in the engine

**Files:**

- Modify: `src/lib/starforce.js` (header comment, `attemptOdds`, `attemptCost`, `successStep`)
- Test: `src/lib/starforce.test.js`

**Interfaces:**

- Produces: `opts.modes` (object keyed by star) honored by `attemptOdds(star, opts)` and `attemptCost(level, star, opts)`; `export function successStep(star, opts)` (was private).

- [ ] **Step 1: Write the failing tests** — append to `src/lib/starforce.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/starforce.test.js -t "per-star modes"`
Expected: FAIL (the `modes` override is ignored).

- [ ] **Step 3: Implement** — in `src/lib/starforce.js`:

Add to the `opts` header comment, under `mode`:

```js
//   modes      object  per-star override of `mode`, keyed by star ({ 18: 3 })
```

Add above `attemptOdds`:

```js
// The Enhancement Mode used at `star`: a per-star plan wins over the single
// calculator-wide mode.
function modeAt(star, opts) {
  return opts.modes?.[star] ?? opts.mode ?? 1
}
```

In `attemptOdds` replace `const { starCatch, safeguard, mode = 1, eventShining } = opts` with:

```js
const { starCatch, safeguard, eventShining } = opts
const mode = modeAt(star, opts)
```

In `attemptCost` replace `const { safeguard, mode = 1, mvp = 'none', eventShining } = opts` with:

```js
const { safeguard, mvp = 'none', eventShining } = opts
const mode = modeAt(star, opts)
```

Change `function successStep(star, opts)` to `export function successStep(star, opts)`.

- [ ] **Step 4: Run the engine tests**

Run: `npx vitest run src/lib/starforce.test.js`
Expected: PASS (all, including existing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/starforce.js src/lib/starforce.test.js
git commit -m "feat: let the Star Force engine take a mode per star"
```

---

### Task 2: The optimizer

**Files:**

- Create: `src/lib/optimizer.js`
- Test: `src/lib/optimizer.test.js`

**Interfaces:**

- Consumes: `attemptOdds`, `attemptCost`, `boomResetStar`, `successStep`, `maxStarForLevel`, `MAX_STAR` from `./starforce`.
- Produces:
  - `export const MAX_SPARES = 10`
  - `export function optimizeModes(level, fromStar, toStar, opts, chance)` →
    `null` (nothing to climb) or
    `{ target, stars, rows, cheapest }` where
    `rows[k]` is `{ spares, chance, cost, modes }` or `{ spares, unreachable: true, best: { chance, cost, modes } }` for k = 0..10, and
    `cheapest` is `{ cost, modes, chanceBySpares }` (`chanceBySpares[k]` = that plan's chance with k spares).

- [ ] **Step 1: Write the failing tests** — create `src/lib/optimizer.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { optimizeModes, MAX_SPARES } from './optimizer'
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/optimizer.test.js`
Expected: FAIL ("Failed to resolve import ./optimizer").

- [ ] **Step 3: Implement** — create `src/lib/optimizer.js`:

```js
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

export const MAX_SPARES = 10

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
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/optimizer.test.js`
Expected: PASS. If only the `0.528` assertion fails, print `rows[10].best.chance`, confirm it is all-Level-4's chance (the max) and pin that value to 3 decimals.

- [ ] **Step 5: Commit**

```bash
git add src/lib/optimizer.js src/lib/optimizer.test.js
git commit -m "feat: add the Star Force mode optimizer"
```

---

### Task 3: Spares and Chance in the inputs model

**Files:**

- Modify: `src/lib/storage.js` (`SF_DEFAULTS`, `normalizeSfInputs`, `SHARE_PARAMS`, new `SF_CHANCES`)
- Test: `src/lib/storage.test.js` (~L365-406), `src/components/StarForcePanel.test.jsx` (~L250)

**Interfaces:**

- Consumes: `MAX_SPARES` from `./optimizer`.
- Produces: `SF_DEFAULTS.spares` (`'2'`), `SF_DEFAULTS.chance` (`'90'`), `export const SF_CHANCES = ['50', '75', '90', '95', '99']`, share params `sp` / `ch`.

- [ ] **Step 1: Update and add tests** — in `src/lib/storage.test.js`:

Change the readable-query expectation to:

```js
      'lv=200&from=0&to=22&sc=1&sg=0&mode=1&mvp=none&shine=0&plus=0&runs=3000&sp=2&ch=90',
```

In "round-trips every input", add to the `inputs` object:

```js
      spares: '7',
      chance: '95',
```

Change the junk-values test query to:

```js
      sfInputsFromQuery(
        '?lv=999&to=abc&sc=maybe&mode=9&mvp=bogus&runs=7&sp=x&ch=42',
      ),
```

Add inside `describe('Star Force share links', …)`:

```js
it('clamps spares to the Lab maximum', () => {
  expect(sfInputsFromQuery('?sp=99')).toEqual({ ...SF_DEFAULTS, spares: '10' })
})
```

In `src/components/StarForcePanel.test.jsx` ("copies a link to the current inputs"), change the expected URL to:

```js
      `${window.location.origin}/?lv=160&from=0&to=22&sc=1&sg=0&mode=1&mvp=none&shine=0&plus=0&runs=3000&sp=2&ch=90`,
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/storage.test.js src/components/StarForcePanel.test.jsx`
Expected: FAIL on the query strings and the spares clamp.

- [ ] **Step 3: Implement** — in `src/lib/storage.js`:

Add `import { MAX_SPARES } from './optimizer'` beside the other imports.
Add `spares: '2',` and `chance: '90',` at the end of `SF_DEFAULTS`. Below it:

```js
// The Lab's "at least" chance options, as whole percents.
export const SF_CHANCES = ['50', '75', '90', '95', '99']
```

At the end of the object returned by `normalizeSfInputs`:

```js
    spares: digitsOr(i.spares, MAX_SPARES, d.spares),
    chance: SF_CHANCES.includes(i.chance) ? i.chance : d.chance,
```

At the end of `SHARE_PARAMS`:

```js
  sp: ['spares', whole],
  ch: ['chance', String],
```

- [ ] **Step 4: Run the full suite** (saved setups compare every `SF_DEFAULTS` key, so make sure nothing else moved)

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.js src/lib/storage.test.js src/components/StarForcePanel.test.jsx
git commit -m "feat: add spares and chance to the Star Force inputs"
```

---

### Task 4: The Lab results component

**Files:**

- Modify: `src/lib/format.js` (move `digits`, `clampRaw`, `pct` here), `src/components/StarForcePanel.jsx` (import them instead), `src/index.css` (Lab section)
- Create: `src/components/StarForceLab.jsx`
- Test: `src/components/StarForceLab.test.jsx`

**Interfaces:**

- Consumes: `optimizeModes`, `MAX_SPARES` (Task 2); `SF_CHANCES` (Task 3); `attemptOdds`, `attemptCost`; `formatMeso`, `digits`, `clampRaw`, `pct`; `SELECT_CHEVRON` from `./SavedSetups`; `ScrollStatusArea`.
- Produces: `export default function StarForceLab({ level, cur, target, rangeValid, starCap, opts, sparesRaw, chanceRaw, targetText, onSet, onEditTarget, emptyMessage })`
  - `opts`: memoized `{ starCatch, mvp, eventShining, eventPlusOne }`
  - `onSet(field, value)`: same as the panel's `set`
  - `onEditTarget()`: called when the Target box is clicked
  - Root element: `<div className="sfResults sfLabResults">`. Tables carry `aria-label="Your plan"` / `"Every option"`.

- [ ] **Step 1: Move the helpers** — append to `src/lib/format.js` (cut from `StarForcePanel.jsx`, unchanged):

```js
export function digits(value) {
  return value.replace(/\D/g, '')
}

// Overshooting a field snaps to its max (typing "999" in Level lands on 300,
// a 26★ target on a Lv.100 item lands on its 8★ cap) instead of silently
// dropping digits or accepting values the game can't reach.
export function clampRaw(raw, max) {
  if (raw === '') return ''
  return String(Math.min(Number(raw), max))
}

export function pct(p) {
  return `${(p * 100).toFixed(1)}%`
}
```

In `StarForcePanel.jsx` delete the three local functions and change the format import to:

```js
import { formatMeso, digits, clampRaw, pct } from '@/lib/format'
```

Run: `npx vitest run src/components/StarForcePanel.test.jsx` → PASS.

- [ ] **Step 2: Write the failing tests** — create `src/components/StarForceLab.test.jsx`:

```jsx
import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import StarForceLab from './StarForceLab'
import { optimizeModes } from '@/lib/optimizer'
import { formatMeso, pct } from '@/lib/format'

afterEach(cleanup)

const OPTS = {
  starCatch: true,
  mvp: 'none',
  eventShining: false,
  eventPlusOne: false,
}

function renderLab(props = {}) {
  const onSet = vi.fn()
  const onEditTarget = vi.fn()
  render(
    <MantineProvider>
      <StarForceLab
        level={200}
        cur={0}
        target={22}
        rangeValid
        starCap={30}
        opts={OPTS}
        sparesRaw="2"
        chanceRaw="90"
        targetText="22"
        onSet={onSet}
        onEditTarget={onEditTarget}
        emptyMessage="Pick a target above your current star."
        {...props}
      />
    </MantineProvider>,
  )
  return { onSet, onEditTarget }
}

describe('StarForceLab', () => {
  it('shows the cheapest plan for the chosen spares and chance', () => {
    renderLab()
    const row = optimizeModes(200, 0, 22, OPTS, 0.9).rows[2]
    expect(
      screen.getAllByText(formatMeso(Math.round(row.cost))).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(pct(row.chance)).length).toBeGreaterThan(0)
    const plan = screen.getByRole('table', { name: 'Your plan' })
    expect(within(plan).getByText('15 → 16')).toBeInTheDocument()
    expect(within(plan).getAllByText('Level 4').length).toBeGreaterThan(0)
  })

  it('lists every spare count plus No limit, and picking one sets Spares', () => {
    const { onSet } = renderLab()
    const table = screen.getByRole('table', { name: 'Every option' })
    // header + 11 spare counts + No limit
    expect(within(table).getAllByRole('row')).toHaveLength(13)
    expect(within(table).getByText('No limit')).toBeInTheDocument()
    fireEvent.click(within(table).getByRole('button', { name: '5 spares' }))
    expect(onSet).toHaveBeenCalledWith('spares', '5')
  })

  it('clamps typed spares to 10', () => {
    const { onSet } = renderLab()
    fireEvent.change(screen.getByLabelText('Spares'), {
      target: { value: '99' },
    })
    expect(onSet).toHaveBeenCalledWith('spares', '10')
  })

  it('treats an empty Spares field as 0 spares', () => {
    renderLab({ sparesRaw: '' })
    const row0 = optimizeModes(200, 0, 22, OPTS, 0.9).rows[0]
    expect(
      screen.getAllByText(formatMeso(Math.round(row0.cost))).length,
    ).toBeGreaterThan(0)
  })

  it('shows the best chance when no plan can reach the target', () => {
    renderLab({ target: 25, targetText: '25' })
    expect(
      screen.getByText(/Can't reach 90% with 2 spares/),
    ).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Every option' })
    expect(within(table).getAllByText(/Can't reach 90% · best/)).toHaveLength(
      11,
    )
  })

  it('says when no modes are needed', () => {
    renderLab({ target: 18, targetText: '18' })
    expect(screen.getByText(/No modes needed/)).toBeInTheDocument()
  })

  it('explains targets that never reach the mode stars', () => {
    renderLab({ target: 15, targetText: '15' })
    expect(
      screen.getByText(
        'Modes only matter from 15 ★ up. Set a target above 15 ★.',
      ),
    ).toBeInTheDocument()
  })

  it('explains items capped at 15★', () => {
    renderLab({ level: 120, starCap: 15, targetText: '15' })
    expect(
      screen.getByText(
        "Enhancement Modes start at 15 ★. A Lv.120 item caps at 15 ★, so there's nothing to optimize.",
      ),
    ).toBeInTheDocument()
  })

  it('shows the calculator empty message without a valid range', () => {
    renderLab({ rangeValid: false })
    expect(
      screen.getByText('Pick a target above your current star.'),
    ).toBeInTheDocument()
  })

  it('jumps to the Target star field from the Target box', () => {
    const { onEditTarget } = renderLab()
    fireEvent.click(screen.getByRole('button', { name: /Target star 22/ }))
    expect(onEditTarget).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/components/StarForceLab.test.jsx`
Expected: FAIL ("Failed to resolve import ./StarForceLab").

- [ ] **Step 4: Implement** — create `src/components/StarForceLab.jsx`:

```jsx
import { useMemo } from 'react'
import {
  Group,
  Select,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { attemptOdds, attemptCost } from '@/lib/starforce'
import { optimizeModes, MAX_SPARES } from '@/lib/optimizer'
import { SF_CHANCES } from '@/lib/storage'
import { formatMeso, digits, clampRaw, pct } from '@/lib/format'
import ScrollStatusArea from './ScrollStatusArea'
import { SELECT_CHEVRON } from './SavedSetups'

const CHANCE_OPTIONS = SF_CHANCES.map((c) => ({ value: c, label: `${c}%` }))

const sparesText = (n) => `${n} ${n === 1 ? 'spare' : 'spares'}`

const sameModes = (a, b) => Object.keys(a).every((s) => a[s] === b[s])

const INFO_ICON = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
)

// The Lab's results column: the cheapest Enhancement Mode plan for the chosen
// spares and chance, and a table of every spare count. Inputs are shared with
// the calculator and come in as props; the optimizer runs here.
export default function StarForceLab({
  level,
  cur,
  target,
  rangeValid,
  starCap,
  opts,
  sparesRaw,
  chanceRaw,
  targetText,
  onSet,
  onEditTarget,
  emptyMessage,
}) {
  // Spares only picks a row, so it isn't a dependency: typing it never
  // re-runs the search.
  const result = useMemo(
    () =>
      rangeValid
        ? optimizeModes(level, cur, target, opts, Number(chanceRaw) / 100)
        : null,
    [rangeValid, level, cur, target, opts, chanceRaw],
  )
  const spares = sparesRaw === '' ? 0 : Number(sparesRaw)
  const ready = result !== null && result.stars.length > 0
  const row = ready ? result.rows[spares] : null
  const shown = row && (row.unreachable ? row.best : row)
  const goal = result?.target

  const notice = !result
    ? emptyMessage
    : !ready
      ? starCap <= 15
        ? `Enhancement Modes start at 15 ★. A Lv.${level} item caps at ${starCap} ★, so there's nothing to optimize.`
        : 'Modes only matter from 15 ★ up. Set a target above 15 ★.'
      : null

  let compare = null
  if (ready && !row.unreachable) {
    const cheapChance = pct(result.cheapest.chanceBySpares[spares])
    compare = sameModes(row.modes, result.cheapest.modes)
      ? `No modes needed: the cheapest plan reaches ${goal} ★ ${cheapChance} of the time with ${sparesText(spares)}.`
      : `The cheapest plan costs ${formatMeso(Math.round(result.cheapest.cost))}, but with ${sparesText(spares)} it reaches ${goal} ★ only ${cheapChance} of the time.`
  }

  return (
    <div className="sfResults sfLabResults">
      <div className="sfHero">
        <div className="sfHeroCost">
          <Group gap={20} align="flex-end">
            <div>
              <Text size="sm" fw={600} mb={7}>
                Spares
              </Text>
              <TextInput
                aria-label="Spares"
                value={sparesRaw}
                onChange={(e) =>
                  onSet(
                    'spares',
                    clampRaw(digits(e.currentTarget.value), MAX_SPARES),
                  )
                }
                w={80}
                size="sm"
                inputMode="numeric"
                classNames={{ input: 'sfNumInput' }}
              />
            </div>
            <div>
              <Group gap={6} align="baseline" mb={7}>
                <Text size="sm" fw={600}>
                  Chance
                </Text>
                <Text size="xs" c="dark.3">
                  at least
                </Text>
              </Group>
              <Select
                aria-label="Chance"
                data={CHANCE_OPTIONS}
                value={chanceRaw}
                onChange={(v) => onSet('chance', v ?? '90')}
                w={110}
                size="sm"
                rightSection={SELECT_CHEVRON}
                rightSectionPointerEvents="none"
                styles={{ input: { height: 40, fontSize: 16 } }}
                allowDeselect={false}
              />
            </div>
            <div>
              <Group gap={4} align="center" mb={7}>
                <Text size="sm" fw={600}>
                  Target
                </Text>
                <Tooltip
                  label="Change the target star in Inputs. Click the box to jump there."
                  withArrow
                  multiline
                  w={220}
                  events={{ hover: true, focus: true, touch: true }}
                >
                  <UnstyledButton aria-label="About target" className="sfInfo">
                    {INFO_ICON}
                  </UnstyledButton>
                </Tooltip>
              </Group>
              <UnstyledButton
                className="sfNumInput sfNumInputTarget sfTargetMirror"
                aria-label={`Target star ${targetText}. Change it in Inputs`}
                onClick={onEditTarget}
              >
                {targetText}
                <Text size="xs" c="sage.7" component="span">
                  ★
                </Text>
              </UnstyledButton>
            </div>
          </Group>

          {notice ? (
            <Text size="sm" c="dark.1" mt={16}>
              {notice}
            </Text>
          ) : (
            <>
              {row.unreachable && (
                <Text size="sm" c="orange.3" mt={16}>
                  Can&apos;t reach {chanceRaw}% with {sparesText(spares)}. Best
                  possible:
                </Text>
              )}
              <Group gap={40} mt={16} align="flex-end">
                <div>
                  <Text className="sfEyebrow" c="sage.2">
                    Expected cost
                  </Text>
                  <Group gap={8} align="baseline">
                    <Text className="sfHeroValue" c="sage.2" component="span">
                      {formatMeso(Math.round(shown.cost))}
                    </Text>
                    <Text size="md" fw={600} c="sage.4" component="span">
                      mesos
                    </Text>
                  </Group>
                </div>
                <div>
                  <Text className="sfEyebrow" c="sage.2">
                    Chance to reach {goal} ★
                  </Text>
                  <Text className="sfHeroValue" c="sage.2">
                    {pct(shown.chance)}
                  </Text>
                </div>
              </Group>
              {compare && (
                <Text size="sm" c="dark.1" mt={12}>
                  {compare}
                </Text>
              )}
            </>
          )}
        </div>
      </div>

      {!notice && (
        <>
          <div className="sfTableCard">
            <Text size="md" fw={600} px={16} pt={14} pb={10}>
              Your plan
            </Text>
            <ScrollStatusArea
              className="sfTableScroll"
              refreshKey={shown}
              scrollbars="xy"
            >
              <table className="sfTable" aria-label="Your plan">
                <thead>
                  <tr>
                    <th>Star</th>
                    <th className="sfLabMode">Mode</th>
                    <th>Success</th>
                    <th>Boom</th>
                    <th>Cost / attempt</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stars.map((s) => {
                    const o = { ...opts, mode: shown.modes[s] }
                    const odds = attemptOdds(s, o)
                    return (
                      <tr key={s}>
                        <td>
                          {s} → {s + 1}
                        </td>
                        <td
                          className="sfLabMode"
                          data-basic={shown.modes[s] === 1 || undefined}
                        >
                          Level {shown.modes[s]}
                        </td>
                        <td>{pct(odds.success)}</td>
                        <td
                          style={{
                            color:
                              odds.boom > 0
                                ? 'var(--mantine-color-orange-3)'
                                : 'var(--mantine-color-dark-3)',
                          }}
                        >
                          {odds.boom > 0 ? pct(odds.boom) : '—'}
                        </td>
                        <td>{formatMeso(attemptCost(level, s, o))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </ScrollStatusArea>
          </div>

          <div className="sfTableCard">
            <Group
              justify="space-between"
              align="baseline"
              gap={6}
              px={16}
              pt={14}
              pb={10}
            >
              <Text size="md" fw={600}>
                Every option at {chanceRaw}%
              </Text>
              <Text size="xs" c="dark.2">
                Mode level per star · pick a row to see its plan
              </Text>
            </Group>
            <ScrollStatusArea
              className="sfTableScroll"
              refreshKey={result}
              scrollbars="xy"
            >
              <table className="sfTable" aria-label="Every option">
                <thead>
                  <tr>
                    <th>Spares</th>
                    <th>Chance</th>
                    <th>Exp. cost</th>
                    {result.stars.map((s) => (
                      <th key={s} className="sfLabLevel">
                        {s} ★
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => {
                    const plan = r.unreachable ? r.best : r
                    return (
                      <tr
                        key={r.spares}
                        data-selected={r.spares === spares || undefined}
                      >
                        <td>
                          <UnstyledButton
                            className="sfLabPick"
                            aria-pressed={r.spares === spares}
                            onClick={() => onSet('spares', String(r.spares))}
                          >
                            {sparesText(r.spares)}
                          </UnstyledButton>
                        </td>
                        {r.unreachable ? (
                          <td colSpan={2} className="sfLabMiss">
                            Can&apos;t reach {chanceRaw}% · best{' '}
                            {pct(r.best.chance)}
                          </td>
                        ) : (
                          <>
                            <td>{pct(r.chance)}</td>
                            <td>{formatMeso(Math.round(r.cost))}</td>
                          </>
                        )}
                        {result.stars.map((s) => (
                          <td
                            key={s}
                            className="sfLabLevel"
                            data-basic={plan.modes[s] === 1 || undefined}
                          >
                            {plan.modes[s]}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  <tr>
                    <td>No limit</td>
                    <td>100%</td>
                    <td>{formatMeso(Math.round(result.cheapest.cost))}</td>
                    {result.stars.map((s) => (
                      <td
                        key={s}
                        className="sfLabLevel"
                        data-basic={result.cheapest.modes[s] === 1 || undefined}
                      >
                        {result.cheapest.modes[s]}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </ScrollStatusArea>
            <Text size="xs" c="dark.2" px={16} py={12}>
              Chance is how often you reach {goal} ★ before running out of
              spares. Exp. cost is the average spend if you keep going until{' '}
              {goal} ★. Modes only exist for 15–21 ★, so higher stars always
              risk a boom. Some plans look uneven on purpose: the optimizer
              takes boom risk where it&apos;s cheapest.
            </Text>
          </div>
        </>
      )}
    </div>
  )
}
```

Append to `src/index.css` (after the Star Force calculator section):

```css
/* --- Star Force Lab ----------------------------------------------------- */

/* Lab tables grow with their rows instead of sharing the column's height. */
.sfLabResults .sfTableCard {
  flex: none;
}

/* The selected spare count in the options table. */
.sfTable tbody tr[data-selected] {
  background: var(--mantine-color-sage-light);
}

.sfTable .sfLabMode {
  text-align: left;
  font-family: var(--mantine-font-family);
  font-weight: 600;
  color: var(--mantine-color-sage-3);
}

.sfTable .sfLabLevel {
  text-align: center;
  font-weight: 600;
}

/* Level 1 is the default, so it steps back and the modes in use stand out. */
.sfTable [data-basic] {
  color: var(--mantine-color-dark-3);
}

.sfTable .sfLabMiss {
  text-align: left;
  font-family: var(--mantine-font-family);
  color: var(--mantine-color-orange-3);
}

.sfLabPick {
  font-weight: 600;
  color: inherit;
}

.sfInfo {
  display: inline-flex;
  color: var(--mantine-color-dark-2);
  cursor: help;
}

/* Read-only mirror of the Target star field, styled like it. */
.sfTargetMirror {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 92px;
  padding: 0 12px;
  border: 1px solid var(--mantine-color-sage-8);
  border-radius: var(--mantine-radius-md);
  background: var(--mantine-color-dark-6);
}

/* Brief highlight when the Lab sends you to the Target star field. */
.sfNumInput[data-flash] {
  box-shadow: 0 0 0 3px var(--mantine-color-sage-light);
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/components/StarForceLab.test.jsx`
Expected: PASS.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add src/lib/format.js src/components/StarForcePanel.jsx src/components/StarForceLab.jsx src/components/StarForceLab.test.jsx src/index.css
git commit -m "feat: add the Star Force Lab results view"
```

---

### Task 5: Calculator | Lab switch in the Star Force page

**Files:**

- Modify: `src/components/StarForcePanel.jsx`, `src/index.css`
- Test: `src/components/StarForcePanel.test.jsx`

**Interfaces:**

- Consumes: `StarForceLab` (Task 4).
- Produces: `export default function StarForcePanel({ view = 'calculator', onViewChange })` — `view` is `'calculator' | 'lab'`; `onViewChange(view)` is called by the switch.

- [ ] **Step 1: Write the failing tests** — append to `src/components/StarForcePanel.test.jsx` (add `useState` from `react`, `optimizeModes` from `@/lib/optimizer`, and `pct` from `@/lib/format` to the imports):

```jsx
function Harness({ initial = 'calculator' }) {
  const [view, setView] = useState(initial)
  return <StarForcePanel view={view} onViewChange={setView} />
}

function renderHarness(initial) {
  return render(
    <MantineProvider>
      <Harness initial={initial} />
    </MantineProvider>,
  )
}

describe('Lab view', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete window.IntersectionObserver
    delete navigator.clipboard
  })

  it('keeps the inputs and hides calculator-only settings', () => {
    renderHarness()
    fill('Item level', '160')
    fireEvent.click(screen.getByRole('tab', { name: 'Lab' }))
    expect(screen.queryByLabelText('Safeguard')).not.toBeInTheDocument()
    expect(screen.queryByText('Enhancement mode')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Simulation runs')).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Your plan' })).toBeInTheDocument()
    expect(screen.getByLabelText('Item level').value).toBe('160')

    fireEvent.click(screen.getByRole('tab', { name: 'Calculator' }))
    expect(screen.getByText('Enhancement table')).toBeInTheDocument()
    expect(screen.getByLabelText('Item level').value).toBe('160')
  })

  it('ignores Safeguard and the mode left on in the calculator', () => {
    renderHarness()
    fireEvent.click(screen.getByLabelText('Safeguard'))
    fireEvent.click(screen.getByText('Level 3'))
    fireEvent.click(screen.getByRole('tab', { name: 'Lab' }))
    const row = optimizeModes(
      200,
      0,
      22,
      {
        starCatch: true,
        mvp: 'none',
        eventShining: false,
        eventPlusOne: false,
      },
      0.9,
    ).rows[2]
    expect(
      screen.getAllByText(formatMeso(Math.round(row.cost))).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(pct(row.chance)).length).toBeGreaterThan(0)
  })

  it('sends the Target box to the Target star field', () => {
    renderHarness('lab')
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
    fireEvent.click(screen.getByRole('button', { name: /Target star 22/ }))
    const field = screen.getByLabelText('Target star')
    expect(scrollIntoView).toHaveBeenCalled()
    expect(document.activeElement).toBe(field)
    expect(field).toHaveAttribute('data-flash')
  })

  it('copies a Lab link', () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderHarness('lab')
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/lab?lv=200&from=0&to=22&sc=1&sg=0&mode=1&mvp=none&shine=0&plus=0&runs=3000&sp=2&ch=90`,
    )
  })

  it('opens straight into the Lab without the phone bar, and re-arms it later', () => {
    const observe = vi.fn()
    window.IntersectionObserver = class {
      observe = observe
      disconnect() {}
    }
    renderHarness('lab')
    expect(observe).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: /full breakdown/i, hidden: true }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Calculator' }))
    expect(observe).toHaveBeenCalledWith(document.querySelector('.sfHero'))
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/StarForcePanel.test.jsx -t "Lab view"`
Expected: FAIL (no `Lab` tab).

- [ ] **Step 3: Implement** — in `src/components/StarForcePanel.jsx`:

Add `import StarForceLab from './StarForceLab'`. Above the component:

```js
// The page's two views. Each has its own address; App owns the URL.
const VIEWS = [
  { value: 'calculator', label: 'Calculator', path: '/' },
  { value: 'lab', label: 'Lab', path: '/lab' },
]
```

Change the signature to `export default function StarForcePanel({ view = 'calculator', onViewChange }) {` and add right after it:

```js
const lab = view === 'lab'
```

Destructure `spares` and `chance` from `inputs` too.

Phone-bar effect — guard the missing hero and re-arm per view:

```js
useEffect(() => {
  // The Lab has no result cards to watch (and no bar).
  if (typeof IntersectionObserver === 'undefined' || !heroRef.current) return
  const observer = new IntersectionObserver(
    ([entry]) =>
      setBarVisible(!entry.isIntersecting && entry.boundingClientRect.top > 0),
    { rootMargin: `0px 0px -${BAR_CLEARANCE}px 0px` },
  )
  observer.observe(heroRef.current)
  return () => observer.disconnect()
}, [lab])
```

Target jump (below `showResults`):

```js
// The Lab's Target box sends you here: the star fields only live in Inputs.
const targetRef = useRef(null)
const flashTimer = useRef(null)
function editTarget() {
  const field = targetRef.current
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  field.scrollIntoView({
    behavior: reduce ? 'auto' : 'smooth',
    block: 'center',
  })
  field.focus({ preventScroll: true })
  field.dataset.flash = ''
  clearTimeout(flashTimer.current)
  flashTimer.current = setTimeout(() => delete field.dataset.flash, 1500)
}
```

Skip calculator work in the Lab — the `run` and `sim` memos become:

```js
const run = useMemo(
  () => (rangeValid && !lab ? expectedRun(level, cur, target, opts) : null),
  [rangeValid, lab, level, cur, target, opts],
)

const sim = useMemo(
  () =>
    rangeValid && !lab
      ? simulateRuns(level, cur, target, opts, {
          runs: Number(runs),
          rng: mulberry32(SIM_SEED),
        })
      : null,
  [rangeValid, lab, level, cur, target, opts, runs],
)
```

Add after `opts`:

```js
// What the Lab exposes; Safeguard and the single mode stay out of it.
const labOpts = useMemo(
  () => ({ starCatch, mvp, eventShining, eventPlusOne }),
  [starCatch, mvp, eventShining, eventPlusOne],
)
```

JSX:

- Wrap the outer `<div>`'s first child with the switch above `.sfLayout`:

```jsx
<div
  className="appTabs sfViewTabs"
  role="tablist"
  aria-label="Star Force views"
>
  {VIEWS.map((v) => (
    <UnstyledButton
      key={v.value}
      component="a"
      href={v.path}
      role="tab"
      aria-selected={view === v.value}
      className="appTab"
      data-active={view === v.value || undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        if (v.value !== view) onViewChange?.(v.value)
      }}
    >
      {v.label}
    </UnstyledButton>
  ))}
</div>
```

- Copy link: `` `${window.location.origin}${lab ? '/lab' : '/'}?${sfInputsToQuery(inputs)}` ``.
- Target star `TextInput`: add `ref={targetRef}`.
- Wrap the Safeguard `SettingRow` and the Enhancement mode `<div>` in `{!lab && (<>…</>)}`; wrap the Simulation runs `<div>` in `{!lab && …}`.
- At the end of the inputs `<Stack>`:

```jsx
{
  lab && (
    <Text size="xs" c="dimmed">
      Same inputs as the Calculator. The optimizer picks the modes.
    </Text>
  )
}
```

- Replace `<div className="sfResults">…</div>` with `{lab ? (<StarForceLab … />) : (<div className="sfResults">…</div>)}` where:

```jsx
<StarForceLab
  level={level}
  cur={cur}
  target={target}
  rangeValid={rangeValid}
  starCap={starCap}
  opts={labOpts}
  sparesRaw={spares}
  chanceRaw={chance}
  targetText={clampRaw(targetRaw, starCap)}
  onSet={set}
  onEditTarget={editTarget}
  emptyMessage={emptyMessage}
/>
```

- Render the phone bar only in the calculator: `{!lab && (<UnstyledButton className="sfBar" …>…</UnstyledButton>)}`.

Append to `src/index.css` in the Lab section:

```css
/* Calculator | Lab switch: the header's pill tabs, sized to their labels. */
.sfViewTabs {
  width: fit-content;
  margin-bottom: 14px;
}
```

- [ ] **Step 4: Run the panel tests**

Run: `npx vitest run src/components/StarForcePanel.test.jsx`
Expected: PASS (old and new).

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/components/StarForcePanel.jsx src/components/StarForcePanel.test.jsx src/index.css
git commit -m "feat: add a Calculator | Lab switch to the Star Force page"
```

---

### Task 6: `/lab` routing

**Files:**

- Modify: `src/App.jsx` (`TABS`, header, navigation, panel props), `vercel.json`, `public/sitemap.xml`
- Test: `src/App.test.jsx`

**Interfaces:**

- Consumes: `StarForcePanel({ view, onViewChange })` (Task 5).

- [ ] **Step 1: Write the failing test** — add to `describe('App', …)` in `src/App.test.jsx` (add `within` to the testing-library import):

```jsx
it('opens the Lab at /lab inside the Star Force tab', () => {
  window.history.replaceState(null, '', '/lab')
  renderApp()
  expect(document.title).toBe('Star Force Lab · Maplet')
  const header = screen.getByRole('tablist', { name: 'Maplet sections' })
  expect(within(header).getAllByRole('tab')).toHaveLength(2)
  const starForce = within(header).getByRole('tab', { name: 'Star Force' })
  expect(starForce).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('table', { name: 'Your plan' })).toBeInTheDocument()

  // Star Force in the header keeps you in the Lab.
  fireEvent.click(starForce)
  expect(window.location.pathname).toBe('/lab')

  // The page's own switch goes to the Calculator, keeping the inputs.
  fireEvent.change(screen.getByLabelText('Item level'), {
    target: { value: '160' },
  })
  fireEvent.click(screen.getByRole('tab', { name: 'Calculator' }))
  expect(window.location.pathname).toBe('/')
  expect(document.title).toBe('Star Force Calculator · Maplet')
  expect(screen.getByLabelText('Item level').value).toBe('160')

  // Back returns to the Lab.
  act(() => {
    window.history.replaceState(null, '', '/lab')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  expect(screen.getByRole('table', { name: 'Your plan' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/App.test.jsx -t "Lab"`
Expected: FAIL (title is "Star Force Calculator · Maplet").

- [ ] **Step 3: Implement** — in `src/App.jsx`:

`TABS` becomes:

```js
// Each tab has its own address so it survives a reload and can be shared.
// Star Force is the home page; vercel.json rewrites /planner and /lab to the
// app. The Lab is a view inside the Star Force page (`parent`), so it gets an
// address but no header tab.
const TABS = [
  {
    value: 'starforce',
    label: 'Star Force',
    path: '/',
    title: 'Star Force Calculator',
  },
  {
    value: 'lab',
    label: 'Lab',
    path: '/lab',
    title: 'Star Force Lab',
    parent: 'starforce',
  },
  { value: 'planner', label: 'Planner', path: '/planner', title: 'Planner' },
]
```

After `const current = …`:

```js
// The header tab that owns the current page (the Lab lives under Star Force).
const section = current.parent ?? current.value
```

Replace `openTab` with:

```js
function go(value) {
  if (value === tab) return
  window.history.pushState(null, '', TABS.find((t) => t.value === value).path)
  setTab(value)
}
```

Header: map over `TABS.filter((t) => !t.parent)`; use `aria-selected={section === t.value}`, `data-active={section === t.value || undefined}`, and in `onClick` replace `openTab(t)` with:

```js
// Clicking the section you're in (Star Force from the Lab)
// keeps you where you are.
if (t.value !== section) go(t.value)
```

Star Force branch (same JSX position for both views, so switching never remounts the panel and the inputs survive):

```jsx
<StarForcePanel
  view={tab === 'lab' ? 'lab' : 'calculator'}
  onViewChange={(v) => go(v === 'lab' ? 'lab' : 'starforce')}
/>
```

`vercel.json` `rewrites` becomes:

```json
  "rewrites": [
    { "source": "/planner", "destination": "/index.html" },
    { "source": "/lab", "destination": "/index.html" }
  ]
```

`public/sitemap.xml`: add `<url><loc>https://maplet.dev/lab</loc></url>` after the planner line.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/App.test.jsx vercel.json public/sitemap.xml
git commit -m "feat: serve the Star Force Lab at /lab"
```

---

### Task 7: Docs and a real-browser check

**Files:**

- Modify: `README.md` (Features, Shareable pages, Tech stack, How it works, Status / scope), `CLAUDE.md` (Architecture: Lab view + `/lab` rewrite; Project structure: `lib/optimizer.js`)

- [ ] **Step 1: README** — add a Features bullet after the Star Force calculator one:

```md
- **Star Force Lab** — a **Calculator | Lab** switch at the top of the Star Force page opens the Lab ([maplet.dev/lab](https://maplet.dev/lab)), which uses the same inputs (Safeguard, Enhancement mode and simulation runs are hidden there). Enter how many **spares** you have (booms you can afford, 0–10) and the **chance** you want (at least 50/75/90/95/99%), and it finds the cheapest Enhancement Mode level for each star from 15 to 21 that reaches your target that often: the plan's expected cost and chance, a **Your plan** table (mode, success, boom and cost per attempt for each star), and an **Every option** table with the cheapest plan for every spare count from 0 to 10 plus "No limit" (click a row to see its plan). When no plan can reach your chance, it shows the best one possible. It checks every plan exactly (closed-form cost, exact chance with a limited number of booms); a plan uses one level per star and doesn't change as you use spares. Lab links and saved setups carry the spares and chance too.
```

In **Shareable pages**, mention `maplet.dev/lab`. In **Tech stack**, `vercel.json` serves the app at `/planner` and `/lab`. In **How it works**, Pages: the Lab is a view of the Star Force tab at `/lab`; add "The Lab's optimizer is `lib/optimizer.js` (pure; brute force over the 4⁷ per-star mode plans with an exact boom-limited chance DP), shown by `components/StarForceLab.jsx`." In **Status / scope**, add the Lab to what the MVP covers.

- [ ] **Step 2: CLAUDE.md** — in Architecture, after the Star Force sentence: "The Star Force page has a **Calculator | Lab** switch; the Lab (`StarForceLab`, optimizer in `lib/optimizer.js`) is at `/lab`, a `TABS` entry with `parent: 'starforce'` (no header tab)." Update the vercel.json sentence to mention the `/lab` rewrite.

- [ ] **Step 3: Full checks**

Run: `npm run lint && npm test && npm run build`
Expected: all pass.

- [ ] **Step 4: Real-browser check** — `npm run dev`, open `http://localhost:5173/lab` directly (no crash), switch views, change Spares/Chance, click an option row, click the Target box, try a 0→25★ target, try Lv.120, and check phone width (390px).

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: document the Star Force Lab"
```
