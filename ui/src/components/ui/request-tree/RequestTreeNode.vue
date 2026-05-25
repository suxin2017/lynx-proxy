<script setup lang="ts">
import type { FlatTreeNode } from './types'
import { cn } from '@/lib/utils'

const props = defineProps<{
  node: FlatTreeNode
  selected: boolean
  highlightTerm?: string
}>()

const emit = defineEmits<{
  toggle: [id: string]
  select: [node: FlatTreeNode]
}>()

// ---------------------------------------------------------------------------
// Indent: 12px per depth level
// ---------------------------------------------------------------------------
const INDENT_PX = 12

// ---------------------------------------------------------------------------
// Operation badge colors
// ---------------------------------------------------------------------------
const METHOD_COLORS: Record<string, string> = {
  GET: 'text-blue-500',
  POST: 'text-green-500',
  PUT: 'text-orange-500',
  PATCH: 'text-purple-500',
  DELETE: 'text-red-500',
  HEAD: 'text-cyan-500',
  OPTIONS: 'text-yellow-500',
  CONNECT: 'text-teal-500',
}

function methodColor(method: string): string {
  return METHOD_COLORS[method.toUpperCase()] ?? 'text-muted-foreground'
}

function requestTypeLabel(node: FlatTreeNode): string | undefined {
  return node.request?.requestType?.trim() || undefined
}

interface HighlightPart {
  text: string
  match: boolean
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitHighlightParts(text: string, term?: string): HighlightPart[] {
  if (!text) return [{ text: '', match: false }]
  const normalized = term?.trim()
  if (!normalized) return [{ text, match: false }]

  const matcher = new RegExp(`(${escapeRegExp(normalized)})`, 'ig')
  const tokens = text.split(matcher).filter(Boolean)

  if (tokens.length === 0) {
    return [{ text, match: false }]
  }

  return tokens.map(token => ({
    text: token,
    match: token.toLowerCase() === normalized.toLowerCase(),
  }))
}

// ---------------------------------------------------------------------------
// Status dot
// ---------------------------------------------------------------------------
function statusClass(status: string): string {
  switch (status) {
    case 'success': return 'bg-green-500'
    case 'error': return 'bg-red-500'
    case 'cancelled': return 'bg-neutral-400'
    default: return 'bg-yellow-400 animate-pulse' // pending
  }
}

function handleClick() {
  if (props.node.type === 'group') {
    emit('toggle', props.node.id)
  }
  else {
    emit('select', props.node)
  }
}
</script>

<template>
  <!-- Fixed 32px row height is critical for TanStack Virtual size estimation -->
  <div
    class="flex h-6 cursor-pointer items-center gap-2 rounded-sm border border-transparent px-2 text-xs transition-colors select-none"
    :class="cn(
      'hover:bg-muted/50 hover:border-border/40',
      selected && 'bg-muted text-foreground border-border/60',
    )"
    :style="{ paddingLeft: `${props.node.depth * INDENT_PX + 4}px` }"
    :title="node.fullLabel"
    @click="handleClick"
  >
    <!-- Group node -->
    <template v-if="node.type === 'group'">
      <!-- Chevron -->
      <span class="flex w-4 shrink-0 items-center justify-center text-muted-foreground">
        <svg
          class="transition-transform duration-100"
          :class="node.expanded ? 'rotate-90' : 'rotate-0'"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
        >
          <path d="M3 2l4 3-4 3V2z" />
        </svg>
      </span>

      <!-- Label: split on "/" to dim separators -->
      <span class="min-w-0 flex-1 truncate font-mono">
        <template v-for="(part, i) in node.label.split('/')" :key="i">
          <span v-if="i > 0" class="text-muted-foreground/50">/</span>
          <span :class="i === node.label.split('/').length - 1 ? 'text-foreground' : 'text-muted-foreground'">
            <template
              v-for="(token, idx) in splitHighlightParts(part, props.highlightTerm)"
              :key="`${i}-${idx}-${token.text}`"
            >
              <mark v-if="token.match" class="rounded-sm bg-yellow-200 px-0.5 text-foreground">
                {{ token.text }}
              </mark>
              <template v-else>{{ token.text }}</template>
            </template>
          </span>
        </template>
      </span>

      <!-- Child count badge -->
      <span
        v-if="node.childCount !== undefined"
        class="ml-auto shrink-0 rounded-sm bg-muted px-1 text-xs text-muted-foreground"
      >
        {{ node.childCount }}
      </span>
    </template>

    <!-- Leaf node -->
    <template v-else-if="node.type === 'leaf' && node.request">
      <!-- Status dot / spinner -->
      <span class="flex w-4 shrink-0 items-center justify-center">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="statusClass(node.request.status)"
        />
      </span>

      <!-- Operation / verb -->
      <span
        class="w-12 shrink-0 font-mono text-xs uppercase tracking-wide"
        :class="methodColor(node.request.method)"
      >
        <template
          v-for="(token, idx) in splitHighlightParts(node.request.method, props.highlightTerm)"
          :key="`m-${idx}-${token.text}`"
        >
          <mark v-if="token.match" class="rounded-sm bg-yellow-200 px-0.5 text-current">
            {{ token.text }}
          </mark>
          <template v-else>{{ token.text }}</template>
        </template>
      </span>

      <!-- URL tail / record identity -->
      <span class="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
        <template
          v-for="(token, idx) in splitHighlightParts(node.label, props.highlightTerm)"
          :key="`l-${idx}-${token.text}`"
        >
          <mark v-if="token.match" class="rounded-sm bg-yellow-200 px-0.5 text-foreground">
            {{ token.text }}
          </mark>
          <template v-else>{{ token.text }}</template>
        </template>
      </span>

      <!-- Secondary meta: request type + status code -->
      <span class="shrink-0 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
        <template v-if="requestTypeLabel(node)">
          <template
            v-for="(token, idx) in splitHighlightParts(requestTypeLabel(node)!, props.highlightTerm)"
            :key="`t-${idx}-${token.text}`"
          >
            <mark v-if="token.match" class="rounded-sm bg-yellow-200 px-0.5 text-foreground">
              {{ token.text }}
            </mark>
            <template v-else>{{ token.text }}</template>
          </template>
          <span v-if="node.request.statusCode"> · </span>
        </template>
        <span v-if="node.request.statusCode">{{ node.request.statusCode }}</span>
      </span>
    </template>
  </div>
</template>
