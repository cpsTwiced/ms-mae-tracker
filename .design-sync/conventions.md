# Maplet — build conventions

Maplet is a cozy-dark MapleStory planner. Dark is the only look: warm charcoal surfaces, one sage-teal accent, one moderate 8px rounding everywhere, compact density.

## Setup (required)

Wrap every app in `MapletProvider` — it is Mantine's provider preconfigured with the Maplet theme (sage accent, warm `dark` palette, `defaultRadius: 'md'`, pointer cursors on switches/checkboxes, plain switch knobs, dark color scheme). Without it every component renders unstyled/light.

```jsx
import { MapletProvider, Tracker } from 'maplet'
;<MapletProvider>{/* your screens */}</MapletProvider>
```

Page background is `var(--mantine-color-body)` (near-black warm charcoal); don't hardcode dark hexes.

## Styling idiom

This is a **Mantine v9 prop-driven system — there is no utility-class vocabulary**. Style library components via Mantine props (`radius`, `padding`, `c`, `fw`, `size`, `gap`, `withBorder`, …). For your own layout glue use inline styles or small style blocks built on the injected theme variables:

- Colors: `var(--mantine-color-body)`, `var(--mantine-color-text)`, `var(--mantine-color-dimmed)`, accent scale `var(--mantine-color-sage-0)`…`-9` (5 = filled accent), surfaces `var(--mantine-color-dark-0)`…`-9` (6/7 = card fills, 8 = page)
- Spacing: `var(--mantine-spacing-xs|sm|md|lg|xl)`; radius: `var(--mantine-radius-md)` (the app-wide rounding); font: `var(--mantine-font-family)`
- Countdown/meso numerals use monospace (`ff="monospace"` on Mantine `Text`)

App-level layout classes shipped in the stylesheet (use them rather than re-inventing): `.plannerGrid` + `.plannerCol` (responsive two-column planner that stacks on mobile), `.pane` + `.paneBody` (fixed-height card whose body scrolls on desktop), `.timersPane`, `.charGrid` (horizontally scrolling roster row), `.charTile` / `.charAddTile` (character tiles; `data-active` gets the sage tint), `.pickerModalScroll` (modal list height cap).

## Component notes

- `DifficultyBadge` difficulty values are exactly `Easy | Normal | Hard | Chaos | Extreme` — fixed-width uppercase pills.
- `ContentPanel` renders a whole task list (header + count + Reorder/Edit + rows); give it `items` or grouped `sections`, never hand-build rows.
- Modals go through `ResponsiveModal` (auto full-screen under the `sm` breakpoint); pass regular Mantine Modal props.
- `Timers` and `Tracker` are self-styled compositions — drop them in whole.

## Where the truth lives

Read `styles.css` (imports `_ds_bundle.css`: Mantine core styles + the app classes above) before inventing styles, and each component's `.prompt.md` / `.d.ts` for its API. The `theme` export carries the full palette if you need raw values.
