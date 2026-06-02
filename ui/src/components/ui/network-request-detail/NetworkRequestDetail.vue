<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { NetworkDetailKeyValue, NetworkDetailMatchedRule, NetworkDetailRecord } from './types'

import { computed, ref } from 'vue'

import { VerticalSplitPanel } from '@/components/ui/split-panels'
import BodyPreviewPanel from './BodyPreviewPanel.vue'
import { cn } from '@/lib/utils'
import {
  detailLabelClass,
  detailRowGridClass,
  detailSectionTitleClass,
  detailValueBreakClass,
  detailValueClass,
} from './detail-styles'

const TABS = ['overview', 'content'] as const
const REQUEST_SUB_TABS = ['query', 'headers', 'cookies', 'body'] as const
const RESPONSE_SUB_TABS = ['headers', 'cookies', 'body'] as const

type DetailTab = typeof TABS[number]
type RequestSubTab = typeof REQUEST_SUB_TABS[number]
type ResponseSubTab = typeof RESPONSE_SUB_TABS[number]

const props = withDefaults(
  defineProps<{
    record?: NetworkDetailRecord | null
    class?: HTMLAttributes['class']
    /** Storybook / 调试：打开详情时默认选中的主 Tab */
    initialTab?: DetailTab
    initialRequestSubTab?: RequestSubTab
    initialResponseSubTab?: ResponseSubTab
  }>(),
  {
    initialTab: 'overview',
    initialRequestSubTab: 'headers',
    initialResponseSubTab: 'headers',
  },
)

const emit = defineEmits<{
  'rule:open': [rule: NetworkDetailMatchedRule]
}>()

const TAB_LABELS: Record<DetailTab, string> = {
  overview: '概览',
  content: '内容',
}

const activeTab = ref<DetailTab>(props.initialTab)
const requestSubTab = ref<RequestSubTab>(props.initialRequestSubTab)
const responseSubTab = ref<ResponseSubTab>(props.initialResponseSubTab)
const contentSplitRatio = ref(44)

function duration(value?: number): string {
  if (value == null) return '-'
  return `${value.toFixed(1)} ms`
}

function formatStartTime(iso?: string): string {
  if (!iso) return '-'

  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d+))?/)
  if (!match) return iso

  const [, date, time, ms] = match
  return ms ? `${date} ${time}.${ms}` : `${date} ${time}`
}

function nonEmptyRows(rows?: NetworkDetailKeyValue[]): NetworkDetailKeyValue[] {
  return (rows ?? []).filter(row => row.key || row.value)
}

function nonEmptyMatchedRules(rules?: NetworkDetailMatchedRule[]): NetworkDetailMatchedRule[] {
  return (rules ?? []).filter(r => r && typeof r.ruleId === 'string' && r.ruleId.trim().length > 0 && r.name.trim().length > 0)
}

const isWebSocketRequest = computed(() => {
  const type = props.record?.requestType?.toLowerCase() ?? ''
  const contentType = props.record?.requestContentType?.toLowerCase() ?? ''
  return type.includes('websocket') || contentType.includes('websocket')
})
</script>

<template>
  <section
    :class="cn(
      'flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-card',
      props.record && 'border border-border',
      props.class,
    )"
  >
    <div
      v-if="!props.record"
      class="flex h-full min-h-0 flex-1 items-center justify-center px-6 text-xs text-muted-foreground"
    >
      从列表中选择请求以查看详情。
    </div>

    <template v-else>
      <nav class="flex items-end gap-px border-b border-border bg-muted/30 px-1 pt-1">
        <button
          v-for="tab in TABS"
          :key="tab"
          type="button"
          class="-mb-px h-7 flex-1 rounded-t-sm border border-transparent border-b-0 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          :class="activeTab === tab
            ? 'bg-card text-foreground border-border'
            : 'hover:bg-background/60 hover:border-border/40'"
          @click="activeTab = tab"
        >
          {{ TAB_LABELS[tab] }}
        </button>
      </nav>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 text-xs">
        <div v-if="activeTab === 'overview'" class="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-0.5">

          <section class="space-y-1.5">
            <h3 :class="detailSectionTitleClass">常规</h3>
            <dl class="space-y-1">
              <div :class="detailRowGridClass">
                <dt :class="detailLabelClass">请求 URL</dt>
                <dd :class="detailValueBreakClass">{{ props.record.url }}</dd>
              </div>
              <div :class="detailRowGridClass">
                <dt :class="detailLabelClass">请求方法</dt>
                <dd :class="detailValueClass">{{ props.record.method }}</dd>
              </div>
              <div :class="detailRowGridClass">
                <dt :class="detailLabelClass">状态码</dt>
                <dd :class="detailValueClass">{{ props.record.statusCode ?? '-' }}</dd>
              </div>
              <div :class="detailRowGridClass">
                <dt :class="detailLabelClass">远端地址</dt>
                <dd :class="detailValueClass">{{ props.record.remoteAddress || '-' }}</dd>
              </div>
              <div :class="detailRowGridClass">
                <dt :class="detailLabelClass">协议</dt>
                <dd :class="detailValueClass">{{ props.record.protocol || '-' }}</dd>
              </div>
              <div :class="detailRowGridClass">
                <dt :class="detailLabelClass">命中规则</dt>
                <dd :class="detailValueClass">
                  <div v-if="nonEmptyMatchedRules(props.record.matchedRules).length === 0">-</div>
                  <div v-else class="flex flex-col items-start gap-1">
                    <button
                      v-for="rule in nonEmptyMatchedRules(props.record.matchedRules)"
                      :key="rule.ruleId"
                      type="button"
                      class="max-w-full text-left font-medium text-primary underline-offset-4 hover:underline"
                      @click="emit('rule:open', rule)"
                    >
                      {{ rule.name }}
                    </button>
                  </div>
                </dd>
              </div>
            </dl>
          </section>

          <section class="space-y-1.5">
            <h3 :class="detailSectionTitleClass">时序</h3>
            <dl class="space-y-1">
              <div :class="detailRowGridClass">
                <dt :class="detailLabelClass">开始时间</dt>
                <dd :class="detailValueClass">{{ formatStartTime(props.record.startTime) }}</dd>
              </div>
              <div :class="detailRowGridClass">
                <dt :class="detailLabelClass">耗时</dt>
                <dd :class="detailValueClass">{{ duration(props.record.durationMs) }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div v-else class="min-h-0 flex-1 overflow-hidden">
          <VerticalSplitPanel v-model="contentSplitRatio" class="h-full min-h-0" :min-top-px="96" :min-bottom-px="96">
            <template #top>
              <div class="flex h-full min-h-0 flex-col">
                <nav class="flex flex-wrap items-center gap-1 px-1 py-0.5">
                  <button
                    v-for="subTab in REQUEST_SUB_TABS"
                    :key="subTab"
                    type="button"
                    class="h-6 rounded px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                    :class="requestSubTab === subTab ? 'bg-muted text-foreground' : 'hover:bg-muted/40'"
                    @click="requestSubTab = subTab"
                  >
                    {{ subTab }}
                  </button>
                </nav>

                <div
                  class="flex min-h-0 flex-1 flex-col"
                  :class="requestSubTab === 'body' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'"
                >
                  <section v-if="requestSubTab === 'query'" class="space-y-1">
                    <div v-if="nonEmptyRows(props.record.query).length === 0" class="px-5 py-1 text-xs text-muted-foreground">无查询参数</div>
                    <div v-else>
                      <table class="w-full text-xs">
                        <tbody>
                          <tr v-for="row in nonEmptyRows(props.record.query)" :key="`qp-${row.key}-${row.value}`" class="align-top">
                            <td class="w-[34%] px-5 py-1 font-mono text-[11px] text-muted-foreground">{{ row.key }}</td>
                            <td class="px-2 py-1 font-mono text-[11px] break-all">{{ row.value }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section v-else-if="requestSubTab === 'headers'" class="space-y-1">
                    <div v-if="nonEmptyRows(props.record.requestHeaders).length === 0" class="px-5 py-1 text-xs text-muted-foreground">无请求 Headers</div>
                    <div v-else>
                      <table class="w-full text-xs">
                        <tbody>
                          <tr v-for="row in nonEmptyRows(props.record.requestHeaders)" :key="`rh-${row.key}-${row.value}`" class="align-top">
                            <td class="w-[34%] px-5 py-1 font-mono text-[11px] text-muted-foreground">{{ row.key }}</td>
                            <td class="px-2 py-1 font-mono text-[11px] break-all">{{ row.value }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section v-else-if="requestSubTab === 'cookies'" class="space-y-1">
                    <div v-if="nonEmptyRows(props.record.requestCookies).length === 0" class="px-5 py-1 text-xs text-muted-foreground">无请求 Cookies</div>
                    <div v-else>
                      <table class="w-full text-xs">
                        <tbody>
                          <tr v-for="row in nonEmptyRows(props.record.requestCookies)" :key="`rc-${row.key}-${row.value}`" class="align-top">
                            <td class="w-[34%] px-5 py-1 font-mono text-[11px] text-muted-foreground">{{ row.key }}</td>
                            <td class="px-2 py-1 font-mono text-[11px] break-all">{{ row.value }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <BodyPreviewPanel
                    v-else
                    empty-label="无请求 Body"
                    :bytes="props.record.requestBodyBytes"
                    :content-type="props.record.requestContentType"
                    :truncated="props.record.requestBodyTruncated"
                    :is-web-socket="isWebSocketRequest"
                  />
                </div>
              </div>
            </template>

            <template #bottom>
              <div class="flex h-full min-h-0 flex-col">
                <nav class="flex flex-wrap items-center gap-1 px-1 py-0.5">
                  <button
                    v-for="subTab in RESPONSE_SUB_TABS"
                    :key="subTab"
                    type="button"
                    class="h-6 rounded px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                    :class="responseSubTab === subTab ? 'bg-muted text-foreground' : 'hover:bg-muted/40'"
                    @click="responseSubTab = subTab"
                  >
                    {{ subTab }}
                  </button>
                </nav>

                <div
                  class="flex min-h-0 flex-1 flex-col"
                  :class="responseSubTab === 'body' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'"
                >
                  <section v-if="responseSubTab === 'headers'" class="space-y-1">
                    <div v-if="nonEmptyRows(props.record.responseHeaders).length === 0" class="px-5 py-1 text-xs text-muted-foreground">无响应 Headers</div>
                    <div v-else>
                      <table class="w-full text-xs">
                        <tbody>
                          <tr v-for="row in nonEmptyRows(props.record.responseHeaders)" :key="`sh-${row.key}-${row.value}`" class="align-top">
                            <td class="w-[34%] px-5 py-1 font-mono text-[11px] text-muted-foreground">{{ row.key }}</td>
                            <td class="px-2 py-1 font-mono text-[11px] break-all">{{ row.value }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section v-else-if="responseSubTab === 'cookies'" class="space-y-1">
                    <div v-if="nonEmptyRows(props.record.responseCookies).length === 0" class="px-5 py-1 text-xs text-muted-foreground">无响应 Cookies</div>
                    <div v-else>
                      <table class="w-full text-xs">
                        <tbody>
                          <tr v-for="row in nonEmptyRows(props.record.responseCookies)" :key="`sc-${row.key}-${row.value}`" class="align-top">
                            <td class="w-[34%] px-5 py-1 font-mono text-[11px] text-muted-foreground">{{ row.key }}</td>
                            <td class="px-2 py-1 font-mono text-[11px] break-all">{{ row.value }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <BodyPreviewPanel
                    v-else
                    empty-label="无响应 Body"
                    :bytes="props.record.responseBodyBytes"
                    :content-type="props.record.responseContentType"
                    :truncated="props.record.responseBodyTruncated"
                  />
                </div>
              </div>
            </template>
          </VerticalSplitPanel>
        </div>
      </div>
    </template>
  </section>
</template>
