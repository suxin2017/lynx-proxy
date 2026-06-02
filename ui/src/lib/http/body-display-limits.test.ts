import { describe, expect, it } from 'vitest'
import {
  assessBodyDisplay,
  bodyTooLargeMessage,
  MAX_BODY_RENDER_BYTES,
} from './body-display-limits'

describe('assessBodyDisplay', () => {
  it('allows empty bodies', () => {
    expect(assessBodyDisplay(undefined)).toEqual({ renderable: true, byteLength: 0 })
  })

  it('allows bodies within render limit', () => {
    const bytes = new Uint8Array(16)
    expect(assessBodyDisplay(bytes)).toEqual({ renderable: true, byteLength: 16 })
  })

  it('blocks bodies above render limit via reported length without buffer', () => {
    const result = assessBodyDisplay(undefined, MAX_BODY_RENDER_BYTES + 1)
    expect(result.renderable).toBe(false)
    if (!result.renderable) {
      expect(result.byteLength).toBe(MAX_BODY_RENDER_BYTES + 1)
    }
  })

  it('blocks when byte length exceeds render limit', () => {
    const result = assessBodyDisplay(new Uint8Array(MAX_BODY_RENDER_BYTES), MAX_BODY_RENDER_BYTES + 1)
    expect(result.renderable).toBe(false)
    if (!result.renderable) {
      expect(result.byteLength).toBe(MAX_BODY_RENDER_BYTES + 1)
      expect(result.limit).toBe(MAX_BODY_RENDER_BYTES)
      expect(bodyTooLargeMessage(result.byteLength, result.limit)).toContain('内容过大')
    }
  })
})
