import { proxyForwardSchemeSummaryLabel } from './proxy-forward-scheme'

export type RuleHandlerType =
  | 'block'
  | 'modifyRequest'
  | 'modifyResponse'
  | 'localFile'
  | 'proxyForward'
  | 'delay'
  | 'throttle'
  | 'htmlScriptInjector'

interface RuleActionBase {
  id: string
  type: RuleHandlerType
  enabled: boolean
  order: number
}

export interface RuleBlockActionConfig {
  statusCode: number
  reason: string
}

export interface RuleDelayActionConfig {
  delayMs: number
  varianceMs?: number
  delayType: 'beforeRequest' | 'afterRequest' | 'both'
}

export interface RuleProxyForwardActionConfig {
  /** Empty = inherit; `http` / `https` (WS uses ws/wss via proxy). */
  targetScheme: string
  targetAuthority: string
  targetPath: string
}

export interface RuleHeaderPair {
  key: string
  value: string
}

export interface RuleModifyRequestActionConfig {
  modifyHeaders: RuleHeaderPair[]
  modifyMethod: string
  modifyUrl: string
  modifyBody: string
}

export interface RuleModifyResponseActionConfig {
  modifyHeaders: RuleHeaderPair[]
  modifyStatusCode?: number
  modifyBody: string
}

export interface RuleLocalFileActionConfig {
  filePath: string
  contentType: string
  statusCode?: number
}

export interface RuleHtmlScriptInjectorActionConfig {
  content: string
  injectionPosition: 'head' | 'body-start' | 'body-end'
}

export type RuleThrottlePreset = 'Fast3G' | 'Slow3G' | 'Offline' | 'Custom'

export interface RuleThrottleActionConfig {
  preset: RuleThrottlePreset
  downloadKbps?: number
  uploadKbps?: number
  latencyMs?: number
}

export interface RuleBlockActionDraft extends RuleActionBase {
  type: 'block'
  config: RuleBlockActionConfig
}

export interface RuleDelayActionDraft extends RuleActionBase {
  type: 'delay'
  config: RuleDelayActionConfig
}

export interface RuleProxyForwardActionDraft extends RuleActionBase {
  type: 'proxyForward'
  config: RuleProxyForwardActionConfig
}

export interface RuleModifyRequestActionDraft extends RuleActionBase {
  type: 'modifyRequest'
  config: RuleModifyRequestActionConfig
}

export interface RuleModifyResponseActionDraft extends RuleActionBase {
  type: 'modifyResponse'
  config: RuleModifyResponseActionConfig
}

export interface RuleLocalFileActionDraft extends RuleActionBase {
  type: 'localFile'
  config: RuleLocalFileActionConfig
}

export interface RuleHtmlScriptInjectorActionDraft extends RuleActionBase {
  type: 'htmlScriptInjector'
  config: RuleHtmlScriptInjectorActionConfig
}

export interface RuleThrottleActionDraft extends RuleActionBase {
  type: 'throttle'
  config: RuleThrottleActionConfig
}

export type RuleActionDraft =
  | RuleBlockActionDraft
  | RuleDelayActionDraft
  | RuleProxyForwardActionDraft
  | RuleModifyRequestActionDraft
  | RuleModifyResponseActionDraft
  | RuleLocalFileActionDraft
  | RuleThrottleActionDraft
  | RuleHtmlScriptInjectorActionDraft

export interface RuleDraft {
  id: string
  project?: string
  name: string
  description: string
  enabled: boolean
  priority: number
  matchDsl: string
  actions: RuleActionDraft[]
}

function createBlockConfig(seed?: Partial<RuleBlockActionConfig>): RuleBlockActionConfig {
  return {
    statusCode: seed?.statusCode ?? 403,
    reason: seed?.reason ?? '',
  }
}

function createDelayConfig(seed?: Partial<RuleDelayActionConfig>): RuleDelayActionConfig {
  return {
    delayMs: seed?.delayMs ?? 1000,
    varianceMs: seed?.varianceMs,
    delayType: seed?.delayType ?? 'beforeRequest',
  }
}

function createProxyForwardConfig(seed?: Partial<RuleProxyForwardActionConfig>): RuleProxyForwardActionConfig {
  return {
    targetScheme: seed?.targetScheme ?? '',
    targetAuthority: seed?.targetAuthority ?? '',
    targetPath: seed?.targetPath ?? '',
  }
}

function createModifyRequestConfig(seed?: Partial<RuleModifyRequestActionConfig>): RuleModifyRequestActionConfig {
  return {
    modifyHeaders: seed?.modifyHeaders ?? [],
    modifyMethod: seed?.modifyMethod ?? '',
    modifyUrl: seed?.modifyUrl ?? '',
    modifyBody: seed?.modifyBody ?? '',
  }
}

function createModifyResponseConfig(seed?: Partial<RuleModifyResponseActionConfig>): RuleModifyResponseActionConfig {
  return {
    modifyHeaders: seed?.modifyHeaders ?? [],
    modifyStatusCode: seed?.modifyStatusCode,
    modifyBody: seed?.modifyBody ?? '',
  }
}

function createLocalFileConfig(seed?: Partial<RuleLocalFileActionConfig>): RuleLocalFileActionConfig {
  return {
    filePath: seed?.filePath ?? '',
    contentType: seed?.contentType ?? '',
    statusCode: seed?.statusCode,
  }
}

function createHtmlScriptInjectorConfig(seed?: Partial<RuleHtmlScriptInjectorActionConfig>): RuleHtmlScriptInjectorActionConfig {
  return {
    content: seed?.content ?? '',
    injectionPosition: seed?.injectionPosition ?? 'body-end',
  }
}

function createThrottleConfig(seed?: Partial<RuleThrottleActionConfig>): RuleThrottleActionConfig {
  return {
    preset: seed?.preset ?? 'Slow3G',
    downloadKbps: seed?.downloadKbps,
    uploadKbps: seed?.uploadKbps,
    latencyMs: seed?.latencyMs,
  }
}

export function createAction(seed?: Partial<RuleActionDraft>): RuleActionDraft {
  const id = seed?.id ?? `act-${Math.random().toString(36).slice(2, 9)}`
  const type = seed?.type ?? 'modifyRequest'

  if (type === 'block') {
    return {
      id,
      type,
      enabled: seed?.enabled ?? true,
      order: seed?.order ?? 1,
      config: createBlockConfig(
        (seed as Partial<RuleBlockActionDraft> | undefined)?.config,
      ),
    }
  }

  if (type === 'delay') {
    return {
      id,
      type,
      enabled: seed?.enabled ?? true,
      order: seed?.order ?? 1,
      config: createDelayConfig(
        (seed as Partial<RuleDelayActionDraft> | undefined)?.config,
      ),
    }
  }

  if (type === 'proxyForward') {
    return {
      id,
      type,
      enabled: seed?.enabled ?? true,
      order: seed?.order ?? 1,
      config: createProxyForwardConfig(
        (seed as Partial<RuleProxyForwardActionDraft> | undefined)?.config,
      ),
    }
  }

  if (type === 'modifyRequest') {
    return {
      id,
      type,
      enabled: seed?.enabled ?? true,
      order: seed?.order ?? 1,
      config: createModifyRequestConfig(
        (seed as Partial<RuleModifyRequestActionDraft> | undefined)?.config,
      ),
    }
  }

  if (type === 'modifyResponse') {
    return {
      id,
      type,
      enabled: seed?.enabled ?? true,
      order: seed?.order ?? 1,
      config: createModifyResponseConfig(
        (seed as Partial<RuleModifyResponseActionDraft> | undefined)?.config,
      ),
    }
  }

  if (type === 'localFile') {
    return {
      id,
      type,
      enabled: seed?.enabled ?? true,
      order: seed?.order ?? 1,
      config: createLocalFileConfig(
        (seed as Partial<RuleLocalFileActionDraft> | undefined)?.config,
      ),
    }
  }

  if (type === 'htmlScriptInjector') {
    return {
      id,
      type,
      enabled: seed?.enabled ?? true,
      order: seed?.order ?? 1,
      config: createHtmlScriptInjectorConfig(
        (seed as Partial<RuleHtmlScriptInjectorActionDraft> | undefined)?.config,
      ),
    }
  }

  if (type === 'throttle') {
    return {
      id,
      type,
      enabled: seed?.enabled ?? true,
      order: seed?.order ?? 1,
      config: createThrottleConfig(
        (seed as Partial<RuleThrottleActionDraft> | undefined)?.config,
      ),
    }
  }

  return {
    id,
    type: 'modifyRequest',
    enabled: seed?.enabled ?? true,
    order: seed?.order ?? 1,
    config: createModifyRequestConfig(),
  }
}

export function changeActionType(action: RuleActionDraft, type: RuleHandlerType): RuleActionDraft {
  return createAction({
    id: action.id,
    enabled: action.enabled,
    order: action.order,
    type,
  })
}

export function getActionSummary(action: RuleActionDraft): string {
  if (action.type === 'block') {
    return `返回 ${action.config.statusCode}${action.config.reason ? ` - ${action.config.reason}` : ''}`
  }

  if (action.type === 'delay') {
    const variance = typeof action.config.varianceMs === 'number' ? ` ±${action.config.varianceMs}ms` : ''
    return `${action.config.delayType} ${action.config.delayMs}ms${variance}`
  }

  if (action.type === 'proxyForward') {
    const scheme = proxyForwardSchemeSummaryLabel(action.config.targetScheme)
    const authority = action.config.targetAuthority.trim() || '<authority>'
    const path = action.config.targetPath.trim() || ''
    return `${scheme}://${authority}${path}`
  }

  if (action.type === 'modifyRequest') {
    const changes = [
      action.config.modifyMethod ? '方法' : '',
      action.config.modifyUrl ? 'URL' : '',
      action.config.modifyBody ? 'Body' : '',
      action.config.modifyHeaders.length > 0 ? `Headers:${action.config.modifyHeaders.length}` : '',
    ].filter(Boolean)
    return changes.length > 0 ? `修改请求 ${changes.join(', ')}` : '修改请求（未设置字段）'
  }

  if (action.type === 'modifyResponse') {
    const changes = [
      action.config.modifyStatusCode ? `状态码:${action.config.modifyStatusCode}` : '',
      action.config.modifyBody ? 'Body' : '',
      action.config.modifyHeaders.length > 0 ? `Headers:${action.config.modifyHeaders.length}` : '',
    ].filter(Boolean)
    return changes.length > 0 ? `修改响应 ${changes.join(', ')}` : '修改响应（未设置字段）'
  }

  if (action.type === 'localFile') {
    return action.config.filePath ? `提供本地文件 ${action.config.filePath}` : '本地文件路径必填'
  }

  if (action.type === 'htmlScriptInjector') {
    return action.config.content
      ? `在 ${action.config.injectionPosition} 注入脚本`
      : '脚本内容必填'
  }

  if (action.type === 'throttle') {
    const preset = action.config.preset
    if (preset === 'Offline') return '离线（503）'
    if (preset === 'Fast3G') return 'Fast3G 1600↓/750↑ 150ms'
    if (preset === 'Slow3G') return 'Slow3G 500↓/400↑ 400ms'
    const download = action.config.downloadKbps ?? 0
    const upload = action.config.uploadKbps ?? 0
    const latency = action.config.latencyMs ?? 0
    if (download === 0 && upload === 0 && latency === 0) return '自定义（未限速/无延迟）'
    return `自定义 ${download}↓/${upload}↑ ${latency}ms`
  }

  return '暂无摘要'
}

export function getActionValidationErrors(action: RuleActionDraft): string[] {
  if (action.type === 'block') {
    if (!Number.isFinite(action.config.statusCode) || action.config.statusCode < 100 || action.config.statusCode > 599) {
      return ['状态码必须在 100-599 之间']
    }
    return []
  }

  if (action.type === 'delay') {
    const errors: string[] = []
    if (!Number.isFinite(action.config.delayMs) || action.config.delayMs < 0) {
      errors.push('延迟毫秒必须 >= 0')
    }
    if (typeof action.config.varianceMs === 'number' && action.config.varianceMs < 0) {
      errors.push('波动毫秒必须 >= 0')
    }
    return errors
  }

  if (action.type === 'proxyForward') {
    return action.config.targetAuthority.trim() ? [] : ['目标 Authority 必填']
  }

  if (action.type === 'modifyRequest') {
    const errors: string[] = []
    if (action.config.modifyUrl && !/^https?:\/\//i.test(action.config.modifyUrl)) {
      errors.push('修改 URL 必须以 http:// 或 https:// 开头')
    }
    action.config.modifyHeaders.forEach((header, idx) => {
      if (!header.key.trim()) errors.push(`请求 Header #${idx + 1} 的 key 必填`)
    })
    return errors
  }

  if (action.type === 'modifyResponse') {
    const errors: string[] = []
    if (typeof action.config.modifyStatusCode === 'number' && (action.config.modifyStatusCode < 100 || action.config.modifyStatusCode > 599)) {
      errors.push('响应状态码必须在 100-599 之间')
    }
    action.config.modifyHeaders.forEach((header, idx) => {
      if (!header.key.trim()) errors.push(`响应 Header #${idx + 1} 的 key 必填`)
    })
    return errors
  }

  if (action.type === 'localFile') {
    return action.config.filePath.trim() ? [] : ['文件路径必填']
  }

  if (action.type === 'htmlScriptInjector') {
    return action.config.content.trim() ? [] : ['脚本内容必填']
  }

  if (action.type === 'throttle') {
    const errors: string[] = []
    if (action.config.preset === 'Custom') {
      const fields: Array<{ key: keyof RuleThrottleActionConfig, label: string }> = [
        { key: 'downloadKbps', label: '下载 Kbps' },
        { key: 'uploadKbps', label: '上传 Kbps' },
        { key: 'latencyMs', label: '延迟 ms' },
      ]
      for (const field of fields) {
        const value = action.config[field.key] as number | undefined
        if (value === undefined) continue
        if (!Number.isFinite(value) || value < 0) {
          errors.push(`${field.label} 必须是 >= 0 的数字`)
        }
      }
    }
    return errors
  }

  return []
}

export function createRuleDraft(seed?: Partial<RuleDraft>): RuleDraft {
  const id = seed?.id ?? `rule-${Math.random().toString(36).slice(2, 9)}`
  return {
    id,
    project: seed?.project,
    name: seed?.name ?? '未命名规则',
    description: seed?.description ?? '',
    enabled: seed?.enabled ?? true,
    priority: seed?.priority ?? 10000,
    matchDsl: seed?.matchDsl ?? 'example.com',
    actions: seed?.actions?.length
      ? seed.actions
      : [createAction({ order: 1, type: 'modifyRequest' })],
  }
}
