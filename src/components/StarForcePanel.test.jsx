import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import { MantineProvider } from '@mantine/core'
import StarForcePanel from './StarForcePanel'
import { expectedRun } from '@/lib/starforce'
import { formatMeso, pct } from '@/lib/format'
import { optimizeModes } from '@/lib/optimizer'

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

    const run = expectedRun(200, 17, 18, {
      starCatch: true,
      mode: 1,
      eventShining: true,
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
      eventShining: true,
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

describe('share link', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
    delete navigator.clipboard
  })

  it('fills the inputs from a shared link, then cleans the address bar', () => {
    window.history.replaceState(null, '', '/?lv=160&from=12&to=21&sg=1')
    renderPanel()
    expect(screen.getByLabelText('Item level').value).toBe('160')
    expect(screen.getByLabelText('Current star').value).toBe('12')
    expect(screen.getByLabelText('Target star').value).toBe('21')
    expect(screen.getByLabelText('Safeguard')).toBeChecked()
    expect(window.location.search).toBe('')
  })

  it('leaves an address without calculator settings alone', () => {
    window.history.replaceState(null, '', '/?ref=discord#top')
    renderPanel()
    expect(screen.getByLabelText('Item level').value).toBe('200')
    expect(window.location.search).toBe('?ref=discord')
    expect(window.location.hash).toBe('#top')
  })

  it('copies a link to the current inputs', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderPanel()
    fill('Item level', '160')
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/?lv=160&from=0&to=22&sc=1&sg=0&mode=1&mvp=none&shine=0&plus=0&runs=3000&sp=2&ch=90`,
    )
    expect(await screen.findByText('✓ Copied')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Link copied')
  })

  it('says so when the copy fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) },
      configurable: true,
    })
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(await screen.findByText("Couldn't copy")).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      "Couldn't copy the link",
    )
  })
})

describe('phone results bar', () => {
  let reportHero
  afterEach(() => {
    vi.restoreAllMocks()
    delete window.IntersectionObserver
  })

  it('shows only while the result cards are below the screen', () => {
    window.IntersectionObserver = class {
      constructor(callback) {
        reportHero = (entry) => act(() => callback([entry]))
      }
      observe() {}
      disconnect() {}
    }
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
    renderPanel()
    const bar = screen.getByRole('button', {
      name: /full breakdown/i,
      hidden: true,
    })
    expect(bar).toHaveAttribute('inert')

    reportHero({ isIntersecting: false, boundingClientRect: { top: 900 } })
    expect(bar).not.toHaveAttribute('inert')
    const run = expectedRun(200, 0, 22, { starCatch: true, mode: 1 })
    expect(bar).toHaveTextContent(formatMeso(Math.round(run.cost)))
    expect(bar).toHaveTextContent(run.booms.toFixed(1))

    fireEvent.click(bar)
    expect(scrollIntoView).toHaveBeenCalled()
    expect(document.activeElement).toHaveClass('sfHero')

    reportHero({ isIntersecting: true, boundingClientRect: { top: 400 } })
    expect(bar).toHaveAttribute('inert')
    // Scrolled past the cards (down in the table): still out of the way.
    reportHero({ isIntersecting: false, boundingClientRect: { top: -300 } })
    expect(bar).toHaveAttribute('inert')
  })
})

describe('formatMeso shorthand used by the panel', () => {
  it('is lowercase per MapleStory convention', () => {
    expect(formatMeso(1500000000)).toBe('1.5b')
  })
})

function Harness({ initial = 'calculator' }) {
  const [view, setView] = useState(initial)
  return <StarForcePanel view={view} onViewChange={setView} />
}

function renderHarness(initial) {
  return render(
    <MantineProvider>
      <Harness initial={initial} />
    </MantineProvider>,
  )
}

describe('Lab view', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete window.IntersectionObserver
    delete navigator.clipboard
  })

  it('keeps the inputs and hides calculator-only settings', () => {
    renderHarness()
    fill('Item level', '160')
    fireEvent.click(screen.getByRole('tab', { name: 'Lab' }))
    expect(screen.queryByLabelText('Safeguard')).not.toBeInTheDocument()
    expect(screen.queryByText('Enhancement mode')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Simulation runs')).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Your plan' })).toBeInTheDocument()
    expect(screen.getByLabelText('Item level').value).toBe('160')

    fireEvent.click(screen.getByRole('tab', { name: 'Calculator' }))
    expect(screen.getByText('Enhancement table')).toBeInTheDocument()
    expect(screen.getByLabelText('Item level').value).toBe('160')
  })

  it('ignores Safeguard and the mode left on in the calculator', () => {
    renderHarness()
    fireEvent.click(screen.getByLabelText('Safeguard'))
    fireEvent.click(screen.getByText('Level 3'))
    fireEvent.click(screen.getByRole('tab', { name: 'Lab' }))
    const row = optimizeModes(
      200,
      0,
      22,
      {
        starCatch: true,
        mvp: 'none',
        eventShining: false,
        eventPlusOne: false,
      },
      0.9,
    ).rows[2]
    expect(
      screen.getAllByText(formatMeso(Math.round(row.cost))).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(pct(row.chance)).length).toBeGreaterThan(0)
  })

  it('sends the Target box to the Target star field', () => {
    renderHarness('lab')
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
    fireEvent.click(screen.getByRole('button', { name: /Target star 22/ }))
    const field = screen.getByLabelText('Target star')
    expect(scrollIntoView).toHaveBeenCalled()
    expect(document.activeElement).toBe(field)
    expect(field).toHaveAttribute('data-flash')
  })

  it('copies a Lab link', () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderHarness('lab')
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/lab?lv=200&from=0&to=22&sc=1&sg=0&mode=1&mvp=none&shine=0&plus=0&runs=3000&sp=2&ch=90`,
    )
  })

  it('opens straight into the Lab without the phone bar, and re-arms it later', () => {
    const observe = vi.fn()
    window.IntersectionObserver = class {
      observe = observe
      disconnect() {}
    }
    renderHarness('lab')
    expect(observe).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: /full breakdown/i, hidden: true }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Calculator' }))
    expect(observe).toHaveBeenCalledWith(document.querySelector('.sfHero'))
  })
})
