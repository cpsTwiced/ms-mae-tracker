# Maplet

A personal **Global MapleStory (GMS) weekly tracker**, modeled on the in-game _Maple Planner_. Track your weekly bosses and weekly content per character, with live countdowns to each reset. Runs entirely in your browser — no backend, no login.

## Features

- **Per-character tracking** — add up to **6** characters (name, level 1–300, job, server). Each character has its own independent boss and weekly lists. The **Characters** pane at the top is a single horizontally-scrolling row of fixed-width tiles, one per character, each showing the name, `Lv.`, job, and a progress bar with an `X/Y done` count across that character's boss + weekly tasks. When the tiles are wider than the pane the row scrolls sideways — drag the scrollbar (styled to match the other panes), swipe, or use the mouse wheel. Click a tile to switch to it (the active one is highlighted); hover a tile for its drag handle (left) and ⋮ menu (right, **Edit / Delete character**). An **Add Character** tile rides at the end of the row; once you hit the 6-character cap it stays visible but is disabled, with a tooltip explaining the limit.
- **Boss Content** — pick bosses and difficulties from an Edit modal (one checkbox per difficulty), laid out like the in-game planner: each boss is its own row with a portrait, name, and level. The modal is split into **Weekly** and **Monthly** sections — weekly bosses (ordered by entry level) and the monthly Black Mage. Daily bosses (Horntail, Gollux) are excluded. Difficulty pills use the in-game palette (Easy/Normal/Hard/Chaos/Extreme), with Chaos and Extreme as dark pills to match the game. The same pills appear on tracked entries; tracked entries are added or removed through the Edit modal. Each boss can only be tracked at **one** difficulty (you can only clear a boss once per reset) — picking a different difficulty swaps the boss over to it (deselecting the previous one), so you don't have to uncheck first.
- **Weekly Content** — track weekly activities, grouped into **Content** (Monster Park Extreme, Epic Dungeon, Erda Spectrum, Hungry Muto, Midnight Chaser, Spirit Savior, Ranheim Defense, Esfera Guardian), **Guild** (Culvert, Flag Race), and **Quest** (Erda's Request). The same sections appear in the panel and the Edit modal.
- **Timers** — live countdowns to the daily, standard weekly (Thursday), and event weekly (Wednesday) resets, each shown in **your local time** with a tooltip listing what that reset covers.
- **Desktop planner layout** — a full-width **character pane** (the horizontally-scrolling row of character tiles) tops the app, with Weekly Content and Boss Content below it in equal-height columns with shorter, internally scrolling panes and shared modal/pane scroll indicators only when scrolling is needed, so the page keeps visible background below the tracker.
- **Drag-to-reorder** — boss entries can be sorted with the panel's Reorder toggle, and character tiles reorder through the drag handle that appears on hover. Weekly content stays in catalog order within each section.
- **Auto-reset** — checked items automatically uncheck when their reset passes. Weekly bosses and weekly content clear on the Thursday reset; the monthly boss (Black Mage) clears on the 1st of the month, independently.
- **Saved in your browser** — everything persists in localStorage, stays synchronized across open tabs, and shows a warning if the browser cannot save a change.

## Reset Schedule

The app tracks the real GMS reset cadence. Since **v.264** Nexon unified weekly bosses and most standard weekly quests/content onto a single **Thursday** reset. Ongoing Events weekly resets can differ from the standard weekly reset. The in-app timers also show each reset in your local timezone.

| Reset                                     | UTC                    | Eastern                                     |
| ----------------------------------------- | ---------------------- | ------------------------------------------- |
| Daily                                     | 00:00 UTC every day    | 8:00 PM EDT / 7:00 PM EST                   |
| Weekly bosses and standard weekly content | Thursday 00:00 UTC     | Wednesday 8:00 PM EDT / 7:00 PM EST         |
| Ongoing Events weekly resets              | Wednesday 00:00 UTC    | Tuesday 8:00 PM EDT / 7:00 PM EST           |
| Monthly boss (Black Mage)                 | 1st of month 00:00 UTC | Last day of month 8:00 PM EDT / 7:00 PM EST |

The monthly boss reset is applied automatically (Black Mage unchecks on its own schedule) but is not shown as a countdown timer.

## Tech stack

- **React 19** + **Vite 8**
- **Mantine 9** for UI (cozy-dark theme)
- **@dnd-kit** for drag-to-reorder
- **Vitest 4** + Testing Library for tests, **ESLint 9** for linting
- **Husky** + **lint-staged** pre-commit hook (runs lint on staged files, then the test suite)

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

- **State** lives in `App.jsx` and is persisted to localStorage (`lib/storage.js`). There is no server or account — data is scoped to one browser.
- **Reset logic** is in `lib/weeklyReset.js` (all UTC). The app stores the last weekly-boss, weekly-quest, and monthly-boss reset it applied; when a boundary passes, the matching items are unchecked (weekly bosses and monthly Black Mage are unchecked independently).
- **Content catalogs** (`data/bossContent.js`, `data/weeklyContent.js`, `data/jobs.js`, `data/servers.js`) are static data that drive the pickers and dropdowns.

### Project structure

`src/` is grouped by layer — `components/` (React UI), `data/` (static catalogs), and `lib/` (framework-free logic and helpers like the reset math and storage), with `App.jsx` / `main.jsx` at the root. Cross-layer imports use a `@/` → `src/` alias, and tests sit next to the files they cover.

## Boss portraits

Boss portraits are **self-hosted** in `public/bosses/`. Most were sourced once from the community **maplestory.io** sprite API — there is no official source for GMS boss art. The newest two, **The First Adversary** and **Baldrix**, come from the community **MapleStory Wiki** (maplestorywiki.net) instead, since maplestory.io has no usable render for them. The running app makes no external API calls. Gloom's full giant-boss body can't be rendered through the API, so it uses its **Gloom Core** sprite (the purple eye) as the portrait; a name-initials avatar still stands in for any boss without art. All art is Nexon's; this is a personal fan project.

## Status / scope

MVP focused on **Boss Content** and **Weekly Content**, single-browser. Not yet implemented: cross-device sync, daily-content panel, per-class portraits.

## License

The source code is released under the **MIT License** (see [`LICENSE`](LICENSE)). The bundled boss portraits in `public/bosses/` are Nexon's property, included under fan-project terms, and are **not** covered by the MIT license.
