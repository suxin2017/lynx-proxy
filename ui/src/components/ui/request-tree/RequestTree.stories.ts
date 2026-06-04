import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { onBeforeUnmount, ref } from 'vue'
import type { TrafficRecord } from './types'
import RequestTree from './RequestTree.vue'

const meta = {
  title: 'Data Display/RequestTree',
  component: RequestTree as unknown as object,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

function req(
  id: string,
  url: string,
  method: TrafficRecord['method'],
  requestType: string,
  status: TrafficRecord['status'],
  statusCode?: number,
): TrafficRecord {
  return { id, url, method, requestType, status, statusCode }
}

const STATIC_REQUESTS: TrafficRecord[] = [
  req('1', 'https://api.example.com/v1/users', 'GET', 'xhr', 'success', 200),
  req('2', 'https://api.example.com/v1/users', 'POST', 'fetch', 'success', 201),
  req('3', 'https://api.example.com/v1/users', 'GET', 'xhr', 'success', 200),
  req('4', 'https://api.example.com/v1/users/123', 'GET', 'xhr', 'success', 200),
  req('5', 'https://api.example.com/v1/users/123', 'DELETE', 'xhr', 'error', 404),
  req('6', 'https://api.example.com/v1/users/123/profile/settings/preferences', 'PUT', 'xhr', 'success', 200),
  req('7', 'https://api.example.com/v2/health', 'GET', 'fetch', 'success', 200),
  req('8', 'https://api.example.com/v2/metrics/system/cpu', 'GET', 'xhr', 'pending'),
  req('9', 'https://other.service.io/auth/token', 'POST', 'xhr', 'success', 200),
  req('10', 'https://other.service.io/auth/token', 'DELETE', 'xhr', 'cancelled'),
  req('11', 'wss://realtime.example.com/ws/events/stream', 'GET', 'websocket', 'pending'),
  req('12', 'ftp://files.example.net/pub/releases/lynx-proxy.tar.gz', 'GET', 'ftp', 'success', 226),
  req(
    '13',
    'https://cdn.very-long-domain-name.example.co.uk/static/assets/images/thumbnails/2024/january/category/product-hero.jpg',
    'GET',
    'asset',
    'success',
    200,
  ),
]

export const Static: Story = {
  render: () => ({
    components: { RequestTree },
    setup() {
      const selected = ref<string | undefined>(undefined)
      return { requests: STATIC_REQUESTS, selected }
    },
    template: `
      <div style="width: 360px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">
        <RequestTree :requests="requests" v-model="selected" :height="480" />
        <div v-if="selected" style="margin-top:8px; font-size:12px; color:#6b7280">
          Selected: {{ selected }}
        </div>
      </div>
    `,
  }),
}

const REAL_WORLD_REQUESTS: TrafficRecord[] = [
  req('r1', 'https://app.example.com/', 'GET', 'document', 'success', 200),
  req('r2', 'https://app.example.com/assets/app.css', 'GET', 'stylesheet', 'success', 200),
  req('r3', 'https://app.example.com/assets/app.js', 'GET', 'script', 'success', 200),
  req('r4', 'https://api.example.com/v1/session', 'POST', 'fetch', 'success', 200),
  req('r5', 'https://api.example.com/v1/session', 'POST', 'fetch', 'success', 200),
  req('r6', 'https://api.example.com/v1/profile', 'GET', 'xhr', 'success', 200),
  req('r7', 'https://api.example.com/v1/profile', 'GET', 'xhr', 'success', 200),
  req('r8', 'wss://socket.example.com/realtime', 'GET', 'websocket', 'pending'),
  req('r9', 'wss://socket.example.com/realtime', 'GET', 'websocket', 'pending'),
  req('r10', 'https://cdn.example.com/images/avatar.png', 'GET', 'image', 'success', 200),
  req('r11', 'https://cdn.example.com/images/avatar.png', 'GET', 'image', 'success', 200),
  req('r12', 'https://api.example.com/v1/search?q=lynx', 'GET', 'xhr', 'success', 200),
  req('r13', 'https://api.example.com/v1/search?q=proxy', 'GET', 'xhr', 'success', 200),
  req('r14', 'ws://socket.example.com/live/updates', 'GET', 'websocket', 'pending'),
  req('r15', 'ftp://files.example.net/pub/releases/lynx-proxy.tar.gz', 'GET', 'ftp', 'success', 226),
]

export const RealWorldTraffic: Story = {
  render: () => ({
    components: { RequestTree },
    setup() {
      const selected = ref<string | undefined>(undefined)
      return { requests: REAL_WORLD_REQUESTS, selected }
    },
    template: `
      <div style="width: 380px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">
        <div style="margin-bottom: 8px; font-size: 12px; color: #6b7280;">
          Real network traffic: same URL can appear multiple times, type distinguishes records
        </div>
        <RequestTree :requests="requests" v-model="selected" :height="520" />
      </div>
    `,
  }),
}

export const DynamicUpdate: Story = {
  render: () => ({
    components: { RequestTree },
    setup() {
      const requests = ref<TrafficRecord[]>([
        req('d1', 'https://api.example.com/v1/users', 'GET', 'xhr', 'success', 200),
        req('d2', 'https://api.example.com/v1/orders', 'GET', 'fetch', 'success', 200),
      ])

      const methods: TrafficRecord['method'][] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      const requestTypes = ['xhr', 'fetch', 'websocket', 'document', 'image']
      const paths = [
        '/v1/users',
        '/v1/orders',
        '/v1/products',
        '/v2/search',
        '/v2/auth/token',
        '/v1/users/123',
        '/v1/orders/456/items',
      ]
      const statuses: TrafficRecord['status'][] = ['success', 'error', 'pending', 'cancelled']
      const codes = [200, 201, 204, 400, 401, 404, 500]

      let counter = 10
      const interval = setInterval(() => {
        counter += 1
        const path = paths[counter % paths.length]
        const method = methods[counter % methods.length]
        const requestType = requestTypes[counter % requestTypes.length]
        const status = statuses[counter % statuses.length]
        const statusCode = status === 'pending' ? undefined : codes[counter % codes.length]

        requests.value = [
          ...requests.value,
          req(
            `d${counter}`,
            `https://api.example.com${path}`,
            method,
            requestType,
            status,
            statusCode,
          ),
        ]
      }, 300)

      onBeforeUnmount(() => clearInterval(interval))

      return { requests }
    },
    template: `
      <div style="width: 380px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">
        <div style="margin-bottom: 8px; font-size: 12px; color: #6b7280;">
          Requests stream in over time, and repeated URLs stay visible as separate records
        </div>
        <RequestTree :requests="requests" :height="520" />
      </div>
    `,
  }),
}

function generateLargeDataset(count: number): TrafficRecord[] {
  const hosts = ['https://api.example.com', 'https://cdn.example.com', 'https://auth.example.io']
  const segments = ['v1', 'v2', 'users', 'orders', 'products', 'search', 'auth', 'metrics']
  const methods: TrafficRecord['method'][] = ['GET', 'POST', 'PUT', 'DELETE']
  const requestTypes = ['xhr', 'fetch', 'image', 'script', 'stylesheet']
  const statuses: TrafficRecord['status'][] = ['success', 'error', 'pending', 'cancelled']

  return Array.from({ length: count }, (_, index) => {
    const host = hosts[index % hosts.length]
    const depth = (index % 3) + 1
    const path = Array.from({ length: depth }, (__, depthIndex) => segments[(index + depthIndex) % segments.length]).join('/')

    return req(
      `large_${index}`,
      `${host}/${path}`,
      methods[index % methods.length],
      requestTypes[index % requestTypes.length],
      statuses[index % statuses.length],
      index % 5 === 0 ? undefined : [200, 201, 400, 404, 500][index % 5],
    )
  })
}

function generateRealisticHighVolumeTraffic(count: number): TrafficRecord[] {
  const apiHosts = [
    'https://gateway.lynx.internal',
    'https://edge.lynx.internal',
    'https://api.partner-net.io',
    'https://assets.lynx-cdn.com',
  ]
  const methods: TrafficRecord['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  const requestTypes = ['xhr', 'fetch', 'document', 'script', 'image', 'island', 'websocket', 'prefetch']
  const statuses: TrafficRecord['status'][] = ['success', 'error', 'pending', 'cancelled']
  const statusCodes = [200, 201, 204, 206, 301, 400, 401, 403, 404, 429, 500, 502]

  return Array.from({ length: count }, (_, index) => {
    const host = apiHosts[index % apiHosts.length]
    const method = methods[index % methods.length]
    const requestType = requestTypes[index % requestTypes.length]
    const status = statuses[index % statuses.length]
    const statusCode = status === 'pending' ? undefined : statusCodes[index % statusCodes.length]

    const island = `island-${index % 9}`
    const deepPath = [
      'runtime',
      'hydration',
      island,
      'widgets',
      `container-${index % 30}`,
      'panels',
      `panel-${index % 120}`,
      'fragments',
      `fragment-${index}`,
    ].join('/')

    const longQuery = new URLSearchParams({
      traceId: `trace_${index}_${Math.floor(index / 7)}`,
      session: `sess_${index % 200}`,
      locale: ['en-US', 'zh-CN', 'ja-JP'][index % 3],
      viewport: ['desktop', 'tablet', 'mobile'][index % 3],
      featureFlag: `island_streaming_v${(index % 5) + 1}`,
      snapshot: `${Date.now()}_${index}`,
      payload: 'x'.repeat((index % 40) + 30),
    }).toString()

    const protocolHost =
      requestType === 'websocket'
        ? `wss://socket.lynx.internal/realtime/${island}/channel-${index % 40}`
        : requestType === 'prefetch'
          ? `https://prefetch.lynx-cdn.com/${deepPath}`
          : `${host}/${deepPath}`

    const url = `${protocolHost}?${longQuery}`

    return req(
      `real_${index}`,
      url,
      method,
      requestType,
      status,
      statusCode,
    )
  })
}

export const LargeDataset: Story = {
  render: () => ({
    components: { RequestTree },
    setup() {
      const requests = ref(generateLargeDataset(1000))
      console.log('Generated large dataset with', requests.value.length, 'items')
      return { requests }
    },
    template: `
      <div style="width: 380px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">
        <div style="margin-bottom: 8px; font-size: 12px; color: #6b7280;">
          1000 requests – scroll should be smooth
        </div>
        <RequestTree :requests="requests" :height="600" />
      </div>
    `,
  }),
}

export const RealisticHighVolumeTraffic: Story = {
  render: () => ({
    components: { RequestTree },
    setup() {
      const requests = ref(generateRealisticHighVolumeTraffic(2500))
      return { requests }
    },
    template: `
      <div style="width: 420px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">
        <div style="margin-bottom: 8px; font-size: 12px; color: #6b7280;">
          Real traffic: high volume + long URLs + island-type requests (2500 records)
        </div>
        <RequestTree :requests="requests" :height="620" :default-expand-depth="2" />
      </div>
    `,
  }),
}

function generateBoundaryCaseRequests(): TrafficRecord[] {
  const veryLongTail =
    'final-segment-' +
    'ultra-long-token-with-mixed-content-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789-' +
    'repeatable-marker-'.repeat(8)

  const encodedTail = encodeURIComponent('中文 空格 ? & / # + % and emoji-like-text')

  return [
    req(
      'b1',
      `https://api.boundary.test/v1/resources/${veryLongTail}`,
      'GET',
      'xhr',
      'success',
      200,
    ),
    req(
      'b2',
      `https://api.boundary.test/v1/resources/${veryLongTail}`,
      'GET',
      'fetch',
      'success',
      200,
    ),
    req(
      'b3',
      `https://api.boundary.test/v1/resources/${veryLongTail}?q=${'x'.repeat(400)}`,
      'POST',
      'xhr',
      'error',
      413,
    ),
    req(
      'b4',
      `https://api.boundary.test/v1/deep/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/${veryLongTail}`,
      'PUT',
      'fetch',
      'success',
      204,
    ),
    req(
      'b5',
      `https://api.boundary.test/v1/encoded/${encodedTail}`,
      'GET',
      'document',
      'success',
      200,
    ),
    req(
      'b6',
      `wss://socket.boundary.test/realtime/room/${veryLongTail}`,
      'GET',
      'websocket',
      'pending',
    ),
    req(
      'b7',
      `ftp://files.boundary.test/pub/releases/${veryLongTail}.tar.gz`,
      'GET',
      'ftp',
      'success',
      226,
    ),
    req(
      'b8',
      `https://cdn.boundary.test/assets/images/${veryLongTail}.avif`,
      'GET',
      'image',
      'cancelled',
    ),
  ]
}

export const BoundaryCasesLongTail: Story = {
  render: () => ({
    components: { RequestTree },
    setup() {
      const requests = ref(generateBoundaryCaseRequests())
      return { requests }
    },
    template: `
      <div style="width: 440px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">
        <div style="margin-bottom: 8px; font-size: 12px; color: #6b7280;">
          Boundary cases: ultra-long last segment, deep path, encoded tail, mixed protocols
        </div>
        <RequestTree :requests="requests" :height="620" :default-expand-depth="3" />
      </div>
    `,
  }),
}

function generateBoundaryCaseStressRequests(count: number): TrafficRecord[] {
  const hosts = [
    'https://api.boundary.test',
    'https://cdn.boundary.test',
    'https://edge.boundary.test',
    'wss://socket.boundary.test',
  ]
  const methods: TrafficRecord['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  const requestTypes = ['xhr', 'fetch', 'document', 'image', 'websocket', 'script']
  const statuses: TrafficRecord['status'][] = ['success', 'error', 'pending', 'cancelled']
  const statusCodes = [200, 201, 204, 400, 404, 413, 429, 500, 502]

  return Array.from({ length: count }, (_, index) => {
    const host = hosts[index % hosts.length]
    const method = methods[index % methods.length]
    const requestType = requestTypes[index % requestTypes.length]
    const status = statuses[index % statuses.length]
    const statusCode = status === 'pending' ? undefined : statusCodes[index % statusCodes.length]

    const tail =
      `tail-${index}-` +
      'long-segment-abcdefghijklmnopqrstuvwxyz-0123456789-'.repeat((index % 6) + 2)

    const depth = (index % 10) + 2
    const deepPath = Array.from(
      { length: depth },
      (_, level) => `level-${level}-${(index + level) % 97}`,
    ).join('/')

    const encoded = encodeURIComponent(`mix ${index} / ? # + % 中文 space`)
    const query = new URLSearchParams({
      q: 'z'.repeat((index % 180) + 20),
      traceId: `boundary_trace_${index}_${Math.floor(index / 3)}`,
      token: `${index}`.padStart(12, '0'),
      encoded,
    }).toString()

    const baseUrl =
      host.startsWith('wss://')
        ? `${host}/stream/${deepPath}/${tail}`
        : `${host}/v1/${deepPath}/${tail}`

    return req(
      `bs_${index}`,
      `${baseUrl}?${query}`,
      method,
      requestType,
      status,
      statusCode,
    )
  })
}

export const BoundaryCasesStress: Story = {
  render: () => ({
    components: { RequestTree },
    setup() {
      const requests = ref(generateBoundaryCaseStressRequests(500))
      return { requests }
    },
    template: `
      <div style="width: 460px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px;">
        <div style="margin-bottom: 8px; font-size: 12px; color: #6b7280;">
          Stress boundary: 500 long-tail records with deep path and encoded segments
        </div>
        <RequestTree :requests="requests" :height="640" :default-expand-depth="2" />
      </div>
    `,
  }),
}
