import { useEffect, useRef, useState } from 'react'
import { Alert, Container, Title } from '@mantine/core'
import {
  lastBossReset,
  lastQuestReset,
  lastMonthlyReset,
} from '@/lib/weeklyReset'
import {
  loadState,
  saveState,
  makeCharacter,
  makeBossTask,
  makeWeeklyTask,
  MAX_CHARACTERS,
  STORAGE_KEY,
  deserializeState,
} from '@/lib/storage'
import { isMonthlyBossTask } from '@/data/bossContent'
import Tracker from '@/components/Tracker'
import CharacterBar from '@/components/CharacterBar'

export default function App() {
  const [state, setState] = useState(loadState)
  const [saveFailed, setSaveFailed] = useState(false)
  const skipNextSave = useRef(false)

  // Apply resets when a boundary passes. Checked on mount and once a minute
  // while the app stays open — reset times are minute-granular, so a per-second
  // tick is unnecessary and would re-render the whole planner tree every second
  // (the live countdown owns its own 1s tick inside Timers). Weekly bosses and
  // weekly content reset Thursday (GMS v.264 unified them); monthly bosses
  // (Black Mage) reset on the 1st, so the weekly boundary must leave them alone.
  useEffect(() => {
    function applyResets() {
      const boss = lastBossReset()
      const quest = lastQuestReset()
      const month = lastMonthlyReset()
      setState((s) => {
        let characters = s.characters
        let bossResetAt = s.bossResetAt
        let weeklyResetAt = s.weeklyResetAt
        let monthlyResetAt = s.monthlyResetAt
        let changed = false
        if (boss > s.bossResetAt) {
          characters = characters.map((c) => ({
            ...c,
            bossTasks: c.bossTasks.map((t) =>
              isMonthlyBossTask(t) ? t : { ...t, done: false },
            ),
          }))
          bossResetAt = boss
          changed = true
        }
        if (month > s.monthlyResetAt) {
          characters = characters.map((c) => ({
            ...c,
            bossTasks: c.bossTasks.map((t) =>
              isMonthlyBossTask(t) ? { ...t, done: false } : t,
            ),
          }))
          monthlyResetAt = month
          changed = true
        }
        if (quest > s.weeklyResetAt) {
          characters = characters.map((c) => ({
            ...c,
            weeklyTasks: c.weeklyTasks.map((t) => ({ ...t, done: false })),
          }))
          weeklyResetAt = quest
          changed = true
        }
        return changed
          ? { ...s, characters, bossResetAt, weeklyResetAt, monthlyResetAt }
          : s
      })
    }
    applyResets()
    const id = setInterval(applyResets, 60_000)
    return () => clearInterval(id)
  }, [])

  // Keep open tabs in sync. The storage event only fires in other tabs, and the
  // ref prevents the received state from being written straight back.
  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== STORAGE_KEY || event.newValue === null) return
      const nextState = deserializeState(event.newValue)
      if (!nextState) return
      skipNextSave.current = true
      setState(nextState)
      // Don't clear saveFailed here: a sync from another tab is not proof that
      // *this* tab can write. saveFailed is owned by the local save effect and
      // clears on the next successful local save.
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Persist on every local change.
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setSaveFailed(!saveState(state))
  }, [state])

  const active =
    state.characters.find((c) => c.id === state.activeId) ?? state.characters[0]

  function mapActive(s, fn) {
    return {
      ...s,
      characters: s.characters.map((c) => (c.id === s.activeId ? fn(c) : c)),
    }
  }

  function setActive(id) {
    setState((s) => ({ ...s, activeId: id }))
  }

  function addCharacter(fields) {
    setState((s) => {
      if (s.characters.length >= MAX_CHARACTERS) return s
      const c = makeCharacter(fields)
      return { ...s, characters: [...s.characters, c], activeId: c.id }
    })
  }

  function updateCharacter(id, patch) {
    setState((s) => ({
      ...s,
      characters: s.characters.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }))
  }

  function removeCharacter(id) {
    setState((s) => {
      if (s.characters.length <= 1) return s
      const characters = s.characters.filter((c) => c.id !== id)
      const activeId = s.activeId === id ? characters[0].id : s.activeId
      return { ...s, characters, activeId }
    })
  }

  function reorderCharacters(newOrder) {
    setState((s) => ({ ...s, characters: newOrder }))
  }

  // --- Boss tasks (active character) ---
  function setBossDifficulty(boss, diff, checked) {
    setState((s) =>
      mapActive(s, (c) => {
        const key = `${boss.id}:${diff.d}`
        if (!checked)
          return { ...c, bossTasks: c.bossTasks.filter((t) => t.key !== key) }
        // Only one difficulty per boss: picking a new one replaces the boss's
        // current difficulty in place (keeping its spot in the list) instead of
        // requiring the old one to be unchecked first.
        const idx = c.bossTasks.findIndex((t) => t.bossId === boss.id)
        if (idx === -1)
          return { ...c, bossTasks: [...c.bossTasks, makeBossTask(boss, diff)] }
        return {
          ...c,
          bossTasks: c.bossTasks.map((t, i) =>
            i === idx ? makeBossTask(boss, diff) : t,
          ),
        }
      }),
    )
  }
  function toggleBoss(taskId) {
    setState((s) =>
      mapActive(s, (c) => ({
        ...c,
        bossTasks: c.bossTasks.map((t) =>
          t.id === taskId ? { ...t, done: !t.done } : t,
        ),
      })),
    )
  }
  function removeBoss(taskId) {
    setState((s) =>
      mapActive(s, (c) => ({
        ...c,
        bossTasks: c.bossTasks.filter((t) => t.id !== taskId),
      })),
    )
  }
  function reorderBoss(newOrder) {
    setState((s) => mapActive(s, (c) => ({ ...c, bossTasks: newOrder })))
  }
  function clearBosses() {
    setState((s) => mapActive(s, (c) => ({ ...c, bossTasks: [] })))
  }

  // --- Weekly tasks (active character) ---
  function setWeeklyContent(content, checked) {
    setState((s) =>
      mapActive(s, (c) => {
        const exists = c.weeklyTasks.some((t) => t.key === content.id)
        if (checked && !exists)
          return {
            ...c,
            weeklyTasks: [...c.weeklyTasks, makeWeeklyTask(content)],
          }
        if (!checked && exists)
          return {
            ...c,
            weeklyTasks: c.weeklyTasks.filter((t) => t.key !== content.id),
          }
        return c
      }),
    )
  }
  function toggleWeekly(taskId) {
    setState((s) =>
      mapActive(s, (c) => ({
        ...c,
        weeklyTasks: c.weeklyTasks.map((t) =>
          t.id === taskId ? { ...t, done: !t.done } : t,
        ),
      })),
    )
  }
  function removeWeekly(taskId) {
    setState((s) =>
      mapActive(s, (c) => ({
        ...c,
        weeklyTasks: c.weeklyTasks.filter((t) => t.id !== taskId),
      })),
    )
  }
  function reorderWeekly(newOrder) {
    setState((s) => mapActive(s, (c) => ({ ...c, weeklyTasks: newOrder })))
  }

  return (
    <Container size="lg" py="md">
      <Title order={1} size="h2">
        Maplet
      </Title>

      {saveFailed && (
        <Alert color="red" title="Changes are not being saved" mt="md">
          Browser storage is unavailable or full. Keep this tab open until the
          issue is resolved.
        </Alert>
      )}

      <CharacterBar
        characters={state.characters}
        activeId={active.id}
        onSelect={setActive}
        onAdd={addCharacter}
        onUpdate={updateCharacter}
        onRemove={removeCharacter}
        onReorder={reorderCharacters}
      />

      <Tracker
        character={active}
        onToggleBoss={toggleBoss}
        onRemoveBoss={removeBoss}
        onReorderBoss={reorderBoss}
        onSetBossDifficulty={setBossDifficulty}
        onClearBosses={clearBosses}
        onToggleWeekly={toggleWeekly}
        onRemoveWeekly={removeWeekly}
        onReorderWeekly={reorderWeekly}
        onSetWeeklyContent={setWeeklyContent}
      />
    </Container>
  )
}
