import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import {
  BlockActionConfig,
  DelayActionConfig,
  HtmlScriptInjectorActionConfig,
  LocalFileActionConfig,
  ModifyRequestActionConfig,
  ModifyResponseActionConfig,
  ProxyForwardActionConfig,
} from './action-configs'
import type {
  RuleBlockActionConfig,
  RuleDelayActionConfig,
  RuleHtmlScriptInjectorActionConfig,
  RuleLocalFileActionConfig,
  RuleModifyRequestActionConfig,
  RuleModifyResponseActionConfig,
  RuleProxyForwardActionConfig,
} from './types'

const meta = {
  title: 'Workbench/ActionConfigs',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

function renderCard(title: string, componentName: string, keyName = 'value') {
  return `
    <div class="max-w-3xl rounded-lg bg-card p-4 shadow-sm ring-1 ring-border/30">
      <h3 class="text-sm font-semibold text-foreground">${title}</h3>
      <p class="mb-3 text-xs text-muted-foreground">Independent action config component review.</p>
      <${componentName} :config="${keyName}" @update:config="next => ${keyName} = next" />
      <pre class="mt-3 rounded-md bg-muted/35 p-2 text-[11px] leading-5 text-muted-foreground">{{ JSON.stringify(${keyName}, null, 2) }}</pre>
    </div>
  `
}

export const Block: Story = {
  render: () => ({
    components: { BlockActionConfig },
    setup() {
      const value = ref<RuleBlockActionConfig>({ statusCode: 403, reason: 'Blocked by policy' })
      return { value }
    },
    template: renderCard('Block', 'BlockActionConfig'),
  }),
}

export const Delay: Story = {
  render: () => ({
    components: { DelayActionConfig },
    setup() {
      const value = ref<RuleDelayActionConfig>({ delayMs: 1200, varianceMs: 100, delayType: 'beforeRequest' })
      return { value }
    },
    template: renderCard('Delay', 'DelayActionConfig'),
  }),
}

export const ProxyForward: Story = {
  render: () => ({
    components: { ProxyForwardActionConfig },
    setup() {
      const value = ref<RuleProxyForwardActionConfig>({ targetScheme: 'https', targetAuthority: 'api.example.com', targetPath: '/v1' })
      return { value }
    },
    template: renderCard('Proxy Forward', 'ProxyForwardActionConfig'),
  }),
}

export const ModifyRequest: Story = {
  render: () => ({
    components: { ModifyRequestActionConfig },
    setup() {
      const value = ref<RuleModifyRequestActionConfig>({
        modifyHeaders: [{ key: 'x-env', value: 'staging' }],
        modifyMethod: 'POST',
        modifyUrl: 'https://example.com/rewrite',
        modifyBody: '{"patched":true}',
      })
      return { value }
    },
    template: renderCard('Modify Request', 'ModifyRequestActionConfig'),
  }),
}

export const ModifyResponse: Story = {
  render: () => ({
    components: { ModifyResponseActionConfig },
    setup() {
      const value = ref<RuleModifyResponseActionConfig>({
        modifyHeaders: [{ key: 'x-cache', value: 'bypass' }],
        modifyStatusCode: 202,
        modifyBody: '{"ok":true}',
      })
      return { value }
    },
    template: renderCard('Modify Response', 'ModifyResponseActionConfig'),
  }),
}

export const LocalFile: Story = {
  render: () => ({
    components: { LocalFileActionConfig },
    setup() {
      const value = ref<RuleLocalFileActionConfig>({ filePath: '/tmp/mock.json', contentType: 'application/json', statusCode: 200 })
      return { value }
    },
    template: renderCard('Local File', 'LocalFileActionConfig'),
  }),
}

export const HtmlScriptInjector: Story = {
  render: () => ({
    components: { HtmlScriptInjectorActionConfig },
    setup() {
      const value = ref<RuleHtmlScriptInjectorActionConfig>({
        content: '<script>window.__demo=true</script>',
        injectionPosition: 'body-end',
      })
      return { value }
    },
    template: renderCard('HTML Script Injector', 'HtmlScriptInjectorActionConfig'),
  }),
}
