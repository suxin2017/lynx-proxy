import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { NetworkDetailRecord } from '@/components/ui/network-request-detail/types'
import { captureToDraft } from '@/components/ui/compose/lib/capture-to-draft'
import type { ApiRequestDraft, ApiRequestLayout, ApiRequestTab, ComposeResponse } from '../types'
import { composeDraftToApiDraft, createEmptyApiDraft } from '../lib/empty-api-draft'
import ApiRequestWorkbench from './ApiRequestWorkbench.vue'

const SAMPLE_CAPTURE: NetworkDetailRecord = {
  id: 'req-api-studio-demo',
  method: 'POST',
  url: 'https://gateway.lynx.internal/v1/session?locale=zh-CN',
  status: 'success',
  statusCode: 201,
  path: '/v1/session',
  query: [{ key: 'locale', value: 'zh-CN' }],
  requestHeaders: [
    { key: 'content-type', value: 'application/json' },
    { key: 'authorization', value: 'Bearer demo-token' },
  ],
  requestContentType: 'application/json',
  requestBody: { userId: 42, remember: true },
  responseHeaders: [
    { key: 'content-type', value: 'application/json; charset=utf-8' },
  ],
  responseContentType: 'application/json; charset=utf-8',
  responseBody: { ok: true, sessionId: 'sess_demo' },
}

const SAMPLE_RESPONSE: ComposeResponse = {
  status: 201,
  statusText: 'Created',
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'x-request-id': 'gw-demo-001',
  },
  body: JSON.stringify({ ok: true, sessionId: 'sess_demo' }, null, 2),
  responseTime: 128,
  size: 48,
}

const FILLED_DRAFT: ApiRequestDraft = createEmptyApiDraft({
  name: 'POST /v1/session',
  method: 'POST',
  url: 'https://gateway.lynx.internal/v1/session?locale=zh-CN',
  queryParams: [{ key: 'locale', value: 'zh-CN', enabled: true }],
  headers: [
    { key: 'content-type', value: 'application/json', enabled: true },
    { key: 'authorization', value: 'Bearer demo-token', enabled: true },
  ],
  body: JSON.stringify({ userId: 42, remember: true }, null, 2),
  cookies: [
    { key: 'session', value: 'sess_preview', enabled: true },
    { key: 'X-Trace', value: 'trace_demo', enabled: false },
  ],
  settings: {
    timeoutMs: 15_000,
    followRedirects: true,
    validateSsl: true,
  },
})

const meta = {
  title: 'API Studio/ApiRequestWorkbench',
  component: ApiRequestWorkbench,
  args: {
    draft: createEmptyApiDraft(),
    response: null,
    loading: false,
    error: null,
    layout: 'vertical' as ApiRequestLayout,
    activeRequestTab: 'params' as ApiRequestTab,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ApiRequestWorkbench>

export default meta

type Story = StoryObj<typeof meta>

function createInteractiveRender(initialDraft: ApiRequestDraft = createEmptyApiDraft()) {
  return () => ({
    components: { ApiRequestWorkbench },
    setup() {
      const draft = ref<ApiRequestDraft>(structuredClone(initialDraft))
      const response = ref<ComposeResponse | null>(null)
      const loading = ref(false)
      const error = ref<string | null>(null)
      const layout = ref<ApiRequestLayout>('vertical')
      const activeRequestTab = ref<ApiRequestTab>('params')

      function onSend() {
        loading.value = true
        error.value = null
        response.value = null
        window.setTimeout(() => {
          loading.value = false
          response.value = SAMPLE_RESPONSE
        }, 900)
      }

      return {
        draft,
        response,
        loading,
        error,
        layout,
        activeRequestTab,
        onSend,
      }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <div class="mx-auto h-[720px] max-w-6xl">
          <ApiRequestWorkbench
            v-model:draft="draft"
            v-model:layout="layout"
            v-model:active-request-tab="activeRequestTab"
            :response="response"
            :loading="loading"
            :error="error"
            @send="onSend"
          />
        </div>
      </div>
    `,
  })
}

export const Empty: Story = {
  render: createInteractiveRender(),
}

export const FilledRequest: Story = {
  render: createInteractiveRender(FILLED_DRAFT),
}

export const WithResponse: Story = {
  render: () => ({
    components: { ApiRequestWorkbench },
    setup() {
      const draft = ref(structuredClone(FILLED_DRAFT))
      const layout = ref<ApiRequestLayout>('vertical')
      const activeRequestTab = ref<ApiRequestTab>('cookies')
      return { draft, layout, activeRequestTab, response: SAMPLE_RESPONSE }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <div class="mx-auto h-[720px] max-w-6xl">
          <ApiRequestWorkbench
            v-model:draft="draft"
            v-model:layout="layout"
            v-model:active-request-tab="activeRequestTab"
            :response="response"
          />
        </div>
      </div>
    `,
  }),
}

export const Loading: Story = {
  render: () => ({
    components: { ApiRequestWorkbench },
    setup() {
      const draft = ref(structuredClone(FILLED_DRAFT))
      const layout = ref<ApiRequestLayout>('vertical')
      const activeRequestTab = ref<ApiRequestTab>('body')
      return { draft, layout, activeRequestTab }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <div class="mx-auto h-[720px] max-w-6xl">
          <ApiRequestWorkbench
            v-model:draft="draft"
            v-model:layout="layout"
            v-model:active-request-tab="activeRequestTab"
            :loading="true"
          />
        </div>
      </div>
    `,
  }),
}

export const Error: Story = {
  render: () => ({
    components: { ApiRequestWorkbench },
    setup() {
      const draft = ref(structuredClone(FILLED_DRAFT))
      const layout = ref<ApiRequestLayout>('vertical')
      const activeRequestTab = ref<ApiRequestTab>('settings')
      return {
        draft,
        layout,
        activeRequestTab,
        error: '连接超时：无法连接到目标服务器',
      }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <div class="mx-auto h-[720px] max-w-6xl">
          <ApiRequestWorkbench
            v-model:draft="draft"
            v-model:layout="layout"
            v-model:active-request-tab="activeRequestTab"
            :error="error"
          />
        </div>
      </div>
    `,
  }),
}

export const WithCookiesAndSettings: Story = {
  render: createInteractiveRender(FILLED_DRAFT),
  args: {
    activeRequestTab: 'cookies',
  },
}

export const FromCapture: Story = {
  render: createInteractiveRender(
    composeDraftToApiDraft(captureToDraft(SAMPLE_CAPTURE), {
      cookies: [{ key: 'locale', value: 'zh-CN', enabled: true }],
    }),
  ),
}
