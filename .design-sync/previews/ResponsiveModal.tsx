import { ResponsiveModal, DifficultyBadge } from 'maplet'

const noop = () => {}

const PickRow = ({
  name,
  difficulty,
  checked,
}: {
  name: string
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Chaos' | 'Extreme'
  checked?: boolean
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      borderRadius: 'var(--mantine-radius-md)',
      background: checked
        ? 'var(--mantine-color-dark-5)'
        : 'var(--mantine-color-dark-6)',
      border: '1px solid var(--mantine-color-dark-4)',
    }}
  >
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 14,
        color: 'var(--mantine-color-dark-0)',
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: checked
            ? 'none'
            : '1px solid var(--mantine-color-dark-3)',
          background: checked ? 'var(--mantine-color-sage-5)' : 'transparent',
          color: 'var(--mantine-color-dark-8)',
          fontSize: 11,
          lineHeight: '16px',
          textAlign: 'center',
        }}
      >
        {checked ? '✓' : ''}
      </span>
      {name}
    </span>
    <DifficultyBadge difficulty={difficulty} />
  </div>
)

// At the capture width (620px < Mantine `sm`) the modal switches to its
// full-screen phone layout — the wrapper's whole point. Portal rendering
// captures fine (both picker modals verify through it); withinPortal={false}
// rendered an empty shell, so don't use it.
export const FullScreenBelowSm = () => (
  <ResponsiveModal opened onClose={noop} title="Edit Boss Content">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <PickRow name="Lotus" difficulty="Hard" checked />
      <PickRow name="Damien" difficulty="Hard" checked />
      <PickRow name="Lucid" difficulty="Hard" />
      <PickRow name="Chosen Seren" difficulty="Normal" />
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          marginTop: 8,
        }}
      >
        <button
          type="button"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--mantine-radius-lg)',
            border: '1px solid var(--mantine-color-dark-4)',
            background: 'transparent',
            color: 'var(--mantine-color-dark-1)',
            fontFamily: 'var(--mantine-font-family)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Unselect all
        </button>
        <button
          type="button"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--mantine-radius-lg)',
            border: 'none',
            background: 'var(--mantine-color-sage-5)',
            color: 'var(--mantine-color-dark-8)',
            fontFamily: 'var(--mantine-font-family)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  </ResponsiveModal>
)
