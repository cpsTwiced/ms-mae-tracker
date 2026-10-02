import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import StarForcePanel from './StarForcePanel'
import { PRESETS_KEY, SF_DEFAULTS, makePreset } from '@/lib/storage'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderPanel() {
  return render(
    <MantineProvider>
      <StarForcePanel />
    </MantineProvider>,
  )
}

function stored() {
  return JSON.parse(localStorage.getItem(PRESETS_KEY))
}

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function picker() {
  return screen.getByRole('combobox', { name: 'Saved setup' })
}

async function saveAs(name) {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Name'), {
    target: { value: name },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull())
}

async function menu(item) {
  fireEvent.click(screen.getByRole('button', { name: 'Setup actions' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: item }))
}

function seed(...presets) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
}

describe('SavedSetups', () => {
  it('starts empty with the picker disabled', () => {
    renderPanel()
    expect(picker()).toBeDisabled()
    expect(
      screen.getByText('Save the inputs below to load them again later.'),
    ).toBeInTheDocument()
  })

  it('saves every current input under a name', async () => {
    renderPanel()
    fill('Target star', '17')
    fireEvent.click(screen.getByLabelText('Shining Star Force'))
    await saveAs('  Tyrant boots ')

    const [preset] = stored()
    expect(preset.name).toBe('Tyrant boots')
    expect(preset.inputs).toEqual({
      ...SF_DEFAULTS,
      targetRaw: '17',
      eventShining: true,
    })
    expect(picker().value).toBe('Tyrant boots')
  })

  it('loads a saved setup back into the calculator', async () => {
    seed(makePreset('Arcane hat', { ...SF_DEFAULTS, curRaw: '17', mode: 3 }))
    renderPanel()
    fireEvent.click(picker())
    fireEvent.click(await screen.findByRole('option', { name: /Arcane hat/ }))

    expect(screen.getByLabelText('Current star').value).toBe('17')
    expect(screen.getByRole('button', { name: /Level 3/ })).toHaveAttribute(
      'data-active',
    )
  })

  it('flags edits and updates the setup in place', async () => {
    renderPanel()
    await saveAs('Genesis')
    fill('Target star', '21')
    expect(screen.getByText('Edited')).toBeInTheDocument()

    await menu('Update')
    expect(await screen.findByText('✓ Updated')).toBeInTheDocument()
    expect(screen.queryByText('Edited')).toBeNull()
    expect(stored()).toHaveLength(1)
    expect(stored()[0].inputs.targetRaw).toBe('21')
  })

  it('shows Edited right away when inputs change after an update', async () => {
    renderPanel()
    await saveAs('Genesis')
    fill('Target star', '21')
    await menu('Update')
    expect(await screen.findByText('✓ Updated')).toBeInTheDocument()
    fill('Target star', '20')
    expect(screen.queryByText('✓ Updated')).toBeNull()
    expect(screen.getByText('Edited')).toBeInTheDocument()
  })

  it('discards edits when the loaded setup is picked again', async () => {
    seed(makePreset('Arcane hat', { ...SF_DEFAULTS, targetRaw: '17' }))
    renderPanel()
    fireEvent.click(picker())
    fireEvent.click(await screen.findByRole('option', { name: /Arcane hat/ }))
    fill('Target star', '19')
    expect(screen.getByText('Edited')).toBeInTheDocument()

    // jsdom never re-shows a reopened dropdown, so click the option directly.
    fireEvent.click(picker())
    fireEvent.click(
      screen.getByRole('option', { name: /Arcane hat/, hidden: true }),
    )
    expect(screen.getByLabelText('Target star').value).toBe('17')
    expect(screen.queryByText('Edited')).toBeNull()
  })

  it('keeps setups saved by another open tab', async () => {
    renderPanel()
    // Another tab saves after this one has already read the list.
    seed(makePreset('Other tab', SF_DEFAULTS))
    await saveAs('This tab')
    expect(stored().map((p) => p.name)).toEqual(['Other tab', 'This tab'])
  })

  it('renames the loaded setup', async () => {
    renderPanel()
    await saveAs('Old')
    await menu('Rename')
    const name = await screen.findByLabelText('Name')
    expect(name.value).toBe('Old')
    fireEvent.change(name, { target: { value: 'New' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

    await waitFor(() => expect(stored()[0].name).toBe('New'))
  })

  it('deletes the loaded setup after confirming, keeping the inputs', async () => {
    renderPanel()
    fill('Target star', '18')
    await saveAs('Gone')
    await menu('Delete')
    expect(await screen.findByText('Delete Gone?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete setup' }))

    await waitFor(() => expect(stored()).toEqual([]))
    expect(screen.getByLabelText('Target star').value).toBe('18')
  })

  it('lists setups in the reorder dialog', async () => {
    seed(makePreset('First', SF_DEFAULTS), makePreset('Second', SF_DEFAULTS))
    renderPanel()
    await menu('Reorder')
    expect(
      await screen.findByRole('button', { name: 'Drag First to reorder' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Drag Second to reorder' }),
    ).toBeInTheDocument()
  })

  it('warns when the browser refuses the write', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    renderPanel()
    await saveAs('Nope')
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save")
  })
})
