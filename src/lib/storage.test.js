import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  deserializeState,
  loadState,
  saveState,
  makeCharacter,
  makeBossTask,
  makeWeeklyTask,
  STORAGE_KEY,
  loadPresets,
  savePresets,
  makePreset,
  SF_DEFAULTS,
  PRESETS_KEY,
  MAX_PRESETS,
  MAX_PRESET_NAME_LENGTH,
  sfInputsToQuery,
  sfInputsFromQuery,
} from './storage'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadState', () => {
  it('returns a single Main character by default', () => {
    const s = loadState()
    expect(s.characters).toHaveLength(1)
    expect(s.characters[0].name).toBe('Main')
    expect(s.activeId).toBe(s.characters[0].id)
    expect(typeof s.bossResetAt).toBe('number')
    expect(typeof s.weeklyResetAt).toBe('number')
    expect(typeof s.monthlyResetAt).toBe('number')
  })

  it('refreshes boss portraits from the catalog on load', () => {
    saveState({
      characters: [
        {
          id: 'c1',
          name: 'Main',
          level: 280,
          job: '',
          server: '',
          bossTasks: [
            // Tracked before the portrait existed: stored img is null.
            {
              id: 't1',
              key: 'lotus:Normal',
              bossId: 'lotus',
              name: 'Lotus',
              img: null,
              difficulty: 'Normal',
              level: 210,
              done: false,
            },
          ],
          weeklyTasks: [],
        },
      ],
      activeId: 'c1',
      bossResetAt: 1,
      weeklyResetAt: 2,
    })
    const task = loadState().characters[0].bossTasks[0]
    expect(task.img).toBe('/bosses/lotus.png')
  })

  it('round-trips a saved state', () => {
    const character = makeCharacter({
      name: 'Mule',
      level: 260,
      job: 'Night Lord',
      server: 'Kronos',
    })
    const saved = {
      characters: [character],
      activeId: character.id,
      bossResetAt: 1000,
      weeklyResetAt: 2000,
      monthlyResetAt: 3000,
    }
    expect(saveState(saved)).toBe(true)
    expect(loadState()).toEqual(saved)
  })

  it('repairs an invalid active id', () => {
    const character = makeCharacter({ name: 'A' })
    saveState({
      characters: [character],
      activeId: 'nope',
      bossResetAt: 1,
      weeklyResetAt: 2,
    })
    expect(loadState().activeId).toBe(character.id)
  })

  it('repairs malformed character fields and task lists', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters: [
          {
            id: '',
            name: 123,
            level: '260',
            job: null,
            server: false,
            bossTasks: null,
            weeklyTasks: [{ id: '', key: 42, name: 'Guild Culvert', done: 1 }],
          },
        ],
        activeId: 'missing',
        bossResetAt: 'bad',
        weeklyResetAt: null,
      }),
    )

    const s = loadState()
    expect(s.characters).toHaveLength(1)
    expect(s.characters[0]).toMatchObject({
      name: 'Character 1',
      level: 1,
      job: '',
      server: '',
      bossTasks: [],
    })
    expect(s.characters[0].id).toEqual(expect.any(String))
    expect(s.characters[0].weeklyTasks[0]).toMatchObject({
      key: 'Guild Culvert',
      contentId: 'Guild Culvert',
      name: 'Guild Culvert',
      done: true,
    })
    expect(s.activeId).toBe(s.characters[0].id)
    expect(typeof s.bossResetAt).toBe('number')
    expect(typeof s.weeklyResetAt).toBe('number')
    expect(typeof s.monthlyResetAt).toBe('number')
  })

  it('clamps future reset timestamps so resets self-heal', () => {
    const character = makeCharacter({ name: 'A' })
    const future = Date.now() + 365 * 24 * 60 * 60 * 1000
    saveState({
      characters: [character],
      activeId: character.id,
      bossResetAt: future,
      weeklyResetAt: future,
      monthlyResetAt: future,
    })

    const s = loadState()
    expect(s.bossResetAt).toBeLessThanOrEqual(Date.now())
    expect(s.weeklyResetAt).toBeLessThanOrEqual(Date.now())
    expect(s.monthlyResetAt).toBeLessThanOrEqual(Date.now())
  })

  it('repairs duplicate character ids', () => {
    saveState({
      characters: [
        { id: 'same', name: 'A' },
        { id: 'same', name: 'B' },
      ],
      activeId: 'same',
      bossResetAt: 1,
      weeklyResetAt: 2,
    })

    const ids = loadState().characters.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reports storage write failures', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(saveState({ characters: [] })).toBe(false)
  })
})

describe('makeCharacter', () => {
  it('applies defaults', () => {
    expect(makeCharacter({ name: 'Solo' })).toMatchObject({
      name: 'Solo',
      level: 1,
      job: '',
      server: '',
      bossTasks: [],
      weeklyTasks: [],
    })
  })

  it('caps names at the 12-character GMS limit', () => {
    expect(makeCharacter({ name: 'x'.repeat(40) }).name).toHaveLength(12)
    // Stored data from before the cap is truncated on load, too.
    const state = deserializeState(
      JSON.stringify({
        characters: [{ id: 'c1', name: 'y'.repeat(86), level: 200 }],
        activeId: 'c1',
      }),
    )
    expect(state.characters[0].name).toBe('y'.repeat(12))
  })
})

describe('makeBossTask', () => {
  it('builds a tracked boss-difficulty entry', () => {
    const boss = { id: 'lotus', name: 'Lotus', img: '/bosses/lotus.png' }
    const t = makeBossTask(boss, { d: 'Hard', level: 245 })
    expect(t).toMatchObject({
      key: 'lotus:Hard',
      bossId: 'lotus',
      name: 'Lotus',
      img: '/bosses/lotus.png',
      difficulty: 'Hard',
      level: 245,
      done: false,
    })
  })
})

describe('makeWeeklyTask', () => {
  it('builds a tracked weekly content entry', () => {
    const t = makeWeeklyTask({ id: 'guildculvert', name: 'Guild Culvert' })
    expect(t).toMatchObject({
      key: 'guildculvert',
      contentId: 'guildculvert',
      name: 'Guild Culvert',
      done: false,
    })
  })
})

describe('deserializeState', () => {
  it('rejects invalid serialized data', () => {
    expect(deserializeState('{broken')).toBeNull()
    expect(deserializeState(null)).toBeNull()
  })
})

describe('STORAGE_KEY', () => {
  it('reads and writes under the v1 key', () => {
    expect(STORAGE_KEY).toBe('maple-tracker-v1')

    const character = makeCharacter({ name: 'Reader' })
    saveState({
      characters: [character],
      activeId: character.id,
      bossResetAt: 1,
      weeklyResetAt: 2,
      monthlyResetAt: 3,
    })

    expect(localStorage.getItem(STORAGE_KEY)).toContain('Reader')
    expect(loadState().characters[0].name).toBe('Reader')
  })

  it('starts fresh and leaves data under any other key untouched (no migration)', () => {
    // A blob under an old/other key is intentionally ignored on v1 load.
    localStorage.setItem(
      'maple-tracker-v2',
      JSON.stringify({
        characters: [{ id: 'old', name: 'Legacy' }],
        activeId: 'old',
      }),
    )

    const s = loadState()
    expect(s.characters).toHaveLength(1)
    expect(s.characters[0].name).toBe('Main')
    expect(localStorage.getItem('maple-tracker-v2')).not.toBeNull()
  })
})

describe('Star Force presets', () => {
  it('loads an empty list when nothing is saved', () => {
    expect(loadPresets()).toEqual([])
  })

  it('round-trips presets under their own key', () => {
    const preset = makePreset('  Genesis wep 22★ ', { ...SF_DEFAULTS, mode: 3 })
    expect(preset.name).toBe('Genesis wep 22★')
    expect(savePresets([preset])).toBe(true)
    expect(JSON.parse(localStorage.getItem(PRESETS_KEY))).toHaveLength(1)
    expect(loadPresets()).toEqual([preset])
  })

  it('caps names at the max length', () => {
    const preset = makePreset('x'.repeat(40), SF_DEFAULTS)
    expect(preset.name).toHaveLength(MAX_PRESET_NAME_LENGTH)
  })

  it('never cuts an emoji in half at the length cap', () => {
    const name = 'x'.repeat(MAX_PRESET_NAME_LENGTH - 1) + '🔥👍🏽'
    expect(makePreset(name, SF_DEFAULTS).name).toBe(
      'x'.repeat(MAX_PRESET_NAME_LENGTH - 1) + '🔥',
    )
  })

  it('keeps single-code-point emoji whole without Intl.Segmenter', () => {
    vi.stubGlobal('Intl', {})
    try {
      const name = 'x'.repeat(MAX_PRESET_NAME_LENGTH - 1) + '🔥🔥'
      expect(makePreset(name, SF_DEFAULTS).name).toBe(
        'x'.repeat(MAX_PRESET_NAME_LENGTH - 1) + '🔥',
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('repairs malformed entries and drops unreadable ones', () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        null,
        'junk',
        {
          id: 'a',
          name: 'Ok',
          inputs: { mode: 9, mvp: 'platinum', runs: '7' },
        },
        { id: 'a', name: 42, inputs: { levelRaw: '1x5', starCatch: 0 } },
        { id: 'b', name: 'y'.repeat(40) },
      ]),
    )
    const [ok, dupe, noInputs] = loadPresets()
    expect(ok.inputs).toEqual(SF_DEFAULTS)
    expect(dupe.id).not.toBe('a')
    expect(dupe.name).toBe('Untitled')
    expect(dupe.inputs.levelRaw).toBe('15')
    expect(dupe.inputs.starCatch).toBe(false)
    expect(noInputs.name).toHaveLength(MAX_PRESET_NAME_LENGTH)
    expect(noInputs.inputs).toEqual(SF_DEFAULTS)
    // The repaired id was stored, so the next read agrees on it.
    expect(loadPresets()[1].id).toBe(dupe.id)
  })

  it('keeps at most the max number of presets', () => {
    const many = Array.from({ length: MAX_PRESETS + 5 }, (_, i) =>
      makePreset(`p${i}`, SF_DEFAULTS),
    )
    localStorage.setItem(PRESETS_KEY, JSON.stringify(many))
    expect(loadPresets()).toHaveLength(MAX_PRESETS)
  })

  it('falls back to an empty list on corrupt JSON', () => {
    localStorage.setItem(PRESETS_KEY, '{nope')
    expect(loadPresets()).toEqual([])
  })

  it('reports a failed write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    expect(savePresets([])).toBe(false)
  })
})

describe('Star Force share links', () => {
  it('writes every input as a readable query', () => {
    expect(sfInputsToQuery(SF_DEFAULTS)).toBe(
      'lv=200&from=0&to=22&sc=1&sg=0&mode=1&mvp=none&shine=0&plus=0&runs=3000',
    )
  })

  it('round-trips every input', () => {
    const inputs = {
      levelRaw: '160',
      curRaw: '12',
      targetRaw: '21',
      starCatch: false,
      safeguard: true,
      mode: 3,
      mvp: 'gold',
      eventShining: true,
      eventPlusOne: true,
      runs: '10000',
    }
    expect(sfInputsFromQuery(`?${sfInputsToQuery(inputs)}`)).toEqual(inputs)
  })

  it('returns null when the link carries no usable settings', () => {
    expect(sfInputsFromQuery('')).toBeNull()
    expect(sfInputsFromQuery('?ref=discord')).toBeNull()
    // A tracking tag that happens to share a param name.
    expect(sfInputsFromQuery('?from=reddit')).toBeNull()
    expect(sfInputsFromQuery('?lv=1.5e2&to=-25')).toBeNull()
  })

  it('falls back to defaults for missing or junk values', () => {
    expect(
      sfInputsFromQuery('?lv=999&to=abc&sc=maybe&mode=9&mvp=bogus&runs=7'),
    ).toEqual({ ...SF_DEFAULTS, levelRaw: '300' })
  })

  it('ignores built-in object names as toggle values', () => {
    expect(
      sfInputsFromQuery('?lv=200&sg=constructor&shine=toString&sc=__proto__'),
    ).toEqual(SF_DEFAULTS)
  })
})
