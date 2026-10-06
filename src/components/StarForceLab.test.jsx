import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import StarForceLab from './StarForceLab'
import { optimizeModes } from '@/lib/optimizer'
import { formatMeso, pct } from '@/lib/format'

afterEach(cleanup)

const OPTS = {
  starCatch: true,
  mvp: 'none',
  eventShining: false,
  eventPlusOne: false,
}

function renderLab(props = {}) {
  const onSet = vi.fn()
  const onEditTarget = vi.fn()
  render(
    <MantineProvider>
      <StarForceLab
        level={200}
        cur={0}
        target={22}
        rangeValid
        starCap={30}
        opts={OPTS}
        sparesRaw="2"
        chanceRaw="90"
        targetText="22"
        onSet={onSet}
        onEditTarget={onEditTarget}
        emptyMessage="Pick a target above your current star."
        {...props}
      />
    </MantineProvider>,
  )
  return { onSet, onEditTarget }
}

describe('StarForceLab', () => {
  it('shows the cheapest plan for the chosen spares and chance', () => {
    renderLab()
    const row = optimizeModes(200, 0, 22, OPTS, 0.9).rows[2]
    expect(
      screen.getAllByText(formatMeso(Math.round(row.cost))).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(pct(row.chance)).length).toBeGreaterThan(0)
    const plan = screen.getByRole('table', { name: 'Your plan' })
    expect(within(plan).getByText('15 → 16')).toBeInTheDocument()
    expect(within(plan).getAllByText('Level 4').length).toBeGreaterThan(0)
  })

  it('lists every spare count plus No limit, and picking one sets Spares', () => {
    const { onSet } = renderLab()
    const table = screen.getByRole('table', { name: 'Every option' })
    // header + 11 spare counts + No limit
    expect(within(table).getAllByRole('row')).toHaveLength(13)
    expect(within(table).getByText('No limit')).toBeInTheDocument()
    fireEvent.click(within(table).getByRole('button', { name: '5 spares' }))
    expect(onSet).toHaveBeenCalledWith('spares', '5')
  })

  it('clamps typed spares to 10', () => {
    const { onSet } = renderLab()
    fireEvent.change(screen.getByLabelText('Spares'), {
      target: { value: '99' },
    })
    expect(onSet).toHaveBeenCalledWith('spares', '10')
  })

  it('treats an empty Spares field as 0 spares', () => {
    renderLab({ sparesRaw: '' })
    const row0 = optimizeModes(200, 0, 22, OPTS, 0.9).rows[0]
    expect(
      screen.getAllByText(formatMeso(Math.round(row0.cost))).length,
    ).toBeGreaterThan(0)
  })

  it('shows the best chance when no plan can reach the target', () => {
    renderLab({ target: 25, targetText: '25' })
    expect(
      screen.getByText(/Can't reach 90% with 2 spares/),
    ).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Every option' })
    expect(within(table).getAllByText(/Can't reach 90% · best/)).toHaveLength(
      11,
    )
  })

  it('says when no modes are needed', () => {
    renderLab({ target: 18, targetText: '18' })
    expect(screen.getByText(/No modes needed/)).toBeInTheDocument()
  })

  it('explains targets that never reach the mode stars', () => {
    renderLab({ target: 15, targetText: '15' })
    expect(
      screen.getByText(
        'Modes only matter from 15 ★ up. Set a target above 15 ★.',
      ),
    ).toBeInTheDocument()
  })

  it('explains items capped at 15★', () => {
    renderLab({ level: 120, starCap: 15, targetText: '15' })
    expect(
      screen.getByText(
        "Enhancement Modes start at 15 ★. A Lv.120 item caps at 15 ★, so there's nothing to optimize.",
      ),
    ).toBeInTheDocument()
  })

  it('shows the calculator empty message without a valid range', () => {
    renderLab({ rangeValid: false })
    expect(
      screen.getByText('Pick a target above your current star.'),
    ).toBeInTheDocument()
  })

  it('jumps to the Target star field from the Target box', () => {
    const { onEditTarget } = renderLab()
    fireEvent.click(screen.getByRole('button', { name: /Target star 22/ }))
    expect(onEditTarget).toHaveBeenCalled()
  })
})
