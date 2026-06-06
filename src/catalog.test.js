import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BOSS_CONTENT } from './bossContent'
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
})
