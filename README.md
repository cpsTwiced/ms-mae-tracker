# Maplet

A personal **Global MapleStory (GMS) Star Force calculator and weekly tracker**, live at [maplet.dev](https://maplet.dev). Price a Star Force climb, and track your weekly bosses and weekly content per character (modeled on the in-game _Maple Planner_), with live countdowns to each reset. Runs entirely in your browser — no backend, no login.

## Features

- **Per-character tracking** — add up to **6** characters (name — capped at the 12-character GMS limit — level 1–300, job, server). Each character has its own independent boss and weekly lists. The **Characters** pane at the top is a single horizontally-scrolling row of fixed-width tiles, one per character, each showing the name, `Lv.`, job, and a progress bar with an `X/Y done` count across that character's boss + weekly tasks. When the tiles are wider than the pane the row scrolls sideways — drag the scrollbar (styled to match the other panes), swipe, or use the mouse wheel. Click a tile to switch to it (the active one is highlighted); hover a tile for its drag handle (left) and ⋮ menu (right, **Edit / Delete character**). An **Add Character** tile rides at the end of the row; once you hit the 6-character cap it stays visible but is disabled, with a tooltip explaining the limit.
- **Boss Content** — pick bosses and difficulties from an Edit modal (one checkbox per difficulty), laid out like the in-game planner: each boss is its own row with a portrait, name, and level. The modal is split into **Weekly** and **Monthly** sections — weekly bosses (ordered by entry level) and the monthly Black Mage. Daily bosses (Horntail, Gollux) are excluded. Difficulty pills use the in-game palette (Easy/Normal/Hard/Chaos/Extreme), with Chaos and Extreme as dark pills to match the game. The same pills appear on tracked entries; tracked entries are added or removed through the Edit modal. Each boss can only be tracked at **one** difficulty (you can only clear a boss once per reset) — picking a different difficulty swaps the boss over to it (deselecting the previous one), so you don't have to uncheck first.
- **Weekly Content** — track weekly activities, grouped into **Content** (Monster Park Extreme, Epic Dungeon, Erda Spectrum, Hungry Muto, Midnight Chaser, Spirit Savior, Ranheim Defense, Esfera Guardian), **Guild** (Culvert, Flag Race), and **Quest** (Erda's Request). The same sections appear in the panel and the Edit modal. Both Edit modals (boss and weekly) have an **Unselect All** button that clears the list in one click.
- **Timers** — live countdowns to the daily, standard weekly (Thursday), and event weekly (Wednesday) resets, each shown in **your local time** with a tooltip listing what that reset covers. A fourth row tracks **Ursus Golden Time** (2x mesos, twice daily): while a window is active it shows a gold "2x now" badge, "2x mesos until <time>", and a gold countdown labeled **ends in**; otherwise it shows the next window's start time and a countdown labeled **starts in**.
- **Desktop planner layout** — a full-width **character pane** (the horizontally-scrolling row of character tiles) tops the app, with Weekly Content and Boss Content below it in equal-height columns with shorter, internally scrolling panes and shared modal/pane scroll indicators only when scrolling is needed, so the page keeps visible background below the tracker. An empty list shrinks to fit instead of stretching into a tall blank pane.
- **Phone planner layout** — on phones and narrow screens the panes stack with the checklists first: **Weekly Content**, **Boss Content**, then **Timers** at the bottom.
- **Drag-to-reorder** — boss entries can be sorted with the panel's Reorder toggle, and character tiles reorder through the drag handle that appears on hover (on touch devices, on the selected tile). Weekly content stays in catalog order within each section.
- **Auto-reset** — checked items automatically uncheck when their reset passes. Weekly bosses and weekly content clear on the Thursday reset; the monthly boss (Black Mage) clears on the 1st of the month, independently.
- **Shareable pages** — each tab has its own address: [maplet.dev](https://maplet.dev) opens Star Force, [maplet.dev/lab](https://maplet.dev/lab) opens the Star Force Lab, and [maplet.dev/planner](https://maplet.dev/planner) opens the Planner, so reloads, bookmarks, and the browser's back/forward buttons keep you on the same page (the old `/starforce` address forwards to the home page). Links pasted into Discord and similar apps show a description and preview image, the site ships a `robots.txt` and `sitemap.xml`, and the default `ms-mae-tracker.vercel.app` address redirects to maplet.dev.
- **Saved in your browser** — everything persists in localStorage and shows a warning if the browser cannot save a change. Planner data stays synchronized across open tabs; saved Star Force setups show up in other tabs after a refresh.
- **Star Force calculator** — the home page (top-level tabs **Star Force | Planner**), which prices taking one item from its current star to a target. Enter the item level (with 150/160/200/250 quick pills) and a current → target star range — inputs clamp to their real maximums (level 300, stars to the item's level-based cap) — then toggle **Safeguard** (15–17★, +200% cost, no booms), the v.269 **Enhancement Modes 1–4** (higher modes boom less but cost more; modes 2–4 also lower success on 18–21★), an **MVP tier** discount, and the two current GMS events — **Shining Star Force** (30% off cost + 30% fewer booms up to 22★) and **1+1 Star Force** (+1★ per success under 11★, caps at 12★), independently toggleable and stackable. Results show the exact expected cost and boom count (closed-form math over the official v.269 rates, including boom-checkpoint re-climbs), expected attempts, a seeded-simulation **median** and **unlucky (top 10%)** run (for extreme climbs near 29–30★, where a single run averages millions of attempts, the simulation is replaced by labeled analytic estimates), and a per-star enhancement table (success/boom odds, cost per attempt, expected cost and booms per step; on phones it drops the cost-per-attempt and expected-booms columns so it fits without sideways scrolling). On phones, where the results sit below the inputs, a bar pinned to the bottom of the screen mirrors the expected cost and booms while the result cards are still out of view; tap it to jump to the full breakdown, and it slides away once the cards are on screen. Inputs default to a Lv.200 item going 0★ → 22★ and aren't persisted themselves, but you can keep up to 30 named **saved setups** (every input, events and MVP tier included) and load them from the **Saved setup** picker, where each entry shows its level, star range and any non-default settings (picking the loaded setup again discards unsaved edits). **Save** stores the current inputs as a new setup; the ⋮ menu can **Update** the loaded setup in place (instant, with a brief "Updated" note; an "Edited" tag shows when the inputs have changed since loading), **Rename** it, **Reorder** all setups by dragging, or **Delete** it after a confirmation. **Copy link** (next to the Inputs heading) copies a link that carries every input in its address (e.g. `maplet.dev/?lv=200&from=0&to=22&…`), so a setup can be shared without a server; opening it fills the calculator, falls back to defaults for any missing or malformed value, and then clears the settings from the address bar. Rates and costs follow the GMS v.264+ 30★ tables (Enhancement Mode arrived in v.269), and every attempt gets the permanent +5% relative success rate that replaced the Star Catch minigame in v.271; the per-mode tables and boom checkpoints are community-sourced.
- **Star Force Lab** (experimental) — a **Calculator | Lab** switch at the top of the Star Force page opens the Lab ([maplet.dev/lab](https://maplet.dev/lab)), with a short description and a warning that its results are estimates and may change, which uses the same inputs (Safeguard, Enhancement mode and simulation runs are hidden there, and the Lab never uses them). Enter how many **spares** you have (booms you can afford, 0–50) and the **chance** you want (at least 50/75/90/95/99%), and it finds the cheapest Enhancement Mode level for each star from 15 to 21 that reaches your target that often: the plan's expected cost and chance, an **Optimized plan** shown as tiles of star ranges and their mode (stars in a row with the same mode share one tile; Level 4 at 15–17★ is shown as **Safeguard**, which it is; stars past 21 show a dash (no modes there)), and an **Every option** table (fixed height, scrolls when the rows don't fit, with a shadow along the bottom while more rows are below) with the cheapest plan for every spare count from 0 to 10, then only the counts that save at least 1% (and the one you picked), ending at **"N+ spares"** (the point where more spares can't make it cheaper), plus "No limit" (click a row to see its plan; Safeguard shows as a shield icon). The search stops at that N, so it only goes past 10 spares when more spares actually help. It also answers how many spares to bring: leaving Spares empty (**Auto**, the default) shows the plan with the **fewest** spares that reach your chance, and **Other options** cards offer the **fewest-spares** and **cheapest** plans you aren't viewing (more spares can mean a much cheaper plan), each with its cost and what it saves; click a card to switch to it. When no plan can reach your chance, it shows the best one possible. The **Target** box mirrors the calculator's target star; clicking it jumps to that field. It checks every plan exactly (closed-form cost, exact chance with a limited number of booms); a plan uses one level per star and doesn't change as you use spares. Lab links and saved setups carry the spares and chance too.

## Reset Schedule

The app tracks the real GMS reset cadence. Since **v.264** Nexon unified weekly bosses and most standard weekly quests/content onto a single **Thursday** reset. Ongoing Events weekly resets can differ from the standard weekly reset. The in-app timers also show each reset in your local timezone.

| Reset                                     | UTC                    | Eastern                                     |
| ----------------------------------------- | ---------------------- | ------------------------------------------- |
| Daily                                     | 00:00 UTC every day    | 8:00 PM EDT / 7:00 PM EST                   |
| Weekly bosses and standard weekly content | Thursday 00:00 UTC     | Wednesday 8:00 PM EDT / 7:00 PM EST         |
| Ongoing Events weekly resets              | Wednesday 00:00 UTC    | Tuesday 8:00 PM EDT / 7:00 PM EST           |
| Monthly boss (Black Mage)                 | 1st of month 00:00 UTC | Last day of month 8:00 PM EDT / 7:00 PM EST |

The monthly boss reset is applied automatically (Black Mage unchecks on its own schedule) but is not shown as a countdown timer.

**Ursus Golden Time** (not a reset — a recurring 2x-meso window) runs twice daily, **01:00–05:00 UTC** and **18:00–22:00 UTC**, per the community MapleStory Wiki / DigitalTQ guides (there is no official GMS listing). The Timers card shows it in your local time.

## Tech stack

- **React 19** + **Vite 8**
- **Mantine 9** for UI (cozy-dark theme)
- **@dnd-kit** for drag-to-reorder
- **Vitest 4** + Testing Library for tests, **ESLint 9** for linting
- **Husky** + **lint-staged** pre-commit hook (runs lint on staged files, then the test suite)
- Hosted on **Vercel** — `vercel.json` serves the app at `/planner` and `/lab` and handles the redirects

## Getting started

Requires Node.js 22+.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

### Scripts

| Command              | What it does                       |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Start the Vite dev server          |
| `npm run build`      | Production build to `dist/`        |
| `npm run preview`    | Serve the production build locally |
| `npm run lint`       | Run ESLint                         |
| `npm test`           | Run the test suite once            |
| `npm run test:watch` | Run tests in watch mode            |

## How it works

- **Pages** are two tabs in `App.jsx`, mapped to `/` (Star Force) and `/planner` with the browser History API — no router library. The Star Force tab's **Lab** view is at `/lab` (a `TABS` entry with a `parent`, so it has an address but no header tab).
- **State** lives in `App.jsx` and is persisted to localStorage (`lib/storage.js`). There is no server or account — data is scoped to one browser.
- **Reset logic** is in `lib/weeklyReset.js` (all UTC). The app stores the last weekly-boss, weekly-quest, and monthly-boss reset it applied; when a boundary passes, the matching items are unchecked (weekly bosses and monthly Black Mage are unchecked independently).
- **Content catalogs** (`data/bossContent.js`, `data/weeklyContent.js`, `data/jobs.js`, `data/servers.js`) are static data that drive the pickers and dropdowns.
- **Star Force math** is in `lib/starforce.js` (pure functions: per-attempt odds/costs, an exact closed-form expected-cost solver, and a seeded Monte Carlo for the median/unlucky stats), driven by the v.269 rate/cost/mode tables in `data/starforce.js` (with source notes). The calculator UI (`components/StarForcePanel.jsx`) keeps its inputs in one local state object; share links are encoded/decoded by `sfInputsToQuery` / `sfInputsFromQuery` in `lib/storage.js` (decoding reuses the saved-setup repair); saved setups (`components/SavedSetups.jsx`) are stored under their own localStorage key (`maple-sf-presets-v1`), separate from planner data, and repaired on load like the planner state. The Lab's optimizer is `lib/optimizer.js` (pure: brute force over the 4⁷ per-star mode plans, with the same closed-form cost as the calculator and an exact chance-with-N-booms recurrence), shown by `components/StarForceLab.jsx`.

### Project structure

`src/` is grouped by layer — `components/` (React UI), `data/` (static catalogs), and `lib/` (framework-free logic and helpers like the reset math and storage), with `App.jsx` / `main.jsx` at the root. Cross-layer imports use a `@/` → `src/` alias, and tests sit next to the files they cover.

## Boss portraits

Boss portraits are **self-hosted** in `public/bosses/`. Most were sourced once from the community **maplestory.io** sprite API — there is no official source for GMS boss art. The newest additions — **The First Adversary**, **Baldrix**, **Malefic Star**, **Kai**, and **Jupiter** — come from the community **MapleStory Wiki** (maplestorywiki.net) instead, since maplestory.io has no usable render for them. The running app makes no external API calls. Gloom's full giant-boss body can't be rendered through the API, so it uses its **Gloom Core** sprite (the purple eye) as the portrait; a name-initials avatar still stands in for any boss without art. All art is Nexon's; this is a personal fan project.

## Status / scope

MVP focused on **Boss Content**, **Weekly Content**, and the **Star Force calculator** (with its **Lab** mode optimizer), single-browser. Not yet implemented: cross-device sync, daily-content panel, per-class portraits. Saved calculator setups don't sync live between open tabs (they show up after a refresh), but saving in one tab never erases setups saved in another.

## License

The source code is released under the **MIT License** (see [`LICENSE`](LICENSE)). The bundled boss portraits in `public/bosses/` are Nexon's property, included under fan-project terms, and are **not** covered by the MIT license.
