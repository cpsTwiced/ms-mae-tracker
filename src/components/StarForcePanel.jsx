import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  Divider,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
  VisuallyHidden,
} from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import {
  expectedRun,
  simulateRuns,
  mulberry32,
  maxStarForLevel,
  MAX_STAR,
  estimateRunQuantiles,
} from '@/lib/starforce'
import { formatMeso, digits, clampRaw, pct } from '@/lib/format'
import { SF_DEFAULTS, sfInputsFromQuery, sfInputsToQuery } from '@/lib/storage'
import ScrollStatusArea from './ScrollStatusArea'
import SavedSetups, { SELECT_CHEVRON } from './SavedSetups'
import StarForceLab from './StarForceLab'

// The page's two views. Each has its own address; App owns the URL.
const VIEWS = [
  { value: 'calculator', label: 'Calculator', path: '/' },
  { value: 'lab', label: 'Lab', path: '/lab' },
]

const LEVEL_PRESETS = [150, 160, 200, 250]

// Mode copy reflects the verified GMS v.269 tables: cost ×1.5-2 / ×2.5-3.5 /
// ×3-6.5 depending on the star, and levels 2-4 also lower success on 18★+.
const MODES = [
  { value: 1, title: 'Level 1', desc: 'Standard rates & cost' },
  { value: 2, title: 'Level 2', desc: '≈33% fewer booms · 1.5–2× cost' },
  { value: 3, title: 'Level 3', desc: '≈67% fewer booms · 2.5–3.5× cost' },
  { value: 4, title: 'Level 4', desc: 'No booms · 3–6.5× cost' },
]

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

// Headroom over the phone results bar's height (67px, 84px when a wide value
// wraps its label). The result cards count as on screen only once they clear
// it; index.css uses the same value for the bar's scroll-padding-bottom.
const BAR_CLEARANCE = 104

function SettingRow({ label, sub, dimmed, checked, onChange }) {
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
      <Switch
        aria-label={label}
        color="sage.6"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
    </div>
  )
}

export default function StarForcePanel({ view = 'calculator', onViewChange }) {
  const lab = view === 'lab'
  // Defaults price a Lv.200 item over the full 0★ → 22★ climb so results
  // show immediately. The inputs are one plain object so a saved setup can
  // capture and restore all of them at once; they don't persist themselves.
  //
  // Only the two events GMS currently runs (re-verified Aug 2026): Shining
  // Star Force = 30% off cost + 30% reduced destruction on ≤21★ attempts,
  // and 1+1 Star Force = +1 extra star per success on ≤10★ attempts. They
  // run independently and stack.
  const [inputs, setInputs] = useState(
    () => sfInputsFromQuery(window.location.search) ?? SF_DEFAULTS,
  )
  // A shared link fills the form once, then leaves the address bar so it
  // never shows a stale setup after an edit. Unrelated params stay put.
  useEffect(() => {
    if (sfInputsFromQuery(window.location.search)) {
      const { pathname, hash } = window.location
      window.history.replaceState(null, '', pathname + hash)
    }
  }, [])
  const clipboard = useClipboard()
  const {
    levelRaw,
    curRaw,
    targetRaw,
    starCatch,
    safeguard,
    mode,
    mvp,
    eventShining,
    eventPlusOne,
    runs,
    spares: sparesRaw,
    chance: chanceRaw,
  } = inputs
  const set = (field, value) =>
    setInputs((prev) => ({ ...prev, [field]: value }))

  // On phones the results stack under a long inputs card, so a pinned bar
  // mirrors the headline numbers while the result cards are still below the
  // screen. Once they're on screen (or scrolled past) the bar steps aside.
  const heroRef = useRef(null)
  const [barVisible, setBarVisible] = useState(false)
  useEffect(() => {
    // The Lab has no result cards to watch (and no bar).
    if (typeof IntersectionObserver === 'undefined' || !heroRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) =>
        setBarVisible(
          !entry.isIntersecting && entry.boundingClientRect.top > 0,
        ),
      { rootMargin: `0px 0px -${BAR_CLEARANCE}px 0px` },
    )
    observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [lab])

  function showResults() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    heroRef.current.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    })
    // The bar goes inert as the cards arrive, so hand focus to the results
    // instead of dropping it on the page.
    heroRef.current.focus({ preventScroll: true })
  }

  // The Lab's Target box sends you here: the star fields only live in Inputs.
  const targetRef = useRef(null)
  const flashTimer = useRef(null)
  function editTarget() {
    const field = targetRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    field.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'center',
    })
    field.focus({ preventScroll: true })
    field.dataset.flash = ''
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => delete field.dataset.flash, 1500)
  }

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
    const lvl = raw === '' ? null : Number(raw)
    if (lvl === null || lvl < 5 || lvl > 300) return set('levelRaw', raw)
    const cap = maxStarForLevel(lvl)
    setInputs((prev) => ({
      ...prev,
      levelRaw: raw,
      curRaw: clampRaw(prev.curRaw, cap),
      targetRaw: clampRaw(prev.targetRaw, cap),
    }))
  }

  const opts = useMemo(
    () => ({ starCatch, safeguard, mode, mvp, eventShining, eventPlusOne }),
    [starCatch, safeguard, mode, mvp, eventShining, eventPlusOne],
  )

  // What the Lab exposes; Safeguard and the single mode stay out of it.
  const labOpts = useMemo(
    () => ({ starCatch, mvp, eventShining, eventPlusOne }),
    [starCatch, mvp, eventShining, eventPlusOne],
  )

  // Calculator-only work is skipped in the Lab.
  const run = useMemo(
    () => (rangeValid && !lab ? expectedRun(level, cur, target, opts) : null),
    [rangeValid, lab, level, cur, target, opts],
  )

  const sim = useMemo(
    () =>
      rangeValid && !lab
        ? simulateRuns(level, cur, target, opts, {
            runs: Number(runs),
            rng: mulberry32(SIM_SEED),
          })
        : null,
    [rangeValid, lab, level, cur, target, opts, runs],
  )

  const hasResult = run !== null && run.perStar.length > 0
  // Extreme climbs (toward 29-30★) average millions of attempts per run —
  // simulating them would either hang the tab or, clipped, report a false
  // median, so simulateRuns refuses them. The closed-form expectations stay
  // exact; only the sim skips.
  const simGated = hasResult && sim === null

  // Analytic typical-run figures stand in for the skipped simulation, so a
  // tail-driven mean is never the only number on screen.
  const est = simGated ? estimateRunQuantiles(run.cost) : null

  // Dim Safeguard/mode only when no attempt can ever reach them. Booms knock
  // runs back to 12-20★ checkpoints, so even a range that starts above the
  // 15-17★ (Safeguard) / 15-21★ (mode) windows re-climbs through them —
  // any target past 15★ keeps both relevant. Null stars count as "in range"
  // so nothing looks disabled while the form is still empty.
  const lowTarget = rangeValid && target <= 15
  // With safeguard on and no step past 18★, every mode-eligible attempt is
  // safeguarded, so the mode has nothing left to affect.
  const modeCovered = rangeValid && safeguard && target <= 18 && cur < 18
  const modeScopeNote = modeCovered
    ? `safeguard covers every step to ${target} ★`
    : rangeValid && safeguard && target > 18
      ? '19–21 ★ — off on safeguarded attempts'
      : '15–21 ★ only'

  const booms = run?.booms ?? 0
  // Shared by the result cards and the phone results bar.
  const costText = hasResult ? formatMeso(Math.round(run.cost)) : '—'
  const boomsText = hasResult ? (booms > 0 ? booms.toFixed(1) : '0') : '—'
  const boomsColor = booms >= 1 ? 'orange.3' : 'dark.0'
  // For gated climbs the mean boom count is tail-driven, so the helper line
  // talks about a typical run instead of anchoring on the huge average.
  const spares =
    booms === 0
      ? 'no spares needed'
      : simGated
        ? `≈ ${Math.ceil(booms * Math.LN2).toLocaleString('en-US')} booms in a typical run`
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
      <div
        className="appTabs sfViewTabs"
        role="tablist"
        aria-label="Star Force views"
      >
        {VIEWS.map((v) => (
          <UnstyledButton
            key={v.value}
            component="a"
            href={v.path}
            role="tab"
            aria-selected={view === v.value}
            className="appTab"
            data-active={view === v.value || undefined}
            onClick={(e) => {
              // Let modified clicks open a new tab/window as usual.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
              e.preventDefault()
              if (v.value !== view) onViewChange?.(v.value)
            }}
          >
            {v.label}
          </UnstyledButton>
        ))}
      </div>

      <div className="sfLayout">
        <Card
          withBorder
          radius="md"
          padding={18}
          className="sfInputs"
          bg="dark.6"
        >
          <Stack gap={14}>
            <Group justify="space-between">
              <Text size="md" fw={600}>
                Inputs
              </Text>
              <Button
                variant="default"
                size="xs"
                onClick={() =>
                  clipboard.copy(
                    `${window.location.origin}${lab ? '/lab' : '/'}?${sfInputsToQuery(inputs)}`,
                  )
                }
              >
                {clipboard.copied
                  ? '✓ Copied'
                  : clipboard.error
                    ? "Couldn't copy"
                    : 'Copy link'}
              </Button>
              {/* Announced outside the button, so the result is read once. */}
              <VisuallyHidden role="status">
                {clipboard.copied
                  ? 'Link copied'
                  : clipboard.error
                    ? "Couldn't copy the link"
                    : ''}
              </VisuallyHidden>
            </Group>

            <SavedSetups inputs={inputs} onLoad={setInputs} />
            <Divider color="dark.5" />

            <div>
              <Text size="sm" fw={600} mb={7}>
                Item level
              </Text>
              <Stack gap={8}>
                <TextInput
                  aria-label="Item level"
                  value={levelRaw}
                  onChange={(e) =>
                    set(
                      'levelRaw',
                      clampRaw(digits(e.currentTarget.value), 300),
                    )
                  }
                  onBlur={() => applyLevel(levelRaw)}
                  w={80}
                  size="sm"
                  inputMode="numeric"
                  classNames={{ input: 'sfNumInput' }}
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
                  {/* Star values render live-clamped to the level cap, so a
                      level change can never leave an out-of-range star on
                      screen; the raw value survives until the next edit, so
                      restoring the old level restores the stars. */}
                  <TextInput
                    aria-label="Current star"
                    value={clampRaw(curRaw, starCap)}
                    onChange={(e) =>
                      set(
                        'curRaw',
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
                    classNames={{ input: 'sfNumInput' }}
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
                    ref={targetRef}
                    aria-label="Target star"
                    value={clampRaw(targetRaw, starCap)}
                    onChange={(e) =>
                      set(
                        'targetRaw',
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
                    classNames={{ input: 'sfNumInput sfNumInputTarget' }}
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
              checked={starCatch}
              onChange={(v) => set('starCatch', v)}
            />

            {/* The Lab picks modes itself, so these stay calculator-only. */}
            {!lab && (
              <>
                <SettingRow
                  label="Safeguard"
                  sub="No booms up to 18 ★, triple cost"
                  dimmed={lowTarget}
                  checked={safeguard}
                  onChange={(v) => set('safeguard', v)}
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
                    data-disabled={lowTarget || modeCovered || undefined}
                  >
                    {MODES.map((m) => (
                      <UnstyledButton
                        key={m.value}
                        className="sfModeCard"
                        data-active={mode === m.value || undefined}
                        onClick={() => set('mode', m.value)}
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
              </>
            )}

            <div>
              <Text size="sm" fw={600} mb={4}>
                MVP tier
              </Text>
              <Select
                aria-label="MVP tier"
                data={MVP_OPTIONS}
                value={mvp}
                onChange={(v) => set('mvp', v ?? 'none')}
                size="sm"
                rightSection={SELECT_CHEVRON}
                rightSectionPointerEvents="none"
                styles={{ input: { height: 40, fontSize: 16 } }}
                allowDeselect={false}
              />
            </div>

            {!lab && (
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
                  onChange={(v) => set('runs', v ?? '3000')}
                  size="sm"
                  rightSection={SELECT_CHEVRON}
                  rightSectionPointerEvents="none"
                  styles={{ input: { height: 40, fontSize: 16 } }}
                  allowDeselect={false}
                />
              </div>
            )}

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
                  checked={eventShining}
                  onChange={(v) => set('eventShining', v)}
                />
                <SettingRow
                  label="1+1 Star Force"
                  sub="+1 ★ per success · under 11 ★, caps at 12 ★"
                  checked={eventPlusOne}
                  onChange={(v) => set('eventPlusOne', v)}
                />
              </Stack>
            </div>

            {lab && (
              <Text size="xs" c="dimmed">
                Same inputs as the Calculator. The optimizer picks the modes.
              </Text>
            )}
          </Stack>
        </Card>

        {lab ? (
          <StarForceLab
            level={level}
            cur={cur}
            target={target}
            rangeValid={rangeValid}
            starCap={starCap}
            opts={labOpts}
            sparesRaw={sparesRaw}
            chanceRaw={chanceRaw}
            targetText={clampRaw(targetRaw, starCap)}
            onSet={set}
            onEditTarget={editTarget}
            emptyMessage={emptyMessage}
          />
        ) : (
          <div className="sfResults">
            <div className="sfHero" ref={heroRef} tabIndex={-1}>
              <div className="sfHeroCost">
                <Text className="sfEyebrow" c="sage.2">
                  Expected cost
                </Text>
                <Group gap={8} align="baseline">
                  <Text className="sfHeroValue" c="sage.2" component="span">
                    {costText}
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
                  <Text className="sfHeroValue" c={boomsColor} component="span">
                    {boomsText}
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
                  Median run{est ? ' (est.)' : ''}
                </Text>
                <Text size="md" fw={600} ff="monospace">
                  {sim
                    ? formatMeso(sim.median)
                    : est
                      ? `≈ ${formatMeso(est.median)}`
                      : '—'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dark.2">
                  Unlucky run (top 10%{est ? ', est.' : ''})
                </Text>
                <Text size="md" fw={600} ff="monospace" c="orange.3">
                  {sim
                    ? formatMeso(sim.p90)
                    : est
                      ? `≈ ${formatMeso(est.p90)}`
                      : '—'}
                </Text>
              </div>
              {simGated && (
                <Text size="xs" c="dimmed" style={{ flexBasis: '100%' }}>
                  simulation skipped — this climb averages{' '}
                  {Math.round(run.attempts).toLocaleString('en-US')} attempts
                  per run, far too many to replay. Median / unlucky are analytic
                  estimates: costs this deep are close to exponential, so a
                  typical run spends well under the tail-driven average.
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
                        <th className="sfWideOnly">Cost / attempt</th>
                        <th>Exp. cost</th>
                        <th className="sfWideOnly">Exp. booms</th>
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
                          <td className="sfWideOnly">
                            {formatMeso(row.attemptCost)}
                          </td>
                          <td style={{ color: 'var(--mantine-color-sage-3)' }}>
                            {formatMeso(Math.round(row.expectedCost))}
                          </td>
                          <td className="sfWideOnly">
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
        )}
      </div>

      <footer className="sfFooter">
        Rates &amp; costs: GMS v.264+ 30 ★ tables — Enhancement Mode multipliers
        community-sourced.
      </footer>

      {!lab && (
        <UnstyledButton
          className="sfBar"
          data-visible={barVisible || undefined}
          inert={!barVisible}
          onClick={showResults}
        >
          <div>
            <Text className="sfEyebrow" c="sage.2">
              Expected cost
            </Text>
            <Text className="sfBarValue" c="sage.2">
              {costText}
            </Text>
          </div>
          <div>
            <Text className="sfEyebrow" c="dark.2">
              Booms
            </Text>
            <Text className="sfBarValue" c={boomsColor}>
              {boomsText}
            </Text>
          </div>
          <Button
            component="span"
            size="xs"
            px="md"
            ml="auto"
            style={{ flexShrink: 0 }}
          >
            Full breakdown<span aria-hidden="true">&nbsp;↓</span>
          </Button>
        </UnstyledButton>
      )}
    </div>
  )
}
