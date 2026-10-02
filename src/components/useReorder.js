import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

// Sensors shared by every drag-to-reorder list: the pointer only starts a drag
// after a 5px move (so a plain click still clicks), plus keyboard dragging.
export function useReorderSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
}

// `list` with item `fromId` moved to `toId`'s slot, or `list` itself when
// nothing moves. Items can vanish mid-drag (e.g. a cross-tab sync replaces the
// list), and arrayMove with -1 would silently relocate the last item.
export function moveById(list, fromId, toId) {
  const from = list.findIndex((i) => i.id === fromId)
  const to = list.findIndex((i) => i.id === toId)
  return from === -1 || to === -1 || from === to
    ? list
    : arrayMove(list, from, to)
}
