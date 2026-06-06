import { Button, Card, Checkbox, Group, Stack, Text } from '@mantine/core'
import { WEEKLY_CONTENT, WEEKLY_SECTIONS } from './weeklyContent'
import ResponsiveModal from './ResponsiveModal'
import ScrollStatusArea from './ScrollStatusArea'

export default function WeeklyEditModal({
  opened,
  onClose,
  character,
  onSetContent,
}) {
  const has = (content) =>
    character.weeklyTasks.some((t) => t.key === content.id)

  const renderContent = (content) => {
    const checked = has(content)
    return (
      <Card
        key={content.id}
        withBorder
        radius="md"
        padding="xs"
        style={{ cursor: 'pointer' }}
        onClick={() => onSetContent(content, !checked)}
      >
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" truncate style={{ minWidth: 0 }}>
            {content.name}
          </Text>
          <Checkbox
            checked={checked}
            onChange={(e) => onSetContent(content, e.currentTarget.checked)}
            // Avoid double-toggling with the card's onClick.
            onClick={(e) => e.stopPropagation()}
            aria-label={content.name}
          />
        </Group>
      </Card>
    )
  }

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title="Edit Weekly Content"
      size="md"
    >
      <ScrollStatusArea autosize mah="55vh">
        <Stack gap="md">
          {WEEKLY_SECTIONS.map(({ key, label }) => {
            const items = WEEKLY_CONTENT.filter((c) => c.category === key)
            if (items.length === 0) return null
            return (
              <Stack key={key} gap="xs">
                <Text size="sm" fw={700} c="dimmed" tt="uppercase">
                  {label}
                </Text>
                {items.map(renderContent)}
              </Stack>
            )
          })}
        </Stack>
      </ScrollStatusArea>
      <Button fullWidth mt="md" onClick={onClose}>
        Done
      </Button>
    </ResponsiveModal>
  )
}
