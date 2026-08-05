// Compact meso amounts in MapleStory's lowercase shorthand (232b, 350m,
// 1.5b): one decimal, dropped once the leading figure reaches three digits.
export function formatMeso(n) {
  if (!Number.isFinite(n)) return '—'
  if (n <= 0) return '0'
  const units = [
    [1e12, 't'],
    [1e9, 'b'],
    [1e6, 'm'],
    [1e3, 'k'],
  ]
  for (const [div, suffix] of units) {
    const v = n / div
    // Pick a unit as soon as the DISPLAYED value reaches 1.0, so amounts
    // that round up never show as "1000b" instead of "1.0t" (and 99.97m
    // shows as "100m", not "100.0m").
    if (v >= 0.9995) {
      return `${v.toFixed(v >= 99.95 ? 0 : 1)}${suffix}`
    }
  }
  return `${Math.round(n)}`
}

export function formatCountdown(ms) {
  if (ms < 0) ms = 0
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return `${days}d ${hours}h ${minutes}m ${seconds}s`
}
