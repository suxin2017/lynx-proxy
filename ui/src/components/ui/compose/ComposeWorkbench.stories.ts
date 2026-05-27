import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import type { NetworkDetailRecord } from '@/components/ui/network-request-detail/types'

import ComposeWorkbench from './ComposeWorkbench.vue'
import { captureToDraft } from './lib/capture-to-draft'
import { createEmptyDraft } from './lib/empty-draft'
import type { ComposeDraft, ComposeLayout, ComposeRequestTab, ComposeResponse } from './types'

const SAMPLE_CAPTURE: NetworkDetailRecord = {
  id: 'req-compose-demo',
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
  requestBody: {
    userId: 42,
    remember: true,
  },
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

const FILLED_DRAFT: ComposeDraft = {
  name: 'POST /v1/session',
  method: 'POST',
  url: 'https://gateway.lynx.internal/v1/session?locale=zh-CN',
  queryParams: [{ key: 'locale', value: 'zh-CN', enabled: true }],
  headers: [
    { key: 'content-type', value: 'application/json', enabled: true },
    { key: 'authorization', value: 'Bearer demo-token', enabled: true },
  ],
  body: JSON.stringify({ userId: 42, remember: true }, null, 2),
}

const meta = {
  title: 'Workbench/ComposeWorkbench',
  component: ComposeWorkbench,
  args: {
    draft: createEmptyDraft(),
    response: null,
    loading: false,
    error: null,
    layout: 'vertical' as ComposeLayout,
    activeRequestTab: 'params' as ComposeRequestTab,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ComposeWorkbench>

export default meta

type Story = StoryObj<typeof meta>

function createInteractiveRender(initialDraft: ComposeDraft = createEmptyDraft()) {
  return () => ({
    components: { ComposeWorkbench },
    setup() {
      const draft = ref<ComposeDraft>(structuredClone(initialDraft))
      const response = ref<ComposeResponse | null>(null)
      const loading = ref(false)
      const error = ref<string | null>(null)
      const layout = ref<ComposeLayout>('vertical')
      const activeRequestTab = ref<ComposeRequestTab>('params')

      function onSend() {
        loading.value = true
        error.value = null
        response.value = null

        window.setTimeout(() => {
          loading.value = false
          response.value = SAMPLE_RESPONSE
        }, 900)
      }

      function onReset() {
        response.value = null
        error.value = null
      }

      return {
        draft,
        response,
        loading,
        error,
        layout,
        activeRequestTab,
        onSend,
        onReset,
      }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <div class="mx-auto h-[720px] max-w-6xl">
          <ComposeWorkbench
            v-model:draft="draft"
            v-model:layout="layout"
            v-model:active-request-tab="activeRequestTab"
            :response="response"
            :loading="loading"
            :error="error"
            @send="onSend"
            @reset="onReset"
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
    components: { ComposeWorkbench },
    setup() {
      const draft = ref(structuredClone(FILLED_DRAFT))
      const layout = ref<ComposeLayout>('vertical')
      const activeRequestTab = ref<ComposeRequestTab>('body')
      return {
        draft,
        layout,
        activeRequestTab,
        response: SAMPLE_RESPONSE,
      }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <div class="mx-auto h-[720px] max-w-6xl">
          <ComposeWorkbench
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
    components: { ComposeWorkbench },
    setup() {
      const draft = ref(structuredClone(FILLED_DRAFT))
      const layout = ref<ComposeLayout>('vertical')
      const activeRequestTab = ref<ComposeRequestTab>('body')
      return { draft, layout, activeRequestTab }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <div class="mx-auto h-[720px] max-w-6xl">
          <ComposeWorkbench
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
    components: { ComposeWorkbench },
    setup() {
      const draft = ref(structuredClone(FILLED_DRAFT))
      const layout = ref<ComposeLayout>('vertical')
      const activeRequestTab = ref<ComposeRequestTab>('body')
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
          <ComposeWorkbench
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

export const FromCapture: Story = {
  render: createInteractiveRender(captureToDraft(SAMPLE_CAPTURE)),
}
