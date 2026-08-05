import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  deserializeState,
  loadState,
  saveState,
  makeCharacter,
  makeBossTask,
  makeWeeklyTask,
  STORAGE_KEY,
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
