import { WeeklyEditModal } from 'maplet'

const noop = () => {}

// A character already tracking a few weeklies. Keys are real content ids from
// src/data/weeklyContent.js, so those rows render checked.
const character = {
  weeklyTasks: [
    { key: 'monsterparkextreme' },
    { key: 'hungrymuto' },
    { key: 'guildculvert' },
    { key: 'erdasrequest' },
  ],
}

// Renders through ResponsiveModal (full-screen below 48em; the 620px capture
// viewport triggers that) and portals to the body, so the open modal fills the
// card. Extra Mantine Modal props are not forwarded by the component.
export const OpenPicker = () => (
  <WeeklyEditModal
    opened
    onClose={noop}
    character={character}
    onSetContent={noop}
  />
)
