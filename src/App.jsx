import { useEffect, useRef, useState } from 'react'
import { Alert, Container, UnstyledButton } from '@mantine/core'
import { lastBossReset, lastMonthlyReset } from '@/lib/weeklyReset'
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
import StarForcePanel from '@/components/StarForcePanel'

const TABS = [
  { value: 'planner', label: 'Planner' },
  { value: 'starforce', label: 'Star Force' },
]

export default function App() {
  const [state, setState] = useState(loadState)
  const [saveFailed, setSaveFailed] = useState(false)
  // Which top-level tab is open. Deliberately not persisted — the planner is
  // the home view. The inactive view is unmounted entirely, which also stops
  // Timers' 1s tick while the calculator tab is open.
  const [tab, setTab] = useState('planner')
  // Serialized form of the last state written to (or received from) storage.
  // The persist effect skips the write only when the current state matches it
  // exactly, so a local mutation that races a cross-tab sync is never swallowed
  // (a boolean "skip next save" flag would drop whichever change lost the race).
  const lastSavedRef = useRef(null)

  // Apply resets when a boundary passes. Checked on mount and once a minute
  // while the app stays open — reset times are minute-granular, so a per-second
  // tick is unnecessary and would re-render the whole planner tree every second
  // (the live countdown owns its own 1s tick inside Timers). Weekly bosses and
  // weekly content reset Thursday (GMS v.264 unified them); monthly bosses
  // (Black Mage) reset on the 1st, so the weekly boundary must leave them alone.
  useEffect(() => {
    function applyResets() {
      const week = lastBossReset()
      const month = lastMonthlyReset()
      setState((s) => {
        const bosses = week > s.bossResetAt
        const monthly = month > s.monthlyResetAt
        const weeklies = week > s.weeklyResetAt
        if (!bosses && !monthly && !weeklies) return s
        return {
          ...s,
          characters: s.characters.map((c) => ({
            ...c,
            bossTasks: c.bossTasks.map((t) =>
              (isMonthlyBossTask(t) ? monthly : bosses)
                ? { ...t, done: false }
                : t,
            ),
            weeklyTasks: weeklies
              ? c.weeklyTasks.map((t) => ({ ...t, done: false }))
              : c.weeklyTasks,
          })),
          bossResetAt: Math.max(s.bossResetAt, week),
          weeklyResetAt: Math.max(s.weeklyResetAt, week),
          monthlyResetAt: Math.max(s.monthlyResetAt, month),
        }
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
      lastSavedRef.current = JSON.stringify(nextState)
      setState(nextState)
      // Don't clear saveFailed here: a sync from another tab is not proof that
      // *this* tab can write. saveFailed is owned by the local save effect and
      // clears on the next successful local save.
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Persist on every local change. Skipped only when the state is exactly what
  // was last saved / received, so cross-tab syncs aren't echoed back.
  useEffect(() => {
    const serialized = JSON.stringify(state)
    if (serialized === lastSavedRef.current) return
    if (saveState(state)) {
      lastSavedRef.current = serialized
      setSaveFailed(false)
    } else {
      setSaveFailed(true)
    }
  }, [state])

  const active =
    state.characters.find((c) => c.id === state.activeId) ?? state.characters[0]

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

  // Applies `fn` to one task list ('bossTasks' | 'weeklyTasks') of the
  // active character.
  function updateTasks(list, fn) {
    setState((s) => ({
      ...s,
      characters: s.characters.map((c) =>
        c.id === s.activeId ? { ...c, [list]: fn(c[list]) } : c,
      ),
    }))
  }
  const toggleTask = (list) => (taskId) =>
    updateTasks(list, (tasks) =>
      tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
    )
  const reorderTasks = (list) => (newOrder) => updateTasks(list, () => newOrder)

  function setBossDifficulty(boss, diff, checked) {
    const key = `${boss.id}:${diff.d}`
    updateTasks('bossTasks', (tasks) => {
      if (!checked) return tasks.filter((t) => t.key !== key)
      // Only one difficulty per boss: picking a new one replaces the boss's
      // current difficulty in place (keeping its spot in the list) instead of
      // requiring the old one to be unchecked first.
      const idx = tasks.findIndex((t) => t.bossId === boss.id)
      if (idx === -1) return [...tasks, makeBossTask(boss, diff)]
      // Carry `done` over: correcting the difficulty of a boss already
      // cleared this week shouldn't lose the checkmark.
      return tasks.map((t, i) =>
        i === idx ? { ...makeBossTask(boss, diff), done: t.done } : t,
      )
    })
  }

  function setWeeklyContent(content, checked) {
    updateTasks('weeklyTasks', (tasks) => {
      const exists = tasks.some((t) => t.key === content.id)
      if (checked && !exists) return [...tasks, makeWeeklyTask(content)]
      if (!checked && exists) return tasks.filter((t) => t.key !== content.id)
      return tasks
    })
  }

  return (
    <Container size="lg" py="md">
      <header className="appHeader">
        <div className="appBrand">
          <img src="/bosses/pinkbean.png" alt="" className="appBrandIcon" />
          <h1 className="appBrandName">Maplet</h1>
        </div>
        <div className="appTabs" role="tablist" aria-label="Maplet sections">
          {TABS.map((t) => (
            <UnstyledButton
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              className="appTab"
              data-active={tab === t.value || undefined}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </UnstyledButton>
          ))}
        </div>
      </header>

      {saveFailed && (
        <Alert color="red" title="Changes are not being saved" mb="md">
          Browser storage is unavailable or full. Keep this tab open until the
          issue is resolved.
        </Alert>
      )}

      <h2 className="pageTitle">
        {tab === 'planner' ? 'Planner' : 'Star Force Calculator'}
      </h2>

      {tab === 'planner' ? (
        <>
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
            onToggleBoss={toggleTask('bossTasks')}
            onReorderBoss={reorderTasks('bossTasks')}
            onSetBossDifficulty={setBossDifficulty}
            onClearBosses={() => updateTasks('bossTasks', () => [])}
            onToggleWeekly={toggleTask('weeklyTasks')}
            onReorderWeekly={reorderTasks('weeklyTasks')}
            onSetWeeklyContent={setWeeklyContent}
          />
        </>
      ) : (
        <StarForcePanel />
      )}
    </Container>
  )
}
