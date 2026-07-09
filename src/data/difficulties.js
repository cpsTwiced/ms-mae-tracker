// Difficulty pill styling, matched to the in-game Maple Planner palette.
// Keyed by the stored `d` value. `bg`/`fg` are the pill fill and text; `border`
// defaults to the fill unless a difficulty needs an outline (Extreme).
export const DIFFICULTY_STYLE = {
  Easy: { bg: '#9aa0a6', fg: '#ffffff' },
  Normal: { bg: '#4f93cf', fg: '#ffffff' },
  Hard: { bg: '#d05f93', fg: '#ffffff' },
  Chaos: { bg: '#3a3a3c', fg: '#f0e9d6' },
  Extreme: { bg: '#241f1b', fg: '#cf7f3f', border: '#7d5230' },
}
