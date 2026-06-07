import { useState } from 'react'
import {
  ActionIcon,
  Avatar,
  Button,
  Card,
  Checkbox,
  Group,
  Stack,
  Text,
} from '@mantine/core'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DifficultyBadge from './DifficultyBadge'
import { initials } from '@/lib/icon'
import ScrollStatusArea from './ScrollStatusArea'

// Presentational row card, shared by the live sortable row and the drag
// overlay (the lifted copy that follows the pointer). `dragHandle` is the grab
// handle to render while reordering; `cardRef`/`style` wire up dnd-kit.
function RowCard({
  item,
  reordering,
  allowRemove,
  showAvatar,
  onToggle,
  onRemove,
  dragHandle,
  cardRef,
  style,
}) {
  return (
    <Card
      ref={cardRef}
      style={style}
      withBorder
      radius="md"
      padding={6}
      pl="sm"
      pr="sm"
      onClick={reordering ? undefined : onToggle}
    >
      {/* mih keeps every row the same height whether or not it has an avatar
          (boss rows do, weekly rows don't). */}
      <Group justify="space-between" wrap="nowrap" mih={28}>
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          {reordering && dragHandle}
          {/* Portrait, difficulty pill and name on one compact row. */}
          {showAvatar && (
            <Avatar src={item.img || undefined} radius="sm" size={24}>
              {initials(item.name)}
            </Avatar>
          )}
          {item.difficulty && <DifficultyBadge difficulty={item.difficulty} />}
          <Text size="sm" fw={600} truncate style={{ minWidth: 0 }}>
            {item.name}
          </Text>
        </Group>
        {!reordering && (
          <Group gap={4} wrap="nowrap">
            <Checkbox
              checked={item.done}
              onChange={onToggle}
              // Stop the row's onClick from firing too (it would double-toggle).
              onClick={(e) => e.stopPropagation()}
              aria-label={`Mark ${item.name} done`}
            />
            {allowRemove && (
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
                aria-label={`Remove ${item.name}`}
              >
                ✕
              </ActionIcon>
            )}
          </Group>
        )}
      </Group>
    </Card>
  )
}

// The grab handle. Listeners/attributes only exist for the live row; the
// overlay reuses the same look with an inert handle.
function DragHandle({ grabbing, ...handleProps }) {
  return (
    <ActionIcon
      variant="transparent"
      color="gray"
      size="sm"
      style={{ cursor: grabbing ? 'grabbing' : 'grab' }}
      aria-label="Drag to reorder"
      {...handleProps}
    >
      ⠿
    </ActionIcon>
  )
}

function Row(props) {
  const { item, reordering } = props
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // The lifted copy is shown in the DragOverlay, so the original stays put as
    // a faint placeholder (the gap the row will drop into).
    opacity: isDragging ? 0.4 : 1,
    // The whole row toggles done (except while reordering).
    cursor: reordering ? undefined : 'pointer',
  }

  return (
    <RowCard
      {...props}
      cardRef={setNodeRef}
      style={style}
      dragHandle={<DragHandle {...attributes} {...listeners} />}
    />
  )
}

// A draggable list of rows. One DndContext per list keeps reordering scoped to
// that list (so sections reorder independently).
function SortableList({
  items,
  reordering,
  allowRemove,
  showAvatar,
  onToggle,
  onRemove,
  onReorder,
}) {
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      onReorder(arrayMove(items, oldIndex, newIndex))
    }
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack gap={4}>
          {items.map((i) => (
            <Row
              key={i.id}
              item={i}
              reordering={reordering}
              allowRemove={allowRemove}
              showAvatar={showAvatar}
              onToggle={() => onToggle(i.id)}
              onRemove={() => onRemove(i.id)}
            />
          ))}
        </Stack>
      </SortableContext>
      {/* The lifted row, rendered in a portal so it follows the pointer
          independently of the scroll container — this is what stops rows from
          vanishing and the list from scrolling away while dragging. */}
      <DragOverlay>
        {activeItem ? (
          <RowCard
            item={activeItem}
            reordering
            allowRemove={allowRemove}
            showAvatar={showAvatar}
            style={{ cursor: 'grabbing' }}
            dragHandle={<DragHandle grabbing />}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default function ContentPanel({
  title,
  items,
  sections,
  onEdit,
  onToggle,
  onRemove,
  onReorder,
  emptyText,
  allowRemove = true,
  showAvatar = true,
  reorderable = true,
  scrollable = false,
  className,
}) {
  const [reordering, setReordering] = useState(false)

  // `sections` (when given) groups rows under headers; otherwise it's one flat
  // list. Counts and the reorder/empty states work off the combined items.
  const allItems = sections ? sections.flatMap((s) => s.items) : items
  const scrollRefreshKey = allItems.map((i) => i.id).join('|')
  const doneCount = allItems.filter((i) => i.done).length

  // Reordering inside one section rewrites the full list, keeping the other
  // sections in their current order.
  function reorderSection(sectionKey, newSectionItems) {
    onReorder(
      sections.flatMap((s) =>
        s.key === sectionKey ? newSectionItems : s.items,
      ),
    )
  }

  const listProps = { reordering, allowRemove, showAvatar, onToggle, onRemove }

  const cardClass = [scrollable && 'pane', className].filter(Boolean).join(' ')

  const body = (
    <>
      {allItems.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">
          {emptyText}
        </Text>
      ) : sections ? (
        <Stack gap="xs">
          {sections
            .filter((s) => s.items.length > 0)
            .map((s) => (
              <Stack key={s.key} gap={4}>
                <Group justify="space-between" wrap="nowrap">
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                    {s.label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {s.items.filter((i) => i.done).length}/{s.items.length}
                  </Text>
                </Group>
                <SortableList
                  items={s.items}
                  onReorder={(next) => reorderSection(s.key, next)}
                  {...listProps}
                />
              </Stack>
            ))}
        </Stack>
      ) : (
        <SortableList items={items} onReorder={onReorder} {...listProps} />
      )}
    </>
  )

  return (
    <Card
      withBorder
      radius="md"
      padding="sm"
      className={cardClass || undefined}
    >
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Text fw={600}>{title}</Text>
        <Group gap="xs" wrap="nowrap">
          {/* Sectioned panels count per section (below); flat panels count here. */}
          {!sections && allItems.length > 0 && (
            <Text size="xs" c="dimmed">
              {doneCount}/{allItems.length}
            </Text>
          )}
          {reorderable && allItems.length > 1 && (
            <Button
              size="xs"
              px="md"
              variant={reordering ? 'filled' : 'light'}
              onClick={() => setReordering((v) => !v)}
            >
              {reordering ? 'Done' : 'Reorder'}
            </Button>
          )}
          <Button size="xs" px="md" variant="light" onClick={onEdit}>
            Edit
          </Button>
        </Group>
      </Group>

      {scrollable ? (
        <ScrollStatusArea className="paneBody" refreshKey={scrollRefreshKey}>
          {body}
        </ScrollStatusArea>
      ) : (
        <div>{body}</div>
      )}
    </Card>
  )
}
