import type { ComposeResponse } from '../types'

/** Rich mock response for Storybook previews. */
export const SAMPLE_API_STUDIO_RESPONSE: ComposeResponse = {
  status: 201,
  statusText: 'Created',
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'x-request-id': 'gw-demo-7f3a',
    'x-ratelimit-remaining': '98',
    'set-cookie': 'session=sess_demo; Path=/; HttpOnly',
  },
  body: JSON.stringify(
    {
      ok: true,
      sessionId: 'sess_demo',
      user: {
        id: 42,
        email: 'user@example.com',
        roles: ['admin', 'developer'],
      },
      meta: {
        locale: 'zh-CN',
        serverTime: '2026-06-04T08:00:00Z',
      },
    },
    null,
    2,
  ),
  responseTime: 128,
  size: 312,
}
