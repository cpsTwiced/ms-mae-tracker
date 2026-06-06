import { useState } from 'react'
import { Stack } from '@mantine/core'
import Timers from './Timers'
import ContentPanel from './ContentPanel'
import BossEditModal from './BossEditModal'
import WeeklyEditModal from './WeeklyEditModal'
import { isMonthlyBossTask } from './bossContent'
import {
  WEEKLY_SECTIONS,
  weeklyCategoryOf,
  weeklyOrderOf,
} from './weeklyContent'

export default function Tracker({
  character,
  now,
  onToggleBoss,
  onRemoveBoss,
  onReorderBoss,
  onSetBossDifficulty,
  onClearBosses,
  onToggleWeekly,
  onRemoveWeekly,
  onReorderWeekly,
  onSetWeeklyContent,
}) {
  const [bossOpen, setBossOpen] = useState(false)
  const [weeklyOpen, setWeeklyOpen] = useState(false)

  // Split tracked bosses into the same Weekly / Monthly sections as the picker.
  const bossSections = [
    {
      key: 'weekly',
      label: 'Weekly',
      items: character.bossTasks.filter((t) => !isMonthlyBossTask(t)),
    },
    {
      key: 'monthly',
      label: 'Monthly',
      items: character.bossTasks.filter(isMonthlyBossTask),
    },
  ]

  // Group tracked weekly content into the Content / Guild / Quest sections,
  // ordered to match the edit modal (catalog order), not the add order.
  const weeklySections = WEEKLY_SECTIONS.map((s) => ({
    key: s.key,
    label: s.label,
    items: character.weeklyTasks
      .filter((t) => weeklyCategoryOf(t) === s.key)
      .sort((a, b) => weeklyOrderOf(a) - weeklyOrderOf(b)),
  }))

  return (
    <Stack gap="sm" mt="sm">
      {/* Two equal-height desktop columns: Timers + Weekly stacked on the left,
          Boss on the right. The content panes scroll inside a shorter shared
          height (see index.css). On narrow screens the columns stack and the
          page scrolls normally. */}
      <div className="plannerGrid">
        <div className="plannerCol">
          <Timers now={now} className="timersPane" />

          <ContentPanel
            title="Weekly Content"
            sections={weeklySections}
            onEdit={() => setWeeklyOpen(true)}
            onToggle={onToggleWeekly}
            onRemove={onRemoveWeekly}
            onReorder={onReorderWeekly}
            showAvatar={false}
            allowRemove={false}
            reorderable={false}
            scrollable
            emptyText="No weekly content yet. Tap Edit to add tasks."
          />
        </div>

        <div className="plannerCol">
          <ContentPanel
            title="Boss Content"
            sections={bossSections}
            onEdit={() => setBossOpen(true)}
            onToggle={onToggleBoss}
            onRemove={onRemoveBoss}
            onReorder={onReorderBoss}
            allowRemove={false}
            scrollable
            emptyText="No boss content yet. Tap Edit to add bosses."
          />
        </div>
      </div>

      <BossEditModal
        opened={bossOpen}
        onClose={() => setBossOpen(false)}
        character={character}
        onSetDifficulty={onSetBossDifficulty}
        onUnselectAll={onClearBosses}
      />
      <WeeklyEditModal
        opened={weeklyOpen}
        onClose={() => setWeeklyOpen(false)}
        character={character}
        onSetContent={onSetWeeklyContent}
      />
    </Stack>
  )
}
