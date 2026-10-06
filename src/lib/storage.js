import { lastBossReset, lastMonthlyReset } from './weeklyReset'
import { BOSS_CONTENT } from '@/data/bossContent'
import { WEEKLY_CONTENT } from '@/data/weeklyContent'
import { MAX_STAR, MAX_SPARES, MVP_DISCOUNTS } from '@/data/starforce'

// Namespace for the first public release. Earlier dev-only builds used other
// keys; their data is intentionally not migrated (a clean v1 starting point).
export const STORAGE_KEY = 'maple-tracker-v1'

// Hard cap on the roster size (main + mules).
export const MAX_CHARACTERS = 6

// GMS in-game names run 4-12 characters, so 12 is the cap everywhere a name
// enters the app (create, edit, and stored data loaded from older versions).
export const MAX_NAME_LENGTH = 12

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
    name: (fields.name ?? '').slice(0, MAX_NAME_LENGTH),
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
    weeklyResetAt: lastBossReset(),
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
    // Truncating on load migrates names stored before the cap existed.
    name: stringOr(c.name, `Character ${index + 1}`).slice(0, MAX_NAME_LENGTH),
    level: numberOr(c.level, 1),
    job: stringOr(c.job),
    server: stringOr(c.server),
    bossTasks: normalizeTasks(c.bossTasks, normalizeBossTask),
    weeklyTasks: normalizeTasks(c.weeklyTasks, normalizeWeeklyTask),
  }
}

// Gives any entry whose id repeats an earlier one a fresh id.
function uniqueIds(items) {
  const seen = new Set()
  return items.map((item) => {
    const repeat = seen.has(item.id)
    const id = repeat ? uid() : item.id
    seen.add(id)
    return repeat ? { ...item, id } : item
  })
}

function normalize(state) {
  if (!Array.isArray(state?.characters) || state.characters.length === 0) {
    return freshState()
  }
  const characters = uniqueIds(state.characters.map(normalizeCharacter))
  const ids = characters.map((c) => c.id)
  return {
    characters,
    activeId: ids.includes(state.activeId) ? state.activeId : ids[0],
    bossResetAt: resetAtOr(state.bossResetAt, lastBossReset()),
    weeklyResetAt: resetAtOr(state.weeklyResetAt, lastBossReset()),
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

// --- Star Force saved setups ----------------------------------------------

// Saved calculator setups live under their own key so they can never touch
// planner data. The calculator's live inputs still don't persist.
export const PRESETS_KEY = 'maple-sf-presets-v1'
export const MAX_PRESETS = 30
export const MAX_PRESET_NAME_LENGTH = 24

// Every calculator input, in its stored form. Level/stars stay raw strings
// (what the text fields hold) so a half-cleared field round-trips as-is.
export const SF_DEFAULTS = {
  levelRaw: '200',
  curRaw: '0',
  targetRaw: '22',
  starCatch: true,
  safeguard: false,
  mode: 1,
  mvp: 'none',
  eventShining: false,
  eventPlusOne: false,
  runs: '3000',
  spares: '2',
  chance: '90',
}

// The Lab's "at least" chance options, as whole percents.
export const SF_CHANCES = ['50', '75', '90', '95', '99']

const SF_RUNS = ['1000', '3000', '10000', '20000']

function digitsOr(value, max, fallback) {
  if (typeof value !== 'string') return fallback
  const digits = value.replace(/\D/g, '')
  return digits === '' ? '' : String(Math.min(Number(digits), max))
}

function boolOr(value, fallback) {
  return value === undefined ? fallback : !!value
}

function normalizeSfInputs(inputs) {
  const i = isRecord(inputs) ? inputs : {}
  const d = SF_DEFAULTS
  return {
    levelRaw: digitsOr(i.levelRaw, 300, d.levelRaw),
    curRaw: digitsOr(i.curRaw, MAX_STAR, d.curRaw),
    targetRaw: digitsOr(i.targetRaw, MAX_STAR, d.targetRaw),
    starCatch: boolOr(i.starCatch, d.starCatch),
    safeguard: boolOr(i.safeguard, d.safeguard),
    mode: [1, 2, 3, 4].includes(i.mode) ? i.mode : d.mode,
    mvp: Object.hasOwn(MVP_DISCOUNTS, i.mvp) ? i.mvp : d.mvp,
    eventShining: boolOr(i.eventShining, d.eventShining),
    eventPlusOne: boolOr(i.eventPlusOne, d.eventPlusOne),
    runs: SF_RUNS.includes(i.runs) ? i.runs : d.runs,
    spares: digitsOr(i.spares, MAX_SPARES, d.spares),
    chance: SF_CHANCES.includes(i.chance) ? i.chance : d.chance,
  }
}

// Share links carry every input as a short, readable query param
// (?lv=200&from=0&to=22…), each with its own parser. Booleans travel as 1/0.
// A parser returns undefined for junk, which normalizeSfInputs then replaces
// with the default.
const yesNo = (v) => (v === '1' ? true : v === '0' ? false : undefined)
const whole = (v) => (/^\d+$/.test(v) ? v : undefined)
const SHARE_PARAMS = {
  lv: ['levelRaw', whole],
  from: ['curRaw', whole],
  to: ['targetRaw', whole],
  sc: ['starCatch', yesNo],
  sg: ['safeguard', yesNo],
  mode: ['mode', Number],
  mvp: ['mvp', String],
  shine: ['eventShining', yesNo],
  plus: ['eventPlusOne', yesNo],
  runs: ['runs', String],
  sp: ['spares', whole],
  ch: ['chance', String],
}

export function sfInputsToQuery(inputs) {
  const params = new URLSearchParams()
  for (const [param, [field]] of Object.entries(SHARE_PARAMS)) {
    const value = inputs[field]
    params.set(param, typeof value === 'boolean' ? Number(value) : value)
  }
  return params.toString()
}

// Links are untrusted, so values go through the same repair as stored
// setups. Null when the link carries no usable calculator settings (say, a
// stray ?from=reddit tag), so the caller leaves the address alone.
export function sfInputsFromQuery(search) {
  const params = new URLSearchParams(search)
  const inputs = {}
  for (const [param, [field, parse]] of Object.entries(SHARE_PARAMS)) {
    if (!params.has(param)) continue
    const value = parse(params.get(param))
    if (value !== undefined) inputs[field] = value
  }
  return Object.keys(inputs).length ? normalizeSfInputs(inputs) : null
}

// Splits a name into the characters a person sees, so the length cap counts
// an emoji as one and never cuts one in half. Firefox before 125 has no
// Segmenter; splitting by code point there keeps simple emoji whole but can
// separate multi-part ones (skin tones, flags, ZWJ sequences).
let segmenter
export function nameChars(name) {
  if (!Intl.Segmenter) return Array.from(name)
  segmenter ??= new Intl.Segmenter()
  return Array.from(segmenter.segment(name), (s) => s.segment)
}

function presetName(name) {
  return nameChars(name.trim()).slice(0, MAX_PRESET_NAME_LENGTH).join('')
}

export function makePreset(name, inputs) {
  return { id: uid(), name: presetName(name), inputs: { ...inputs } }
}

function normalizePresets(list) {
  if (!Array.isArray(list)) return []
  return uniqueIds(
    list
      .filter(isRecord)
      .slice(0, MAX_PRESETS)
      .map((p) => ({
        id: idOr(p.id),
        name: presetName(stringOr(p.name)) || 'Untitled',
        inputs: normalizeSfInputs(p.inputs),
      })),
  )
}

export function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    const presets = normalizePresets(JSON.parse(raw))
    // Store any repairs: a repaired id is random, so without this every read
    // would give that setup a new id and changes to it would miss.
    if (raw !== null && JSON.stringify(presets) !== raw) savePresets(presets)
    return presets
  } catch {
    return []
  }
}

export function savePresets(presets) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
    return true
  } catch {
    return false
  }
}
