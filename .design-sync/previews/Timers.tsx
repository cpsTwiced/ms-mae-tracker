import { Timers } from 'maplet'

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

// Timers is self-contained: it ticks every second and prints each reset in the
// viewer's local timezone.
export const Default = () => (
  <Backdrop>
    <div style={{ maxWidth: 440 }}>
      <Timers />
    </div>
  </Backdrop>
)
