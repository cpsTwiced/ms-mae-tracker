import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import ContentPanel, { reorderWithinSection } from './ContentPanel'

// Reordering inside one section (e.g. dragging within the Weekly boss section)
// must rebuild the FULL list without dropping or duplicating any task, and must
// leave the other sections (e.g. Monthly) exactly where they were.
describe('reorderWithinSection', () => {
  const sections = [
    { key: 'weekly', items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
    { key: 'monthly', items: [{ id: 'x' }, { id: 'y' }] },
  ]

  it('applies the new order to the target section and leaves others intact', () => {
    const merged = reorderWithinSection(sections, 'weekly', [
      { id: 'c' },
      { id: 'a' },
      { id: 'b' },
    ])
    expect(merged.map((i) => i.id)).toEqual(['c', 'a', 'b', 'x', 'y'])
  })

  it('reorders a later section without disturbing earlier ones', () => {
    const merged = reorderWithinSection(sections, 'monthly', [
      { id: 'y' },
      { id: 'x' },
    ])
    expect(merged.map((i) => i.id)).toEqual(['a', 'b', 'c', 'y', 'x'])
  })

  it('preserves the full item count (no drops, no duplicates)', () => {
    const merged = reorderWithinSection(sections, 'weekly', [
      { id: 'b' },
      { id: 'c' },
      { id: 'a' },
    ])
    expect(merged).toHaveLength(5)
    expect(new Set(merged.map((i) => i.id)).size).toBe(5)
  })
})

describe('ContentPanel reorder mode', () => {
  afterEach(cleanup)

  const item = (id) => ({ id, key: id, name: id, done: false })
  const panel = (items) => (
    <MantineProvider>
      <ContentPanel
        title="Boss Content"
        items={items}
        onEdit={() => {}}
        onToggle={() => {}}
        onReorder={() => {}}
        emptyText="Empty"
      />
    </MantineProvider>
  )

  // Removing items (or switching characters) while reordering must not strand
  // the panel in reorder mode with no checkboxes and no Done button.
  it('keeps Done reachable when the list shrinks below two items', () => {
    const { rerender } = render(panel([item('a'), item('b')]))
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    rerender(panel([item('a')]))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('checkbox', { name: 'Mark a done' })).toBeVisible()
  })
})
