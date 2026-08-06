import { describe, it, expect } from 'vitest'
import {
  MAX_STAR,
  SF_RATES,
  ENHANCEMENT_MODES,
  BOOM_RESET_STARS,
  COST_DIVISORS,
  MVP_DISCOUNTS,
  SAFEGUARD_STARS,
} from './starforce'

describe('starforce catalog', () => {
  it('has one rate entry per attemptable star', () => {
    expect(SF_RATES).toHaveLength(MAX_STAR)
  })

  it('keeps every probability a valid distribution', () => {
    for (const { success, boom } of SF_RATES) {
      expect(success).toBeGreaterThan(0)
      expect(success).toBeLessThanOrEqual(1)
      expect(boom).toBeGreaterThanOrEqual(0)
      expect(success + boom).toBeLessThanOrEqual(1)
    }
  })

  it('only booms at 15★-29★', () => {
    SF_RATES.forEach(({ boom }, star) => {
      if (star < 15) expect(boom).toBe(0)
      else expect(boom).toBeGreaterThan(0)
    })
  })

  it('covers exactly 15-21★ with 4 enhancement modes', () => {
    expect(Object.keys(ENHANCEMENT_MODES).map(Number)).toEqual([
      15, 16, 17, 18, 19, 20, 21,
    ])
    for (const [star, row] of Object.entries(ENHANCEMENT_MODES)) {
      expect(row.success).toHaveLength(4)
      expect(row.boom).toHaveLength(4)
      expect(row.costMult).toHaveLength(4)
      // Mode 1 is the base table; mode 4 never booms.
      expect(row.success[0]).toBe(SF_RATES[star].success)
      expect(row.boom[0]).toBe(SF_RATES[star].boom)
      expect(row.boom[3]).toBe(0)
      // Higher modes: boom never rises, cost never falls.
      for (let m = 1; m < 4; m++) {
        expect(row.boom[m]).toBeLessThan(row.boom[m - 1])
        expect(row.costMult[m]).toBeGreaterThan(row.costMult[m - 1])
        expect(row.success[m]).toBeLessThanOrEqual(row.success[m - 1])
      }
    }
  })

  it('gives every boomable star a checkpoint below it', () => {
    SF_RATES.forEach(({ boom }, star) => {
      if (boom === 0) return
      const reset = BOOM_RESET_STARS[star]
      expect(reset).toBeGreaterThanOrEqual(12)
      expect(reset).toBeLessThan(star)
    })
  })

  it('keeps cost divisors positive', () => {
    for (const d of Object.values(COST_DIVISORS)) expect(d).toBeGreaterThan(0)
  })

  it('keeps MVP discounts and safeguard range sane', () => {
    expect(MVP_DISCOUNTS.none).toBe(0)
    for (const d of Object.values(MVP_DISCOUNTS)) {
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThan(1)
    }
    expect(SAFEGUARD_STARS).toEqual([15, 16, 17])
  })
})
