import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import App from './App'
import { STORAGE_KEY } from '@/lib/storage'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderApp() {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  )
}

describe('App', () => {
  it('renders the title and timers', () => {
    renderApp()
    expect(screen.getByText('Maplet')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Characters' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Timers')).toBeInTheDocument()
    expect(screen.getByText('Daily Reset')).toBeInTheDocument()
    expect(screen.getByText('Weekly Reset')).toBeInTheDocument()
    expect(screen.getByText('Event Weekly Reset')).toBeInTheDocument()
  })

  it('shows both content panels with empty states', () => {
    renderApp()
    expect(screen.getByText('Boss Content')).toBeInTheDocument()
    expect(screen.getByText('Weekly Content')).toBeInTheDocument()
    expect(screen.getByText(/No boss content yet/i)).toBeInTheDocument()
  })

  it('switches between the Planner and Star Force tabs', () => {
    renderApp()
    // Planner is the default: the calculator is not mounted.
    expect(screen.queryByText('Enhancement table')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Star Force' }))
    expect(screen.getByText('Enhancement table')).toBeInTheDocument()
    // The inactive view is unmounted entirely (conditional render), which
    // also stops the planner's timers while the calculator is open.
    expect(screen.queryByText('Boss Content')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Planner' }))
    expect(screen.getByText('Boss Content')).toBeInTheDocument()
  })

  it('adds a character and persists it', async () => {
    const first = renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Add character' }))
    fireEvent.change(await screen.findByLabelText('Name'), {
      target: { value: 'Mule' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create character' }))

    // The new character shows up as a pill and becomes the active character.
    expect(screen.getByRole('button', { name: 'Mule' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mule' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEY)).toContain('Mule'),
    )

    first.unmount()
    renderApp()
    expect(screen.getByRole('button', { name: 'Mule' })).toBeInTheDocument()
  })

  it('caps character names at the 12-character GMS limit', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Add character' }))
    const name = await screen.findByLabelText('Name')
    fireEvent.change(name, { target: { value: 'x'.repeat(40) } })
    expect(name.value).toHaveLength(12)
  })

  it('clamps the creation Level field to 300 on commit', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Add character' }))
    const level = await screen.findByLabelText('Level')
    fireEvent.change(level, { target: { value: '999' } })
    fireEvent.blur(level)
    expect(level.value).toBe('300')
  })

  it('synchronizes state saved by another tab', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    renderApp()
    setItem.mockClear()

    const externalState = {
      characters: [
        {
          id: 'other-tab',
          name: 'Other Tab',
          level: 275,
          job: 'Hero',
          server: 'Kronos',
          bossTasks: [],
          weeklyTasks: [],
        },
      ],
      activeId: 'other-tab',
      bossResetAt: Date.now(),
      weeklyResetAt: Date.now(),
      monthlyResetAt: Date.now(),
    }

    fireEvent(
      window,
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify(externalState),
      }),
    )

    expect(
      await screen.findByRole('button', { name: 'Other Tab' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(setItem).not.toHaveBeenCalled()
  })

  it('warns when browser storage cannot save changes', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Changes are not being saved',
    )
  })

  it('updates the selected character from the character pane', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters: [
          {
            id: 'main',
            name: 'Main',
            level: 260,
            job: '',
            server: '',
            bossTasks: [],
            weeklyTasks: [],
          },
        ],
        activeId: 'main',
        bossResetAt: Date.now(),
        weeklyResetAt: Date.now(),
        monthlyResetAt: Date.now(),
      }),
    )

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Main actions' }))
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Edit character' }),
    )
    fireEvent.change(await screen.findByLabelText('Name'), {
      target: { value: 'HeroMain' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(screen.getByRole('button', { name: 'HeroMain' })).toBeInTheDocument()
    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEY)).toContain('HeroMain'),
    )
  })

  it('deletes the selected character after confirmation', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters: [
          {
            id: 'main',
            name: 'Main',
            level: 260,
            job: '',
            server: '',
            bossTasks: [],
            weeklyTasks: [],
          },
          {
            id: 'mule',
            name: 'Mule',
            level: 220,
            job: '',
            server: '',
            bossTasks: [],
            weeklyTasks: [],
          },
        ],
        activeId: 'mule',
        bossResetAt: Date.now(),
        weeklyResetAt: Date.now(),
        monthlyResetAt: Date.now(),
      }),
    )

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Mule actions' }))
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete character' }),
    )
    expect(await screen.findByText('Delete Mule?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete character' }))

    expect(
      screen.queryByRole('button', { name: 'Mule' }),
    ).not.toBeInTheDocument()
    // The confirm dialog closes and STAYS closed — a field-reported ghost had
    // it reopening for the already-deleted character after the fade.
    await waitFor(() =>
      expect(screen.queryByText('Delete Mule?')).not.toBeInTheDocument(),
    )
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(screen.queryByText('Delete Mule?')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Main' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEY)).not.toContain('Mule'),
    )
  })

  it('keeps only one character ⋮ menu open at a time', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters: [
          {
            id: 'main',
            name: 'Main',
            level: 260,
            job: '',
            server: '',
            bossTasks: [],
            weeklyTasks: [],
          },
          {
            id: 'mule',
            name: 'Mule',
            level: 220,
            job: '',
            server: '',
            bossTasks: [],
            weeklyTasks: [],
          },
        ],
        activeId: 'main',
        bossResetAt: Date.now(),
        weeklyResetAt: Date.now(),
        monthlyResetAt: Date.now(),
      }),
    )

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Main actions' }))
    expect(
      await screen.findAllByRole('menuitem', { name: 'Edit character' }),
    ).toHaveLength(1)

    // Opening the second character's menu closes the first — never two open.
    fireEvent.click(screen.getByRole('button', { name: 'Mule actions' }))
    await waitFor(() =>
      expect(
        screen.getAllByRole('menuitem', { name: 'Edit character' }),
      ).toHaveLength(1),
    )
  })

  it('unchecks saved boss tasks after a boss reset boundary', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters: [
          {
            id: 'main',
            name: 'Main',
            level: 260,
            job: '',
            server: '',
            bossTasks: [
              {
                id: 'lotus-hard',
                key: 'lotus:Hard',
                bossId: 'lotus',
                name: 'Lotus',
                img: '/bosses/lotus.png',
                difficulty: 'Hard',
                level: 245,
                done: true,
              },
            ],
            weeklyTasks: [],
          },
        ],
        activeId: 'main',
        bossResetAt: 1,
        weeklyResetAt: Date.now(),
      }),
    )

    renderApp()

    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Mark Lotus done' }),
      ).not.toBeChecked(),
    )
  })

  it('keeps a monthly boss checked through a weekly reset', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters: [
          {
            id: 'main',
            name: 'Main',
            level: 285,
            job: '',
            server: '',
            bossTasks: [
              {
                id: 'lotus-hard',
                key: 'lotus:Hard',
                bossId: 'lotus',
                name: 'Lotus',
                img: '/bosses/lotus.png',
                difficulty: 'Hard',
                level: 245,
                done: true,
              },
              {
                id: 'bm-hard',
                key: 'blackmage:Hard',
                bossId: 'blackmage',
                name: 'Black Mage',
                img: '/bosses/blackmage.png',
                difficulty: 'Hard',
                level: 255,
                done: true,
              },
            ],
            weeklyTasks: [],
          },
        ],
        activeId: 'main',
        // Stale weekly boundary fires; monthly boundary stays current.
        bossResetAt: 1,
        weeklyResetAt: Date.now(),
        monthlyResetAt: Date.now(),
      }),
    )

    renderApp()

    // Weekly boss is unchecked, but the monthly Black Mage is left alone.
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Mark Lotus done' }),
      ).not.toBeChecked(),
    )
    expect(
      screen.getByRole('checkbox', { name: 'Mark Black Mage done' }),
    ).toBeChecked()
  })

  it('unchecks a monthly boss after the monthly boundary', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters: [
          {
            id: 'main',
            name: 'Main',
            level: 285,
            job: '',
            server: '',
            bossTasks: [
              {
                id: 'bm-hard',
                key: 'blackmage:Hard',
                bossId: 'blackmage',
                name: 'Black Mage',
                img: '/bosses/blackmage.png',
                difficulty: 'Hard',
                level: 255,
                done: true,
              },
            ],
            weeklyTasks: [],
          },
        ],
        activeId: 'main',
        // Weekly boundary stays current; only the monthly boundary fires.
        bossResetAt: Date.now(),
        weeklyResetAt: Date.now(),
        monthlyResetAt: 1,
      }),
    )

    renderApp()

    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Mark Black Mage done' }),
      ).not.toBeChecked(),
    )
  })

  it('toggles weekly content and removes it via the edit modal', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters: [
          {
            id: 'main',
            name: 'Main',
            level: 260,
            job: '',
            server: '',
            bossTasks: [],
            weeklyTasks: [
              {
                id: 'guildculvert',
                key: 'guildculvert',
                contentId: 'guildculvert',
                name: 'Culvert',
                done: false,
              },
            ],
          },
        ],
        activeId: 'main',
        bossResetAt: Date.now(),
        weeklyResetAt: Date.now(),
      }),
    )

    renderApp()

    const checkbox = screen.getByRole('checkbox', {
      name: 'Mark Culvert done',
    })
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEY)).toContain('"done":true'),
    )

    // The panel has no X button; removal happens by unchecking it in the
    // Weekly Content edit modal (the first Edit button — Weekly is the left
    // column, above Boss Content).
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    const modalCheckbox = await screen.findByRole('checkbox', {
      name: 'Culvert',
    })
    fireEvent.click(modalCheckbox)
    expect(
      screen.queryByRole('checkbox', { name: 'Mark Culvert done' }),
    ).not.toBeInTheDocument()
  })

  it('swaps a boss to a new difficulty in place without duplicating it', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters: [
          {
            id: 'main',
            name: 'Main',
            level: 285,
            job: '',
            server: '',
            bossTasks: [
              {
                id: 'lotus-hard',
                key: 'lotus:Hard',
                bossId: 'lotus',
                name: 'Lotus',
                img: '/bosses/lotus.png',
                difficulty: 'Hard',
                level: 245,
                done: false,
              },
              {
                id: 'damien-normal',
                key: 'damien:Normal',
                bossId: 'damien',
                name: 'Damien',
                img: '/bosses/damien.png',
                difficulty: 'Normal',
                level: 210,
                done: false,
              },
            ],
            weeklyTasks: [],
          },
        ],
        activeId: 'main',
        bossResetAt: Date.now(),
        weeklyResetAt: Date.now(),
        monthlyResetAt: Date.now(),
      }),
    )

    renderApp()

    // Boss Content is the right column → the second Edit button.
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1])
    // Lotus is already tracked at Hard; picking Normal must swap it in place.
    fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Lotus Normal' }),
    )

    await waitFor(() => {
      const tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)).characters[0]
        .bossTasks
      // Still two bosses (no duplicate Lotus), Lotus kept index 0, now Normal.
      expect(tasks).toHaveLength(2)
      expect(tasks[0].bossId).toBe('lotus')
      expect(tasks[0].difficulty).toBe('Normal')
      expect(tasks[1].bossId).toBe('damien')
    })
  })

  it('unchecks weekly content after its boundary while leaving bosses alone', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters: [
          {
            id: 'main',
            name: 'Main',
            level: 260,
            job: '',
            server: '',
            bossTasks: [
              {
                id: 'lotus-hard',
                key: 'lotus:Hard',
                bossId: 'lotus',
                name: 'Lotus',
                img: '/bosses/lotus.png',
                difficulty: 'Hard',
                level: 245,
                done: true,
              },
            ],
            weeklyTasks: [
              {
                id: 'guildculvert',
                key: 'guildculvert',
                contentId: 'guildculvert',
                name: 'Culvert',
                done: true,
              },
            ],
          },
        ],
        activeId: 'main',
        // Only the weekly-content boundary is stale; boss + monthly are current.
        bossResetAt: Date.now(),
        weeklyResetAt: 1,
        monthlyResetAt: Date.now(),
      }),
    )

    renderApp()

    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Mark Culvert done' }),
      ).not.toBeChecked(),
    )
    // The boss boundary hasn't passed, so its check survives.
    expect(
      screen.getByRole('checkbox', { name: 'Mark Lotus done' }),
    ).toBeChecked()
  })

  it('refuses to add past the character cap', () => {
    const characters = Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      name: `Char${i}`,
      level: 200,
      job: '',
      server: '',
      bossTasks: [],
      weeklyTasks: [],
    }))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        characters,
        activeId: 'c0',
        bossResetAt: Date.now(),
        weeklyResetAt: Date.now(),
        monthlyResetAt: Date.now(),
      }),
    )

    renderApp()

    // At the cap there's no enabled add button; the tile stays as a disabled,
    // still-focusable button with the cap hint.
    expect(
      screen.queryByRole('button', { name: 'Add character' }),
    ).not.toBeInTheDocument()
    const addTile = screen.getByText('Add Character').closest('button')
    expect(addTile).toHaveAttribute('aria-disabled', 'true')
  })

  it('does not allow deleting the only character', async () => {
    renderApp() // fresh state → a single "Main" character

    fireEvent.click(screen.getByRole('button', { name: 'Main actions' }))
    const del = await screen.findByRole('menuitem', {
      name: 'Delete character',
    })
    // Disabled while it's the last character: clicking opens no confirm dialog.
    fireEvent.click(del)
    expect(screen.queryByText('Delete Main?')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Main' })).toBeInTheDocument()
  })

  it('ignores malformed or unrelated cross-tab storage events', () => {
    renderApp() // single "Main"

    // Wrong key, null value, and corrupt JSON must all be ignored without
    // crashing or changing the UI.
    fireEvent(
      window,
      new StorageEvent('storage', { key: 'some-other-key', newValue: '{}' }),
    )
    fireEvent(
      window,
      new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }),
    )
    fireEvent(
      window,
      new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{broken' }),
    )

    expect(screen.getByText('Maplet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Main' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
