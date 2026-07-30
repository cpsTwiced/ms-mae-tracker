// Compact meso amounts: 3 significant figures with K/M/B/T units, exact
// below 1000. Rounding happens before unit selection so 999,950 → "1M".
export function formatMeso(n) {
  if (!Number.isFinite(n)) return '—'
  const r = Number(n.toPrecision(3))
  const abs = Math.abs(r)
  const units = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ]
  for (const [div, suffix] of units) {
    if (abs >= div) return `${Number((r / div).toPrecision(3))}${suffix}`
  }
  return `${r}`
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
