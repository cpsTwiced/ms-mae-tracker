import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import Timers from './Timers'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// The Ursus row's meaning flips with the clock, so pin the clock first.
function renderAt(iso) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
  return render(
    <MantineProvider>
      <Timers />
    </MantineProvider>,
  )
}

describe('Timers — Ursus Golden Time row', () => {
  it('renders the reset rows alongside the Ursus row', () => {
    renderAt('2026-08-07T12:00:00Z')
    expect(screen.getByText('Daily Reset')).toBeDefined()
    expect(screen.getByText('Weekly Reset')).toBeDefined()
    expect(screen.getByText('Event Weekly Reset')).toBeDefined()
    expect(screen.getByText('Ursus Golden Time')).toBeDefined()
  })

  it('shows the active state during a window: badge + "ends in" countdown', () => {
    renderAt('2026-08-07T02:30:00Z')
    expect(screen.getByText('2x now')).toBeDefined()
    expect(screen.getByText('ends in')).toBeDefined()
    expect(screen.getByText(/2x mesos until .* your time/)).toBeDefined()
    expect(screen.queryByText('starts in')).toBeNull()
  })

  it('shows the upcoming state between windows: no badge, "starts in" countdown', () => {
    renderAt('2026-08-07T12:00:00Z')
    expect(screen.queryByText('2x now')).toBeNull()
    expect(screen.getByText('starts in')).toBeDefined()
    expect(screen.getByText(/next at .* your time/)).toBeDefined()
    expect(screen.queryByText('ends in')).toBeNull()
  })
})
