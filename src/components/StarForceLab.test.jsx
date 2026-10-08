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
    // Stars sharing a mode merge into one step; Level 4 at 15-17★ is
    // labeled Safeguard.
    const plan = screen.getByRole('list', { name: 'Optimized plan' })
    const steps = within(plan).getAllByRole('listitem')
    expect(steps.map((el) => el.textContent)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^15.* ★.*Safeguard$/)]),
    )
    expect(steps.length).toBeLessThan(7)
    const grid = screen.getByRole('table', { name: 'Every option' })
    expect(
      within(grid).getAllByRole('img', { name: 'Safeguard' }).length,
    ).toBeGreaterThan(0)
  })

  it('lists 0-10 spares, key rows up to "N+", then No limit; picking one sets Spares', () => {
    const { onSet } = renderLab()
    const { enough } = optimizeModes(200, 0, 22, OPTS, 0.9)
    const table = screen.getByRole('table', { name: 'Every option' })
    const rows = within(table).getAllByRole('row')
    expect(within(rows[11]).getByText('10 spares')).toBeInTheDocument()
    expect(
      within(rows.at(-2)).getByText(`${enough}+ spares`),
    ).toBeInTheDocument()
    expect(within(rows.at(-1)).getByText('No limit')).toBeInTheDocument()
    // Fewer rows than every count up to `enough`.
    expect(rows.length).toBeLessThan(enough + 3)
    fireEvent.click(within(table).getByRole('button', { name: '5 spares' }))
    expect(onSet).toHaveBeenCalledWith('spares', '5')
  })

  it('keeps the picked spare count in Every option even when it saves < 1%', () => {
    renderLab()
    const { enough } = optimizeModes(200, 0, 22, OPTS, 0.9)
    const listed = (k) =>
      within(screen.getByRole('table', { name: 'Every option' })).queryByRole(
        'button',
        { name: `${k} spares` },
      )
    const hidden = Array.from({ length: enough - 11 }, (_, i) => 11 + i).find(
      (k) => !listed(k),
    )
    expect(hidden).toBeDefined()
    const labels = () =>
      within(screen.getByRole('table', { name: 'Every option' }))
        .getAllByRole('button')
        .map((b) => b.textContent)
    const before = labels()
    cleanup()
    renderLab({ sparesRaw: String(hidden) })
    expect(listed(hidden)).toBeInTheDocument()
    // Picking it doesn't hide any other row.
    expect(labels().filter((l) => l !== `${hidden} spares`)).toEqual(before)
  })

  it('clamps typed spares to 50', () => {
    const { onSet } = renderLab()
    fireEvent.change(screen.getByLabelText('Spares'), {
      target: { value: '99' },
    })
    expect(onSet).toHaveBeenCalledWith('spares', '50')
  })

  it('shows the fewest spares on Auto and offers the cheapest as another option', () => {
    const { onSet } = renderLab({ sparesRaw: '', chanceRaw: '50' })
    const fits = optimizeModes(200, 0, 22, OPTS, 0.5).rows.filter(
      (r) => !r.unreachable,
    )
    const cheapest = fits.reduce((a, r) => (r.cost < a.cost ? r : a))
    expect(fits[0].spares).not.toBe(cheapest.spares)
    expect(screen.getByLabelText('Spares')).toHaveAttribute(
      'placeholder',
      'Auto',
    )
    expect(
      screen.getAllByText(formatMeso(Math.round(fits[0].cost))).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Fewest spares')).toBeInTheDocument()
    expect(screen.getByText('Other options for 50%')).toBeInTheDocument()
    const card = screen.getByRole('button', {
      name: `View the ${cheapest.spares} spares plan`,
    })
    expect(within(card).getByText('Cheapest')).toBeInTheDocument()
    expect(within(card).getByText(/cheaper$/)).toBeInTheDocument()
    fireEvent.click(card)
    expect(onSet).toHaveBeenCalledWith('spares', String(cheapest.spares))
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

  it('shows a dash for stars past 21 (no modes)', () => {
    renderLab({ target: 24, targetText: '24' })
    const steps = within(
      screen.getByRole('list', { name: 'Optimized plan' }),
    ).getAllByRole('listitem')
    expect(steps.at(-1)).toHaveTextContent('22–23 ★ —')
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
