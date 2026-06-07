import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import ScrollStatusArea from './ScrollStatusArea'

afterEach(() => {
  cleanup()
})

function renderArea(refreshKey) {
  return (
    <MantineProvider>
      <ScrollStatusArea refreshKey={refreshKey}>
        <div>Scrollable content</div>
      </ScrollStatusArea>
    </MantineProvider>
  )
}

describe('ScrollStatusArea', () => {
  it('adds and removes reserved scroll space as overflow changes', async () => {
    let scrollHeight = 100
    let clientHeight = 200
    const { container, rerender } = render(renderArea('fits'))
    const viewport = container.querySelector('.scrollStatusViewport')

    Object.defineProperties(viewport, {
      scrollHeight: {
        configurable: true,
        get: () => scrollHeight,
      },
      clientHeight: {
        configurable: true,
        get: () => clientHeight,
      },
    })

    rerender(renderArea('still-fits'))
    await waitFor(() =>
      expect(viewport).not.toHaveAttribute('data-scroll-required'),
    )

    scrollHeight = 300
    rerender(renderArea('overflows'))
    await waitFor(() =>
      expect(viewport).toHaveAttribute('data-scroll-required', 'true'),
    )

    scrollHeight = 120
    clientHeight = 200
    rerender(renderArea('fits-again'))
    await waitFor(() =>
      expect(viewport).not.toHaveAttribute('data-scroll-required'),
    )
  })
})
