import { useMemo } from 'react'
import {
  Group,
  Select,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { attemptOdds, attemptCost } from '@/lib/starforce'
import { optimizeModes, reachChances } from '@/lib/optimizer'
import { MAX_SPARES, SAFEGUARD_STARS } from '@/data/starforce'
import { SF_CHANCES, SF_DEFAULTS } from '@/lib/storage'
import { formatMeso, digits, clampRaw, pct } from '@/lib/format'
import ScrollStatusArea from './ScrollStatusArea'
import { SELECT_CHEVRON } from './SavedSetups'

const CHANCE_OPTIONS = SF_CHANCES.map((c) => ({ value: c, label: `${c}%` }))

const sparesText = (n) => `${n} ${n === 1 ? 'spare' : 'spares'}`

const sameModes = (a, b) => Object.keys(a).every((s) => a[s] === b[s])

// Level 4 at 15-17★ is Safeguard (no booms, same 3× cost), so it's shown as
// Safeguard rather than a mode level.
const isSafeguard = (star, mode) => mode === 4 && SAFEGUARD_STARS.includes(star)

const SHIELD_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    fillOpacity="0.3"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: '-3px' }}
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
)

// One cell of the per-star level grid: the level, or a shield for Safeguard.
const levelCell = (star, mode) =>
  isSafeguard(star, mode) ? (
    <span
      className="sfSafeguard"
      role="img"
      aria-label="Safeguard"
      title="Safeguard"
    >
      {SHIELD_ICON}
    </span>
  ) : (
    mode
  )

const INFO_ICON = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
)

// The Lab's results column: the cheapest Enhancement Mode plan for the chosen
// spares and chance, and a table of every spare count. Inputs are shared with
// the calculator and come in as props; the optimizer runs here.
export default function StarForceLab({
  level,
  cur,
  target,
  rangeValid,
  starCap,
  opts,
  sparesRaw,
  chanceRaw,
  targetText,
  onSet,
  onEditTarget,
  emptyMessage,
}) {
  // Spares only picks a row, so it isn't a dependency: typing it never
  // re-runs the search.
  const result = useMemo(
    () =>
      rangeValid
        ? optimizeModes(level, cur, target, opts, Number(chanceRaw) / 100)
        : null,
    [rangeValid, level, cur, target, opts, chanceRaw],
  )
  const ready = result !== null && result.stars.length > 0
  // The two "how many to bring" answers: the fewest spares that meet the
  // chance, and the spare count with the cheapest such plan (ties keep fewer).
  const fits = ready ? result.rows.filter((r) => !r.unreachable) : []
  const fewest = fits[0]
  const cheapest = fits.reduce((a, r) => (r.cost < a.cost ? r : a), fewest)
  // An empty Spares field is Auto: the fewest spares (or the most the Lab
  // plans for, when none meet the chance).
  const spares =
    sparesRaw !== '' ? Number(sparesRaw) : fewest ? fewest.spares : MAX_SPARES
  const row = ready ? result.rows[spares] : null
  const shown = row && (row.unreachable ? row.best : row)
  const goal = result?.target
  // Every option lists 0-10 spares, then only the counts where the plan gets
  // at least 1% cheaper (plus the picked one), ending at `enough` ("N+
  // spares": more can't help).
  const lastK = result?.enough ?? MAX_SPARES
  // The picked row is shown but isn't the 1% baseline, so picking a row never
  // hides another.
  const tableRows = []
  let prev
  for (const r of ready ? result.rows.slice(0, lastK + 1) : []) {
    const key =
      r.spares <= 10 ||
      r.spares === lastK ||
      (!r.unreachable && (prev.unreachable || r.cost <= prev.cost * 0.99))
    if (key) prev = r
    if (key || r.spares === spares) tableRows.push(r)
  }
  const isPlus = (r) => r.spares === result.enough
  const isPicked = (r) =>
    r.spares === spares || (isPlus(r) && spares > result.enough)
  // "Other options": whichever of those two you aren't looking at, each with
  // why you'd pick it over the plan shown.
  const others = [fewest, cheapest]
    .filter((r, i, all) => r && r.spares !== spares && all.indexOf(r) === i)
    .map((r) => ({
      r,
      why: row.unreachable
        ? `reaches ${chanceRaw}%`
        : r.cost < shown.cost
          ? `${formatMeso(Math.round(shown.cost - r.cost))} cheaper`
          : r.spares === 0
            ? 'no spares needed'
            : `${spares - r.spares} fewer ${spares - r.spares === 1 ? 'spare' : 'spares'}`,
    }))
  // Plan rows run from the first mode star to the target; past 21 ★ there are
  // no modes, but the reach chance still matters there.
  const planStars = ready
    ? Array.from({ length: goal - 15 }, (_, i) => 15 + i)
    : []
  const reach = useMemo(
    () => (shown ? reachChances(cur, goal, opts, shown.modes, spares) : null),
    [shown, cur, goal, opts, spares],
  )

  const notice = !result
    ? emptyMessage
    : !ready
      ? starCap <= 15
        ? `Enhancement Modes start at 15 ★. A Lv.${level} item caps at ${starCap} ★, so there's nothing to optimize.`
        : 'Modes only matter from 15 ★ up. Set a target above 15 ★.'
      : null

  let compare = null
  if (ready && !row.unreachable) {
    const cheapChance = pct(result.cheapest.chanceBySpares[spares])
    compare = sameModes(row.modes, result.cheapest.modes)
      ? `No modes needed: the cheapest plan reaches ${goal} ★ ${cheapChance} of the time with ${sparesText(spares)}.`
      : `The cheapest plan costs ${formatMeso(Math.round(result.cheapest.cost))}, but with ${sparesText(spares)} it reaches ${goal} ★ only ${cheapChance} of the time.`
  }

  return (
    <div className="sfResults sfLabResults">
      <div className="sfHero">
        <div className="sfHeroCost">
          <Group gap={20} align="flex-end">
            <div>
              <Text size="sm" fw={600} mb={7}>
                Spares
              </Text>
              <TextInput
                aria-label="Spares"
                value={sparesRaw}
                onChange={(e) =>
                  onSet(
                    'spares',
                    clampRaw(digits(e.currentTarget.value), MAX_SPARES),
                  )
                }
                placeholder="Auto"
                w={80}
                size="sm"
                inputMode="numeric"
                classNames={{ input: 'sfNumInput' }}
              />
            </div>
            <div>
              <Group gap={6} align="baseline" mb={7}>
                <Text size="sm" fw={600}>
                  Chance
                </Text>
                <Text size="xs" c="dark.3">
                  at least
                </Text>
              </Group>
              <Select
                aria-label="Chance"
                data={CHANCE_OPTIONS}
                value={chanceRaw}
                onChange={(v) => onSet('chance', v ?? SF_DEFAULTS.chance)}
                w={110}
                size="sm"
                rightSection={SELECT_CHEVRON}
                rightSectionPointerEvents="none"
                styles={{ input: { height: 40, fontSize: 16 } }}
                allowDeselect={false}
              />
            </div>
            <div>
              <Group gap={4} align="center" mb={7}>
                <Text size="sm" fw={600}>
                  Target
                </Text>
                <Tooltip
                  label="Change the target star in Inputs. Click the box to jump there."
                  withArrow
                  multiline
                  w={220}
                  events={{ hover: true, focus: true, touch: true }}
                >
                  <UnstyledButton aria-label="About target" className="sfInfo">
                    {INFO_ICON}
                  </UnstyledButton>
                </Tooltip>
              </Group>
              <UnstyledButton
                className="sfNumInput sfNumInputTarget sfTargetMirror"
                aria-label={`Target star ${targetText}. Change it in Inputs`}
                onClick={onEditTarget}
              >
                {targetText}
                {/* Body font, like the real field's ★ (mono shrinks it). */}
                <Text size="xs" c="sage.7" ff="text" component="span">
                  ★
                </Text>
              </UnstyledButton>
            </div>
          </Group>

          {notice ? (
            <Text size="sm" c="dark.1" mt={16}>
              {notice}
            </Text>
          ) : (
            <>
              {row.unreachable && (
                <Text size="sm" c="orange.3" mt={16}>
                  Can&apos;t reach {chanceRaw}% with {sparesText(spares)}. Best
                  possible:
                </Text>
              )}
              <Group gap={40} mt={16} align="flex-end" style={{ rowGap: 12 }}>
                <div>
                  <Text className="sfEyebrow" c="sage.2">
                    Expected cost
                  </Text>
                  <Group gap={8} align="baseline">
                    <Text className="sfHeroValue" c="sage.2" component="span">
                      {formatMeso(Math.round(shown.cost))}
                    </Text>
                    <Text size="md" fw={600} c="sage.4" component="span">
                      mesos
                    </Text>
                  </Group>
                </div>
                <div>
                  <Text className="sfEyebrow" c="sage.2">
                    Chance to reach {goal} ★
                  </Text>
                  <Text className="sfHeroValue" c="sage.2">
                    {pct(shown.chance)}
                  </Text>
                </div>
                {sparesRaw === '' && !row.unreachable && (
                  <div>
                    <Text className="sfEyebrow" c="sage.2">
                      Fewest spares
                    </Text>
                    <Text className="sfHeroValue" c="sage.2">
                      {spares}
                    </Text>
                  </div>
                )}
              </Group>
              {compare && (
                <Text size="sm" c="dark.1" mt={12}>
                  {compare}
                </Text>
              )}
              {others.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text size="sm" fw={600} mb={4}>
                    Other options for {chanceRaw}%
                  </Text>
                  {others.map(({ r, why }) => (
                    <Group key={r.spares} gap={12}>
                      <Text size="sm" c="dark.1">
                        Bring {sparesText(r.spares)} →{' '}
                        {formatMeso(Math.round(r.cost))} ({why})
                      </Text>
                      <UnstyledButton
                        className="sfLabView"
                        aria-label={`View the ${sparesText(r.spares)} plan`}
                        onClick={() => onSet('spares', String(r.spares))}
                      >
                        View ›
                      </UnstyledButton>
                    </Group>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!notice && (
        <>
          <div className="sfTableCard">
            <Text size="md" fw={600} px={16} pt={14} pb={10}>
              Optimized plan
            </Text>
            <ScrollStatusArea
              className="sfTableScroll"
              refreshKey={shown}
              scrollbars="xy"
            >
              <table className="sfTable" aria-label="Optimized plan">
                <thead>
                  <tr>
                    <th>Star</th>
                    <th className="sfLabMode">Mode</th>
                    <th>Success</th>
                    <th>Boom</th>
                    <th>Cost / attempt</th>
                    <th>Reach</th>
                  </tr>
                </thead>
                <tbody>
                  {planStars.map((s) => {
                    const mode = shown.modes[s]
                    const o = { ...opts, mode: mode ?? 1 }
                    const odds = attemptOdds(s, o)
                    return (
                      <tr key={s}>
                        <td>
                          {s} → {s + 1}
                        </td>
                        <td
                          className="sfLabMode"
                          data-basic={(mode ?? 1) === 1 || undefined}
                          data-safeguard={isSafeguard(s, mode) || undefined}
                        >
                          {isSafeguard(s, mode)
                            ? 'Safeguard'
                            : mode
                              ? `Level ${mode}`
                              : '—'}
                        </td>
                        <td>{pct(odds.success)}</td>
                        <td
                          style={{
                            color:
                              odds.boom > 0
                                ? 'var(--mantine-color-orange-3)'
                                : 'var(--mantine-color-dark-3)',
                          }}
                        >
                          {odds.boom > 0 ? pct(odds.boom) : '—'}
                        </td>
                        <td>{formatMeso(attemptCost(level, s, o))}</td>
                        <td>{pct(reach[s + 1] ?? 1)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </ScrollStatusArea>
            <Text size="xs" c="dark.2" px={16} py={12}>
              Reach is the chance to get to that row&apos;s next star with{' '}
              {sparesText(spares)}, using this plan.
            </Text>
          </div>

          <div className="sfTableCard">
            <Group
              justify="space-between"
              align="baseline"
              gap={6}
              px={16}
              pt={14}
              pb={10}
            >
              <Text size="md" fw={600}>
                Every option at {chanceRaw}%
              </Text>
              <Text size="xs" c="dark.2">
                Mode level per star · pick a row to see its plan
              </Text>
            </Group>
            <ScrollStatusArea
              className="sfTableScroll"
              refreshKey={result}
              scrollbars="xy"
            >
              <table className="sfTable" aria-label="Every option">
                <thead>
                  <tr>
                    <th>Spares</th>
                    <th>Chance</th>
                    <th>Exp. cost</th>
                    {result.stars.map((s) => (
                      <th key={s} className="sfLabLevel">
                        {s} ★
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => {
                    const plan = r.unreachable ? r.best : r
                    return (
                      <tr
                        key={r.spares}
                        data-selected={isPicked(r) || undefined}
                      >
                        <td>
                          <UnstyledButton
                            className="sfLabPick"
                            aria-pressed={isPicked(r)}
                            onClick={() => onSet('spares', String(r.spares))}
                          >
                            {isPlus(r)
                              ? `${r.spares}+ spares`
                              : sparesText(r.spares)}
                          </UnstyledButton>
                        </td>
                        {r.unreachable ? (
                          <td colSpan={2} className="sfLabMiss">
                            Can&apos;t reach {chanceRaw}% · best{' '}
                            {pct(r.best.chance)}
                          </td>
                        ) : (
                          <>
                            <td>{pct(r.chance)}</td>
                            <td>{formatMeso(Math.round(r.cost))}</td>
                          </>
                        )}
                        {result.stars.map((s) => (
                          <td
                            key={s}
                            className="sfLabLevel"
                            data-basic={plan.modes[s] === 1 || undefined}
                          >
                            {levelCell(s, plan.modes[s])}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  <tr>
                    <td>No limit</td>
                    <td>100%</td>
                    <td>{formatMeso(Math.round(result.cheapest.cost))}</td>
                    {result.stars.map((s) => (
                      <td
                        key={s}
                        className="sfLabLevel"
                        data-basic={result.cheapest.modes[s] === 1 || undefined}
                      >
                        {levelCell(s, result.cheapest.modes[s])}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </ScrollStatusArea>
            <Text size="xs" c="dark.2" px={16} py={12}>
              <span className="sfSafeguard">{SHIELD_ICON}</span> = Safeguard
              (15–17 ★: no booms, +200% cost; the game also offers it as
              Enhancement Mode Level 4). Chance is how often you reach {goal} ★
              before running out of spares. Exp. cost is the average spend if
              you keep going until {goal} ★. Modes only exist for 15–21 ★, so
              higher stars always risk a boom. Some plans look uneven on
              purpose: the optimizer takes boom risk where it&apos;s cheapest.
              Past 10 spares, only counts that save at least 1% are listed
              {result.enough !== null &&
                `; ${result.enough}+ means more spares won't make it any cheaper`}
              . You can type up to {MAX_SPARES} spares.
            </Text>
          </div>
        </>
      )}
    </div>
  )
}
