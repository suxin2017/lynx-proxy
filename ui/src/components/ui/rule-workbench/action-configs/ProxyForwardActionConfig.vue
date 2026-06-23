<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown } from '@lucide/vue'
import type { RuleProxyForwardActionConfig } from '../types'
import {
  PROXY_FORWARD_SCHEME_OPTIONS,
  proxyForwardChoiceToScheme,
  proxyForwardSchemeToChoice,
  type RuleProxyForwardSchemeChoice,
} from '../proxy-forward-scheme'
import { fetchBaseAddresses } from '@/lib/http/settings-api'

interface ProxyForwardActionConfigProps {
  config: RuleProxyForwardActionConfig
}

const props = defineProps<ProxyForwardActionConfigProps>()
const emit = defineEmits<{
  'update:config': [config: RuleProxyForwardActionConfig]
}>()

const schemeChoice = computed(() => proxyForwardSchemeToChoice(props.config.targetScheme))
const localIps = ref<string[]>([])
const ipMenuOpen = ref(false)
const ipLoading = ref(false)
const ipLoadError = ref<string | null>(null)
const ipLoadedOnce = ref(false)
const ipDropdownRef = ref<HTMLElement | null>(null)

function update(partial: Partial<RuleProxyForwardActionConfig>) {
  emit('update:config', {
    ...props.config,
    ...partial,
  })
}

function updateSchemeChoice(choice: RuleProxyForwardSchemeChoice) {
  update({ targetScheme: proxyForwardChoiceToScheme(choice) })
}

function normalizeHost(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }
  const host = trimmed.includes('://') ? trimmed.split('://')[1] : trimmed
  return host.split(':')[0]?.trim() ?? ''
}

function normalizeHosts(values: string[]): string[] {
  const unique = new Set<string>()
  values.forEach((value) => {
    const host = normalizeHost(value)
    if (host) {
      unique.add(host)
    }
  })
  return [...unique].sort((a, b) => a.localeCompare(b, 'en'))
}

function splitAuthority(value: string): { host: string, port: string } {
  const trimmed = value.trim()
  if (!trimmed) {
    return { host: '', port: '' }
  }
  const firstColonIndex = trimmed.indexOf(':')
  if (firstColonIndex < 0) {
    return { host: trimmed, port: '' }
  }
  const host = trimmed.slice(0, firstColonIndex).trim()
  const rest = trimmed.slice(firstColonIndex + 1).trim()
  const port = rest ? `:${rest}` : ''
  return { host, port }
}

function replaceAuthorityHost(nextHost: string) {
  const { port } = splitAuthority(props.config.targetAuthority)
  update({ targetAuthority: `${nextHost}${port}` })
  ipMenuOpen.value = false
}

async function ensureLocalIpsLoaded(force = false) {
  if (ipLoading.value) {
    return
  }
  if (!force && ipLoadedOnce.value) {
    return
  }
  ipLoading.value = true
  ipLoadError.value = null
  try {
    const addresses = await fetchBaseAddresses()
    localIps.value = normalizeHosts(addresses)
    ipLoadedOnce.value = true
  } catch (err) {
    ipLoadError.value = err instanceof Error ? err.message : String(err)
  } finally {
    ipLoading.value = false
  }
}

function toggleIpMenu() {
  ipMenuOpen.value = !ipMenuOpen.value
  if (ipMenuOpen.value) {
    void ensureLocalIpsLoaded()
  }
}

function retryLoadIps() {
  void ensureLocalIpsLoaded(true)
}

function closeIpMenu() {
  ipMenuOpen.value = false
}

function onDocumentPointerDown(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Node)) {
    return
  }
  if (!ipDropdownRef.value?.contains(target)) {
    closeIpMenu()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentPointerDown)
})
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2">
    <label class="grid gap-1 text-[11px] text-muted-foreground">
      Scheme
      <select
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
        :value="schemeChoice"
        @change="updateSchemeChoice(($event.target as HTMLSelectElement).value as RuleProxyForwardSchemeChoice)"
      >
        <option
          v-for="option in PROXY_FORWARD_SCHEME_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground">
      主机与端口
      <div ref="ipDropdownRef" class="relative flex items-center gap-1">
        <input
          class="h-7 min-w-0 flex-1 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
          :value="props.config.targetAuthority"
          placeholder="example.com:443"
          @input="update({ targetAuthority: ($event.target as HTMLInputElement).value })"
        >
        <button
          type="button"
          class="inline-flex h-7 shrink-0 items-center gap-1 rounded-sm border border-input bg-background px-2 text-[11px] text-foreground outline-none ring-ring transition-colors hover:bg-muted/40 focus:ring-1"
          :class="ipMenuOpen ? 'bg-muted/50 ring-1' : ''"
          :aria-expanded="ipMenuOpen"
          aria-haspopup="listbox"
          @click="toggleIpMenu"
        >
          替换 IP
          <ChevronDown
            class="h-3 w-3 transition-transform duration-150"
            :class="ipMenuOpen ? 'rotate-180' : ''"
          />
        </button>

        <Transition
          enter-active-class="transition duration-120 ease-out"
          enter-from-class="translate-y-1 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="translate-y-1 opacity-0"
        >
          <div
            v-if="ipMenuOpen"
            class="absolute right-0 top-8 z-10 w-52 overflow-hidden rounded-md border border-border bg-popover p-1 text-xs text-popover-foreground shadow-md"
            role="listbox"
            tabindex="-1"
          >
            <div class="px-2 py-1 text-[10px] text-muted-foreground">
              选择本机 IP
            </div>
            <div class="mb-1 h-px bg-border/70" />
            <div v-if="ipLoading" class="px-2 py-1.5 text-muted-foreground">
              加载中...
            </div>

            <div v-else-if="ipLoadError" class="space-y-1 px-1 py-1">
              <div class="px-1 text-[11px] text-destructive">
                加载失败
              </div>
              <button
                type="button"
                class="w-full rounded-sm px-2 py-1 text-left text-[11px] hover:bg-muted/50"
                @click="retryLoadIps"
              >
                重试
              </button>
            </div>

            <div v-else-if="localIps.length === 0" class="px-2 py-1.5 text-muted-foreground">
              未发现可用 IP
            </div>

            <div v-else class="max-h-48 overflow-auto">
              <button
                v-for="ip in localIps"
                :key="ip"
                type="button"
                class="w-full rounded-sm px-2 py-1 text-left transition-colors hover:bg-muted/50"
                @click="replaceAuthorityHost(ip)"
              >
                {{ ip }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground sm:col-span-2">
      路径
      <input
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
        :value="props.config.targetPath"
        placeholder="/api"
        @input="update({ targetPath: ($event.target as HTMLInputElement).value })"
      >
    </label>
  </div>
</template>
