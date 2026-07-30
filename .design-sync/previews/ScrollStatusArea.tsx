import { ScrollStatusArea } from 'maplet'

const Backdrop = ({ children }: { children?: any }) => (
  <div
    style={{
      background: 'var(--mantine-color-body)',
      padding: 16,
      borderRadius: 12,
      width: 'fit-content',
    }}
  >
    <div style={{ width: 340 }}>{children}</div>
  </div>
)

const Pane = ({ children }: { children?: any }) => (
  <div
    style={{
      background: 'var(--mantine-color-dark-6)',
      border: '1px solid var(--mantine-color-dark-4)',
      borderRadius: 'var(--mantine-radius-lg)',
      padding: 8,
    }}
  >
    {children}
  </div>
)

const RowItem = ({ name, level }: { name: string; level: number }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 10px',
      borderRadius: 8,
      fontSize: 14,
      color: 'var(--mantine-color-dark-0)',
    }}
  >
    <span>{name}</span>
    <span style={{ fontSize: 12, color: 'var(--mantine-color-dark-2)' }}>
      Lv. {level}
    </span>
  </div>
)

const longList = [
  ['Lotus', 245],
  ['Damien', 250],
  ['Guardian Angel Slime', 240],
  ['Lucid', 250],
  ['Will', 255],
  ['Gloom', 245],
  ['Darknell', 260],
  ['Verus Hilla', 260],
  ['Chosen Seren', 265],
  ['Kalos the Guardian', 275],
  ['Kaling', 275],
] as const

// Content overflows the 180px pane, so the viewport reserves scrollbar space
// and the slim themed scrollbar track shows on the right.
export const Overflowing = () => (
  <Backdrop>
    <Pane>
      <ScrollStatusArea h={180} refreshKey={longList.length}>
        {longList.map(([name, level]) => (
          <RowItem key={name} name={name} level={level} />
        ))}
      </ScrollStatusArea>
    </Pane>
  </Backdrop>
)

// Same pane height, but the short list fits — no scrollbar gutter is
// reserved, so rows keep the full width.
export const FitsWithoutScrollbar = () => (
  <Backdrop>
    <Pane>
      <ScrollStatusArea h={180} refreshKey={3}>
        {longList.slice(0, 3).map(([name, level]) => (
          <RowItem key={name} name={name} level={level} />
        ))}
      </ScrollStatusArea>
    </Pane>
  </Backdrop>
)
