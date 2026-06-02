<script setup lang="ts">
import type {
  RuleActionDraft,
  RuleBlockActionConfig,
  RuleDelayActionConfig,
  RuleHtmlScriptInjectorActionConfig,
  RuleLocalFileActionConfig,
  RuleModifyRequestActionConfig,
  RuleModifyResponseActionConfig,
  RuleProxyForwardActionConfig,
  RuleThrottleActionConfig,
} from './types'
import {
  BlockActionConfig,
  DelayActionConfig,
  HtmlScriptInjectorActionConfig,
  LocalFileActionConfig,
  ModifyRequestActionConfig,
  ModifyResponseActionConfig,
  ProxyForwardActionConfig,
  ThrottleActionConfig,
} from './action-configs'

interface ActionConfigRendererProps {
  action: RuleActionDraft
}

const props = defineProps<ActionConfigRendererProps>()

const emit = defineEmits<{
  'update:action': [action: RuleActionDraft]
}>()

function updateBlockConfig(config: RuleBlockActionConfig) {
  if (props.action.type !== 'block') return
  emit('update:action', { ...props.action, config })
}

function updateDelayConfig(config: RuleDelayActionConfig) {
  if (props.action.type !== 'delay') return
  emit('update:action', { ...props.action, config })
}

function updateProxyForwardConfig(config: RuleProxyForwardActionConfig) {
  if (props.action.type !== 'proxyForward') return
  emit('update:action', { ...props.action, config })
}

function updateModifyRequestConfig(config: RuleModifyRequestActionConfig) {
  if (props.action.type !== 'modifyRequest') return
  emit('update:action', { ...props.action, config })
}

function updateModifyResponseConfig(config: RuleModifyResponseActionConfig) {
  if (props.action.type !== 'modifyResponse') return
  emit('update:action', { ...props.action, config })
}

function updateLocalFileConfig(config: RuleLocalFileActionConfig) {
  if (props.action.type !== 'localFile') return
  emit('update:action', { ...props.action, config })
}

function updateHtmlScriptInjectorConfig(config: RuleHtmlScriptInjectorActionConfig) {
  if (props.action.type !== 'htmlScriptInjector') return
  emit('update:action', {
    ...props.action,
    config,
  })
}

function updateThrottleConfig(config: RuleThrottleActionConfig) {
  if (props.action.type !== 'throttle') return
  emit('update:action', { ...props.action, config })
}
</script>

<template>
  <div>
    <BlockActionConfig
      v-if="props.action.type === 'block'"
      :config="props.action.config"
      @update:config="updateBlockConfig"
    />

    <DelayActionConfig
      v-else-if="props.action.type === 'delay'"
      :config="props.action.config"
      @update:config="updateDelayConfig"
    />

    <ProxyForwardActionConfig
      v-else-if="props.action.type === 'proxyForward'"
      :config="props.action.config"
      @update:config="updateProxyForwardConfig"
    />

    <ModifyRequestActionConfig
      v-else-if="props.action.type === 'modifyRequest'"
      :config="props.action.config"
      @update:config="updateModifyRequestConfig"
    />

    <ModifyResponseActionConfig
      v-else-if="props.action.type === 'modifyResponse'"
      :config="props.action.config"
      @update:config="updateModifyResponseConfig"
    />

    <LocalFileActionConfig
      v-else-if="props.action.type === 'localFile'"
      :config="props.action.config"
      @update:config="updateLocalFileConfig"
    />

    <HtmlScriptInjectorActionConfig
      v-else-if="props.action.type === 'htmlScriptInjector'"
      :config="props.action.config"
      @update:config="updateHtmlScriptInjectorConfig"
    />

    <ThrottleActionConfig
      v-else-if="props.action.type === 'throttle'"
      :config="props.action.config"
      @update:config="updateThrottleConfig"
    />

    <div v-else class="rounded-sm bg-muted/45 px-2 py-1.5 text-[11px] text-muted-foreground ring-1 ring-border/30">
      未知动作类型
    </div>
  </div>
</template>
