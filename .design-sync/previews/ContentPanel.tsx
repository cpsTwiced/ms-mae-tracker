import { ContentPanel } from 'maplet'

const Backdrop = ({ children }: { children?: any }) => (
  <div
    style={{
      background: 'var(--mantine-color-body)',
      padding: 16,
      borderRadius: 12,
    }}
  >
    <div style={{ width: 400 }}>{children}</div>
  </div>
)

const noop = () => {}

// Boss rows carry a difficulty pill and an initials avatar (portraits are
// self-hosted in the real app; `img: null` uses the fallback by design).
const bossItems = [
  { id: 'b1', name: 'Lucid', done: true, img: null, difficulty: 'Hard' },
  { id: 'b2', name: 'Will', done: true, img: null, difficulty: 'Hard' },
  { id: 'b3', name: 'Verus Hilla', done: false, img: null, difficulty: 'Normal' },
  { id: 'b4', name: 'Darknell', done: false, img: null, difficulty: 'Chaos' },
]

const weeklyItems = [
  { id: 'w1', name: 'Legion Weekly', done: true },
  { id: 'w2', name: 'Guild Culvert', done: false },
  { id: 'w3', name: 'Monster Park Extreme', done: false },
]

export const BossList = () => (
  <Backdrop>
    <ContentPanel
      title="Boss Content"
      items={bossItems}
      onEdit={noop}
      onToggle={noop}
      onRemove={noop}
      onReorder={noop}
      emptyText="No boss content yet."
    />
  </Backdrop>
)

export const WeeklyListNoAvatars = () => (
  <Backdrop>
    <ContentPanel
      title="Weekly Content"
      items={weeklyItems}
      showAvatar={false}
      onEdit={noop}
      onToggle={noop}
      onRemove={noop}
      onReorder={noop}
      emptyText="No weekly content yet."
    />
  </Backdrop>
)

export const GroupedSections = () => (
  <Backdrop>
    <ContentPanel
      title="Boss Content"
      sections={[
        { key: 'weekly', label: 'Weekly', items: bossItems.slice(0, 2) },
        {
          key: 'monthly',
          label: 'Monthly',
          items: [
            { id: 'm1', name: 'Black Mage', done: false, img: null, difficulty: 'Extreme' },
          ],
        },
      ]}
      onEdit={noop}
      onToggle={noop}
      onRemove={noop}
      onReorder={noop}
      emptyText="No boss content yet."
    />
  </Backdrop>
)

export const EmptyState = () => (
  <Backdrop>
    <ContentPanel
      title="Boss Content"
      items={[]}
      onEdit={noop}
      onToggle={noop}
      onRemove={noop}
      onReorder={noop}
      emptyText="No boss content yet. Use Edit to pick this week's bosses."
    />
  </Backdrop>
)
