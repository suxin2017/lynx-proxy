import { describe, expect, it } from 'vitest'
import { clampMaxLogSize, DEFAULT_MAX_LOG_SIZE } from './general-settings.store'
import { MAX_LOG_SIZE_MAX, MAX_LOG_SIZE_MIN } from '@/lib/http/settings-types'

describe('clampMaxLogSize', () => {
  it('returns default for non-finite values', () => {
    expect(clampMaxLogSize(Number.NaN)).toBe(DEFAULT_MAX_LOG_SIZE)
    expect(clampMaxLogSize(Number.POSITIVE_INFINITY)).toBe(DEFAULT_MAX_LOG_SIZE)
  })

  it('clamps to configured bounds', () => {
    expect(clampMaxLogSize(MAX_LOG_SIZE_MIN - 1)).toBe(MAX_LOG_SIZE_MIN)
    expect(clampMaxLogSize(MAX_LOG_SIZE_MAX + 1)).toBe(MAX_LOG_SIZE_MAX)
    expect(clampMaxLogSize(1500.7)).toBe(1501)
  })
})
