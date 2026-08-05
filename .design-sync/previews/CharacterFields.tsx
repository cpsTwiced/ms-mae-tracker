import { CharacterFields } from 'maplet'

const Backdrop = ({ children }: { children?: any }) => (
  <div
    style={{
      background: 'var(--mantine-color-body)',
      padding: 16,
      borderRadius: 12,
    }}
  >
    <div style={{ width: 520 }}>{children}</div>
  </div>
)

const noop = () => {}

// Edit-character form with every field filled in.
export const Filled = () => (
  <Backdrop>
    <CharacterFields
      values={{ name: 'Michh', level: 285, job: 'Night Lord', server: 'Kronos' }}
      onChange={noop}
    />
  </Backdrop>
)

// Add-character form as it first opens: placeholders showing, level at 1.
export const Empty = () => (
  <Backdrop>
    <CharacterFields
      values={{ name: '', level: 1, job: '', server: '' }}
      onChange={noop}
      namePlaceholder="e.g. MyMain"
    />
  </Backdrop>
)
