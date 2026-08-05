import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import StarForcePanel from './StarForcePanel'
import { expectedRun } from '@/lib/starforce'
import { formatMeso } from '@/lib/format'

afterEach(cleanup)

function renderPanel() {
  return render(
    <MantineProvider>
      <StarForcePanel />
    </MantineProvider>,
  )
}

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('StarForcePanel', () => {
  it('prices a Lv.200 0★ → 22★ run by default', () => {
    renderPanel()
    expect(screen.getByLabelText('Item level').value).toBe('200')
    expect(screen.getByLabelText('Current star').value).toBe('0')
    expect(screen.getByLabelText('Target star').value).toBe('22')

    const run = expectedRun(200, 0, 22, { starCatch: true, mode: 1 })
    expect(
      screen.getByText(`${Math.round(run.cost).toLocaleString('en-US')} mesos`),
    ).toBeInTheDocument()
  })

  it('shows a prompt instead of results when the level is cleared', () => {
    renderPanel()
    fill('Item level', '')
    expect(
      screen.getAllByText('Enter an item level to price the run.').length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Enhancement table')).toBeInTheDocument()
  })

  it('computes once level and a valid range are entered', () => {
    renderPanel()
    fill('Item level', '200')
    fill('Current star', '17')
    fill('Target star', '18')

    const run = expectedRun(200, 17, 18, { starCatch: true, mode: 1 })
    expect(
      screen.getByText(`${Math.round(run.cost).toLocaleString('en-US')} mesos`),
    ).toBeInTheDocument()
    expect(screen.getByText('17 → 18')).toBeInTheDocument()
    // Attempts render as a whole-number value with a separate unit span.
    expect(screen.getByText(run.attempts.toFixed(0))).toBeInTheDocument()
    expect(screen.getByText('attempts')).toBeInTheDocument()
  })

  it('prompts for a target when the range is inverted', () => {
    renderPanel()
    fill('Item level', '200')
    fill('Current star', '20')
    fill('Target star', '18')
    expect(
      screen.getAllByText('Pick a target above your current star.').length,
    ).toBeGreaterThan(0)
  })

  it('level preset pills fill the level field', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: '250' }))
    expect(screen.getByLabelText('Item level').value).toBe('250')
  })

  it('strips non-digits from the star inputs', () => {
    renderPanel()
    fill('Current star', '1a7')
    expect(screen.getByLabelText('Current star').value).toBe('17')
  })

  it('snaps overshooting inputs to their real maximums', () => {
    renderPanel()
    // Level clamps to 300 instead of dropping digits.
    fill('Item level', '999999999')
    expect(screen.getByLabelText('Item level').value).toBe('300')
    // Stars clamp to the level-based cap, not a universal 30.
    fill('Item level', '100')
    fill('Target star', '26')
    expect(screen.getByLabelText('Target star').value).toBe('8')
    fill('Item level', '200')
    fill('Target star', '99')
    expect(screen.getByLabelText('Target star').value).toBe('30')
  })

  it('snaps stars down when a committed level lowers the cap', () => {
    renderPanel()
    // Defaults are 200 / 0→22; dropping the level to 100 (cap 8★) and
    // leaving the field must pull the 22★ target down to the cap.
    fill('Item level', '100')
    fireEvent.blur(screen.getByLabelText('Item level'))
    expect(screen.getByLabelText('Target star').value).toBe('8')
  })

  it('shows analytic estimates for ranges too long to simulate', () => {
    renderPanel()
    fill('Current star', '0')
    fill('Target star', '30')
    expect(screen.getByText(/simulation skipped/)).toBeInTheDocument()
    // The closed-form expectations still render.
    const run = expectedRun(200, 0, 30, { starCatch: true, mode: 1 })
    expect(
      screen.getByText(`${Math.round(run.cost).toLocaleString('en-US')} mesos`),
    ).toBeInTheDocument()
    // Median / unlucky show ≈ estimates instead of dashes, labeled as such.
    expect(screen.getByText('Median run (est.)')).toBeInTheDocument()
    expect(
      screen.getByText(`≈ ${formatMeso(run.cost * Math.LN2)}`),
    ).toBeInTheDocument()
    expect(
      screen.getByText(`≈ ${formatMeso(run.cost * Math.log(10))}`),
    ).toBeInTheDocument()
  })

  it('re-clamps displayed stars when the level drops the cap', () => {
    renderPanel()
    // Defaults 200 / 0→22; typing level 100 (cap 8★) immediately re-clamps
    // the displayed target, and restoring the level restores the value.
    fill('Item level', '100')
    expect(screen.getByLabelText('Target star').value).toBe('8')
    fill('Item level', '200')
    expect(screen.getByLabelText('Target star').value).toBe('22')
  })

  it('safeguard changes the expected cost', () => {
    renderPanel()
    fill('Item level', '200')
    fill('Current star', '15')
    fill('Target star', '16')

    const plain = expectedRun(200, 15, 16, { starCatch: true, mode: 1 })
    fireEvent.click(screen.getByLabelText('Safeguard'))
    const guarded = expectedRun(200, 15, 16, {
      starCatch: true,
      mode: 1,
      safeguard: true,
    })
    expect(
      screen.getByText(
        `${Math.round(guarded.cost).toLocaleString('en-US')} mesos`,
      ),
    ).toBeInTheDocument()
    expect(Math.round(guarded.cost)).not.toBe(Math.round(plain.cost))
  })

  it('shining star force applies the cost discount and boom reduction', () => {
    renderPanel()
    fill('Item level', '200')
    fill('Current star', '17')
    fill('Target star', '18')
    fireEvent.click(screen.getByLabelText('Shining Star Force'))

    // The single toggle drives both engine flags.
    const run = expectedRun(200, 17, 18, {
      starCatch: true,
      mode: 1,
      eventCost30: true,
      eventBoom30: true,
    })
    expect(
      screen.getByText(`${Math.round(run.cost).toLocaleString('en-US')} mesos`),
    ).toBeInTheDocument()
  })

  it('1+1 star force stacks with shining star force', () => {
    renderPanel()
    fill('Item level', '160')
    fill('Current star', '8')
    fill('Target star', '12')
    fireEvent.click(screen.getByLabelText('Shining Star Force'))
    fireEvent.click(screen.getByLabelText('1+1 Star Force'))

    const run = expectedRun(160, 8, 12, {
      starCatch: true,
      mode: 1,
      eventCost30: true,
      eventBoom30: true,
      eventPlusOne: true,
    })
    // 2-star jumps show in the table and the combined cost reflects all flags.
    expect(screen.getByText('8 → 10')).toBeInTheDocument()
    expect(
      screen.getByText(`${Math.round(run.cost).toLocaleString('en-US')} mesos`),
    ).toBeInTheDocument()
  })

  it('shows median and unlucky simulation stats', () => {
    renderPanel()
    fill('Item level', '150')
    fill('Current star', '14')
    fill('Target star', '15')
    // Deterministic seed: the stat strip renders concrete meso figures.
    expect(screen.getByText('Median run')).toBeInTheDocument()
    const attempt = expectedRun(150, 14, 15, { starCatch: true })
    expect(attempt.cost).toBeGreaterThan(0)
    // Median of a 14→15 climb is a whole number of attempt costs.
    expect(
      screen.getAllByText((t) => /^\d+(\.\d+)?[kmbt]$/.test(t)).length,
    ).toBeGreaterThan(0)
  })

  it('notes the star cap for low-level items', () => {
    renderPanel()
    fill('Item level', '130')
    expect(screen.getByText('a Lv.130 item caps at 20 ★')).toBeInTheDocument()
  })
})

describe('formatMeso shorthand used by the panel', () => {
  it('is lowercase per MapleStory convention', () => {
    expect(formatMeso(1500000000)).toBe('1.5b')
  })
})
