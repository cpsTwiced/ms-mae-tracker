import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import App from './App'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
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
      expect(localStorage.getItem('maple-tracker-v2')).toContain('Mule'),
    )

    first.unmount()
    renderApp()
    expect(screen.getByRole('button', { name: 'Mule' })).toBeInTheDocument()
  })

  it('updates the selected character from the character pane', async () => {
    localStorage.setItem(
      'maple-tracker-v2',
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
      expect(localStorage.getItem('maple-tracker-v2')).toContain('HeroMain'),
    )
  })

  it('deletes the selected character after confirmation', async () => {
    localStorage.setItem(
      'maple-tracker-v2',
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
    expect(screen.getByRole('button', { name: 'Main' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() =>
      expect(localStorage.getItem('maple-tracker-v2')).not.toContain('Mule'),
    )
  })

  it('unchecks saved boss tasks after a boss reset boundary', async () => {
    localStorage.setItem(
      'maple-tracker-v2',
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
      'maple-tracker-v2',
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
      'maple-tracker-v2',
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
      'maple-tracker-v2',
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
      expect(localStorage.getItem('maple-tracker-v2')).toContain('"done":true'),
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
})
