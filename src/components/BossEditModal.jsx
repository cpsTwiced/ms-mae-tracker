import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { BOSS_CONTENT } from '@/data/bossContent'
import DifficultyBadge from './DifficultyBadge'
import { initials } from '@/lib/icon'
import ResponsiveModal from './ResponsiveModal'
import ScrollStatusArea from './ScrollStatusArea'

const SECTIONS = [
  { cadence: 'weekly', label: 'Weekly' },
  { cadence: 'monthly', label: 'Monthly' },
]

export default function BossEditModal({
  opened,
  onClose,
  character,
  onSetDifficulty,
  onUnselectAll,
}) {
  const isMobile = useMediaQuery('(max-width: 48em)')
  const has = (boss, d) =>
    character.bossTasks.some((t) => t.key === `${boss.id}:${d}`)
  const hasSelection = character.bossTasks.length > 0

  const renderBoss = (boss) => {
    return (
      <Card key={boss.id} withBorder radius="md" padding="xs">
        <Group
          gap="sm"
          wrap={isMobile ? 'wrap' : 'nowrap'}
          align={isMobile ? 'flex-start' : 'center'}
        >
          <Group
            gap="sm"
            wrap="nowrap"
            w={isMobile ? '100%' : 220}
            style={{ flexShrink: 0, minWidth: 0 }}
          >
            <Avatar src={boss.img || undefined} alt="" radius="sm" size={40}>
              {initials(boss.name)}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                <Text size="sm" truncate style={{ minWidth: 0 }}>
                  {boss.name}
                </Text>
                {boss.note && (
                  <Tooltip withArrow multiline w={220} label={boss.note}>
                    <Text
                      size="sm"
                      c="sage"
                      aria-label={boss.note}
                      style={{ cursor: 'help', flexShrink: 0 }}
                    >
                      ⓘ
                    </Text>
                  </Tooltip>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                Lv. {boss.difficulties[0].level}
              </Text>
            </div>
          </Group>
          {/* On desktop, nowrap keeps every boss's difficulties on one row so
              all cards are the same height (the modal is wide enough for the
              four-difficulty bosses like Kalos/Kaling). On narrow screens the
              row wraps instead, so the checkboxes stay reachable without
              horizontal scrolling. */}
          <Group
            gap="sm"
            wrap={isMobile ? 'wrap' : 'nowrap'}
            justify="flex-start"
            style={{ flex: 1 }}
          >
            {boss.difficulties.map((diff) => {
              const checked = has(boss, diff.d)
              return (
                <Checkbox
                  key={diff.d}
                  w={110}
                  checked={checked}
                  aria-label={`${boss.name} ${diff.d}`}
                  onChange={(e) =>
                    onSetDifficulty(boss, diff, e.currentTarget.checked)
                  }
                  label={
                    <DifficultyBadge
                      difficulty={diff.d}
                      style={{ cursor: 'pointer' }}
                    />
                  }
                />
              )
            })}
          </Group>
        </Group>
      </Card>
    )
  }

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title="Edit Boss Content"
      size={820}
    >
      <ScrollStatusArea autosize className="pickerModalScroll">
        <Stack gap="md">
          {SECTIONS.map(({ cadence, label }) => {
            const bosses = BOSS_CONTENT.filter(
              (boss) => (boss.cadence ?? 'weekly') === cadence,
            ).sort((a, b) => a.difficulties[0].level - b.difficulties[0].level)
            if (bosses.length === 0) return null
            return (
              <Stack key={cadence} gap="xs">
                <Text size="sm" fw={700} c="dimmed" tt="uppercase">
                  {label}
                </Text>
                {bosses.map(renderBoss)}
              </Stack>
            )
          })}
        </Stack>
      </ScrollStatusArea>
      <Group mt="md" grow>
        <Button
          variant="default"
          onClick={onUnselectAll}
          disabled={!hasSelection}
        >
          Unselect All
        </Button>
        <Button onClick={onClose}>Done</Button>
      </Group>
    </ResponsiveModal>
  )
}
