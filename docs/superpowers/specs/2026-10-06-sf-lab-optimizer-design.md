# Star Force Lab: mode optimizer

Date: 2026-10-06 · Branch: `feat/sf-lab-optimizer` (off `feat/sf-share-link`, which it builds on)
Mockup: https://claude.ai/artifact/FGU4BU11Z8cU77DqmHUDZc (Lab page artboard, real numbers)

## Goal

Answer "which Enhancement Mode should I use at each star, given how many booms I can afford?"
The user sets **spares** (booms they can afford) and the **chance** they want; the Lab shows the
cheapest mode plan that reaches the target star at least that often, plus a table of every
option so they can compare spare counts.

The calculator itself is unchanged. The optimizer lives in a separate **Lab** view.

## Decisions (user-approved)

- **Placement:** a `Calculator | Lab` switch at the top of the Star Force page. Lab has its own
  address, `/lab`. The header keeps two tabs (Star Force, Planner); Star Force stays highlighted
  in Lab.
- **Shared inputs:** Calculator and Lab use the same inputs object. Switching keeps the item.
  Saved setups and Copy link work in both.
- **Lab hides** Safeguard, Enhancement mode and Simulation runs (the optimizer picks modes; Lab
  runs no simulation). Their values are kept, only hidden.
- **Lab controls:** plain labeled fields, no sentence UI:
  - **Spares**: number field (no −/+), 0–10.
  - **Chance** ("at least"): dropdown 50 / 75 / 90 / 95 / 99%.
  - **Target**: read-only box mirroring the Target star input, with an ⓘ tooltip ("Change the
    target star in Inputs. Click the box to jump there."). Clicking the box scrolls to and focuses
    the Target star input and briefly highlights it.
- **A plan** = one mode level per star from 15 to 21. It does not change as spares run out.
- **Visual rule:** stick with what is already in the app. Reuse existing components and classes
  (Mantine fields at the calculator's sizes, `.sfTable`, `.sfHero*`, `.sfEyebrow`, Tooltip). No new
  control shapes, chips or meters.

## Math

All pure functions, no React.

### Per-star modes in the engine (`lib/starforce.js`)

`attemptOdds` and `attemptCost` read the mode as `opts.modes?.[star] ?? opts.mode ?? 1`. Every
existing caller passes `mode` only, so nothing changes for them. `expectedRun(level, from, to,
{ ...opts, modes })` then gives a plan's expected cost and booms with no new code.

### Optimizer (`lib/optimizer.js`, new)

`optimizeModes(level, fromStar, toStar, opts, { chance, maxSpares = 10 })` returns:

```js
{
  stars,          // mode stars the climb can touch, e.g. [15, …, 21]; [] = modes don't matter
  rows,           // one per spare count 0..maxSpares:
                  //   { spares, chance, cost, modes } or { spares, unreachable: true }
  cheapest,       // all-Level-1 plan: { cost, chanceBySpares: [...] }
}
```

- **Mode stars:** every star from 15 to 21 below the target. Even a climb that starts above 15★
  can fall back below it: a boom at 15–19★ drops to 12★, and every higher checkpoint leads there.
  A star a plan never actually reaches costs the same at any level, so the tie-break leaves it at
  Level 1.
- **Search:** try every plan (at most 4⁷ = 16,384). For each, compute the expected cost (closed
  form via `expectedRun`) and the chance per spare count (below). Per spare count, keep the
  cheapest plan whose chance meets the target. If nothing meets it, the row is `unreachable`.
  Ties go to the first plan in enumeration order (all-Level-1 first). Precompute odds/costs per
  star per mode once per call.
- **Chance with N spares:** P(reach target with at most N booms), exact, by DP over (star,
  booms left). With p = success, b = boom at star s, c = its checkpoint:
  `P[k][s] = (p·P[k][s+step] + b·P[k−1][c]) / (p + b)`, `P[k][target] = 1`, `P[−1][·] = 0`.
  Solve layer k = 0..N, stars top-down (c < s, so `P[k−1][c]` is already known). `step` is 2 for
  1+1-event attempts, as in `expectedRun`.
- **Expected cost** = average meso to reach the target if you keep going (ignores the spare
  limit), identical to the calculator's Expected cost for the same modes.
- **Speed:** measured ~70 ms on a laptop for 0→22★ with 6 spare counts. Run in `useMemo` keyed on
  the inputs. `// ponytail: main-thread brute force; move to a Web Worker if phones lag.`

Safeguard is not a separate option: Level 4 at 15–17★ is Safeguard (same odds and cost).

## UI

### Routing (`App.jsx`, `vercel.json`)

- Add a `lab` entry to `TABS` (`path: '/lab'`, `title: 'Star Force Lab'`) marked as a Star Force
  sub-view, so the header doesn't render it and highlights Star Force. The existing
  pushState/popstate/title code handles it.
- `StarForcePanel` gets `view` (`'calculator' | 'lab'`) and `onViewChange` props.
- `vercel.json`: add a `/lab` rewrite to `/index.html`.

### Star Force page (`StarForcePanel.jsx`)

- The `Calculator | Lab` switch sits above the two columns, in the header tabs' style
  (`.appTabs` / `.appTab`).
- Inputs card: unchanged, except in Lab it hides Safeguard, Enhancement mode and Simulation runs
  and adds a one-line note ("Same inputs as the Calculator. The optimizer picks the modes.").
- Right column: the existing results in Calculator view, `<StarForceLab …/>` in Lab view.
- The phone results bar (`.sfBar`) is hidden in Lab view.
- Copy link copies the current view's address (`/` or `/lab`) plus the query.
- The Target star input gets a ref so Lab's "jump to target" can scroll to it
  (`behavior: 'smooth'` unless reduced motion), focus it, and flash a highlight for ~1.5 s.

### Lab results (`components/StarForceLab.jsx`, new)

Top to bottom, matching the mockup:

1. **Controls + summary card** (hero card style): Spares, Chance, Target fields; then Expected cost
   and Chance to reach N★ for the selected row; then the comparison line: "All Level 1 is cheapest
   at X, but with N spares it reaches N★ only Y% of the time."
2. **Your plan** (`.sfTable`): Star (15 → 16) · Mode (Level N) · Success · Boom (— when 0) · Cost /
   attempt, for the selected row's plan, mode stars only.
3. **Every option at Y%** (`.sfTable`): rows for spares 0–10 plus **No limit** (all Level 1, 100%).
   Columns: Spares · Chance · Exp. cost · one column per mode star with its level (Level 1
   dimmed). The row matching the Spares field is highlighted. Clicking a row's spare-count
   button sets Spares. Unreachable rows read "Can't reach Y%".
4. **Footnote:** what Chance and Exp. cost mean, that modes only exist for 15–21★, and that uneven
   plans are on purpose.

### Inputs model (`lib/storage.js`)

- `SF_DEFAULTS` gains `spares: '2'` and `chance: '90'`. `normalizeSfInputs` repairs them (spares
  digits 0–10, chance one of the five options).
- `SHARE_PARAMS` gains `sp` → spares and `ch` → chance, so Lab links carry them. Every link still
  includes all params, as decided for PR #21.
- Saved setups store them automatically (a setup saves every input).

### Empty and edge states

- No valid range (same cases as the calculator): reuse the calculator's empty message.
- No mode stars (target ≤ 15★): "Modes only matter from 15 ★ up. Set a target above 15 ★."
- Targets above 22★ can't avoid booms, so low-spare rows may be unreachable. That is expected
  and shown per row.
- Events and MVP apply exactly as in the calculator.

## Testing

- `lib/starforce.test.js`: `modes` overrides `mode` per star in `attemptOdds`/`attemptCost`;
  existing results unchanged.
- `lib/optimizer.test.js`:
  - the all-Level-1 plan's cost equals `expectedRun` with mode 1;
  - chance DP matches a seeded Monte Carlo within tolerance on one range;
  - mockup spot-check: Lv.200, 0→22★, Star Catch, 90%, 2 spares → 90.6%, ≈55.9b,
    modes `[4, 3, 4, 3, 1, 4, 4]`;
  - all Level 4 reaches 22★ at 100% with 0 spares;
  - target ≤ 15★ → `stars` is empty;
  - a row the target can't reach is `unreachable`;
  - a 22→24★ climb still lists 15–21★ as mode stars (re-climbs after a boom).
- `lib/storage.test.js`: defaults and repair for `spares`/`chance`; `sp`/`ch` query round-trip.
- `StarForcePanel.test.jsx`: switching to Lab hides Safeguard/mode/runs, shows the plan table;
  clicking an option row updates Spares; Target box focuses the Target star input.
- `App.test.jsx`: `/lab` opens Star Force with the Lab view.

## Docs

Update `README.md` in the same change: Features (Lab / mode optimizer), routes (`/lab`), and the
Status / scope section. The footer's "community-sourced" provenance note covers Lab too (same
mode tables).

## Out of scope

- Applying a plan to the calculator, or per-star mode inputs in the calculator.
- Plans that change modes as spares run out.
- Pricing a spare in meso.
- A phone results bar for Lab.
- More Lab experiments (luck chart etc.): each gets its own spec.
