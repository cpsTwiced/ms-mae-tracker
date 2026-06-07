import { describe, it, expect } from 'vitest'
import { reorderWithinSection } from './ContentPanel'

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
