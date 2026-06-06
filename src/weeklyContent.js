// Weekly (non-boss) content for the "Edit Weekly Content" picker.
// These reset on the standard Thursday weekly reset. `category` groups them
// into the Content / Guild / Quest sections in the picker and the panel.
export const WEEKLY_CONTENT = [
  {
    id: 'monsterparkextreme',
    name: 'Monster Park Extreme',
    category: 'content',
  },
  { id: 'epicdungeon', name: 'Epic Dungeon', category: 'content' },
  { id: 'erdaspectrum', name: 'Erda Spectrum', category: 'content' },
  { id: 'hungrymuto', name: 'Hungry Muto', category: 'content' },
  { id: 'midnightchaser', name: 'Midnight Chaser', category: 'content' },
  { id: 'spiritsavior', name: 'Spirit Savior', category: 'content' },
  { id: 'ranheimdefense', name: 'Ranheim Defense', category: 'content' },
  { id: 'esferaguardian', name: 'Esfera Guardian', category: 'content' },
  { id: 'guildculvert', name: 'Culvert', category: 'guild' },
  { id: 'guildflagrace', name: 'Flag Race', category: 'guild' },
  { id: 'erdasrequest', name: "Erda's Request", category: 'quest' },
]

// Display order and labels for the weekly-content categories.
export const WEEKLY_SECTIONS = [
  { key: 'content', label: 'Content' },
  { key: 'guild', label: 'Guild' },
  { key: 'quest', label: 'Quest' },
]

const CATEGORY_BY_ID = new Map(WEEKLY_CONTENT.map((c) => [c.id, c.category]))
const ORDER_BY_ID = new Map(WEEKLY_CONTENT.map((c, i) => [c.id, i]))

// A tracked weekly task carries a contentId; map it back to its category
// (falling back to 'content' for anything not in the catalog).
export const weeklyCategoryOf = (task) =>
  CATEGORY_BY_ID.get(task.contentId) ?? 'content'

// Catalog position of a tracked task, so the panel can show items in the same
// order as the edit modal regardless of when they were added. Unknown ids sort
// last.
export const weeklyOrderOf = (task) =>
  ORDER_BY_ID.get(task.contentId) ?? Infinity
