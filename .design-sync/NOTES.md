# design-sync notes — Maplet

Repo-specific gotchas for future syncs. The app is NOT a packaged library: no dist entry, no Storybook, plain JS (no TS).

- **Entry**: `.design-sync/entry.mjs` is a hand-written barrel (cfg.entry). It also `import`s `@mantine/core/styles.css` + `src/index.css` so esbuild bundles all CSS into `_ds_bundle.css` — do NOT use `cfg.cssEntry` for these (it copies files verbatim without inlining `@import`s, which then 404).
- **`--node-modules ./node_modules`** (repo root). `node_modules/maplet` doesn't exist (self-install), hence cfg.entry.
- **Path alias**: components import `@/…`; resolved via `.design-sync/tsconfig.sync.json` (cfg.tsconfig) since the repo has no tsconfig.
- **Props contracts**: repo is untyped JS → every `<Name>Props` body is hand-written in `cfg.dtsPropsFor`. When a component's props change, update `dtsPropsFor` in the same change or the design agent gets a stale API.
- **Theme**: lives in `src/components/MapletProvider.jsx` (extracted from main.jsx for this sync; main.jsx now uses it). `cfg.provider` wraps every preview in it.
- **Converter deps**: `.ds-sync` needs `typescript@5` explicitly — plain `npm i typescript` grabs TS 7 (native preview) whose compiler API the validate parse check can't import, and it silently reports "skipped".
- **Playwright**: chromium-headless-shell v1234 cached at `~/Library/Caches/ms-playwright` (playwright installed in `.ds-sync`).

## Preview-authoring gotchas (from the first-sync wave)

- **cfg.overrides `viewport` edits require a full `package-build.mjs` re-stamp** before any scoped `preview-rebuild` of the affected component — otherwise `[CONFIG_STALE]` (cardMode/primaryStory are exempt from the stamp).
- Capture viewports: 900px wide for grid/column cards (~700px tall for column) — below the app's 62em desktop breakpoint. Tracker's preview replays index.css's 62em planner rules in an inline `<style>` to show the two-column desktop layout; CharacterBar's roster cell deliberately clips mid-tile (fixed 200px tiles, real scrolling-row look).
- Tracker preview data must match storage factory shapes: weekly tasks need `contentId` (category grouping) and boss tasks need `bossId` (Monthly section routing).
- BossEditModal/WeeklyEditModal don't forward extra Mantine Modal props (only opened/onClose/title/size reach ResponsiveModal), so previews can't pass `withinPortal={false}` — captures rely on the portal landing in-page. ResponsiveModal itself does forward, and its preview uses `withinPortal={false}` + `transitionProps={{duration:0}}`.
- At the 620px modal-capture viewport the app is below its 48em breakpoint → modals render full-screen/mobile layout; that's the real app view, not a bug.
- MapletProvider's preview is pure JSX + CSS vars (no 'maplet' import): swatch board of the runtime-injected sage/dark scales.

## Re-sync risks (watch-list for the next run)

- **`cfg.dtsPropsFor` is hand-maintained** (untyped repo): silently rots when component props change. Diff it against the component signatures whenever `src/components/*` changed.
- **`.design-sync/entry.mjs` is a hand-written barrel**: a NEW component must be added there AND to `componentSrcMap` AND `dtsPropsFor`, or it simply won't exist in the bundle.
- **Tracker preview inlines a copy of index.css's 62em planner rules** (capture viewport is below the desktop breakpoint) — update it if `.plannerGrid`/`.pane` rules change.
- **Modal/roster previews use real catalog ids** (bossContent/weeklyContent/jobs/servers) — renaming ids breaks selections in those previews (renders still fine, checkmarks vanish).
- **Timers renders live countdowns** — screenshot text varies run to run; that's display-only (render hashes come from sources, not pixels). Don't chase countdown diffs when confirming spot-checks.
- Toolchain assumed: node 22, npm; converter deps installed in `.ds-sync` (esbuild, ts-morph, @types/react, typescript@5, playwright).

## Known render warns

- `[TOKENS_MISSING] 87 CSS custom properties` — expected: all `--mantine-*`/`--affix-*` etc. vars are injected at runtime by MapletProvider (cfg.provider is set, renders verify). Not fixable via tokensPkg; do not chase.
- Boss portraits (`/bosses/*.png`, self-hosted in the app's public/) are not shipped; previews use `img: null` → initials-avatar fallback, which is the app's own designed fallback.
- `[RENDER_THIN]` on BossEditModal / ResponsiveModal / WeeklyEditModal (`maxHeight: 0`) — expected: Mantine modals render via portal, so the in-flow preview root is empty while the real content paints over it (pngBytes 25-50KB, visually verified good). Not a failure; do not chase.
- The sage/dark numeric var scales (`--mantine-color-sage-0..9`) named in conventions.md are runtime-injected by Mantine from the theme (palette hexes verified present in `_ds_bundle.js`); they don't appear as definitions in shipped CSS.
