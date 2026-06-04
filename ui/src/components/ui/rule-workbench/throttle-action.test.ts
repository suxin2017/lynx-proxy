import { describe, expect, it } from 'vitest'

import { createAction, getActionSummary, getActionValidationErrors } from './types'

describe('throttle action', () => {
  it('summarizes presets', () => {
    const offline = createAction({ type: 'throttle', config: { preset: 'Offline' } } as any)
    expect(getActionSummary(offline)).toBe('离线（503）')

    const fast = createAction({ type: 'throttle', config: { preset: 'Fast3G' } } as any)
    expect(getActionSummary(fast)).toContain('Fast3G')
  })

  it('validates custom numeric fields', () => {
    const action = createAction({
      type: 'throttle',
      config: {
        preset: 'Custom',
        downloadKbps: -1,
        uploadKbps: 1,
        latencyMs: -5,
      },
    } as any)
    const errors = getActionValidationErrors(action)
    expect(errors.join('\n')).toContain('下载 Kbps')
    expect(errors.join('\n')).toContain('延迟 ms')
  })
})

