# Star Force Lab: mode optimizer

Date: 2026-10-06 · Branch: `feat/sf-lab-optimizer` (off `feat/sf-share-link`, which it builds on)
Mockup: https://claude.ai/artifact/FGU4BU11Z8cU77DqmHUDZc (Lab page artboard, real numbers)
Revised after an independent review (same day): math confirmed; integration fixes folded in.

## Goal

Answer "which Enhancement Mode should I use at each star, given how many booms I can afford?"
The user sets **spares** (booms they can afford) and the **chance** they want; the Lab shows the
cheapest mode plan that reaches the target star at least that often, plus a table of every
option so they can compare spare counts.

The calculator itself is unchanged. The optimizer lives in a separate **Lab** view.

## Decisions (user-approved)

- **Placement:** a `Calculator | Lab` switch at the top of the Star Force page. Lab has its own
  address, `/lab`. The header keeps two tabs (Star Force, Planner); Star Force stays highlighted
  in Lab, and clicking it while in Lab does nothing (you stay in Lab).
- **Shared inputs:** Calculator and Lab use the same inputs object. Switching keeps the item.
  Saved setups and Copy link work in both.
- **Lab hides** Safeguard, Enhancement mode and Simulation runs (the optimizer picks modes; Lab
  runs no simulation). Their values are kept, only hidden, and never affect Lab's math.
- **Lab controls:** plain labeled fields, no sentence UI:
  - **Spares**: number field (no −/+), 0–10.
  - **Chance** ("at least"): dropdown 50 / 75 / 90 / 95 / 99%.
  - **Target**: read-only box mirroring the Target star input, with an ⓘ tooltip ("Change the
    target star in Inputs. Click the box to jump there."). Clicking the box scrolls to and focuses
    the Target star input and briefly highlights it.
- **A plan** = one mode level per star from 15 to 21. It does not change as spares run out.
- **Can't reach:** a spare count with no plan meeting the chance shows "Can't reach 90% · best
  52.8%" (the highest chance any plan gets with that many spares).
- **Saved setups** store Spares and Chance like every other input. Changing either (including by
  clicking an option row) marks a loaded setup "Edited". Accepted.
- **Visual rule:** stick with what is already in the app. Reuse existing components and classes
  (Mantine `TextInput`/`Select`/`Tooltip` at the calculator's sizes, `.sfTable`, `.sfHero*`,
  `.sfEyebrow`, `.appTabs`). No new control shapes, chips or meters.

## Math

All pure functions, no React.

### Per-star modes in the engine (`lib/starforce.js`)

`attemptOdds` and `attemptCost` read the mode as `opts.modes?.[star] ?? opts.mode ?? 1`.
`modes` is always **keyed by star number** (`{ 15: 4, 16: 3, … }`), everywhere in this feature.
Every existing caller passes `mode` only, so nothing changes for them. The existing Safeguard
branch still wins when `safeguard` is on; Lab never turns it on (see below).

### Optimizer (`lib/optimizer.js`, new)

`optimizeModes(level, fromStar, toStar, opts, chance)`, where `opts` is
`{ starCatch, mvp, eventShining, eventPlusOne }` only and `chance` is a fraction (`0.9`).
The caller builds `opts` from those four inputs, so hidden Safeguard/mode values can't leak in.
Spares range is a module constant, `MAX_SPARES = 10`. Returns:

```js
{
  target,         // toStar clamped to the level's star cap and 30★, as expectedRun does
  stars,          // mode stars: 15..min(21, target − 1); [] = modes don't matter
  rows,           // one per spare count 0..10:
                  //   reachable:   { spares, chance, cost, modes }
                  //   unreachable: { spares, unreachable: true, best: { chance, cost, modes } }
  cheapest,       // cheapest plan overall (the "No limit" row): { cost, modes, chanceBySpares }
}
```

- **Mode stars:** every star from 15 to 21 below the (clamped) target. Even a climb that starts
  above 15★ can fall back below it: a boom at 15–19★ drops to 12★, and every higher checkpoint
  leads there (verified for `BOOM_RESET_STARS`, with and without events). A star a plan never
  reaches ties exactly, so the tie-break leaves it at Level 1.
- **Tables first:** build per-star, per-mode success/boom/cost tables once per call (from
  `attemptOdds`/`attemptCost` with `modes`). Everything below reads only these tables.
- **Search:** try every plan (at most 4⁷ = 16,384). For each:
  - **Expected cost**, with the same recurrence as `expectedRun`, inlined over the tables:
    `e_s = (C_s + b_s · Σ e_k for k in [c_s, s)) / p_s`, summed over the climb's stars. This is the
    average meso to reach the target if you keep going (ignores the spare limit), identical to
    the calculator's Expected cost for the same modes.
  - **Chance with N spares** = P(reach target with at most N booms), exact, by DP over (star,
    booms left). With p = success, b = boom at star s, c = its checkpoint:
    `P[k][s] = (p·P[k][s+step] + b·P[k−1][c]) / (p + b)`, `P[k][target] = 1`, `P[−1][·] = 0`.
    Solve k = 0..10, stars top-down (c < s, so `P[k−1][c]` is already known). `step` is 2 for
    1+1-event attempts, as in `expectedRun`.
  - Per spare count, keep the cheapest plan whose chance meets `chance`, and separately the
    highest-chance plan (cheapest among equals) for the `best` fallback. Track the cheapest plan
    overall for `cheapest`. Ties go to the first plan in enumeration order (all Level 1 first).
- **Speed:** with the inlined tables the reviewer measured 19–27 ms on an Apple M4 for 0→22★ and
  0→30★ with 11 spare counts (vs ~110–140 ms calling `expectedRun` per plan). The panel runs it in
  a `useMemo` keyed on level, current, target, starCatch, mvp, eventShining, eventPlusOne and
  chance. **Not** spares: spares only picks a row.
  `// ponytail: main-thread brute force; move to a Web Worker if phones lag.`

Safeguard is not a separate option: Level 4 at 15–17★ is Safeguard (same odds, same additive
+200% cost; confirmed in `attemptOdds`/`attemptCost`).

## UI

### Routing (`App.jsx`, `vercel.json`, `public/sitemap.xml`)

- Add `{ value: 'lab', path: '/lab', title: 'Star Force Lab', parent: 'starforce' }` to `TABS`.
- Header: render only entries without `parent`; a tab is active when `tab === t.value` or the
  current entry's `parent === t.value`. `openTab` returns early when the clicked tab is the
  current tab **or** its parent (so Star Force does nothing while in Lab).
- pushState / popstate / document title already work per `TABS` entry.
- `StarForcePanel` gets `view` (`'calculator' | 'lab'`) and `onViewChange` props. App renders one
  `<StarForcePanel>` for both views (same element position) so switching never remounts it and
  the inputs survive.
- `vercel.json`: add a `/lab` rewrite to `/index.html`. `public/sitemap.xml`: add `/lab`.

### Star Force page (`StarForcePanel.jsx`)

- The `Calculator | Lab` switch sits above the two columns, reusing the header tabs' markup and
  classes (`.appTabs` / `.appTab`).
- Inputs card: unchanged, except in Lab it hides Safeguard, Enhancement mode and Simulation runs
  and adds a one-line note ("Same inputs as the Calculator. The optimizer picks the modes.").
- Right column: the existing results in Calculator view, `<StarForceLab …/>` in Lab view.
- Calculator-only work is skipped in Lab: `expectedRun` / `simulateRuns` memos return `null` when
  `view === 'lab'` (the simulation alone is ~55 ms at 20,000 runs).
- **Phone results bar fix:** the bar's IntersectionObserver effect depends on `view` and does
  nothing when the hero ref is null. Today it calls `observe(heroRef.current)` once on mount
  with no null check, so a direct `/lab` load (no hero card) would throw and blank the app, and
  switching views would leave it watching a removed element. The bar is hidden in Lab.
- Copy link copies the current view's address (`/` or `/lab`) plus the query.
- The Target star input gets a ref so Lab's "jump to target" can scroll to it
  (`behavior: 'smooth'` unless reduced motion), focus it, and flash a highlight for ~1.5 s.

### Lab results (`components/StarForceLab.jsx`, new)

Top to bottom, matching the mockup:

1. **Controls + summary card** (hero card style): Spares, Chance, Target fields; then the
   selected row's Expected cost and Chance to reach N★; then one comparison line:
   - plan uses modes: "The cheapest plan costs X, but with N spares it reaches N★ only Y% of
     the time."
   - the cheapest plan already meets the chance: "No modes needed: the cheapest plan reaches
     N★ Y% of the time with N spares."
   - selected row unreachable: the stats show the `best` plan's cost and chance, headed "Can't
     reach 90% with N spares. Best possible:".
2. **Your plan** (`.sfTable`): Star (15 → 16) · Mode (Level N) · Success · Boom (— when 0) · Cost /
   attempt, for the selected row's plan (or its `best` plan when unreachable).
3. **Every option at Y%** (`.sfTable`): rows for spares 0–10 plus **No limit** (the `cheapest`
   plan, 100%). Columns: Spares · Chance · Exp. cost · one column per mode star with its level
   (Level 1 dimmed). The row matching the Spares field is highlighted. Clicking a row's
   spare-count button sets Spares. Unreachable rows read "Can't reach Y% · best Z%" across the
   Chance/cost columns, with the best plan's levels in the star columns.
4. **Footnote:** what Chance and Exp. cost mean, that modes only exist for 15–21★, and that uneven
   plans are on purpose.

Field details: Spares is a `TextInput` with `clampRaw(digits(v), 10)` like the other number
fields; an empty Spares field selects the 0-spares row. Chance is a `Select` (40px / 16px, like
MVP tier).

### Inputs model (`lib/storage.js`)

- `SF_DEFAULTS` gains `spares: '2'` and `chance: '90'` (whole-percent string; the panel divides by
  100 for the optimizer). `normalizeSfInputs` repairs them (spares digits ≤ 10, chance one of
  `'50' '75' '90' '95' '99'`).
- `SHARE_PARAMS` gains `sp` → spares and `ch` → chance, so Lab links carry them. Every link still
  includes all params, as decided for PR #21.
- Old setups and links without `sp`/`ch` load with the defaults.

### Empty and edge states

- No valid range (same cases as the calculator): reuse the calculator's empty message.
- No mode stars, using the **clamped** target:
  - item caps at 15★ or below (`maxStarForLevel(level) <= 15`): "Enhancement Modes start at 15 ★.
    A Lv.{level} item caps at {cap} ★, so there's nothing to optimize."
  - otherwise (target ≤ 15★): "Modes only matter from 15 ★ up. Set a target above 15 ★."
- High targets can make **every** row unreachable (even 10 spares at all Level 4 reach 25★ only
  ~53%, 26★ ~24%, 27★ ~7%, 30★ ~0%). Each row then shows its best chance, as above.
- Events and MVP apply exactly as in the calculator.

## Testing

- `lib/starforce.test.js`: `modes` (keyed by star) overrides `mode` per star in
  `attemptOdds`/`attemptCost`; existing results unchanged.
- `lib/optimizer.test.js`:
  - the inlined cost equals `expectedRun` with the same `modes` for a few plans;
  - chance DP on a hand-checkable case: 15→16★, P₀ = p/(p+b), P₁ = (p + b·P₀)/(p+b) (12–14★
    can't boom);
  - mockup spot-check: Lv.200, 0→22★, Star Catch, 0.9, 2 spares → 90.6%, ≈55.9b,
    modes `{15:4, 16:3, 17:4, 18:3, 19:1, 20:4, 21:4}`;
  - `cheapest` is all Level 1 for the spot-check setup (pins the current finding);
  - all Level 4 reaches 22★ at 100% with 0 spares;
  - target ≤ 15★ and a Lv.120 item (cap 15★) → `stars` is empty;
  - an unreachable row carries `best` (e.g. Lv.200, Star Catch, 0→25★ at 0.9: every row
    unreachable, 10-spare best ≈ 52.8%; confirm the exact figure when writing the test);
  - a 22→24★ climb still lists 15–21★ as mode stars;
  - hidden settings don't leak: the panel's Lab results are the same with Safeguard on/off and any
    mode selected.
- `lib/storage.test.js`: defaults and repair for `spares`/`chance`; `sp`/`ch` query round-trip;
  update the hard-coded share query strings (`storage.test.js` ~L367-368).
- `StarForcePanel.test.jsx`: switching to Lab hides Safeguard/mode/runs and shows the plan table;
  switching views keeps the inputs; clicking an option row updates Spares; the Target box focuses
  the Target star input; rendering `view="lab"` then `"calculator"` with the stubbed
  IntersectionObserver doesn't throw; update the hard-coded share link (~L250).
- `App.test.jsx`: `/lab` opens Star Force (highlighted) with the Lab view; clicking Star Force
  there stays in Lab.

## Docs

Update `README.md` in the same change: Features (Lab / mode optimizer), routes (`/lab`), and the
Status / scope section. The footer's "community-sourced" provenance note covers Lab too (same
mode tables).

## Out of scope

- Applying a plan to the calculator, or per-star mode inputs in the calculator.
- Plans that change modes as spares run out.
- Pricing a spare in meso.
- A phone results bar for Lab.
- Showing Spares/Chance in the saved-setup summary tags.
- More Lab experiments (luck chart etc.): each gets its own spec.
