import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import type { NetworkDetailRecord } from './types'

import NetworkRequestDetail from './NetworkRequestDetail.vue'
import type { TrafficRecord } from '../request-tree/types'
import RequestTree from '../request-tree/RequestTree.vue'
import type { RuleDraft, RuleWorkbenchRuleItem } from '../rule-workbench'
import { createRuleDraft } from '../rule-workbench'
import type { SecondaryPaneKey } from '../rules-drawer'
import { RulesAssetsDrawer } from '../rules-drawer'

const meta = {
  title: 'Data Display/NetworkRequestDetail',
  component: NetworkRequestDetail as unknown as object,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

function jsonBodyBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value, null, 2))
}

const sampleRecord: NetworkDetailRecord = {
  id: 'req-1203',
  method: 'POST',
  url: 'https://gateway.lynx.internal/runtime/hydration/island-7/widgets/container-11/panels/panel-54/fragments/fragment-239?traceId=trace_239_34&locale=zh-CN&viewport=desktop',
  status: 'success',
  statusCode: 201,
  requestType: 'fetch',
  protocol: 'HTTP/2',
  host: 'gateway.lynx.internal',
  path: '/runtime/hydration/island-7/widgets/container-11/panels/panel-54/fragments/fragment-239',
  remoteAddress: '10.14.22.117:443',
  startTime: '2026-05-21 15:02:32.231',
  durationMs: 142.6,
  size: {
    requestBytes: 1789,
    responseBytes: 9834,
    decodedBytes: 21432,
  },
  query: [
    { key: 'traceId', value: 'trace_239_34' },
    { key: 'locale', value: 'zh-CN' },
    { key: 'viewport', value: 'desktop' },
  ],
  requestHeaders: [
    { key: 'content-type', value: 'application/json' },
    { key: 'authorization', value: 'Bearer eyJh...snip' },
    { key: 'x-lynx-trace-id', value: 'trace_239_34' },
  ],
  responseHeaders: [
    { key: 'content-type', value: 'application/json; charset=utf-8' },
    { key: 'cache-control', value: 'no-store' },
    { key: 'x-request-id', value: 'gw-57c1d08e-3' },
  ],
  requestCookies: [
    { key: 'session_id', value: 'sess_53f0f76' },
  ],
  responseCookies: [
    { key: 'refresh_hint', value: 'true' },
  ],
  requestContentType: 'application/json',
  responseContentType: 'application/json; charset=utf-8',
  requestBodyBytes: jsonBodyBytes({
    userId: 98234,
    include: ['permissions', 'preferences', 'featureFlags'],
    locale: 'zh-CN',
    viewport: 'desktop',
    payload: {
      panelId: 'panel-54',
      widgetId: 'container-11',
    },
  }),
  responseBodyBytes: jsonBodyBytes({
    ok: true,
    data: {
      panel: {
        id: 'panel-54',
        widgets: 6,
      },
      updatedAt: '2026-05-21T07:02:32.373Z',
    },
    meta: {
      requestId: 'gw-57c1d08e-3',
      cost: {
        cpuMs: 11,
        ioMs: 4,
      },
    },
  }),
  timing: {
    blockedMs: 1.5,
    dnsMs: 3.2,
    tcpMs: 12.1,
    tlsMs: 28.6,
    requestSentMs: 2.8,
    waitingMs: 71.9,
    downloadMs: 22.5,
  },
  matchedRules: [
    {
      ruleId: '101',
      name: 'Mock · 注入调试 Header',
      reason: 'matchDsl 命中',
    },
  ],
}

const sampleRecord2: NetworkDetailRecord = {
  ...sampleRecord,
  id: 'req-1204',
  method: 'GET',
  status: 'success',
  statusCode: 200,
  requestType: 'xhr',
  durationMs: 89.3,
  url: 'https://gateway.lynx.internal/runtime/hydration/island-2/widgets/container-4/panels/panel-12/fragments/fragment-991?traceId=trace_991_21&locale=en-US&viewport=mobile',
  query: [
    { key: 'traceId', value: 'trace_991_21' },
    { key: 'locale', value: 'en-US' },
    { key: 'viewport', value: 'mobile' },
  ],
  matchedRules: [],
}

const sampleRecord3: NetworkDetailRecord = {
  ...sampleRecord,
  id: 'req-1205',
  method: 'DELETE',
  status: 'error',
  statusCode: 404,
  requestType: 'fetch',
  durationMs: 233.7,
  url: 'https://gateway.lynx.internal/runtime/hydration/island-8/widgets/container-21/panels/panel-77/fragments/fragment-1002?traceId=trace_1002_9&locale=zh-CN&viewport=desktop',
  matchedRules: [
    { ruleId: '201', name: 'Mock · 拦截 404', reason: 'matchDsl 命中' },
    { ruleId: '202', name: 'Mock · 延迟 800ms', reason: 'matchDsl 命中' },
    { ruleId: '203', name: 'Mock · 代理转发到 staging', reason: 'matchDsl 命中' },
  ],
}

const detailRecords: NetworkDetailRecord[] = [sampleRecord, sampleRecord2, sampleRecord3]

const treeRequests: TrafficRecord[] = detailRecords.map(record => ({
  id: record.id,
  url: record.url,
  method: record.method,
  requestType: record.requestType,
  status: record.status,
  statusCode: record.statusCode,
}))

export const Default: Story = {
  render: () => ({
    components: { NetworkRequestDetail },
    setup() {
      const record = ref(sampleRecord)
      return { record }
    },
    template: `
      <div style="height: 100vh; padding: 16px; background: #f5f6f7;">
        <NetworkRequestDetail :record="record" class="h-full" />
      </div>
    `,
  }),
}

export const EmptyState: Story = {
  render: () => ({
    components: { NetworkRequestDetail },
    setup() {
      const record = ref<NetworkDetailRecord | null>(null)
      return { record }
    },
    template: `
      <div style="height: 100vh; padding: 16px; background: #f5f6f7;">
        <NetworkRequestDetail :record="record" class="h-full" />
      </div>
    `,
  }),
}

export const HalfWidthInSplitLayout: Story = {
  render: () => ({
    components: { NetworkRequestDetail, RequestTree },
    setup() {
      const selected = ref<string>(detailRecords[0].id)
      const currentRecord = ref<NetworkDetailRecord>(detailRecords[0])

      function handleSelect(request: TrafficRecord) {
        const found = detailRecords.find(item => item.id === request.id)
        if (found) currentRecord.value = found
      }

      return {
        selected,
        currentRecord,
        treeRequests,
        handleSelect,
      }
    },
    template: `
      <div style="height: 100vh; padding: 12px; background: #f3f4f6;">
        <div style="height: 100%; border: 1px solid #d4d4d8; border-radius: 10px; overflow: hidden; background: white; display: grid; grid-template-columns: 1fr 1fr;">
          <aside style="border-right: 1px solid #e4e4e7; padding: 10px; overflow: hidden; display: flex; flex-direction: column;">
            <div style="font-size: 12px; font-weight: 600; color: #52525b; margin-bottom: 8px;">Request List</div>
            <RequestTree
              :requests="treeRequests"
              v-model="selected"
              :height="760"
              @select="handleSelect"
            />
          </aside>

          <section style="padding: 10px; overflow: hidden;">
            <NetworkRequestDetail :record="currentRecord" class="h-full" />
          </section>
        </div>
      </div>
    `,
  }),
}

/** 直达「内容」→ 请求/响应 body，预览与线上详情一致 */
export const ContentBodyTab: Story = {
  name: 'Content · Body tab',
  render: () => ({
    components: { NetworkRequestDetail },
    setup() {
      const record = ref(sampleRecord)
      return { record }
    },
    template: `
      <div style="height: 100vh; padding: 16px; background: #f5f6f7;">
        <NetworkRequestDetail
          :record="record"
          class="h-full"
          initial-tab="content"
          initial-request-sub-tab="body"
          initial-response-sub-tab="body"
        />
      </div>
    `,
  }),
}

export const DrawerPanel: Story = {
  render: () => ({
    components: { NetworkRequestDetail, RequestTree, RulesAssetsDrawer },
    setup() {
      const selected = ref<string>(detailRecords[0].id)
      const currentRecord = ref<NetworkDetailRecord>(detailRecords[0])
      const drawerOpen = ref(false)
      const rulesDrawerOpen = ref(false)
      const rulesPane = ref<SecondaryPaneKey>('list')
      const selectedRuleId = ref<string>('')
      const ruleDraft = ref<RuleDraft | undefined>(undefined)

      const rules = ref<RuleWorkbenchRuleItem[]>([
        { id: '101', name: 'Mock · 注入调试 Header', enabled: true, priority: 50, summary: 'modifyRequest: headers' },
        { id: '201', name: 'Mock · 拦截 404', enabled: true, priority: 10, summary: 'block: 404' },
        { id: '202', name: 'Mock · 延迟 800ms', enabled: true, priority: 40, summary: 'delay: 800ms' },
        { id: '203', name: 'Mock · 代理转发到 staging', enabled: false, priority: 60, summary: 'proxyForward: staging' },
      ])

      function openRuleEditor(ruleId: string) {
        rulesDrawerOpen.value = true
        rulesPane.value = 'editor'
        selectedRuleId.value = ruleId
        const ruleName = rules.value.find(r => r.id === ruleId)?.name ?? '未命名规则'
        ruleDraft.value = createRuleDraft({
          id: ruleId,
          name: ruleName,
          matchDsl: 'example.com',
        })
      }

      function handleSelect(request: TrafficRecord) {
        const found = detailRecords.find(item => item.id === request.id)
        if (found) {
          currentRecord.value = found
          drawerOpen.value = true
        }
      }

      return {
        selected,
        currentRecord,
        drawerOpen,
        treeRequests,
        handleSelect,
        rulesDrawerOpen,
        rulesPane,
        selectedRuleId,
        ruleDraft,
        rules,
        openRuleEditor,
      }
    },
    template: `
      <div style="height: 100vh; padding: 12px; background: #f3f4f6; position: relative; overflow: hidden;">
        <div style="height: 100%; border: 1px solid #d4d4d8; border-radius: 10px; background: white; overflow: hidden; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="font-size: 12px; font-weight: 600; color: #52525b;">Drawer Host Page</div>
            <button
              type="button"
              style="height: 28px; border: 1px solid #d4d4d8; border-radius: 6px; padding: 0 10px; font-size: 12px; background: #fafafa; cursor: pointer;"
              @click="drawerOpen = !drawerOpen"
            >
              {{ drawerOpen ? 'Hide Detail Drawer' : 'Show Detail Drawer' }}
            </button>
          </div>

          <RequestTree
            :requests="treeRequests"
            v-model="selected"
            :height="760"
            @select="handleSelect"
          />
        </div>

        <div
          style="position: absolute; top: 12px; right: 12px; bottom: 12px; width: min(52vw, 760px); border-left: 1px solid #d4d4d8; background: white; box-shadow: -6px 0 24px rgba(0, 0, 0, 0.12); transition: transform 220ms ease;"
          :style="{ transform: drawerOpen ? 'translateX(0)' : 'translateX(105%)' }"
        >
          <div style="height: 100%; padding: 10px;">
            <NetworkRequestDetail
              :record="currentRecord"
              class="h-full"
              @rule:open="(rule) => openRuleEditor(rule.ruleId)"
            />
          </div>
        </div>

        <RulesAssetsDrawer
          v-model:open="rulesDrawerOpen"
          v-model:rules-pane="rulesPane"
          v-model:selected-rule-id="selectedRuleId"
          v-model:rule-draft="ruleDraft"
          :rules="rules"
          :dirty="false"
          :loading="false"
          :saving="false"
        />
      </div>
    `,
  }),
}

export const MatchedRules_None: Story = {
  name: 'MatchedRules · None',
  render: () => ({
    components: { NetworkRequestDetail },
    setup() {
      const record = ref<NetworkDetailRecord>({
        ...sampleRecord2,
        matchedRules: [],
      })
      return { record }
    },
    template: `
      <div style="height: 100vh; padding: 16px; background: #f5f6f7;">
        <NetworkRequestDetail :record="record" class="h-full" />
      </div>
    `,
  }),
}

export const MatchedRules_Single_ClickToOpenDrawer: Story = {
  name: 'MatchedRules · Single (click → open drawer)',
  render: () => ({
    components: { NetworkRequestDetail, RulesAssetsDrawer },
    setup() {
      const record = ref<NetworkDetailRecord>({ ...sampleRecord })

      const rulesDrawerOpen = ref(false)
      const rulesPane = ref<SecondaryPaneKey>('list')
      const selectedRuleId = ref<string>('')
      const ruleDraft = ref<RuleDraft | undefined>(undefined)

      const rules = ref<RuleWorkbenchRuleItem[]>([
        { id: '101', name: 'Mock · 注入调试 Header', enabled: true, priority: 50, summary: 'modifyRequest: headers' },
      ])

      function openRuleEditor(ruleId: string) {
        rulesDrawerOpen.value = true
        rulesPane.value = 'editor'
        selectedRuleId.value = ruleId
        ruleDraft.value = createRuleDraft({ id: ruleId, name: 'Mock · 注入调试 Header' })
      }

      return {
        record,
        rulesDrawerOpen,
        rulesPane,
        selectedRuleId,
        ruleDraft,
        rules,
        openRuleEditor,
      }
    },
    template: `
      <div style="height: 100vh; padding: 16px; background: #f5f6f7;">
        <NetworkRequestDetail
          :record="record"
          class="h-full"
          @rule:open="(rule) => openRuleEditor(rule.ruleId)"
        />

        <RulesAssetsDrawer
          v-model:open="rulesDrawerOpen"
          v-model:rules-pane="rulesPane"
          v-model:selected-rule-id="selectedRuleId"
          v-model:rule-draft="ruleDraft"
          :rules="rules"
          :dirty="false"
          :loading="false"
          :saving="false"
        />
      </div>
    `,
  }),
}

export const MatchedRules_Multiple_ClickToOpenDrawer: Story = {
  name: 'MatchedRules · Multiple (click → open drawer)',
  render: () => ({
    components: { NetworkRequestDetail, RulesAssetsDrawer },
    setup() {
      const record = ref<NetworkDetailRecord>({ ...sampleRecord3 })

      const rulesDrawerOpen = ref(false)
      const rulesPane = ref<SecondaryPaneKey>('list')
      const selectedRuleId = ref<string>('')
      const ruleDraft = ref<RuleDraft | undefined>(undefined)

      const rules = ref<RuleWorkbenchRuleItem[]>([
        { id: '201', name: 'Mock · 拦截 404', enabled: true, priority: 10, summary: 'block: 404' },
        { id: '202', name: 'Mock · 延迟 800ms', enabled: true, priority: 40, summary: 'delay: 800ms' },
        { id: '203', name: 'Mock · 代理转发到 staging', enabled: false, priority: 60, summary: 'proxyForward: staging' },
      ])

      function openRuleEditor(ruleId: string) {
        rulesDrawerOpen.value = true
        rulesPane.value = 'editor'
        selectedRuleId.value = ruleId
        const ruleName = rules.value.find(r => r.id === ruleId)?.name ?? '未命名规则'
        ruleDraft.value = createRuleDraft({ id: ruleId, name: ruleName })
      }

      return {
        record,
        rulesDrawerOpen,
        rulesPane,
        selectedRuleId,
        ruleDraft,
        rules,
        openRuleEditor,
      }
    },
    template: `
      <div style="height: 100vh; padding: 16px; background: #f5f6f7;">
        <NetworkRequestDetail
          :record="record"
          class="h-full"
          @rule:open="(rule) => openRuleEditor(rule.ruleId)"
        />

        <RulesAssetsDrawer
          v-model:open="rulesDrawerOpen"
          v-model:rules-pane="rulesPane"
          v-model:selected-rule-id="selectedRuleId"
          v-model:rule-draft="ruleDraft"
          :rules="rules"
          :dirty="false"
          :loading="false"
          :saving="false"
        />
      </div>
    `,
  }),
}
