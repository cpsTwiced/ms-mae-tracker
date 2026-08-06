import { useEffect, useState } from 'react'
import { Modal } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

// Shared modal wrapper. The app is desktop-first, so on phones (below Mantine's
// `sm` breakpoint) modals go full-screen — that way their content reflows into
// the full viewport instead of overflowing off the right edge with no way to
// scroll to it. On wider screens the modal keeps whatever `size` it was given.
// All app modals render through this so the behavior stays consistent.
//
// Backdrop-dismiss is disabled until the open transition finishes: a click
// that lands while the modal is still fading in would otherwise fall through
// to the overlay and immediately close it, which makes rapid interaction feel
// flaky. Escape and the close button work throughout.
export default function ResponsiveModal({
  transitionProps,
  closeOnClickOutside = true,
  ...props
}) {
  const fullScreen = useMediaQuery('(max-width: 48em)')
  const [entered, setEntered] = useState(false)
  // Mantine Modal's default enter transition runs 200ms.
  const duration = transitionProps?.duration ?? 200

  // `onEntered` below is the precise signal, but environments that never
  // deliver transition callbacks (jsdom; defensive against browser edge
  // cases) would otherwise leave backdrop-dismiss disabled forever — this
  // timer is the guaranteed fallback.
  useEffect(() => {
    if (!props.opened) {
      setEntered(false)
      return undefined
    }
    const id = setTimeout(() => setEntered(true), duration + 50)
    return () => clearTimeout(id)
  }, [props.opened, duration])

  return (
    <Modal
      fullScreen={fullScreen}
      {...props}
      closeOnClickOutside={closeOnClickOutside && entered}
      transitionProps={{
        ...transitionProps,
        onEntered: () => {
          setEntered(true)
          transitionProps?.onEntered?.()
        },
        onExited: () => {
          setEntered(false)
          transitionProps?.onExited?.()
        },
      }}
    />
  )
}
