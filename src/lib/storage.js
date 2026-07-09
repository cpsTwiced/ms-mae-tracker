import { lastBossReset, lastQuestReset, lastMonthlyReset } from './weeklyReset'
import { BOSS_CONTENT } from '@/data/bossContent'
import { WEEKLY_CONTENT } from '@/data/weeklyContent'

// Namespace for the first public release. Earlier dev-only builds used other
// keys; their data is intentionally not migrated (a clean v1 starting point).
export const STORAGE_KEY = 'maple-tracker-v1'

// Hard cap on the roster size (main + mules).
export const MAX_CHARACTERS = 6

// Portraits are owned by the catalog, not user data, so tracked entries are
// re-linked by bossId on load. This keeps saved tasks in sync with catalog art.
const BOSS_BY_ID = new Map(BOSS_CONTENT.map((boss) => [boss.id, boss]))
const WEEKLY_BY_ID = new Map(WEEKLY_CONTENT.map((c) => [c.id, c]))

function uid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function stringOr(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function numberOr(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function idOr(value) {
  return stringOr(value) || uid()
}

// Reset timestamps must never be in the future: a corrupted future value would
// silently disable that reset until the future date arrives, surviving every
// reload. Clamping to the latest boundary self-heals such data.
function resetAtOr(value, latest) {
  return Math.min(numberOr(value, latest), latest)
}

export function makeCharacter(fields = {}) {
  return {
    id: uid(),
    name: fields.name ?? '',
    level: fields.level ?? 1,
    job: fields.job ?? '',
    server: fields.server ?? '',
    bossTasks: [],
    weeklyTasks: [],
  }
}

// One tracked boss at a specific difficulty.
export function makeBossTask(boss, diff) {
  return {
    id: uid(),
    key: `${boss.id}:${diff.d}`,
    bossId: boss.id,
    name: boss.name,
    img: boss.img ?? null,
    difficulty: diff.d,
    level: diff.level,
    done: false,
  }
}

// One tracked weekly-content activity.
export function makeWeeklyTask(content) {
  return {
    id: uid(),
    key: content.id,
    contentId: content.id,
    name: content.name,
    done: false,
  }
}

function freshState() {
  const character = makeCharacter({ name: 'Main' })
  return {
    characters: [character],
    activeId: character.id,
    bossResetAt: lastBossReset(),
    weeklyResetAt: lastQuestReset(),
    monthlyResetAt: lastMonthlyReset(),
  }
}

function normalizeBossTask(task) {
  if (!isRecord(task)) return null
  const name = stringOr(task.name, 'Untitled')
  const key = stringOr(task.key, name)
  const storedBossId = typeof task.bossId === 'string' ? task.bossId : null
  const storedImg = typeof task.img === 'string' ? task.img : null
  const boss = storedBossId ? BOSS_BY_ID.get(storedBossId) : null
  return {
    id: idOr(task.id),
    key: key || name,
    bossId: boss ? boss.id : storedBossId,
    name: name || key,
    img: boss ? (boss.img ?? null) : storedImg,
    difficulty: stringOr(task.difficulty),
    level: numberOr(task.level, 0),
    done: !!task.done,
  }
}

function normalizeWeeklyTask(task) {
  if (!isRecord(task)) return null
  const name = stringOr(task.name, 'Untitled')
  const key = stringOr(task.key, stringOr(task.contentId, name))
  const contentId = stringOr(task.contentId, key || name)
  // Re-link the display name to the catalog so renamed entries stay in sync.
  const content = WEEKLY_BY_ID.get(contentId)
  return {
    id: idOr(task.id),
    key: key || name,
    contentId,
    name: content ? content.name : name || key,
    done: !!task.done,
  }
}

function normalizeTasks(tasks, normalizeTask) {
  if (!Array.isArray(tasks)) return []
  return tasks.map(normalizeTask).filter(Boolean)
}

function normalizeCharacter(c, index) {
  if (!isRecord(c)) return makeCharacter({ name: `Character ${index + 1}` })
  return {
    id: idOr(c.id),
    name: stringOr(c.name, `Character ${index + 1}`),
    level: numberOr(c.level, 1),
    job: stringOr(c.job),
    server: stringOr(c.server),
    bossTasks: normalizeTasks(c.bossTasks, normalizeBossTask),
    weeklyTasks: normalizeTasks(c.weeklyTasks, normalizeWeeklyTask),
  }
}

function normalize(state) {
  if (!Array.isArray(state?.characters) || state.characters.length === 0) {
    return freshState()
  }
  const seen = new Set()
  const characters = state.characters
    .map(normalizeCharacter)
    .map((character) => {
      if (!seen.has(character.id)) {
        seen.add(character.id)
        return character
      }
      const id = uid()
      seen.add(id)
      return { ...character, id }
    })
  const ids = characters.map((c) => c.id)
  return {
    characters,
    activeId: ids.includes(state.activeId) ? state.activeId : ids[0],
    bossResetAt: resetAtOr(state.bossResetAt, lastBossReset()),
    weeklyResetAt: resetAtOr(state.weeklyResetAt, lastQuestReset()),
    monthlyResetAt: resetAtOr(state.monthlyResetAt, lastMonthlyReset()),
  }
}

export function loadState() {
  try {
    const state = deserializeState(localStorage.getItem(STORAGE_KEY))
    if (state) return state
  } catch {
    // ignore corrupt data and fall through
  }

  return freshState()
}

export function deserializeState(raw) {
  if (typeof raw !== 'string') return null
  try {
    return normalize(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
