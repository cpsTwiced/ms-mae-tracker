import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import BossEditModal from './BossEditModal'

afterEach(() => {
  cleanup()
})

const character = {
  id: 'c1',
  name: 'Main',
  level: '210',
  bossTasks: [{ key: 'lotus:Hard' }],
}

function renderModal(props = {}) {
  return render(
    <MantineProvider>
      <BossEditModal
        opened
        onClose={() => {}}
        character={character}
        onSetDifficulty={() => {}}
        {...props}
      />
    </MantineProvider>,
  )
}

describe('BossEditModal', () => {
  it('renders boss difficulty pills', () => {
    renderModal()
    // Stored values are title-case; the pill uppercases them via CSS, so the
    // DOM text stays title-case.
    expect(screen.getAllByText('Normal').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Extreme').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Chaos').length).toBeGreaterThan(0)
  })

  it('checks exactly the difficulty the character already tracks', () => {
    renderModal()
    const checked = screen.getAllByRole('checkbox').filter((box) => box.checked)
    expect(checked).toHaveLength(1)
  })

  it('unselects all selected bosses via the Unselect All button', () => {
    const onUnselectAll = vi.fn()
    renderModal({ onUnselectAll })
    fireEvent.click(screen.getByRole('button', { name: 'Unselect All' }))
    expect(onUnselectAll).toHaveBeenCalled()
  })

  it('disables Unselect All when nothing is selected', () => {
    renderModal({ character: { ...character, bossTasks: [] } })
    expect(screen.getByRole('button', { name: 'Unselect All' })).toBeDisabled()
  })

  it('keeps a boss other difficulties selectable once one is selected', () => {
    // The character tracks Lotus (Hard); Lotus also has Normal and Extreme.
    // Picking a different difficulty should swap, not require unchecking first,
    // so nothing is disabled.
    renderModal()
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes.some((box) => box.disabled)).toBe(false)
  })

  it('reports the boss, difficulty, and checked state on toggle', () => {
    const onSetDifficulty = vi.fn()
    renderModal({ onSetDifficulty })
    // First boss in the catalog is Lotus; its first difficulty is Normal.
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(onSetDifficulty).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lotus' }),
      expect.objectContaining({ d: 'Normal' }),
      true,
    )
  })
})
