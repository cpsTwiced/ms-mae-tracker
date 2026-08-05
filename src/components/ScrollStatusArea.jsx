import { useLayoutEffect, useRef, useState } from 'react'
import { ScrollArea } from '@mantine/core'

export default function ScrollStatusArea({
  autosize = false,
  refreshKey,
  viewportProps,
  scrollbars = 'y',
  ...props
}) {
  const viewportRef = useRef(null)
  const [scrollRequired, setScrollRequired] = useState(false)
  const [xScrollRequired, setXScrollRequired] = useState(false)
  // Only track horizontal overflow when an x bar can actually appear —
  // otherwise the reserved bottom gutter would show up with no bar in it.
  const trackX = scrollbars.includes('x')

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      setScrollRequired(false)
      setXScrollRequired(false)
      return undefined
    }

    const updateScrollState = () => {
      const next = viewport.scrollHeight > viewport.clientHeight + 1
      setScrollRequired((current) => (current === next ? current : next))
      const nextX = trackX && viewport.scrollWidth > viewport.clientWidth + 1
      setXScrollRequired((current) => (current === nextX ? current : nextX))
    }

    updateScrollState()

    const observer =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(updateScrollState)
        : null

    observer?.observe(viewport)
    if (viewport.firstElementChild) {
      observer?.observe(viewport.firstElementChild)
    }
    window.addEventListener('resize', updateScrollState)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [refreshKey, trackX])

  const Component = autosize ? ScrollArea.Autosize : ScrollArea

  return (
    <Component
      {...props}
      type="auto"
      scrollbarSize={6}
      scrollbars={scrollbars}
      viewportRef={viewportRef}
      viewportProps={{
        ...viewportProps,
        'data-scroll-required': scrollRequired || undefined,
        'data-scroll-required-x': xScrollRequired || undefined,
      }}
      classNames={{
        viewport: 'scrollStatusViewport',
        scrollbar: 'scrollStatusBar',
        thumb: 'scrollStatusThumb',
      }}
    />
  )
}
