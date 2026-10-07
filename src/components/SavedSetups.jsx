import { useEffect, useState } from 'react'
import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Select,
  Stack,
  Text,
  TextInput,
  VisuallyHidden,
} from '@mantine/core'
import { DndContext, closestCenter } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useElementSize } from '@mantine/hooks'
import ResponsiveModal from './ResponsiveModal'
import { moveById, useReorderSensors } from './useReorder'
import {
  loadPresets,
  savePresets,
  makePreset,
  nameChars,
  SF_DEFAULTS,
  MAX_PRESETS,
  MAX_PRESET_NAME_LENGTH,
} from '@/lib/storage'

const MVP_TAGS = {
  silver: 'Silver MVP',
  gold: 'Gold MVP',
  diamond: 'Diamond MVP',
}

// How long the "Updated" note stays up after an instant update.
const UPDATED_NOTE_MS = 2000

// Below this row width the status tag shrinks to its mark; at full size it
// would crowd the setup name out of the picker (fully, on a 320px phone).
const COMPACT_ROW_WIDTH = 360

// Plain down-arrow chevron for the dropdowns (Mantine's default indicator
// doesn't match the design). The calculator's other dropdowns use it too.
export const SELECT_CHEVRON = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: 'var(--mantine-color-dark-2)', flex: 'none' }}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

// Marks the loaded setup in the picker list (custom options drop Mantine's
// built-in check).
const CHECK_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ color: 'var(--mantine-color-sage-4)', flex: 'none' }}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

function sameInputs(a, b) {
  return Object.keys(SF_DEFAULTS).every((k) => a[k] === b[k])
}

// Short description of a setup: level, star range, and a tag for each
// non-default setting, so similar setups can be told apart in the list.
function summary(inputs) {
  const tags = []
  if (inputs.mode > 1) tags.push(`Level ${inputs.mode} mode`)
  if (inputs.safeguard) tags.push('Safeguard')
  if (!inputs.starCatch) tags.push('No Star Catch')
  if (MVP_TAGS[inputs.mvp]) tags.push(MVP_TAGS[inputs.mvp])
  if (inputs.eventShining) tags.push('Shining')
  if (inputs.eventPlusOne) tags.push('1+1')
  return {
    level: `Lv.${inputs.levelRaw || '—'}`,
    stars: `${inputs.curRaw || '—'}★ → ${inputs.targetRaw || '—'}★`,
    tags,
  }
}

function Summary({ inputs }) {
  const { level, stars, tags } = summary(inputs)
  return (
    <Group gap={6} wrap="wrap">
      {[level, stars, ...tags].map((t) => (
        <span key={t} className="sfTag">
          {t}
        </span>
      ))}
    </Group>
  )
}

// A compact tag shows only its mark (the dot, or ✓) so a narrow picker keeps
// room for the setup name; screen readers still hear the word.
function StatusTag({ updated, compact }) {
  const word = updated ? 'Updated' : 'Edited'
  return (
    <span className="sfStatusTag" data-updated={updated || undefined}>
      {compact ? (
        <>
          {updated && <span aria-hidden="true">✓</span>}
          <VisuallyHidden>{word}</VisuallyHidden>
        </>
      ) : (
        <span>{updated ? '✓ Updated' : 'Edited'}</span>
      )}
    </span>
  )
}

// Name form shared by Save and Rename. Mounted only while open, so it starts
// from `initial` every time.
function NameModal({
  title,
  submitLabel,
  initial,
  onSubmit,
  onClose,
  children,
}) {
  const [name, setName] = useState(initial)
  const trimmed = name.trim()
  const length = nameChars(name).length
  return (
    <ResponsiveModal opened onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) onSubmit(trimmed)
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="e.g. Genesis weapon 22★"
            value={name}
            onChange={(e) =>
              setName(
                // Leading spaces are trimmed on submit, so they mustn't use
                // up the cap and push the end of a pasted name off.
                nameChars(e.currentTarget.value.trimStart())
                  .slice(0, MAX_PRESET_NAME_LENGTH)
                  .join(''),
              )
            }
            description={`${length}/${MAX_PRESET_NAME_LENGTH}`}
            inputWrapperOrder={['label', 'input', 'description']}
            data-autofocus
          />
          {children}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmed}>
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </ResponsiveModal>
  )
}

function ReorderRow({ preset }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: preset.id })
  const { level, stars } = summary(preset.inputs)
  return (
    <div
      ref={setNodeRef}
      className="sfReorderRow"
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        // Without this a touch drag scrolls the full-screen dialog on phones
        // instead of moving the row.
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        aria-label={`Drag ${preset.name} to reorder`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </ActionIcon>
      <Text size="sm" fw={600} style={{ flex: 1, minWidth: 0 }} truncate>
        {preset.name}
      </Text>
      <Group gap={6} wrap="nowrap" style={{ flex: 'none' }}>
        <span className="sfTag">{level}</span>
        <span className="sfTag">{stars}</span>
      </Group>
    </div>
  )
}

function ReorderList({ presets, onReorder, onDragging }) {
  const sensors = useReorderSensors()

  function handleDragEnd({ active, over }) {
    onDragging(false)
    if (!over || active.id === over.id) return
    onReorder(active.id, over.id)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => onDragging(true)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => onDragging(false)}
    >
      <SortableContext
        items={presets.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack gap={6}>
          {presets.map((p) => (
            <ReorderRow key={p.id} preset={p} />
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  )
}

// Named saves of the whole calculator setup. Owns its own storage key; the
// calculator only hands over its current inputs and takes back loaded ones.
export default function SavedSetups({ inputs, onLoad }) {
  const [presets, setPresets] = useState(loadPresets)
  // The picker's list spans the whole row (picker + Save + ⋮), not just the
  // picker, so names and tags get the full card width.
  const { ref: rowRef, width: rowWidth } = useElementSize()
  const [activeId, setActiveId] = useState(null)
  // Changes whose write failed. They're replayed on every later write, so
  // they stay listed and reach storage once it works again.
  const [unsaved, setUnsaved] = useState([])
  // Bumped by each Update (restarting its timer); 0 means no "Updated" note.
  const [updatedNote, setUpdatedNote] = useState(0)
  // Which dialog is open: 'save' | 'rename' | 'reorder' | 'delete' | null.
  const [dialog, setDialog] = useState(null)
  // A drag is in progress in the Reorder dialog (Escape then cancels the drag
  // instead of closing the dialog).
  const [dragging, setDragging] = useState(false)

  // Null once the loaded setup is gone (e.g. deleted in another tab).
  const active = presets.find((p) => p.id === activeId) ?? null
  const edited = active !== null && !sameInputs(active.inputs, inputs)
  const updated = active !== null && !edited && updatedNote > 0
  const full = presets.length >= MAX_PRESETS

  useEffect(() => {
    if (!updatedNote) return undefined
    const id = setTimeout(() => setUpdatedNote(0), UPDATED_NOTE_MS)
    return () => clearTimeout(id)
  }, [updatedNote])

  // A real edit ends the note, so editing back to the saved values doesn't
  // bring it back. Re-setting a field to the same value isn't an edit.
  useEffect(() => {
    if (edited) setUpdatedNote(0)
  }, [edited])

  // Each change is applied to a fresh read of storage rather than this tab's
  // copy, so a setup saved in another open tab is never written over.
  function commit(change) {
    const changes = [...unsaved, change]
    const next = changes.reduce((list, fn) => fn(list), loadPresets())
    setPresets(next)
    setUnsaved(savePresets(next) ? [] : changes)
    return next
  }

  function load(id) {
    const preset = presets.find((p) => p.id === id)
    if (!preset) return
    setActiveId(id)
    setUpdatedNote(0)
    onLoad(preset.inputs)
  }

  function save(name) {
    const preset = makePreset(name, inputs)
    // Another tab may have filled the list since this one last read it.
    const next = commit((list) =>
      list.length < MAX_PRESETS ? [...list, preset] : list,
    )
    if (next.includes(preset)) {
      setActiveId(preset.id)
      setUpdatedNote(0)
    }
    setDialog(null)
  }

  function update() {
    commit((list) =>
      list.map((p) =>
        p.id === activeId ? { ...p, inputs: { ...inputs } } : p,
      ),
    )
    setUpdatedNote((n) => n + 1)
  }

  function rename(name) {
    commit((list) => list.map((p) => (p.id === activeId ? { ...p, name } : p)))
    setDialog(null)
  }

  function remove() {
    commit((list) => list.filter((p) => p.id !== activeId))
    setActiveId(null)
    setDialog(null)
  }

  function reorder(fromId, toId) {
    commit((list) => moveById(list, fromId, toId))
  }

  const compact = rowWidth > 0 && rowWidth < COMPACT_ROW_WIDTH
  const status = (updated || edited) && (
    <StatusTag updated={updated} compact={compact} />
  )
  const close = () => setDialog(null)

  return (
    <div>
      <Text size="sm" fw={600} mb={7}>
        Saved setup
      </Text>
      <Group ref={rowRef} gap={8} wrap="nowrap">
        <Select
          aria-label="Saved setup"
          data={presets.map((p) => ({ value: p.id, label: p.name }))}
          // Null once the setup is gone, or the picker keeps showing its name.
          value={active?.id ?? null}
          // Fires even for the already-loaded setup (onChange wouldn't), so
          // picking it again throws away unsaved edits.
          onOptionSubmit={load}
          placeholder={
            presets.length ? 'Choose a setup' : 'No saved setups yet'
          }
          disabled={presets.length === 0}
          allowDeselect={false}
          size="sm"
          style={{ flex: 1, minWidth: 0 }}
          rightSection={
            <Group gap={6} wrap="nowrap">
              {status}
              {SELECT_CHEVRON}
            </Group>
          }
          rightSectionWidth={status ? (compact ? 48 : 112) : undefined}
          rightSectionPointerEvents="none"
          styles={{
            input: { height: 40, fontWeight: 600, textOverflow: 'ellipsis' },
          }}
          classNames={{ option: 'sfSetupOption' }}
          maxDropdownHeight={360}
          comboboxProps={{
            width: rowWidth || 'target',
            position: 'bottom-start',
          }}
          renderOption={({ option, checked }) => {
            const preset = presets.find((p) => p.id === option.value)
            return (
              <Group gap={10} wrap="nowrap" w="100%">
                <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
                  {/* Breaks a long unspaced name instead of widening the list
                      past its box on phones. */}
                  <Text
                    size="sm"
                    fw={600}
                    c={checked ? 'sage.3' : undefined}
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {option.label}
                  </Text>
                  {preset && <Summary inputs={preset.inputs} />}
                </Stack>
                {checked && CHECK_ICON}
              </Group>
            )
          }}
        />
        <Button h={40} onClick={() => setDialog('save')} disabled={full}>
          Save
        </Button>
        <Menu position="bottom-end" width={160}>
          <Menu.Target>
            <ActionIcon
              variant="default"
              size={40}
              aria-label="Setup actions"
              disabled={presets.length === 0}
            >
              ⋮
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item disabled={!active} onClick={update}>
              Update
            </Menu.Item>
            <Menu.Item disabled={!active} onClick={() => setDialog('rename')}>
              Rename
            </Menu.Item>
            <Menu.Item
              disabled={presets.length < 2}
              onClick={() => setDialog('reorder')}
            >
              Reorder
            </Menu.Item>
            <Menu.Item
              color="red"
              disabled={!active}
              onClick={() => setDialog('delete')}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      {presets.length === 0 && (
        <Text size="xs" c="dark.2" mt={6}>
          Save the inputs below to load them again later.
        </Text>
      )}
      {full && (
        <Text size="xs" c="dark.2" mt={6}>
          You can keep {MAX_PRESETS} setups. Delete one to save another.
        </Text>
      )}
      {unsaved.length > 0 && (
        <Text size="xs" c="red.4" mt={6} role="alert">
          Couldn&apos;t save. Browser storage is unavailable or full.
        </Text>
      )}

      {dialog === 'save' && (
        <NameModal
          title="Save setup"
          submitLabel="Save"
          initial=""
          onSubmit={save}
          onClose={close}
        >
          <Stack gap={6}>
            <Text size="xs" c="dark.2">
              Saves every input, including events and MVP tier:
            </Text>
            <Summary inputs={inputs} />
          </Stack>
        </NameModal>
      )}
      {dialog === 'rename' && active && (
        <NameModal
          title="Rename setup"
          submitLabel="Rename"
          initial={active.name}
          onSubmit={rename}
          onClose={close}
        />
      )}
      <ResponsiveModal
        opened={dialog === 'reorder'}
        onClose={close}
        closeOnEscape={!dragging}
        title="Reorder setups"
      >
        <Stack gap="md">
          <Text size="xs" c="dark.2">
            Drag to change the order in the Saved setup list.
          </Text>
          <ReorderList
            presets={presets}
            onReorder={reorder}
            onDragging={setDragging}
          />
          <Group justify="flex-end">
            <Button onClick={close}>Done</Button>
          </Group>
        </Stack>
      </ResponsiveModal>
      <ResponsiveModal
        opened={dialog === 'delete' && active !== null}
        onClose={close}
        title={`Delete ${active?.name ?? 'setup'}?`}
      >
        <Text size="sm" c="dimmed">
          This cannot be undone. The calculator keeps its current inputs.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={close}>
            Cancel
          </Button>
          <Button color="red" onClick={remove}>
            Delete setup
          </Button>
        </Group>
      </ResponsiveModal>
    </div>
  )
}
