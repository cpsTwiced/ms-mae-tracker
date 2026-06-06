import { lastBossReset, lastQuestReset, lastMonthlyReset } from './weeklyReset'
import { BOSS_CONTENT } from './bossContent'
import { WEEKLY_CONTENT } from './weeklyContent'

const KEY = 'maple-tracker-v2'
const OLD_KEY = 'maple-weekly-tasks'

// Hard cap on the roster size (main + mules).
export const MAX_CHARACTERS = 6

// Portraits are owned by the catalog, not user data, so we re-link tracked
// entries to the catalog on load (see normalizeBossTask). This lets art added
// for a boss show up for entries tracked before the portrait existed, including
// legacy entries that predate `bossId` (matched by name as a fallback).
const BOSS_BY_ID = new Map(BOSS_CONTENT.map((boss) => [boss.id, boss]))
const BOSS_BY_NAME = new Map(
  BOSS_CONTENT.map((boss) => [boss.name.toLowerCase(), boss]),
)
const WEEKLY_BY_ID = new Map(WEEKLY_CONTENT.map((c) => [c.id, c]))

function findCatalogBoss(bossId, name) {
  if (bossId && BOSS_BY_ID.has(bossId)) return BOSS_BY_ID.get(bossId)
  if (name && BOSS_BY_NAME.has(name.toLowerCase())) {
    return BOSS_BY_NAME.get(name.toLowerCase())
  }
  return null
}

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

function legacyBossesToTasks(bosses) {
  if (!Array.isArray(bosses)) return []
  return bosses
    .map((b) => {
      if (!isRecord(b)) return null
      const name = stringOr(b.name, stringOr(b.text, 'Untitled'))
      return {
        id: idOr(b.id),
        key: name,
        bossId: null,
        name,
        img: null,
        difficulty: '',
        level: 0,
        done: !!b.done,
      }
    })
    .filter(Boolean)
}

function normalizeBossTask(task) {
  if (!isRecord(task)) return null
  const name = stringOr(task.name, stringOr(task.text, 'Untitled'))
  const key = stringOr(task.key, name)
  const storedBossId = typeof task.bossId === 'string' ? task.bossId : null
  const storedImg = typeof task.img === 'string' ? task.img : null
  // Re-link to the catalog (by id, else by name) so the portrait stays in sync
  // even for legacy entries; fall back to stored values when nothing matches.
  const boss = findCatalogBoss(storedBossId, name)
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
  const name = stringOr(task.name, stringOr(task.text, 'Untitled'))
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
  const base = {
    id: idOr(c.id),
    name: stringOr(c.name, `Character ${index + 1}`),
    level: numberOr(c.level, 1),
    job: stringOr(c.job),
    server: stringOr(c.server),
    bossTasks: normalizeTasks(c.bossTasks, normalizeBossTask),
    weeklyTasks: normalizeTasks(c.weeklyTasks, normalizeWeeklyTask),
  }
  // Migrate the previous single `bosses` list into bossTasks.
  if (Array.isArray(c.bosses) && base.bossTasks.length === 0) {
    base.bossTasks = legacyBossesToTasks(c.bosses)
  }
  return base
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
    bossResetAt: numberOr(state.bossResetAt ?? state.resetAt, lastBossReset()),
    weeklyResetAt: numberOr(state.weeklyResetAt, lastQuestReset()),
    monthlyResetAt: numberOr(state.monthlyResetAt, lastMonthlyReset()),
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    // ignore corrupt data and fall through
  }

  // One-time migration from the original single-list MVP.
  try {
    const old = JSON.parse(localStorage.getItem(OLD_KEY))
    if (old?.tasks?.length) {
      const character = makeCharacter({ name: 'Main' })
      character.bossTasks = legacyBossesToTasks(
        old.tasks.map((t) => ({ id: t.id, name: t.text, done: t.done })),
      )
      return {
        characters: [character],
        activeId: character.id,
        bossResetAt: old.resetAt ?? lastBossReset(),
        weeklyResetAt: lastQuestReset(),
        monthlyResetAt: lastMonthlyReset(),
      }
    }
  } catch {
    // ignore and start fresh
  }

  return freshState()
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Ignore browser storage failures so the tracker stays usable.
  }
}
