import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { ApiStudioOpenTab } from '../types'
import { MOCK_COLLECTION_NODES } from '../mock/collection-tree'
import { MOCK_REQUEST_DRAFTS } from '../mock/request-drafts'
import { SAMPLE_API_STUDIO_RESPONSE } from '../mock/sample-response'
import ApiStudioShell from './ApiStudioShell.vue'

const meta = {
  title: 'API Studio/ApiStudioShell',
  component: ApiStudioShell,
  args: {
    nodes: MOCK_COLLECTION_NODES,
    persistTabSession: false,
    hydrated: true,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ApiStudioShell>

export default meta

type Story = StoryObj<typeof meta>

function buildInitialTab(
  requestNodeId: string,
  overrides: Partial<ApiStudioOpenTab> = {},
): ApiStudioOpenTab {
  const node = MOCK_COLLECTION_NODES.find(n => n.id === requestNodeId)
  const draftId = node?.draftId
  const draft = draftId && MOCK_REQUEST_DRAFTS[draftId]
    ? structuredClone(MOCK_REQUEST_DRAFTS[draftId])
    : structuredClone(MOCK_REQUEST_DRAFTS['draft-login'])

  return {
    id: `tab-${requestNodeId}`,
    requestNodeId,
    title: node?.name ?? 'Request',
    method: node?.method,
    draft,
    response: null,
    loading: false,
    error: null,
    activeRequestTab: 'params',
    ...overrides,
  }
}

export const Default: Story = {
  render: () => ({
    components: { ApiStudioShell },
    setup() {
      const shellRef = ref<InstanceType<typeof ApiStudioShell> | null>(null)
      const nodes = ref([...MOCK_COLLECTION_NODES])
      const selectedId = ref('req-login')
      const initialTabs = [
        buildInitialTab('req-login'),
        buildInitialTab('req-list-users'),
      ]

      function onSend() {
        shellRef.value?.applyActiveTabResult({
          loading: true,
          response: null,
          error: null,
        })
        window.setTimeout(() => {
          shellRef.value?.applyActiveTabResult({
            loading: false,
            response: SAMPLE_API_STUDIO_RESPONSE,
          })
        }, 800)
      }

      return {
        shellRef,
        nodes,
        selectedId,
        initialTabs,
        onSend,
      }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <p class="mx-auto mb-2 max-w-7xl text-xs text-muted-foreground">
          左侧选请求打开标签；底部切换「历史」；拖拽节点/标签；+ 从 cURL 导入
        </p>
        <div class="mx-auto h-[760px] max-w-7xl">
          <ApiStudioShell
            ref="shellRef"
            v-model:nodes="nodes"
            :initial-tabs="initialTabs"
            initial-active-tab-id="tab-req-login"
            v-model:selected-id="selectedId"
            @send="onSend"
          />
        </div>
      </div>
    `,
  }),
}

export const WithResponse: Story = {
  render: () => ({
    components: { ApiStudioShell },
    setup() {
      const nodes = ref([...MOCK_COLLECTION_NODES])
      const selectedId = ref('req-login')
      const initialTabs = [
        buildInitialTab('req-login', {
          response: SAMPLE_API_STUDIO_RESPONSE,
          activeRequestTab: 'headers',
        }),
        buildInitialTab('req-list-users', {
          response: {
            status: 200,
            statusText: 'OK',
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'x-total-count': '2',
            },
            body: JSON.stringify(
              {
                users: [
                  { id: 1, name: 'Alice', email: 'alice@example.com' },
                  { id: 2, name: 'Bob', email: 'bob@example.com' },
                ],
                page: 1,
                total: 2,
              },
              null,
              2,
            ),
            responseTime: 96,
            size: 186,
          },
          activeRequestTab: 'body',
        }),
      ]

      return { nodes, selectedId, initialTabs }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <p class="mx-auto mb-2 max-w-7xl text-xs text-muted-foreground">
          预填响应：切换标签查看不同请求的请求/响应面板（含 Headers、Body）
        </p>
        <div class="mx-auto h-[760px] max-w-7xl">
          <ApiStudioShell
            v-model:nodes="nodes"
            :initial-tabs="initialTabs"
            initial-active-tab-id="tab-req-login"
            v-model:selected-id="selectedId"
          />
        </div>
      </div>
    `,
  }),
}

export const SelectRequestUpdatesDraft: Story = {
  render: () => ({
    components: { ApiStudioShell },
    setup() {
      const nodes = ref([...MOCK_COLLECTION_NODES])
      const selectedId = ref('req-list-users')
      return {
        nodes,
        selectedId,
        initialTabs: [buildInitialTab('req-list-users')],
        initialActiveTabId: 'tab-req-list-users',
      }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <p class="mx-auto mb-2 max-w-7xl text-xs text-muted-foreground">
          点击左侧不同 Request 打开/切换标签，观察 URL 与标题
        </p>
        <div class="mx-auto h-[760px] max-w-7xl">
          <ApiStudioShell
            v-model:nodes="nodes"
            :initial-tabs="initialTabs"
            :initial-active-tab-id="initialActiveTabId"
            v-model:selected-id="selectedId"
          />
        </div>
      </div>
    `,
  }),
}
