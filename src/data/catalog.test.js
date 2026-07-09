import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BOSS_CONTENT, MONTHLY_BOSS_IDS } from './bossContent'
import { DIFFICULTY_STYLE } from './difficulties'
import { WEEKLY_CONTENT } from './weeklyContent'

function duplicates(values) {
  const seen = new Set()
  const dupes = new Set()
  values.forEach((value) => {
    if (seen.has(value)) dupes.add(value)
    seen.add(value)
  })
  return [...dupes]
}

describe('content catalogs', () => {
  it('uses unique boss and weekly content ids', () => {
    expect(duplicates(BOSS_CONTENT.map((boss) => boss.id))).toEqual([])
    expect(duplicates(WEEKLY_CONTENT.map((content) => content.id))).toEqual([])
  })

  it('uses unique difficulties within each boss', () => {
    BOSS_CONTENT.forEach((boss) => {
      expect(
        duplicates(boss.difficulties.map((difficulty) => difficulty.d)),
      ).toEqual([])
    })
  })

  it('defines a badge style for every boss difficulty', () => {
    BOSS_CONTENT.forEach((boss) => {
      boss.difficulties.forEach((difficulty) => {
        const style = DIFFICULTY_STYLE[difficulty.d]
        expect(style?.bg).toEqual(expect.any(String))
        expect(style?.fg).toEqual(expect.any(String))
      })
    })
  })

  it('only references boss images that exist in public', () => {
    BOSS_CONTENT.filter((boss) => boss.img).forEach((boss) => {
      expect(existsSync(join(process.cwd(), 'public', boss.img.slice(1)))).toBe(
        true,
      )
    })
  })

  it('gives every boss a valid cadence, image slot, and difficulties', () => {
    BOSS_CONTENT.forEach((boss) => {
      expect(['weekly', 'monthly']).toContain(boss.cadence)
      expect(boss.difficulties.length).toBeGreaterThan(0)
      // img is either a string path or null (initials-avatar fallback).
      expect(boss.img === null || typeof boss.img === 'string').toBe(true)
    })
  })

  it('orders each boss difficulties by non-decreasing entry level', () => {
    BOSS_CONTENT.forEach((boss) => {
      const levels = boss.difficulties.map((d) => d.level)
      levels.forEach((level) => expect(Number.isFinite(level)).toBe(true))
      const ascending = [...levels].sort((a, b) => a - b)
      expect(levels).toEqual(ascending)
    })
  })

  it('derives MONTHLY_BOSS_IDS from exactly the monthly-cadence bosses', () => {
    const expected = BOSS_CONTENT.filter((b) => b.cadence === 'monthly').map(
      (b) => b.id,
    )
    expect([...MONTHLY_BOSS_IDS].sort()).toEqual([...expected].sort())
    // This is the invariant the weekly/monthly reset routing depends on.
    expect(MONTHLY_BOSS_IDS.has('blackmage')).toBe(true)
  })
})
