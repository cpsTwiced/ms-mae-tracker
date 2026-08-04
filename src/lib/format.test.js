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

  it('abbreviates in lowercase shorthand, one decimal under 100', () => {
    expect(formatMeso(136000)).toBe('136k')
    expect(formatMeso(95200)).toBe('95.2k')
    expect(formatMeso(1234000)).toBe('1.2m')
    expect(formatMeso(12345678901)).toBe('12.3b')
    expect(formatMeso(4.56e12)).toBe('4.6t')
    expect(formatMeso(1488678350)).toBe('1.5b')
  })

  it('treats non-positive amounts as zero', () => {
    expect(formatMeso(-5)).toBe('0')
  })

  it('handles non-finite input', () => {
    expect(formatMeso(Infinity)).toBe('—')
    expect(formatMeso(NaN)).toBe('—')
  })
})
