// Boss catalog for the "Edit Boss Content" picker.
// `cadence` groups bosses in the picker and tracks their crystal reset:
// 'weekly' (resets Thursday) or 'monthly' (Black Mage).
// Daily-reset bosses (Horntail, Gollux) are intentionally excluded. Reset
// cadence per difficulty sourced from
// the community DigitalTQ boss guide (no official GMS list breaks it down this way).
// img -> self-hosted portrait in public/bosses (null = fall back to initials avatar).
// Portraits were sourced once from the community maplestory.io sprite API.
// Level requirements are the in-game entry levels per difficulty.
export const BOSS_CONTENT = [
  {
    id: 'lotus',
    name: 'Lotus',
    cadence: 'weekly',
    img: '/bosses/lotus.png',
    difficulties: [
      { d: 'Normal', level: 210 },
      { d: 'Hard', level: 245 },
      { d: 'Extreme', level: 275 },
    ],
  },
  {
    id: 'damien',
    name: 'Damien',
    cadence: 'weekly',
    img: '/bosses/damien.png',
    difficulties: [
      { d: 'Normal', level: 210 },
      { d: 'Hard', level: 250 },
    ],
  },
  {
    id: 'slime',
    name: 'Guardian Angel Slime',
    cadence: 'weekly',
    img: '/bosses/slime.png',
    difficulties: [
      { d: 'Normal', level: 210 },
      { d: 'Chaos', level: 240 },
    ],
  },
  {
    id: 'lucid',
    name: 'Lucid',
    cadence: 'weekly',
    img: '/bosses/lucid.png',
    difficulties: [
      { d: 'Easy', level: 220 },
      { d: 'Normal', level: 230 },
      { d: 'Hard', level: 250 },
    ],
  },
  {
    id: 'will',
    name: 'Will',
    cadence: 'weekly',
    img: '/bosses/will.png',
    difficulties: [
      { d: 'Easy', level: 235 },
      { d: 'Normal', level: 245 },
      { d: 'Hard', level: 255 },
    ],
  },
  {
    id: 'gloom',
    name: 'Gloom',
    cadence: 'weekly',
    img: '/bosses/gloom.png',
    difficulties: [
      { d: 'Normal', level: 245 },
      { d: 'Chaos', level: 255 },
    ],
  },
  {
    id: 'darknell',
    name: 'Darknell',
    cadence: 'weekly',
    img: '/bosses/darknell.png',
    difficulties: [
      { d: 'Normal', level: 250 },
      { d: 'Hard', level: 260 },
    ],
  },
  {
    id: 'verushilla',
    name: 'Verus Hilla',
    cadence: 'weekly',
    img: '/bosses/verushilla.png',
    difficulties: [
      { d: 'Normal', level: 250 },
      { d: 'Hard', level: 260 },
    ],
  },
  {
    id: 'seren',
    name: 'Chosen Seren',
    cadence: 'weekly',
    img: '/bosses/seren.png',
    difficulties: [
      { d: 'Normal', level: 265 },
      { d: 'Hard', level: 275 },
      { d: 'Extreme', level: 285 },
    ],
  },
  {
    id: 'kalos',
    name: 'Kalos the Guardian',
    cadence: 'weekly',
    img: '/bosses/kalos.png',
    difficulties: [
      { d: 'Easy', level: 265 },
      { d: 'Normal', level: 275 },
      { d: 'Chaos', level: 280 },
      { d: 'Extreme', level: 285 },
    ],
  },
  {
    id: 'kaling',
    name: 'Kaling',
    cadence: 'weekly',
    img: '/bosses/kaling.png',
    difficulties: [
      { d: 'Easy', level: 265 },
      { d: 'Normal', level: 275 },
      { d: 'Hard', level: 280 },
      { d: 'Extreme', level: 285 },
    ],
  },
  {
    id: 'limbo',
    name: 'Limbo',
    cadence: 'weekly',
    img: '/bosses/limbo.png',
    difficulties: [
      { d: 'Normal', level: 280 },
      { d: 'Hard', level: 285 },
    ],
  },
  {
    // Odium endgame boss; all difficulties enter at Lv.270, gated by Sacred
    // Power / Authentic Force rather than level.
    id: 'firstadversary',
    name: 'The First Adversary',
    cadence: 'weekly',
    img: '/bosses/firstadversary.png',
    difficulties: [
      { d: 'Easy', level: 270 },
      { d: 'Normal', level: 270 },
      { d: 'Hard', level: 270 },
      { d: 'Extreme', level: 270 },
    ],
  },
  {
    // Talahart (Lv.290) endgame boss; both difficulties enter at Lv.290, gated
    // by Sacred Power / Authentic Force.
    id: 'baldrix',
    name: 'Baldrix',
    cadence: 'weekly',
    img: '/bosses/baldrix.png',
    difficulties: [
      { d: 'Normal', level: 290 },
      { d: 'Hard', level: 290 },
    ],
  },
  {
    id: 'blackmage',
    name: 'Black Mage',
    cadence: 'monthly',
    img: '/bosses/blackmage.png',
    difficulties: [
      { d: 'Hard', level: 255 },
      { d: 'Extreme', level: 275 },
    ],
  },
]

// Boss ids whose crystal resets monthly (Black Mage) rather than weekly.
// Tracked tasks carry a bossId, so this classifies them without a cadence field
// on the task itself.
export const MONTHLY_BOSS_IDS = new Set(
  BOSS_CONTENT.filter((boss) => boss.cadence === 'monthly').map(
    (boss) => boss.id,
  ),
)

export const isMonthlyBossTask = (task) => MONTHLY_BOSS_IDS.has(task.bossId)
