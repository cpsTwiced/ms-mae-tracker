import { useLayoutEffect, useRef, useState } from 'react'
import { ScrollArea } from '@mantine/core'

export default function ScrollStatusArea({
  autosize = false,
  refreshKey,
  viewportProps,
  ...props
}) {
  const viewportRef = useRef(null)
  const [scrollRequired, setScrollRequired] = useState(false)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      setScrollRequired(false)
      return undefined
    }

    const updateScrollState = () => {
      const next = viewport.scrollHeight > viewport.clientHeight + 1
      setScrollRequired((current) => (current === next ? current : next))
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
  }, [refreshKey])

  const Component = autosize ? ScrollArea.Autosize : ScrollArea

  return (
    <Component
      {...props}
      type="auto"
      scrollbarSize={6}
      scrollbars="y"
      viewportRef={viewportRef}
      viewportProps={{
        ...viewportProps,
        'data-scroll-required': scrollRequired || undefined,
      }}
      classNames={{
        viewport: 'scrollStatusViewport',
        scrollbar: 'scrollStatusBar',
        thumb: 'scrollStatusThumb',
      }}
    />
  )
}
