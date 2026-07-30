// MapletProvider auto-wraps every preview, so this card showcases what the
// provider injects: the cozy-dark theme's CSS variables (sage accent scale,
// warm charcoal surface scale, lg radius, font stack), sampled with plain
// styled divs.

const Swatch = ({ v, label }: { v: string; label: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
    <div
      style={{
        height: 34,
        borderRadius: 6,
        background: v,
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    />
    <span
      style={{
        fontSize: 10,
        textAlign: 'center',
        color: 'var(--mantine-color-dark-2)',
      }}
    >
      {label}
    </span>
  </div>
)

const Scale = ({ name, title }: { name: string; title: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 13, color: 'var(--mantine-color-dark-0)' }}>
      {title}
    </span>
    <div style={{ display: 'flex', gap: 6 }}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <Swatch key={i} v={`var(--mantine-color-${name}-${i})`} label={`${i}`} />
      ))}
    </div>
  </div>
)

export const ThemeTokens = () => (
  <div
    style={{
      background: 'var(--mantine-color-body)',
      padding: 20,
      borderRadius: 12,
      width: 480,
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      fontFamily: 'var(--mantine-font-family)',
    }}
  >
    <Scale name="sage" title="Sage accent (primary, shade 5 in dark)" />
    <Scale name="dark" title="Warm charcoal surfaces" />

    <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
      <div
        style={{
          flex: 1,
          padding: '12px 14px',
          borderRadius: 'var(--mantine-radius-lg)',
          background: 'var(--mantine-color-dark-6)',
          border: '1px solid var(--mantine-color-dark-4)',
          color: 'var(--mantine-color-dark-1)',
          fontSize: 12,
        }}
      >
        Default radius: <code>lg</code>
        <div style={{ marginTop: 4, color: 'var(--mantine-color-dark-2)' }}>
          rounded cards, modals, buttons
        </div>
      </div>
      <div
        style={{
          flex: 1,
          padding: '12px 14px',
          borderRadius: 'var(--mantine-radius-lg)',
          background: 'var(--mantine-color-sage-5)',
          color: 'var(--mantine-color-dark-8)',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Filled accent
        <div style={{ marginTop: 4, fontWeight: 400 }}>
          autoContrast picks dark text
        </div>
      </div>
    </div>

    <div style={{ fontSize: 12, color: 'var(--mantine-color-dark-2)' }}>
      Font: system stack via var(--mantine-font-family) — Weekly reset in 2d 4h
    </div>
  </div>
)
