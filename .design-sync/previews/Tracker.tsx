import { Tracker } from 'maplet'

const Backdrop = ({ children }: { children?: any }) => (
  <div
    style={{
      background: 'var(--mantine-color-body)',
      padding: 16,
      borderRadius: 12,
    }}
  >
    {children}
  </div>
)

const noop = () => {}

// Tasks mirror the exact shapes built by lib/storage.js makeBossTask /
// makeWeeklyTask, using real catalog entries from data/bossContent.js and
// data/weeklyContent.js. `img: null` uses the initials-avatar fallback
// (portraits are self-hosted from public/, which the preview bundle
// doesn't serve).
const bossTasks = [
  { id: 'b1', key: 'lotus:Hard', bossId: 'lotus', name: 'Lotus', img: null, difficulty: 'Hard', level: 245, done: true },
  { id: 'b2', key: 'damien:Hard', bossId: 'damien', name: 'Damien', img: null, difficulty: 'Hard', level: 250, done: true },
  { id: 'b3', key: 'lucid:Hard', bossId: 'lucid', name: 'Lucid', img: null, difficulty: 'Hard', level: 250, done: false },
  { id: 'b4', key: 'will:Hard', bossId: 'will', name: 'Will', img: null, difficulty: 'Hard', level: 255, done: false },
  { id: 'b5', key: 'seren:Normal', bossId: 'seren', name: 'Chosen Seren', img: null, difficulty: 'Normal', level: 265, done: false },
  { id: 'b6', key: 'blackmage:Hard', bossId: 'blackmage', name: 'Black Mage', img: null, difficulty: 'Hard', level: 255, done: false },
]

const weeklyTasks = [
  { id: 'w1', key: 'monsterparkextreme', contentId: 'monsterparkextreme', name: 'Monster Park Extreme', done: true },
  { id: 'w2', key: 'hungrymuto', contentId: 'hungrymuto', name: 'Hungry Muto', done: false },
  { id: 'w3', key: 'guildculvert', contentId: 'guildculvert', name: 'Culvert', done: false },
  { id: 'w4', key: 'erdasrequest', contentId: 'erdasrequest', name: "Erda's Request", done: false },
]

const character = {
  id: 'c1',
  name: 'Michh',
  level: 275,
  job: 'Night Lord',
  server: 'Kronos',
  bossTasks,
  weeklyTasks,
}

// The capture viewport is 900px — just under the app's 62em desktop
// breakpoint — so replay index.css's desktop planner rules here to show the
// real two-column layout (Timers + Weekly left, Boss right) instead of the
// tall stacked phone layout, which would clip at the cell height.
const desktopLayoutCss = `
  .plannerGrid { flex-direction: row; align-items: stretch; }
  .plannerCol { flex: 1 1 0; height: 24rem; min-height: 22rem; }
  .plannerCol > .pane { flex: 1 1 0; }
  .pane { flex: 0 1 auto; }
  .paneBody { flex: 1; min-height: 0; overflow: hidden; }
`

// The whole planner for one character: Timers + Weekly Content on the left,
// Boss Content (Weekly/Monthly sections) on the right. Both picker modals
// stay closed.
export const FilledPlanner = () => (
  <Backdrop>
    <style>{desktopLayoutCss}</style>
    <Tracker
      character={character}
      onToggleBoss={noop}
      onRemoveBoss={noop}
      onReorderBoss={noop}
      onSetBossDifficulty={noop}
      onClearBosses={noop}
      onToggleWeekly={noop}
      onRemoveWeekly={noop}
      onReorderWeekly={noop}
      onSetWeeklyContent={noop}
    />
  </Backdrop>
)
