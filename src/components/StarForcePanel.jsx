import { useMemo, useState } from 'react'
import {
  Card,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import {
  expectedRun,
  simulateRuns,
  mulberry32,
  maxStarForLevel,
  MAX_STAR,
  SIM_MAX_EXPECTED_ATTEMPTS,
} from '@/lib/starforce'
import { formatMeso } from '@/lib/format'
import ScrollStatusArea from './ScrollStatusArea'

const LEVEL_PRESETS = [150, 160, 200, 250]

// Mode copy reflects the verified GMS v.269 tables: cost ×1.5-2 / ×2.5-3.5 /
// ×3-6.5 depending on the star, and levels 2-4 also lower success on 18★+.
const MODES = [
  { value: 1, title: 'Level 1', desc: 'Standard rates & cost' },
  { value: 2, title: 'Level 2', desc: '≈33% fewer booms · 1.5–2× cost' },
  { value: 3, title: 'Level 3', desc: '≈67% fewer booms · 2.5–3.5× cost' },
  { value: 4, title: 'Level 4', desc: 'No booms · 3–6.5× cost' },
]

// Plain down-arrow chevron for the dropdowns (Mantine's default indicator
// doesn't match the design).
const SELECT_CHEVRON = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: 'var(--mantine-color-dark-2)' }}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const MVP_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'silver', label: 'Silver — 3% off, up to 17 ★' },
  { value: 'gold', label: 'Gold — 5% off, up to 17 ★' },
  { value: 'diamond', label: 'Diamond+ — 10% off, up to 17 ★' },
]

const RUN_OPTIONS = [
  { value: '1000', label: '1,000 — fast' },
  { value: '3000', label: '3,000 — balanced' },
  { value: '10000', label: '10,000 — precise' },
  { value: '20000', label: '20,000 — slow' },
]

// Simulation seed: fixed so the median/p90 don't jitter on every keystroke.
const SIM_SEED = 0x5f3759df

function digits(value) {
  return value.replace(/\D/g, '')
}

// Overshooting a field snaps to its max (typing "999" in Level lands on 300,
// a 26★ target on a Lv.100 item lands on its 8★ cap) instead of silently
// dropping digits or accepting values the game can't reach.
function clampRaw(raw, max) {
  if (raw === '') return ''
  return String(Math.min(Number(raw), max))
}

function SettingRow({ label, sub, dimmed, control }) {
  return (
    <div className="sfRow" data-dimmed={dimmed || undefined}>
      <div>
        <Text size="sm" fw={600}>
          {label}
        </Text>
        {sub && (
          <Text size="sm" c="dimmed">
            {sub}
          </Text>
        )}
      </div>
      {control}
    </div>
  )
}

function pct(p) {
  return `${(p * 100).toFixed(1)}%`
}

export default function StarForcePanel() {
  // Defaults price a Lv.200 item over the full 0★ → 22★ climb so results
  // show immediately. Everything below is plain local state — nothing
  // persists.
  const [levelRaw, setLevelRaw] = useState('200')
  const [curRaw, setCurRaw] = useState('0')
  const [targetRaw, setTargetRaw] = useState('22')
  const [starCatch, setStarCatch] = useState(true)
  const [safeguard, setSafeguard] = useState(false)
  const [mode, setMode] = useState(1)
  const [mvp, setMvp] = useState('none')
  // Only the two events GMS currently runs (re-verified Aug 2026): Shining
  // Star Force = 30% off cost + 30% reduced destruction on ≤21★ attempts,
  // and 1+1 Star Force = +1 extra star per success on ≤10★ attempts. They
  // run independently and stack. The engine still supports the retired
  // 5/10/15★-guarantee flag, but it gets no toggle here.
  const [eventShining, setEventShining] = useState(false)
  const [eventPlusOne, setEventPlusOne] = useState(false)
  const [runs, setRuns] = useState('3000')

  const level = levelRaw === '' ? null : Number(levelRaw)
  const cur = curRaw === '' ? null : Math.min(Number(curRaw), MAX_STAR - 1)
  const target = targetRaw === '' ? null : Math.min(Number(targetRaw), MAX_STAR)

  const levelValid = level !== null && level >= 5 && level <= 300
  const rangeValid =
    levelValid && cur !== null && target !== null && target > cur
  const starCap = levelValid ? maxStarForLevel(level) : MAX_STAR

  // Committing a level (blur or a preset pill) snaps out-of-cap star fields
  // down to the new cap. Deliberately not done per keystroke: half-typed
  // levels ("1" on the way to "150") would wrongly crush the stars.
  function applyLevel(raw) {
    setLevelRaw(raw)
    const lvl = raw === '' ? null : Number(raw)
    if (lvl === null || lvl < 5 || lvl > 300) return
    const cap = maxStarForLevel(lvl)
    setCurRaw((c) => clampRaw(c, cap))
    setTargetRaw((t) => clampRaw(t, cap))
  }

  const opts = useMemo(
    () => ({
      starCatch,
      safeguard,
      mode,
      mvp,
      eventCost30: eventShining,
      eventBoom30: eventShining,
      eventPlusOne,
    }),
    [starCatch, safeguard, mode, mvp, eventShining, eventPlusOne],
  )

  const run = useMemo(
    () => (rangeValid ? expectedRun(level, cur, target, opts) : null),
    [rangeValid, level, cur, target, opts],
  )

  // Extreme climbs (toward 29-30★) average millions of attempts per run —
  // simulating them would either hang the tab or, clipped, report a false
  // median. The closed-form expectations stay exact, so only the sim skips.
  const simGated =
    run !== null &&
    run.perStar.length > 0 &&
    run.attempts > SIM_MAX_EXPECTED_ATTEMPTS

  const sim = useMemo(
    () =>
      rangeValid && !simGated
        ? simulateRuns(level, cur, target, opts, {
            runs: Number(runs),
            rng: mulberry32(SIM_SEED),
          })
        : null,
    [rangeValid, simGated, level, cur, target, opts, runs],
  )

  const hasResult = run !== null && run.perStar.length > 0

  // Dim Safeguard/mode only when no attempt can ever reach them. Booms knock
  // runs back to 12-20★ checkpoints, so even a range that starts above the
  // 15-17★ (Safeguard) / 15-21★ (mode) windows re-climbs through them —
  // any target past 15★ keeps both relevant. Null stars count as "in range"
  // so nothing looks disabled while the form is still empty.
  const safeguardDimmed = rangeValid && target <= 15
  const modeDimmed = rangeValid && target <= 15
  // With safeguard on and no step past 18★, every mode-eligible attempt is
  // safeguarded, so the mode has nothing left to affect.
  const modeCovered = rangeValid && safeguard && target <= 18 && cur < 18
  const modeScopeNote = modeCovered
    ? `safeguard covers every step to ${target} ★`
    : rangeValid && safeguard && target > 18
      ? '19–21 ★ — off on safeguarded attempts'
      : '15–21 ★ only'

  const booms = run?.booms ?? 0
  const spares =
    booms === 0
      ? 'no spares needed'
      : `bring ${Math.ceil(booms)} spare${Math.ceil(booms) === 1 ? '' : 's'}`

  // The cap case matters: a valid-looking range (say 20 → 25 on a Lv.130
  // item) silently clamps to the cap and produces no rows, and "pick a higher
  // target" would be misleading advice there.
  const emptyMessage = !levelValid
    ? 'Enter an item level to price the run.'
    : cur !== null && cur >= starCap
      ? `a Lv.${level} item is already at its ${starCap} ★ cap`
      : 'Pick a target above your current star.'

  return (
    <div>
      <div className="sfLayout">
        <Card
          withBorder
          radius="md"
          padding={18}
          className="sfInputs"
          bg="dark.6"
        >
          <Stack gap={14}>
            <Text size="md" fw={600}>
              Inputs
            </Text>

            <div>
              <Text size="sm" fw={600} mb={7}>
                Item level
              </Text>
              <Stack gap={8}>
                <TextInput
                  aria-label="Item level"
                  value={levelRaw}
                  onChange={(e) =>
                    setLevelRaw(clampRaw(digits(e.currentTarget.value), 300))
                  }
                  onBlur={() => applyLevel(levelRaw)}
                  w={80}
                  size="sm"
                  inputMode="numeric"
                  styles={{
                    input: {
                      height: 40,
                      fontFamily: 'var(--mantine-font-family-monospace)',
                      fontSize: 16,
                      fontWeight: 600,
                      borderColor: 'var(--mantine-color-dark-3)',
                    },
                  }}
                />
                <Group gap={6}>
                  {LEVEL_PRESETS.map((preset) => (
                    <UnstyledButton
                      key={preset}
                      className="sfPill"
                      data-active={level === preset || undefined}
                      onClick={() => applyLevel(String(preset))}
                    >
                      {preset}
                    </UnstyledButton>
                  ))}
                </Group>
              </Stack>
            </div>

            <div>
              <Group gap={10} align="flex-end" wrap="nowrap">
                <div>
                  <Text size="sm" fw={600} mb={7}>
                    Current star
                  </Text>
                  <TextInput
                    aria-label="Current star"
                    value={curRaw}
                    onChange={(e) =>
                      setCurRaw(
                        clampRaw(digits(e.currentTarget.value), starCap),
                      )
                    }
                    w={92}
                    size="sm"
                    inputMode="numeric"
                    rightSection={
                      <Text size="xs" c="dark.3">
                        ★
                      </Text>
                    }
                    styles={{
                      input: {
                        height: 40,
                        fontFamily: 'var(--mantine-font-family-monospace)',
                        fontSize: 16,
                        fontWeight: 600,
                        borderColor: 'var(--mantine-color-dark-3)',
                      },
                    }}
                  />
                </div>
                <Text c="dark.3" pb={10}>
                  →
                </Text>
                <div>
                  <Text size="sm" fw={600} mb={7}>
                    Target star
                  </Text>
                  <TextInput
                    aria-label="Target star"
                    value={targetRaw}
                    onChange={(e) =>
                      setTargetRaw(
                        clampRaw(digits(e.currentTarget.value), starCap),
                      )
                    }
                    w={92}
                    size="sm"
                    inputMode="numeric"
                    rightSection={
                      <Text size="xs" c="sage.7">
                        ★
                      </Text>
                    }
                    styles={{
                      input: {
                        height: 40,
                        fontFamily: 'var(--mantine-font-family-monospace)',
                        fontSize: 16,
                        fontWeight: 600,
                        borderColor: 'var(--mantine-color-sage-8)',
                        color: 'var(--mantine-color-sage-3)',
                      },
                    }}
                  />
                </div>
              </Group>
              {levelValid && starCap < MAX_STAR && (
                <Text size="xs" c="dimmed" mt={4}>
                  a Lv.{level} item caps at {starCap} ★
                </Text>
              )}
            </div>

            <SettingRow
              label="Star Catch"
              sub="+5% relative success rate"
              control={
                <Switch
                  aria-label="Star Catch"
                  color="sage.6"
                  checked={starCatch}
                  onChange={(e) => setStarCatch(e.currentTarget.checked)}
                />
              }
            />

            <SettingRow
              label="Safeguard"
              sub="No booms up to 18 ★, triple cost"
              dimmed={safeguardDimmed}
              control={
                <Switch
                  aria-label="Safeguard"
                  color="sage.6"
                  checked={safeguard}
                  onChange={(e) => setSafeguard(e.currentTarget.checked)}
                />
              }
            />

            <div>
              <Group gap={6} align="baseline" mb={4}>
                <Text size="sm" fw={600}>
                  Enhancement mode
                </Text>
                <Text size="xs" c="dimmed">
                  {modeScopeNote}
                </Text>
              </Group>
              <div
                className="sfModeGrid"
                data-disabled={modeDimmed || modeCovered || undefined}
              >
                {MODES.map((m) => (
                  <UnstyledButton
                    key={m.value}
                    className="sfModeCard"
                    data-active={mode === m.value || undefined}
                    onClick={() => setMode(m.value)}
                  >
                    <Text size="sm" fw={700}>
                      {m.title}
                    </Text>
                    <Text size="xs" opacity={0.72}>
                      {m.desc}
                    </Text>
                  </UnstyledButton>
                ))}
              </div>
            </div>

            <div>
              <Text size="sm" fw={600} mb={4}>
                MVP tier
              </Text>
              <Select
                aria-label="MVP tier"
                data={MVP_OPTIONS}
                value={mvp}
                onChange={(v) => setMvp(v ?? 'none')}
                size="sm"
                rightSection={SELECT_CHEVRON}
                rightSectionPointerEvents="none"
                styles={{ input: { height: 40, fontSize: 16 } }}
                allowDeselect={false}
              />
            </div>

            <div>
              <Group gap={6} align="baseline" mb={7}>
                <Text size="sm" fw={600}>
                  Simulation runs
                </Text>
                <Text size="xs" c="dark.3">
                  more runs, steadier numbers
                </Text>
              </Group>
              <Select
                aria-label="Simulation runs"
                data={RUN_OPTIONS}
                value={runs}
                onChange={(v) => setRuns(v ?? '3000')}
                size="sm"
                rightSection={SELECT_CHEVRON}
                rightSectionPointerEvents="none"
                styles={{ input: { height: 40, fontSize: 16 } }}
                allowDeselect={false}
              />
            </div>

            <div>
              <Group gap={6} align="baseline" mb={7}>
                <Text size="sm" fw={600}>
                  Events
                </Text>
                <Text size="xs" c="dark.3">
                  select all that apply
                </Text>
              </Group>
              <Stack gap={8}>
                <SettingRow
                  label="Shining Star Force"
                  sub="30% off cost + 30% fewer booms up to 22 ★"
                  control={
                    <Switch
                      aria-label="Shining Star Force"
                      color="sage.6"
                      checked={eventShining}
                      onChange={(e) => setEventShining(e.currentTarget.checked)}
                    />
                  }
                />
                <SettingRow
                  label="1+1 Star Force"
                  sub="+1 ★ per success · under 11 ★, caps at 12 ★"
                  control={
                    <Switch
                      aria-label="1+1 Star Force"
                      color="sage.6"
                      checked={eventPlusOne}
                      onChange={(e) => setEventPlusOne(e.currentTarget.checked)}
                    />
                  }
                />
              </Stack>
            </div>
          </Stack>
        </Card>

        <div className="sfResults">
          <div className="sfHero">
            <div className="sfHeroCost">
              <Text className="sfEyebrow" c="sage.2">
                Expected cost
              </Text>
              <Group gap={8} align="baseline">
                <Text className="sfHeroValue" c="sage.2" component="span">
                  {hasResult ? formatMeso(Math.round(run.cost)) : '—'}
                </Text>
                <Text size="md" fw={600} c="sage.4" component="span">
                  mesos
                </Text>
              </Group>
              <Text size="xs" ff="monospace" c="dark.2" mt={4}>
                {hasResult
                  ? `${Math.round(run.cost).toLocaleString('en-US')} mesos`
                  : emptyMessage}
              </Text>
            </div>
            <div className="sfHeroBooms">
              <Text className="sfEyebrow" c="dark.2">
                Expected booms
              </Text>
              <Group gap={8} align="baseline">
                <Text
                  className="sfHeroValue"
                  c={booms >= 1 ? 'orange.3' : 'dark.0'}
                  component="span"
                >
                  {hasResult ? (booms > 0 ? booms.toFixed(1) : '0') : '—'}
                </Text>
                {hasResult && booms > 0 && (
                  <Text size="md" fw={600} c="dark.2" component="span">
                    {booms.toFixed(1) === '1.0' ? 'boom' : 'booms'}
                  </Text>
                )}
              </Group>
              <Text size="xs" ff="monospace" c="dark.2" mt={8}>
                {hasResult ? spares : ' '}
              </Text>
            </div>
          </div>

          <div className="sfStats">
            <div>
              <Text size="sm" c="dark.2">
                Expected attempts
              </Text>
              <Group gap={4} align="baseline">
                <Text size="md" fw={600} ff="monospace" component="span">
                  {hasResult ? run.attempts.toFixed(0) : '—'}
                </Text>
                {hasResult && (
                  <Text size="xs" c="dark.2" component="span">
                    {Math.round(run.attempts) === 1 ? 'attempt' : 'attempts'}
                  </Text>
                )}
              </Group>
            </div>
            <div>
              <Text size="sm" c="dark.2">
                Median run
              </Text>
              <Text size="md" fw={600} ff="monospace">
                {sim ? formatMeso(sim.median) : '—'}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dark.2">
                Unlucky run (top 10%)
              </Text>
              <Text size="md" fw={600} ff="monospace" c="orange.3">
                {sim ? formatMeso(sim.p90) : '—'}
              </Text>
            </div>
            {simGated && (
              <Text size="xs" c="dimmed" style={{ flexBasis: '100%' }}>
                simulation skipped — this climb averages{' '}
                {Math.round(run.attempts).toLocaleString('en-US')} attempts per
                run, far too many to replay; the expected values are exact math,
                but a typical run will spend much less than the average
              </Text>
            )}
          </div>

          <div className="sfTableCard">
            <Text size="md" fw={600} px={16} pt={14} pb={10}>
              Enhancement table
            </Text>
            <ScrollStatusArea
              className="sfTableScroll"
              refreshKey={run}
              scrollbars="xy"
            >
              {hasResult ? (
                <table className="sfTable">
                  <thead>
                    <tr>
                      <th>Star</th>
                      <th>Success</th>
                      <th>Boom</th>
                      <th>Cost / attempt</th>
                      <th>Exp. cost</th>
                      <th>Exp. booms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.perStar.map((row) => (
                      <tr key={row.star}>
                        <td>
                          {row.star} → {row.nextStar}
                        </td>
                        <td>{pct(row.odds.success)}</td>
                        <td
                          style={
                            row.odds.boom > 0
                              ? { color: 'var(--mantine-color-orange-3)' }
                              : { color: 'var(--mantine-color-dark-3)' }
                          }
                        >
                          {row.odds.boom > 0 ? pct(row.odds.boom) : '—'}
                        </td>
                        <td>{formatMeso(row.attemptCost)}</td>
                        <td style={{ color: 'var(--mantine-color-sage-3)' }}>
                          {formatMeso(Math.round(row.expectedCost))}
                        </td>
                        <td>
                          {row.expectedBooms > 0
                            ? row.expectedBooms.toFixed(2)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Text size="sm" c="dimmed" px={16} pb={14}>
                  {emptyMessage}
                </Text>
              )}
            </ScrollStatusArea>
          </div>
        </div>
      </div>

      <footer className="sfFooter">
        Rates &amp; costs: GMS v.264+ 30 ★ tables — Enhancement Mode multipliers
        community-sourced.
      </footer>
    </div>
  )
}
