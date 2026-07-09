import { Badge } from '@mantine/core'
import { DIFFICULTY_STYLE } from '@/data/difficulties'

// In-game-style difficulty pill (uppercase label, Maple Planner palette).
export default function DifficultyBadge({ difficulty, style, ...props }) {
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
        ...style,
      }}
    >
      {difficulty}
    </Badge>
  )
}
