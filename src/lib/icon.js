// Fallback shown in an avatar when there's no portrait (weekly content, or the
// handful of bosses with no available art).
export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}
