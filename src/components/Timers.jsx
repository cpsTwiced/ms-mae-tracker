import { useEffect, useState } from 'react'
import { Card, Group, Stack, Text, Tooltip } from '@mantine/core'
import {
  nextDailyReset,
  nextBossReset,
  nextEventReset,
} from '@/lib/weeklyReset'
import { formatCountdown } from '@/lib/format'

// Show each reset in the viewer's local timezone — the countdown itself is an
// absolute instant, so it is already correct everywhere; only the printed time
// needs converting from UTC.
function localTime(ts, withWeekday) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: withWeekday ? 'short' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

const TIMERS = [
  {
    label: 'Daily Reset',
    utc: '00:00 UTC daily',
    next: nextDailyReset,
    withWeekday: false,
    includes: ['Daily quests & bosses', 'MVP daily perks'],
  },
  {
    label: 'Weekly Reset',
    utc: 'Thu 00:00 UTC',
    next: nextBossReset,
    withWeekday: true,
    includes: [
      'Boss content',
      'Weekly quests & content',
      'MVP weekly perks / gifts',
    ],
  },
  {
    label: 'Event Weekly Reset',
    utc: 'Wed 00:00 UTC',
    next: nextEventReset,
    withWeekday: true,
    includes: ['Ongoing Events weekly resets'],
  },
]

export default function Timers({ className }) {
  // Own the 1-second tick here so only the countdowns re-render each second,
  // not the whole planner tree above.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <Card withBorder radius="md" padding="sm" className={className}>
      <Text fw={600} mb="xs">
        Timers
      </Text>
      <Stack gap={8}>
        {TIMERS.map((t) => {
          const next = t.next(new Date(now))
          return (
            <Group key={t.label} justify="space-between" wrap="nowrap">
              <div>
                <Group gap={6} wrap="nowrap">
                  <Text size="sm">{t.label}</Text>
                  <Tooltip
                    withArrow
                    label={
                      <Stack gap={2}>
                        <Text size="xs" fw={600}>
                          {t.utc} · resets:
                        </Text>
                        {t.includes.map((i) => (
                          <Text key={i} size="xs">
                            • {i}
                          </Text>
                        ))}
                      </Stack>
                    }
                  >
                    <Text size="xs" c="dimmed" style={{ cursor: 'help' }}>
                      ⓘ
                    </Text>
                  </Tooltip>
                </Group>
                <Text size="xs" c="dimmed">
                  {localTime(next, t.withWeekday)} your time
                </Text>
              </div>
              <Text size="sm" c="sage" ff="monospace">
                {formatCountdown(next - now)}
              </Text>
            </Group>
          )
        })}
      </Stack>
    </Card>
  )
}
