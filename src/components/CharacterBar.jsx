import { useEffect, useRef, useState } from 'react'
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Menu,
  Progress,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { DndContext, closestCenter } from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MAX_CHARACTERS } from '@/lib/storage'
import CharacterFields from './CharacterFields'
import ResponsiveModal from './ResponsiveModal'
import { moveById, useReorderSensors } from './useReorder'

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

// One character, shown as a tile in the roster grid. A full-tile transparent
// layer makes the whole tile one click target that switches the active
// character; a drag handle (left) and an actions menu (right) fade in on
// hover/focus and sit above that layer so they stay independently clickable.
function CharacterTile({
  character,
  isActive,
  canReorder,
  canDelete,
  menuOpened,
  onMenuChange,
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
              title={character.name}
              style={{ flex: 1, minWidth: 0 }}
            >
              {character.name}
            </Text>
            {/* Controlled so the roster can enforce a single open menu at a
                time and close it when a modal takes over. */}
            <Menu
              position="bottom-end"
              withinPortal
              opened={menuOpened}
              onChange={onMenuChange}
            >
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
// cap it stays a real (focusable) button with aria-disabled rather than a
// plain div, so keyboard users can reach it and surface the cap tooltip; the
// click is suppressed so it can't add past the cap.
function AddTile({ disabled, onClick }) {
  return (
    <Tooltip
      label={`Maximum of ${MAX_CHARACTERS} characters`}
      withArrow
      disabled={!disabled}
    >
      <UnstyledButton
        className="charAddTile"
        data-disabled={disabled || undefined}
        aria-disabled={disabled || undefined}
        aria-label={disabled ? undefined : 'Add character'}
        onClick={disabled ? (e) => e.preventDefault() : onClick}
      >
        <PlusIcon />
        <Text fw={600} size="sm">
          Add Character
        </Text>
      </UnstyledButton>
    </Tooltip>
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
  // One add/edit form. `editTarget` is null when adding; it's kept apart from
  // `formOpen` and retained while the modal fades out, so the title never
  // degrades mid-transition (the "ghost dialog" effect).
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [draft, setDraft] = useState(EMPTY_CHARACTER_DRAFT)
  // The delete dialog is open exactly while it has a target.
  const [deleteTarget, setDeleteTarget] = useState(null)
  // The last target's name, kept (only ever overwritten) so the confirm
  // title stays personal while the modal fades out after the target clears.
  const [deleteName, setDeleteName] = useState('')
  // Which tile's ⋮ menu is open — exactly one at a time.
  const [menuFor, setMenuFor] = useState(null)
  const canDelete = characters.length > 1
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

  const sensors = useReorderSensors()

  function handleDragEnd({ active, over }) {
    const next = over ? moveById(characters, active.id, over.id) : characters
    if (next !== characters) onReorder(next)
  }

  function startAdd() {
    setMenuFor(null)
    setEditTarget(null)
    setDraft(EMPTY_CHARACTER_DRAFT)
    setFormOpen(true)
  }

  function startEdit(character) {
    const { name, level, job, server } = character
    setMenuFor(null)
    setEditTarget(character)
    setDraft({ name, level, job, server })
    setFormOpen(true)
  }

  function saveForm(e) {
    e.preventDefault()
    const name = draft.name.trim()
    if (!name) return
    const fields = {
      name,
      // The field clamps on blur; this covers a submit that skips the blur.
      level:
        typeof draft.level === 'number'
          ? Math.min(300, Math.max(1, draft.level))
          : 1,
      job: draft.job,
      server: draft.server,
    }
    if (editTarget) onUpdate(editTarget.id, fields)
    else onAdd(fields)
    setFormOpen(false)
  }

  function startDelete(character) {
    setMenuFor(null)
    setDeleteTarget(character)
    setDeleteName(character.name)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    onRemove(deleteTarget.id)
    // Clearing the target closes the dialog, so no later re-render can
    // resurrect it for a character that no longer exists.
    setDeleteTarget(null)
  }

  return (
    <>
      <Card withBorder radius="md" padding="md" pb="sm">
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
                    canReorder={canDelete}
                    canDelete={canDelete}
                    menuOpened={menuFor === c.id}
                    onMenuChange={(opened) => setMenuFor(opened ? c.id : null)}
                    onSelect={onSelect}
                    onEdit={startEdit}
                    onDelete={startDelete}
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

      <ResponsiveModal
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? `Edit ${editTarget.name}` : 'Add character'}
      >
        <form onSubmit={saveForm}>
          <CharacterFields
            values={draft}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            namePlaceholder={editTarget ? undefined : 'e.g. MyMain'}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!draft.name.trim() || typeof draft.level !== 'number'}
            >
              {editTarget ? 'Save changes' : 'Create character'}
            </Button>
          </Group>
        </form>
      </ResponsiveModal>

      <ResponsiveModal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteName || 'character'}?`}
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
      </ResponsiveModal>
    </>
  )
}
