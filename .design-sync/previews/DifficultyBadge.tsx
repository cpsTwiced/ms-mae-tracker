import { DifficultyBadge } from 'maplet'

// Preview cells render on the app's dark body background so the pills read
// the way they do in the planner.
const Backdrop = ({ children }: { children?: any }) => (
  <div
    style={{
      background: 'var(--mantine-color-body)',
      padding: 16,
      borderRadius: 12,
      display: 'inline-block',
    }}
  >
    {children}
  </div>
)

export const AllDifficulties = () => (
  <Backdrop>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <DifficultyBadge difficulty="Easy" />
      <DifficultyBadge difficulty="Normal" />
      <DifficultyBadge difficulty="Hard" />
      <DifficultyBadge difficulty="Chaos" />
      <DifficultyBadge difficulty="Extreme" />
    </div>
  </Backdrop>
)

export const InARow = () => (
  <Backdrop>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <DifficultyBadge difficulty="Chaos" />
      <span
        style={{
          color: 'var(--mantine-color-text)',
          fontFamily: 'var(--mantine-font-family)',
          fontSize: 14,
        }}
      >
        Papulatus · Lv. 155
      </span>
    </div>
  </Backdrop>
)
