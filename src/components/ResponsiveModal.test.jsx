import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import ResponsiveModal from './ResponsiveModal'

afterEach(cleanup)

function clickOverlay() {
  const overlay = document.querySelector(
    '.mantine-Modal-overlay, .mantine-Overlay-root',
  )
  if (!overlay) return false
  fireEvent.mouseDown(overlay)
  fireEvent.mouseUp(overlay)
  fireEvent.click(overlay)
  return true
}

describe('ResponsiveModal', () => {
  it('ignores backdrop clicks until the open transition finishes', async () => {
    const onClose = vi.fn()
    render(
      <MantineProvider>
        <ResponsiveModal
          opened
          onClose={onClose}
          title="Guarded"
          transitionProps={{ duration: 400 }}
        >
          body
        </ResponsiveModal>
      </MantineProvider>,
    )

    // Mid fade-in: backdrop clicks fall on the overlay but are swallowed.
    await waitFor(() => expect(clickOverlay()).toBe(true))
    expect(onClose).not.toHaveBeenCalled()

    // Once the enter transition completes, backdrop dismissal works again.
    await waitFor(
      () => {
        clickOverlay()
        expect(onClose).toHaveBeenCalled()
      },
      { timeout: 3000 },
    )
  })
})
