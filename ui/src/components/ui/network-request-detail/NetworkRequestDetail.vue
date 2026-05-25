<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { WorkbenchType } from '@/components/ui/content-workbench/utils'
import type { NetworkDetailKeyValue, NetworkDetailRecord } from './types'

import { computed, ref, watch } from 'vue'

import { ContentWorkbench } from '@/components/ui/content-workbench'
import { cn } from '@/lib/utils'

const props = defineProps<{
  record?: NetworkDetailRecord | null
  class?: HTMLAttributes['class']
}>()

const TABS = ['overview', 'request', 'response', 'timing'] as const
const REQUEST_SUB_TABS = ['query', 'headers', 'cookies', 'body'] as const
const RESPONSE_SUB_TABS = ['headers', 'cookies', 'body'] as const

type DetailTab = typeof TABS[number]
type RequestSubTab = typeof REQUEST_SUB_TABS[number]
type ResponseSubTab = typeof RESPONSE_SUB_TABS[number]

const activeTab = ref<DetailTab>('overview')
const requestSubTab = ref<RequestSubTab>('headers')
const responseSubTab = ref<ResponseSubTab>('headers')

watch(() => props.record?.id, () => {
  activeTab.value = 'overview'
  requestSubTab.value = 'headers'
  responseSubTab.value = 'headers'
})

const totalTiming = computed(() => {
  const timing = props.record?.timing
  if (!timing) return 0

  return [
    timing.blockedMs,
    timing.dnsMs,
    timing.tcpMs,
    timing.tlsMs,
    timing.requestSentMs,
    timing.waitingMs,
    timing.downloadMs,
  ].reduce<number>((sum, part) => sum + (part ?? 0), 0)
})

const timingRows = computed(() => {
  const timing = props.record?.timing
  if (!timing) return [] as Array<{ key: string, label: string, value: number }>

  return [
    { key: 'blocked', label: 'Blocked', value: timing.blockedMs ?? 0 },
    { key: 'dns', label: 'DNS Lookup', value: timing.dnsMs ?? 0 },
    { key: 'tcp', label: 'TCP Connect', value: timing.tcpMs ?? 0 },
    { key: 'tls', label: 'TLS Handshake', value: timing.tlsMs ?? 0 },
    { key: 'request', label: 'Request Sent', value: timing.requestSentMs ?? 0 },
    { key: 'waiting', label: 'Waiting (TTFB)', value: timing.waitingMs ?? 0 },
    { key: 'download', label: 'Download', value: timing.downloadMs ?? 0 },
  ]
})

function timingPercent(value: number): string {
  if (!totalTiming.value || value <= 0) return '0%'
  return `${Math.max(2, (value / totalTiming.value) * 100)}%`
}

function bytes(value?: number): string {
  if (value == null) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function duration(value?: number): string {
  if (value == null) return '-'
  return `${value.toFixed(1)} ms`
}

function nonEmptyRows(rows?: NetworkDetailKeyValue[]): NetworkDetailKeyValue[] {
  return (rows ?? []).filter(row => row.key || row.value)
}

function bodyType(contentType?: string, body?: unknown): WorkbenchType {
  if (body == null || body === '') return 'text'
  if (typeof body === 'object') return 'json'

  const normalized = contentType?.toLowerCase() ?? ''

  if (normalized.includes('application/json')) return 'json'
  if (normalized.includes('text/html')) return 'html-source'
  if (normalized.includes('application/xml') || normalized.includes('text/xml')) return 'xml-source'
  if (normalized.includes('text/css')) return 'css-source'
  if (normalized.includes('javascript') || normalized.includes('ecmascript')) return 'javascript-source'

  return 'text'
}
</script>

<template>
  <section :class="cn('flex h-full min-h-96 flex-col overflow-hidden rounded-lg border border-border bg-card', props.class)">
    <div
      v-if="!props.record"
      class="flex h-full min-h-96 items-center justify-center px-6 text-sm text-muted-foreground"
    >
      Select a request from the list to inspect details.
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
          {{ tab }}
        </button>
      </nav>

      <div class="flex-1 overflow-auto px-2 py-2 text-xs">
        <div v-if="activeTab === 'overview'" class="space-y-4">

          <section class="space-y-1">
            <h3 class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">General</h3>
            <dl class="space-y-1">
              <div class="grid grid-cols-[130px_1fr] gap-2 py-0.5">
                <dt class="text-muted-foreground">Request URL</dt>
                <dd class="font-mono break-all">{{ props.record.url }}</dd>
              </div>
              <div class="grid grid-cols-[130px_1fr] gap-2 py-0.5">
                <dt class="text-muted-foreground">Request Method</dt>
                <dd class="font-mono">{{ props.record.method }}</dd>
              </div>
              <div class="grid grid-cols-[130px_1fr] gap-2 py-0.5">
                <dt class="text-muted-foreground">Status Code</dt>
                <dd class="font-mono">{{ props.record.statusCode ?? '-' }}</dd>
              </div>
              <div class="grid grid-cols-[130px_1fr] gap-2 py-0.5">
                <dt class="text-muted-foreground">Remote Address</dt>
                <dd class="font-mono">{{ props.record.remoteAddress || '-' }}</dd>
              </div>
              <div class="grid grid-cols-[130px_1fr] gap-2 py-0.5">
                <dt class="text-muted-foreground">Protocol</dt>
                <dd class="font-mono">{{ props.record.protocol || '-' }}</dd>
              </div>
            </dl>
          </section>

          <section class="space-y-1">
            <h3 class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sizes</h3>
            <dl class="space-y-1">
              <div class="grid grid-cols-[130px_1fr] gap-2 py-0.5">
                <dt class="text-muted-foreground">Transferred</dt>
                <dd class="font-mono">{{ bytes(props.record.size?.responseBytes) }}</dd>
              </div>
              <div class="grid grid-cols-[130px_1fr] gap-2 py-0.5">
                <dt class="text-muted-foreground">Resource Size</dt>
                <dd class="font-mono">{{ bytes(props.record.size?.decodedBytes) }}</dd>
              </div>
              <div class="grid grid-cols-[130px_1fr] gap-2 py-0.5">
                <dt class="text-muted-foreground">Request Payload</dt>
                <dd class="font-mono">{{ bytes(props.record.size?.requestBytes) }}</dd>
              </div>
            </dl>
          </section>

          <section class="space-y-1">
            <h3 class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Timing</h3>
            <dl class="space-y-1">
              <div class="grid grid-cols-[130px_1fr] gap-2 py-0.5">
                <dt class="text-muted-foreground">Started</dt>
                <dd class="font-mono">{{ props.record.startTime || '-' }}</dd>
              </div>
              <div class="grid grid-cols-[130px_1fr] gap-2 py-0.5">
                <dt class="text-muted-foreground">Duration</dt>
                <dd class="font-mono">{{ duration(props.record.durationMs) }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div v-else-if="activeTab === 'request'" class="space-y-2">
          <nav class="flex flex-wrap items-center gap-1 px-1">
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

          <section v-if="requestSubTab === 'query'" class="space-y-1">
            <div class="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Query Parameters</div>
            <div v-if="nonEmptyRows(props.record.query).length === 0" class="px-5 py-1 text-xs text-muted-foreground">No query parameters</div>
            <div v-else class="max-h-56 overflow-auto">
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
            <div class="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Request Headers</div>
            <div v-if="nonEmptyRows(props.record.requestHeaders).length === 0" class="px-5 py-1 text-xs text-muted-foreground">No request headers</div>
            <div v-else class="max-h-56 overflow-auto">
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
            <div class="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Request Cookies</div>
            <div v-if="nonEmptyRows(props.record.requestCookies).length === 0" class="px-5 py-1 text-xs text-muted-foreground">No request cookies</div>
            <div v-else class="max-h-56 overflow-auto">
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

          <section v-else class="space-y-1">
            <div class="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Request Body</div>
            <div v-if="props.record.requestBody == null || props.record.requestBody === ''" class="px-5 py-1 text-xs text-muted-foreground">No request body</div>
            <ContentWorkbench
              v-else
              :type="bodyType(props.record.requestContentType, props.record.requestBody)"
              :content="props.record.requestBody"
              :show-line-numbers="true"
            />
          </section>
        </div>

        <div v-else-if="activeTab === 'response'" class="space-y-2">
          <nav class="flex flex-wrap items-center gap-1 px-1">
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

          <section v-if="responseSubTab === 'headers'" class="space-y-1">
            <div class="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Response Headers</div>
            <div v-if="nonEmptyRows(props.record.responseHeaders).length === 0" class="px-5 py-1 text-xs text-muted-foreground">No response headers</div>
            <div v-else class="max-h-56 overflow-auto">
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
            <div class="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Response Cookies</div>
            <div v-if="nonEmptyRows(props.record.responseCookies).length === 0" class="px-5 py-1 text-xs text-muted-foreground">No response cookies</div>
            <div v-else class="max-h-56 overflow-auto">
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

          <section v-else class="space-y-1">
            <div class="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Response Body</div>
            <div v-if="props.record.responseBody == null || props.record.responseBody === ''" class="px-5 py-1 text-xs text-muted-foreground">No response body</div>
            <ContentWorkbench
              v-else
              :type="bodyType(props.record.responseContentType, props.record.responseBody)"
              :content="props.record.responseBody"
              :show-line-numbers="true"
            />
          </section>
        </div>

        <div v-else class="space-y-2">
          <div class="flex items-center justify-between pb-1">
            <span class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Timing Breakdown</span>
            <span class="font-mono text-[11px] font-semibold">{{ duration(totalTiming) }}</span>
          </div>

          <div v-if="!props.record.timing" class="text-xs text-muted-foreground">No timing data</div>

          <div v-else class="space-y-2">
            <div v-for="row in timingRows" :key="row.key" class="grid grid-cols-[130px_1fr_72px] items-center gap-2 py-1">
              <span class="truncate text-[11px] text-muted-foreground">{{ row.label }}</span>
              <div class="h-1.5 overflow-hidden rounded bg-muted/60">
                <div class="h-full bg-primary/80" :style="{ width: timingPercent(row.value) }" />
              </div>
              <span class="text-right font-mono text-[11px]">{{ duration(row.value) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
