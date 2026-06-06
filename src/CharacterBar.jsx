import { useEffect, useRef, useState } from 'react'
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  Progress,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MAX_CHARACTERS } from './storage'
import CharacterFields from './CharacterFields'

const EMPTY_CHARACTER_DRAFT = { name: '', level: 1, job: '', server: '' }

// Vertical "kebab" more-actions glyph. Inline SVG (three filled dots) so it
// stays crisp at any size without pulling in an icon dependency.
function DotsIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

// Plus glyph for the add-character tile. Inline SVG (two strokes) so it is
// always crisp and perfectly centered, regardless of the font's "+".
function PlusIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function characterDraft(character) {
  return {
    name: character.name,
    level: character.level,
    job: character.job,
    server: character.server,
  }
}

// One character, shown as a tile in the roster grid. A full-tile transparent
// layer makes the whole tile one click target that switches the active
// character; a drag handle (left) and an actions menu (right) fade in on
// hover/focus and sit above that layer so they stay independently clickable.
function CharacterTile({
  character,
  isActive,
  canReorder,
  canDelete,
  onSelect,
  onEdit,
  onDelete,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: character.id })

  const total = character.bossTasks.length + character.weeklyTasks.length
  const done =
    character.bossTasks.filter((t) => t.done).length +
    character.weeklyTasks.filter((t) => t.done).length
  const pct = total ? (done / total) * 100 : 0
  // Level shares a row with the job so the name gets the full tile width before
  // it has to truncate; the server gets its own row below as a badge, so it
  // stays readable instead of being the first thing to get clipped. Job/server
  // are optional, so render each only when set.
  const meta = [`Lv.${character.level}`, character.job]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      ref={setNodeRef}
      className="charTile"
      data-active={isActive || undefined}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 2 : undefined,
      }}
    >
      <UnstyledButton
        className="charTileSelect"
        aria-label={character.name}
        aria-pressed={isActive}
        onClick={() => onSelect(character.id)}
      />

      <div className="charTileBody">
        <Stack gap={6}>
          <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
            <Text
              fw={700}
              tt="uppercase"
              lh={1}
              lineClamp={1}
              style={{ flex: 1, minWidth: 0 }}
            >
              {character.name}
            </Text>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  className="charTileKebab"
                  variant="transparent"
                  color="gray"
                  size="sm"
                  aria-label={`${character.name} actions`}
                >
                  <DotsIcon />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => onEdit(character)}>
                  Edit character
                </Menu.Item>
                <Menu.Item
                  color="red"
                  disabled={!canDelete}
                  onClick={() => onDelete(character)}
                >
                  Delete character
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
          <Stack gap={1}>
            <Text size="sm" c="dimmed" lineClamp={1} lh={1.25}>
              {meta}
            </Text>
            {/* Always render the server row so the tile height stays the same
                whether or not a server is set; a non-breaking space holds the
                line height when it is empty. */}
            <Text size="sm" c="dimmed" lineClamp={1} lh={1.25}>
              {character.server || ' '}
            </Text>
          </Stack>
          <Progress value={pct} color="sage" size="sm" radius="xl" mt={2} />
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" lh={1}>
            {done}/{total} Done
          </Text>
        </Stack>
      </div>

      {canReorder && (
        <ActionIcon
          className="charTileHandle"
          variant="transparent"
          color="gray"
          size="md"
          aria-label={`Reorder ${character.name}`}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          {...attributes}
          {...listeners}
        >
          ⠿
        </ActionIcon>
      )}
    </div>
  )
}

// Dashed tile that sits after the roster; opens the add modal. At the roster
// cap it renders as a disabled, non-interactive tile with a hint tooltip.
function AddTile({ disabled, onClick }) {
  if (disabled) {
    return (
      <Tooltip label={`Maximum of ${MAX_CHARACTERS} characters`} withArrow>
        <div className="charAddTile" data-disabled aria-disabled="true">
          <PlusIcon />
          <Text fw={600} size="sm">
            Add Character
          </Text>
        </div>
      </Tooltip>
    )
  }
  return (
    <UnstyledButton
      className="charAddTile"
      aria-label="Add character"
      onClick={onClick}
    >
      <PlusIcon />
      <Text fw={600} size="sm">
        Add Character
      </Text>
    </UnstyledButton>
  )
}

// The "Characters" pane: the roster as a grid of tiles (click to switch the
// active character; hover a tile for its drag handle and ⋮ actions), with the
// Add tile at the end. Capped at MAX_CHARACTERS.
export default function CharacterBar({
  characters,
  activeId,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onReorder,
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [addDraft, setAddDraft] = useState(EMPTY_CHARACTER_DRAFT)
  const [editTarget, setEditTarget] = useState(null)
  const [editDraft, setEditDraft] = useState(EMPTY_CHARACTER_DRAFT)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const canDelete = characters.length > 1
  const canReorder = characters.length > 1
  const atMax = characters.length >= MAX_CHARACTERS

  // Track whether the roster actually overflows. We only reserve the scrollbar
  // gap at the bottom when it does, so an un-scrolled roster keeps the same
  // bottom padding as the other panes.
  const gridRef = useRef(null)
  const [scrollable, setScrollable] = useState(false)

  // Let a normal (vertical) mouse wheel scroll the roster sideways. The native
  // wheel only scrolls horizontally with Shift held or a trackpad's sideways
  // swipe; we translate vertical wheel delta into scrollLeft so a plain mouse
  // works too. Attached as a non-passive listener so preventDefault sticks.
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const update = () => setScrollable(el.scrollWidth > el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    function onWheel(e) {
      if (el.scrollWidth <= el.clientWidth) return
      // Leave horizontal trackpad gestures (which send deltaX) alone.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      observer.disconnect()
      el.removeEventListener('wheel', onWheel)
    }
  }, [characters.length])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd({ active: dragged, over }) {
    if (over && dragged.id !== over.id) {
      const oldIndex = characters.findIndex((c) => c.id === dragged.id)
      const newIndex = characters.findIndex((c) => c.id === over.id)
      onReorder(arrayMove(characters, oldIndex, newIndex))
    }
  }

  function startAdd() {
    setAddDraft(EMPTY_CHARACTER_DRAFT)
    setAddOpen(true)
  }

  function saveAdd(e) {
    e.preventDefault()
    const name = addDraft.name.trim()
    if (!name) return
    onAdd({
      name,
      level: typeof addDraft.level === 'number' ? addDraft.level : 1,
      job: addDraft.job,
      server: addDraft.server,
    })
    setAddOpen(false)
    setAddDraft(EMPTY_CHARACTER_DRAFT)
  }

  function startEdit(character) {
    setEditTarget(character)
    setEditDraft(characterDraft(character))
  }

  function saveEdit(e) {
    e.preventDefault()
    if (!editTarget) return
    const name = editDraft.name.trim()
    if (!name) return
    onUpdate(editTarget.id, {
      name,
      level: typeof editDraft.level === 'number' ? editDraft.level : 1,
      job: editDraft.job,
      server: editDraft.server,
    })
    setEditTarget(null)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    onRemove(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <>
      <Card withBorder radius="md" padding="md" pb="sm" mt="md">
        <Stack gap="sm">
          {/* Pane title, matching Boss Content / Timers. */}
          <Text fw={600}>Characters</Text>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={characters.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div
                className="charGrid"
                ref={gridRef}
                data-scrollable={scrollable || undefined}
              >
                {characters.map((c) => (
                  <CharacterTile
                    key={c.id}
                    character={c}
                    isActive={c.id === activeId}
                    canReorder={canReorder}
                    canDelete={canDelete}
                    onSelect={onSelect}
                    onEdit={startEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
                {/* The Add tile rides in the scrolling row as just another tile,
                    sitting right after the last character. */}
                <AddTile disabled={atMax} onClick={startAdd} />
              </div>
            </SortableContext>
          </DndContext>
        </Stack>
      </Card>

      <Modal
        opened={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add character"
      >
        <form onSubmit={saveAdd}>
          <CharacterFields
            values={addDraft}
            onChange={(patch) => setAddDraft((d) => ({ ...d, ...patch }))}
            namePlaceholder="e.g. MyMain"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!addDraft.name.trim()}>
              Create character
            </Button>
          </Group>
        </form>
      </Modal>

      <Modal
        opened={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit ${editTarget?.name ?? 'character'}`}
      >
        <form onSubmit={saveEdit}>
          <CharacterFields
            values={editDraft}
            onChange={(patch) => setEditDraft((d) => ({ ...d, ...patch }))}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!editDraft.name.trim()}>
              Save changes
            </Button>
          </Group>
        </form>
      </Modal>

      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? 'character'}?`}
      >
        <Text size="sm" c="dimmed">
          This cannot be undone. Boss and weekly progress for this character
          will be removed.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Delete character
          </Button>
        </Group>
      </Modal>
    </>
  )
}
