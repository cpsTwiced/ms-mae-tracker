// GMS worlds, split into the two world types shown in-game.
// Shaped for Mantine's grouped Select `data` prop.
// The Challenger worlds are temporary event worlds (Season 3 launched with
// v.269 "Ride the Lightning"); in-game they sit under the existing Heroic /
// Interactive world-type tabs, so they're listed within those groups.
export const SERVER_GROUPS = [
  {
    group: 'Heroic',
    items: ['Kronos', 'Hyperion', 'Challenger-Heroic'],
  },
  {
    group: 'Interactive',
    items: ['Scania', 'Bera', 'Challenger-Interactive'],
  },
]
