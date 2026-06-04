<script setup lang="ts">
import type { NetworkDetailKeyValue, NetworkDetailRecord } from '@/components/ui/network-request-detail'
import type { CSSProperties } from 'vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { requestFactsFromPartialRecord } from '@/lib/http/request-facts'
import { exportNetworkRecordToCurl } from '@/lib/http/curl'
import { resolveBodyPreviewKind } from '@/lib/http/body-preview-kind'
import { assessBodyDisplay } from '@/lib/http/body-display-limits'
import {
  formatBase64Body,
  formatJsonBody,
  formatMultipartForm,
  formatSseBody,
  formatTextBody,
  formatUrlEncodedForm,
} from '@/lib/http/body-formatters'
import { useRequestStreamStore, useRulesStore } from '@/stores'
import { useCaptureRulesStore } from '@/stores'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import { captureToDraft } from '@/components/ui/compose'
import { useComposeStore } from '@/stores/modules/compose.store'

const props = defineProps<{
  recordId?: string
  /** For tree group nodes (origin or origin/path) that are not actual requests. */
  matchExpr?: string
  x: number
  y: number
  openKey: number
}>()

const requestStreamStore = useRequestStreamStore()
const captureRulesStore = useCaptureRulesStore()
const rulesStore = useRulesStore()
const composeStore = useComposeStore()

const record = computed<NetworkDetailRecord | null>(() => {
  if (!props.recordId) return null
  return requestStreamStore.getDetailRecord(props.recordId)
})

type MatchTarget = {
  hostExpr: string
  hostPathExpr: string
  hostLabel: string
  hostPathLabel: string
}

function extractMatchTarget(matchExpr: string): MatchTarget | null {
  const raw = matchExpr.trim()
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    const isHttpLike = /^(https?|wss?):$/i.test(parsed.protocol)
    if (isHttpLike && parsed.host) {
      const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : ''
      const hostLabel = parsed.host
      const hostPathLabel = `${parsed.host}${path || '/'}`
      return {
        hostExpr: parsed.host,
        hostPathExpr: path ? `${parsed.host}${path}` : parsed.host,
        hostLabel,
        hostPathLabel,
      }
    }
  } catch {
    // fallthrough
  }

  // Fallback: treat the first segment as "host-ish", remaining as path.
  const parts = raw.split('/').filter(Boolean)
  const first = parts[0] ?? raw
  const rest = parts.slice(1).join('/')
  const hostExpr = first
  const hostPathExpr = rest ? `${first}/${rest}` : first
  const hostLabel = first
  const hostPathLabel = rest ? `${first}/${rest}` : first
  return { hostExpr, hostPathExpr, hostLabel, hostPathLabel }
}

function formatHeaderLines(rows: NetworkDetailKeyValue[] | undefined): string {
  if (!rows || rows.length === 0) return ''
  return rows
    .filter(r => r.key?.trim())
    .map(r => `${r.key}: ${r.value ?? ''}`)
    .join('\n')
}

function safeUrlForCopy(rec: NetworkDetailRecord): string {
  // `NetworkDetailRecord.url` is already display-formatted; for copy we prefer the resolved URL if present.
  // However, the store currently only keeps the resolved URL in its record; we accept it as-is.
  return rec.url
}

function bodyBytesToCopyText(
  bytes: Uint8Array | undefined,
  contentType: string | undefined,
  context: { isWebSocket?: boolean } = {},
): string {
  if (!bytes || bytes.length === 0) return ''

  const gate = assessBodyDisplay(bytes)
  if (!gate.renderable) {
    // Match BodyPreviewPanel behavior: if too large to render, keep copy consistent by returning empty.
    return ''
  }

  const kind = resolveBodyPreviewKind(contentType, context)
  switch (kind) {
    case 'json': {
      const out = formatJsonBody(bytes, contentType)
      return out.display
    }
    case 'sse':
      return formatSseBody(bytes, contentType)
    case 'form-urlencoded': {
      const rows = formatUrlEncodedForm(bytes, contentType)
      return rows.map(r => `${r.key}\t${r.value}`).join('\n')
    }
    case 'form-multipart': {
      const rows = formatMultipartForm(bytes, contentType)
      return rows.map(r => `${r.key}\t${r.value}`).join('\n')
    }
    case 'media-image':
    case 'media-video':
    case 'media-font':
      return formatBase64Body(bytes)
    case 'html':
    case 'xml':
    case 'css':
    case 'javascript':
    case 'text':
    default:
      return formatTextBody(bytes, contentType)
  }
}

function buildFocusHostExpr(rec: NetworkDetailRecord): { name: string, matchExpr: string } | null {
  const partialLike = {
    method: rec.method,
    url: rec.url,
    requestHeaders: rec.requestHeaders,
  }
  const facts = requestFactsFromPartialRecord(partialLike as any)
  if (!facts.host) return null
  const host = facts.port ? `${facts.host}:${facts.port}` : facts.host
  return { name: `Focus ${host}`, matchExpr: host }
}

function buildFocusHostPathExpr(rec: NetworkDetailRecord): { name: string, matchExpr: string } | null {
  const partialLike = {
    method: rec.method,
    url: rec.url,
    requestHeaders: rec.requestHeaders,
  }
  const facts = requestFactsFromPartialRecord(partialLike as any)
  if (!facts.host || !facts.path) return null
  const host = facts.port ? `${facts.host}:${facts.port}` : facts.host
  const path = facts.path.startsWith('/') ? facts.path : `/${facts.path}`
  return { name: `Focus ${host}${path}`, matchExpr: `${host}${path}` }
}

function buildHostPathMatchExpr(rec: NetworkDetailRecord): string | null {
  const partialLike = {
    method: rec.method,
    url: rec.url,
    requestHeaders: rec.requestHeaders,
  }
  const facts = requestFactsFromPartialRecord(partialLike as any)
  if (!facts.host || !facts.path) return null
  const host = facts.port ? `${facts.host}:${facts.port}` : facts.host
  const path = facts.path.startsWith('/') ? facts.path : `/${facts.path}`
  return `${host}${path}`
}

function buildIgnoreHostExpr(rec: NetworkDetailRecord): { name: string, matchExpr: string } | null {
  const base = buildFocusHostExpr(rec)
  if (!base) return null
  return { name: base.name.replace(/^Focus /, 'Ignore '), matchExpr: base.matchExpr }
}

function buildIgnoreHostPathExpr(rec: NetworkDetailRecord): { name: string, matchExpr: string } | null {
  const base = buildFocusHostPathExpr(rec)
  if (!base) return null
  return { name: base.name.replace(/^Focus /, 'Ignore '), matchExpr: base.matchExpr }
}

async function addFocusHost() {
  const rec = record.value
  const expr = rec
    ? buildFocusHostExpr(rec)
    : props.matchExpr
      ? (() => {
        const target = extractMatchTarget(props.matchExpr!)
        if (!target) return null
        return { name: `Focus ${target.hostLabel}`, matchExpr: target.hostExpr }
      })()
      : null
  if (!expr) return
  await captureRulesStore.upsertFocus({ name: expr.name, enabled: true, matchExpr: expr.matchExpr })
  setHint('已添加 Focus')
}

async function addFocusHostPath() {
  const rec = record.value
  const expr = rec
    ? buildFocusHostPathExpr(rec)
    : props.matchExpr
      ? (() => {
        const target = extractMatchTarget(props.matchExpr!)
        if (!target) return null
        return { name: `Focus ${target.hostPathLabel}`, matchExpr: target.hostPathExpr }
      })()
      : null
  if (!expr) return
  await captureRulesStore.upsertFocus({ name: expr.name, enabled: true, matchExpr: expr.matchExpr })
  setHint('已添加 Focus')
}

async function addIgnoreHost() {
  const rec = record.value
  const expr = rec
    ? buildIgnoreHostExpr(rec)
    : props.matchExpr
      ? (() => {
        const target = extractMatchTarget(props.matchExpr!)
        if (!target) return null
        return { name: `Ignore ${target.hostLabel}`, matchExpr: target.hostExpr }
      })()
      : null
  if (!expr) return
  await captureRulesStore.upsertIgnore({ name: expr.name, enabled: true, matchExpr: expr.matchExpr })
  setHint('已添加 Ignore')
}

async function addIgnoreHostPath() {
  const rec = record.value
  const expr = rec
    ? buildIgnoreHostPathExpr(rec)
    : props.matchExpr
      ? (() => {
        const target = extractMatchTarget(props.matchExpr!)
        if (!target) return null
        return { name: `Ignore ${target.hostPathLabel}`, matchExpr: target.hostPathExpr }
      })()
      : null
  if (!expr) return
  await captureRulesStore.upsertIgnore({ name: expr.name, enabled: true, matchExpr: expr.matchExpr })
  setHint('已添加 Ignore')
}

function looksLikeJson(contentType: string | undefined, bodyText: string): boolean {
  const ct = (contentType ?? '').toLowerCase()
  if (ct.includes('application/json') || ct.includes('+json')) {
    return true
  }
  const trimmed = bodyText.trim()
  if (!trimmed) return false
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return false
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

async function quickOverrideResponseBody() {
  const rec = record.value
  if (!rec) return

  const matchExpr = buildHostPathMatchExpr(rec)
  if (!matchExpr) return

  const bodyText = bodyBytesToCopyText(
    rec.responseBodyBytes,
    rec.responseContentType,
    { isWebSocket: rec.requestType === 'websocket' },
  )

  const isJson = looksLikeJson(rec.responseContentType, bodyText)
  await rulesStore.openOrCreateQuickOverrideRule({
    matchExpr,
    seedBody: bodyText,
    isJson,
  })
  setHint('已打开规则编辑器')
}

async function replayToCompose() {
  const rec = record.value
  if (!rec) return
  const draft = captureToDraft(rec)
  composeStore.setDraft(draft)
  await rulesStore.openDrawer()
  rulesStore.activePrimaryTab = 'compose'
  setHint('已填充 Compose')
}


const anchorEl = ref<HTMLElement | null>(null)
const anchorStyle = computed<CSSProperties>(() => ({
  position: 'fixed',
  left: `${props.x}px`,
  top: `${props.y}px`,
  width: '1px',
  height: '1px',
}))

const hint = ref<string | null>(null)
let hintTimer: ReturnType<typeof setTimeout> | null = null

function setHint(text: string) {
  hint.value = text
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    hint.value = null
    hintTimer = null
  }, 1600)
}

onBeforeUnmount(() => {
  if (hintTimer) clearTimeout(hintTimer)
})

async function copyText(text: string) {
  if (!text) {
    setHint('复制失败')
    return
  }
  try {
    if (!globalThis.navigator?.clipboard?.writeText) {
      throw new Error('Clipboard API is unavailable')
    }
    await globalThis.navigator.clipboard.writeText(text)
    setHint('已复制')
  }
  catch {
    setHint('复制失败')
  }
}

const copyItems = computed(() => {
  const rec = record.value
  if (!rec) return null

  const partialLike = {
    method: rec.method,
    url: rec.url,
    requestHeaders: rec.requestHeaders,
  }
  const facts = requestFactsFromPartialRecord(partialLike as any)

  const host = facts.port ? `${facts.host}:${facts.port}` : facts.host
  const path = facts.query ? `${facts.path}?${facts.query}` : facts.path
  const url = safeUrlForCopy(rec)

  return {
    host,
    path,
    url,
    requestHeaders: formatHeaderLines(rec.requestHeaders),
    responseHeaders: formatHeaderLines(rec.responseHeaders),
    requestBody: bodyBytesToCopyText(rec.requestBodyBytes, rec.requestContentType, { isWebSocket: rec.requestType === 'websocket' }),
    responseBody: bodyBytesToCopyText(rec.responseBodyBytes, rec.responseContentType, { isWebSocket: rec.requestType === 'websocket' }),
    curl: exportNetworkRecordToCurl(rec),
  }
})

watch(
  () => props.openKey,
  async () => {
    // Programmatically open the ContextMenu at the pointer position.
    await nextTick()
    const el = anchorEl.value
    if (!el) return
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: props.x, clientY: props.y }))
  },
)
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div
        ref="anchorEl"
        aria-hidden="true"
        :style="anchorStyle"
      />
    </ContextMenuTrigger>

    <ContextMenuContent class="w-56">
      <ContextMenuItem
        :disabled="!copyItems?.url"
        @select="copyText(copyItems?.url ?? '')"
      >
        复制 URL
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem
        :disabled="!record"
        @select="replayToCompose"
      >
        重放到 Compose
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuSub>
        <ContextMenuSubTrigger>Focus…</ContextMenuSubTrigger>
        <ContextMenuSubContent class="w-56">
          <ContextMenuItem :disabled="!record && !props.matchExpr" @select="addFocusHost">
            Focus Host
          </ContextMenuItem>
          <ContextMenuItem :disabled="!record && !props.matchExpr" @select="addFocusHostPath">
            Focus Host+Path
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>Ignore…</ContextMenuSubTrigger>
        <ContextMenuSubContent class="w-56">
          <ContextMenuItem :disabled="!record && !props.matchExpr" @select="addIgnoreHost">
            Ignore Host
          </ContextMenuItem>
          <ContextMenuItem :disabled="!record && !props.matchExpr" @select="addIgnoreHostPath">
            Ignore Host+Path
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSeparator />

      <ContextMenuItem
        :disabled="!record"
        @select="quickOverrideResponseBody"
      >
        快速替换响应体（Host+Path）
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuSub>
        <ContextMenuSubTrigger>复制…</ContextMenuSubTrigger>
        <ContextMenuSubContent class="w-64">
          <ContextMenuItem :disabled="!copyItems?.host" @select="copyText(copyItems?.host ?? '')">
            复制 Host
          </ContextMenuItem>
          <ContextMenuItem :disabled="!copyItems?.path" @select="copyText(copyItems?.path ?? '')">
            复制 Path
          </ContextMenuItem>
          <ContextMenuItem :disabled="!copyItems?.url" @select="copyText(copyItems?.url ?? '')">
            复制 URL
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem :disabled="!copyItems?.requestHeaders" @select="copyText(copyItems?.requestHeaders ?? '')">
            复制 Request Headers
          </ContextMenuItem>
          <ContextMenuItem :disabled="!copyItems?.requestBody" @select="copyText(copyItems?.requestBody ?? '')">
            复制 Request Body
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem :disabled="!copyItems?.responseHeaders" @select="copyText(copyItems?.responseHeaders ?? '')">
            复制 Response Headers
          </ContextMenuItem>
          <ContextMenuItem :disabled="!copyItems?.responseBody" @select="copyText(copyItems?.responseBody ?? '')">
            复制 Response Body
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem :disabled="!copyItems?.curl" @select="copyText(copyItems?.curl ?? '')">
            复制 cURL
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  </ContextMenu>

  <div
    v-if="hint"
    :class="cn(
      'pointer-events-none fixed bottom-4 left-4 z-50 rounded-sm border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm',
    )"
  >
    {{ hint }}
  </div>
</template>

