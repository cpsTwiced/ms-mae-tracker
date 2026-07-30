import { CharacterBar } from 'maplet'

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

// Tiles only read task length + done flags, so minimal task stubs suffice.
const tasks = (done: number, total: number) =>
  Array.from({ length: total }, (_, i) => ({ id: `t${i}`, done: i < done }))

const roster = [
  {
    id: 'c1',
    name: 'Michh',
    level: 285,
    job: 'Night Lord',
    server: 'Kronos',
    bossTasks: tasks(5, 8),
    weeklyTasks: tasks(2, 3),
  },
  {
    id: 'c2',
    name: 'Solyra',
    level: 264,
    job: 'Bishop',
    server: 'Kronos',
    bossTasks: tasks(3, 6),
    weeklyTasks: tasks(0, 2),
  },
  {
    id: 'c3',
    name: 'Adelheid',
    level: 275,
    job: 'Adele',
    server: 'Hyperion',
    bossTasks: tasks(6, 6),
    weeklyTasks: tasks(2, 2),
  },
  {
    id: 'c4',
    name: 'Kaiserin',
    level: 232,
    job: 'Kaiser',
    server: 'Bera',
    bossTasks: tasks(0, 4),
    weeklyTasks: tasks(0, 1),
  },
]

// Full roster: four characters (Michh active, Adelheid fully done, Kaiserin
// untouched). Tiles are a fixed 200px, so the row overflows the 900px capture
// viewport and clips mid-tile — that is the app's real horizontally-scrolling
// roster; the Add tile (off-screen here) is shown in SingleCharacter below.
export const Roster = () => (
  <Backdrop>
    <CharacterBar
      characters={roster}
      activeId="c1"
      onSelect={noop}
      onAdd={noop}
      onUpdate={noop}
      onRemove={noop}
      onReorder={noop}
    />
  </Backdrop>
)

// Fresh install: a single character (delete/reorder disabled) with an empty
// task list, next to the Add tile.
export const SingleCharacter = () => (
  <Backdrop>
    <CharacterBar
      characters={[
        {
          id: 'c1',
          name: 'Michh',
          level: 285,
          job: 'Night Lord',
          server: 'Kronos',
          bossTasks: [],
          weeklyTasks: [],
        },
      ]}
      activeId="c1"
      onSelect={noop}
      onAdd={noop}
      onUpdate={noop}
      onRemove={noop}
      onReorder={noop}
    />
  </Backdrop>
)
