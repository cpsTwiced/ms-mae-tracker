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
import { optimizeModes } from '@/lib/optimizer'
import { MAX_SPARES } from '@/data/starforce'
import { SF_CHANCES, SF_DEFAULTS } from '@/lib/storage'
import { formatMeso, digits, clampRaw, pct } from '@/lib/format'
import ScrollStatusArea from './ScrollStatusArea'
import { SELECT_CHEVRON } from './SavedSetups'

const CHANCE_OPTIONS = SF_CHANCES.map((c) => ({ value: c, label: `${c}%` }))

const sparesText = (n) => `${n} ${n === 1 ? 'spare' : 'spares'}`

const sameModes = (a, b) => Object.keys(a).every((s) => a[s] === b[s])

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
  const spares = sparesRaw === '' ? 0 : Number(sparesRaw)
  const ready = result !== null && result.stars.length > 0
  const row = ready ? result.rows[spares] : null
  const shown = row && (row.unreachable ? row.best : row)
  const goal = result?.target

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
              </Group>
              {compare && (
                <Text size="sm" c="dark.1" mt={12}>
                  {compare}
                </Text>
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
                  </tr>
                </thead>
                <tbody>
                  {result.stars.map((s) => {
                    const o = { ...opts, mode: shown.modes[s] }
                    const odds = attemptOdds(s, o)
                    return (
                      <tr key={s}>
                        <td>
                          {s} → {s + 1}
                        </td>
                        <td
                          className="sfLabMode"
                          data-basic={shown.modes[s] === 1 || undefined}
                        >
                          Level {shown.modes[s]}
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </ScrollStatusArea>
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
                  {result.rows.map((r) => {
                    const plan = r.unreachable ? r.best : r
                    return (
                      <tr
                        key={r.spares}
                        data-selected={r.spares === spares || undefined}
                      >
                        <td>
                          <UnstyledButton
                            className="sfLabPick"
                            aria-pressed={r.spares === spares}
                            onClick={() => onSet('spares', String(r.spares))}
                          >
                            {sparesText(r.spares)}
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
                            {plan.modes[s]}
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
                        {result.cheapest.modes[s]}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </ScrollStatusArea>
            <Text size="xs" c="dark.2" px={16} py={12}>
              Chance is how often you reach {goal} ★ before running out of
              spares. Exp. cost is the average spend if you keep going until{' '}
              {goal} ★. Modes only exist for 15–21 ★, so higher stars always
              risk a boom. Some plans look uneven on purpose: the optimizer
              takes boom risk where it&apos;s cheapest.
            </Text>
          </div>
        </>
      )}
    </div>
  )
}
