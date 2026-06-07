import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadState,
  saveState,
  makeCharacter,
  makeBossTask,
  makeWeeklyTask,
} from './storage'

beforeEach(() => {
  localStorage.clear()
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

  it('migrates the original single-list format into boss tasks', () => {
    localStorage.setItem(
      'maple-weekly-tasks',
      JSON.stringify({
        tasks: [{ id: 'a', text: 'Hard Lotus', done: true }],
        resetAt: 123,
      }),
    )
    const s = loadState()
    expect(s.characters[0].bossTasks).toEqual([
      {
        id: 'a',
        key: 'Hard Lotus',
        bossId: null,
        name: 'Hard Lotus',
        img: null,
        difficulty: '',
        level: 0,
        done: true,
      },
    ])
    expect(s.bossResetAt).toBe(123)
  })

  it('migrates a v2 character that still uses the bosses field', () => {
    saveState({
      characters: [
        {
          id: 'x',
          name: 'Legacy',
          level: 200,
          job: '',
          server: '',
          bosses: [{ id: 'b1', name: 'Zakum', done: false }],
        },
      ],
      activeId: 'x',
      resetAt: 555,
    })
    const c = loadState().characters[0]
    expect(c.bosses).toBeUndefined()
    expect(c.weeklyTasks).toEqual([])
    expect(c.bossTasks[0]).toMatchObject({
      id: 'b1',
      name: 'Zakum',
      done: false,
    })
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

  it('links legacy boss tasks without a bossId to the catalog by name', () => {
    saveState({
      characters: [
        {
          id: 'c1',
          name: 'Main',
          level: 250,
          job: '',
          server: '',
          bossTasks: [
            // Pre-bossId shape: only a name, no id and no portrait.
            {
              id: 't1',
              key: 'Guardian Angel Slime',
              bossId: null,
              name: 'Guardian Angel Slime',
              img: null,
              difficulty: '',
              level: 0,
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
    expect(task.bossId).toBe('slime')
    expect(task.img).toBe('/bosses/slime.png')
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
    saveState(saved)
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
      'maple-tracker-v2',
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

  it('ignores storage write failures', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('quota exceeded')
    }

    expect(() => saveState({ characters: [] })).not.toThrow()

    Storage.prototype.setItem = original
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
