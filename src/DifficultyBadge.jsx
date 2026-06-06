import { Badge } from '@mantine/core'
import { DIFFICULTY_STYLE } from './difficulties'

// In-game-style difficulty pill (uppercase label, Maple Planner palette).
// `dimmed` softens it for over-level difficulties that stay selectable.
export default function DifficultyBadge({
  difficulty,
  dimmed = false,
  style,
  ...props
}) {
  const palette = DIFFICULTY_STYLE[difficulty] ?? DIFFICULTY_STYLE.Normal
  return (
    <Badge
      size="sm"
      radius="xl"
      {...props}
      // Never truncate the difficulty label — always show the full word.
      styles={{ label: { overflow: 'visible' } }}
      style={{
        // One uniform pill width for every difficulty; shorter words (Hard,
        // Easy) center with empty space on each side.
        width: 74,
        justifyContent: 'center',
        backgroundColor: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border ?? palette.bg}`,
        opacity: dimmed ? 0.45 : 1,
        ...style,
      }}
    >
      {difficulty}
    </Badge>
  )
}
