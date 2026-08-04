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
    if (n >= div) {
      const v = n / div
      return `${v.toFixed(v >= 100 ? 0 : 1)}${suffix}`
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
