import { describe, it, expect } from 'vitest'
import { formatCountdown, formatMeso } from './format'

describe('formatCountdown', () => {
  it('formats days/hours/minutes/seconds', () => {
    expect(formatCountdown(0)).toBe('0d 0h 0m 0s')
    expect(formatCountdown(-5)).toBe('0d 0h 0m 0s')
    expect(formatCountdown(((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000)).toBe(
      '2d 3h 4m 5s',
    )
  })
})

describe('formatMeso', () => {
  it('keeps small amounts exact', () => {
    expect(formatMeso(0)).toBe('0')
    expect(formatMeso(999)).toBe('999')
  })

  it('abbreviates with 3 significant figures', () => {
    expect(formatMeso(136000)).toBe('136K')
    expect(formatMeso(95200)).toBe('95.2K')
    expect(formatMeso(1234000)).toBe('1.23M')
    expect(formatMeso(12345678901)).toBe('12.3B')
    expect(formatMeso(4.56e12)).toBe('4.56T')
  })

  it('rounds up into the next unit instead of printing 1000K', () => {
    expect(formatMeso(999999)).toBe('1M')
  })

  it('handles non-finite input', () => {
    expect(formatMeso(Infinity)).toBe('—')
    expect(formatMeso(NaN)).toBe('—')
  })
})
