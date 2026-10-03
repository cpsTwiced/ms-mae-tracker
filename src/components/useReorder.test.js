import { describe, it, expect } from 'vitest'
import { moveById } from './useReorder'

describe('moveById', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('moves an item to the target slot', () => {
    expect(moveById(list, 'a', 'c').map((i) => i.id)).toEqual(['b', 'c', 'a'])
  })

  it('returns the same list when nothing moves', () => {
    expect(moveById(list, 'b', 'b')).toBe(list)
    // An id that vanished mid-drag must not relocate the last item.
    expect(moveById(list, 'gone', 'a')).toBe(list)
    expect(moveById(list, 'a', 'gone')).toBe(list)
  })
})
