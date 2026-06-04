import { describe, expect, it } from 'vitest'
import { assessBodyDisplay } from './body-payload'
import {
  appendBodyBytes,
  extractBodyChunk,
} from './body-transport'

describe('body-payload re-exports', () => {
  it('re-exports transport helpers', () => {
    const encoded = btoa('ok')
    expect(extractBodyChunk({ data: encoded })).toEqual(
      new TextEncoder().encode('ok'),
    )
    expect(appendBodyBytes(undefined, new TextEncoder().encode('x')).bytes.length).toBe(1)
    expect(assessBodyDisplay(new Uint8Array(1)).renderable).toBe(true)
  })
})
