import { BossEditModal } from 'maplet'

const noop = () => {}

// A mid-game character partway through picking this week's bosses.
// Keys follow the app's `bossId:difficulty` format using real catalog ids
// (src/data/bossContent.js) so the matching checkboxes render checked.
const character = {
  bossTasks: [
    { key: 'lotus:Hard' },
    { key: 'damien:Hard' },
    { key: 'lucid:Hard' },
    { key: 'will:Hard' },
    { key: 'seren:Normal' },
    { key: 'blackmage:Hard' },
  ],
}

// The modal renders through ResponsiveModal (full-screen below 48em, which the
// 620px capture viewport triggers) and portals to the body, so the open modal
// fills the card. Extra Mantine Modal props are not forwarded by the component.
export const OpenPicker = () => (
  <BossEditModal
    opened
    onClose={noop}
    character={character}
    onSetDifficulty={noop}
    onUnselectAll={noop}
  />
)
