# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal Global MapleStory (GMS) weekly-content tracker, modeled on the in-game **Maple Planner**. Single-page React app, **no backend** — all state lives in the browser's localStorage and is scoped to one browser by design. There is no API layer, auth, or server; don't add one unless asked.

## Commands

```bash
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # production build to dist/
npm run preview      # serve the production build
npm run lint         # ESLint (flat config, eslint.config.js)
npm test             # Vitest, single run
npm run test:watch   # Vitest watch mode

npx vitest run src/weeklyReset.test.js   # run one test file
npx vitest run -t "quest reset"           # run tests matching a name
```

A Husky pre-commit hook runs `lint-staged` (eslint --fix on staged JS) then the full test suite; a lint error or failing test blocks the commit.

## Architecture

**`App.jsx` is the single source of truth.** It holds the entire app state via `useState(loadState)`, persists to localStorage on every change, and defines _all_ mutation handlers, which it passes down as props (plain prop-drilling — no context/redux). It toggles between two views: `tracker` (the planner) and `config` (character management).

**State shape:** `{ characters, activeId, bossResetAt, weeklyResetAt, monthlyResetAt }`. Each character is `{ id, name, level, job, server, bossTasks, weeklyTasks }`. A tracked task carries a `key` for dedupe (`bossId:difficulty` for bosses, `contentId` for weeklies) plus a `done` flag.

**Reset cadence is the domain core** (`weeklyReset.js`, all UTC): weekly boss content resets **Thursday 00:00**; weekly quests/content **also reset Thursday 00:00** (GMS v.264 unified them onto one weekly reset); daily is 00:00; **monthly boss content (Black Mage) resets the 1st of the month 00:00**. State carries _three_ reset timestamps (`bossResetAt`, `weeklyResetAt`, `monthlyResetAt`) tracked independently. The reset is _applied_ in an `App.jsx` effect keyed on a 1-second `now` tick: when `lastBossReset() > bossResetAt` it unchecks every character's **weekly** `bossTasks`; when `lastMonthlyReset() > monthlyResetAt` it unchecks the **monthly** ones; when `lastQuestReset() > weeklyResetAt` it unchecks `weeklyTasks`. A boss task is "monthly" when its `bossId` is in `MONTHLY_BOSS_IDS` (derived in `App.jsx` from `BOSS_CONTENT` entries with `cadence: 'monthly'`), so the weekly boundary leaves Black Mage alone and vice-versa. `lastQuestReset`/`nextQuestReset` are now aliases of the Thursday boss reset; `lastWeeklyReset`/`nextWeeklyReset` are older back-compat aliases for the same. `Timers.jsx` renders the daily/weekly/event resets in the **viewer's local timezone**; the monthly reset is applied but has no countdown by design.

**Persistence & migration** (`storage.js`): `loadState`/`saveState` use localStorage key `maple-tracker-v2`. `normalize()` backfills missing fields and migrates older shapes (the original single-list `maple-weekly-tasks`, and v2 characters that still used a flat `bosses` array). `normalizeBossTask` also **re-links each boss task to `BOSS_CONTENT`** (by `bossId`, falling back to `name`) so the portrait stays in sync with the catalog — this is what lets newly-added art appear on bosses tracked before the portrait existed, including legacy entries that predate `bossId`. Build tasks/characters only through the `makeCharacter` / `makeBossTask` / `makeWeeklyTask` factories.

**Static catalogs** drive the pickers: `bossContent.js` (`BOSS_CONTENT`: each boss has `difficulties: [{ d, level }]`, an `img`, and a `cadence` of `'weekly'` or `'monthly'` — the `BossEditModal` groups bosses into Weekly/Monthly sections by it), `weeklyContent.js`, `difficulties.js` (badge colors), and `jobs.js` / `servers.js` (grouped Mantine `Select` data — jobs by class group, servers split Heroic/Interactive).

**Component roles:** `Tracker.jsx` composes the planner (meta header, `Timers`, two `ContentPanel`s, two edit modals). `ContentPanel.jsx` is reused for both boss and weekly lists and houses the dnd-kit drag-to-reorder (`Row` = a `useSortable` item). `BossEditModal`/`WeeklyEditModal` are the checkbox pickers (over-level boss difficulties render dimmed but stay selectable). `Config.jsx` does character CRUD via the shared `CharacterFields.jsx`. `main.jsx` holds the MantineProvider cozy-dark theme (custom `sage` accent + warm `dark` palette).

## Images / external data

Boss portraits are **self-hosted** in `public/bosses/<bossId>.png`, sourced once from the **unofficial** maplestory.io sprite API (there is no official GMS source for boss/class art). The running app makes **no external API calls**. The initials-avatar fallback (`img: null` → `icon.js` `initials()`) still exists for any boss without art, though every current boss has a portrait. Most portraits are mob `render/stand/0` frames; Gloom is the exception — the full giant boss can't be rendered as a normal mob, so it uses the **Gloom Core** sprite (mob id 8950116) instead, which is its recognizable purple eye.

## Conventions

- JS style: **2-space indent, single quotes, no semicolons, trailing commas** — match the surrounding files.
- When adding a field to a tracked task or character, update it in **three** places or old data breaks: the factory in `storage.js`, the defaults in `normalize()`, and any snapshot expectations in `storage.test.js`.
- Component tests must wrap render in `<MantineProvider>` and call `cleanup()` in `afterEach` (Vitest globals are off). `vitest.setup.js` already mocks `matchMedia`/`ResizeObserver` and `crypto.randomUUID` for jsdom.

## Keep README.md current

Whenever you make a feature change, behavior change, or bug fix, update `README.md` in the **same** change so it never drifts from the code. In particular keep these in sync: the **Features** list, the **Reset schedule** table, the **Tech stack**, the **Scripts** table, and the **Status / scope** section.
