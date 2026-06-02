import type { RuleDraft, RuleActionDraft, RuleHeaderPair, RuleWorkbenchRuleItem } from '@/components/ui/rule-workbench'
import { createAction, createRuleDraft } from '@/components/ui/rule-workbench'
import { getRuleValidationErrors } from '@/components/ui/rule-workbench/match-validation'
import type { ActionAssetTemplate } from '@/components/ui/rules-drawer/types'
import type { HandlerRuleDto, HandlerRuleTypeDto, RequestRuleDto } from './rules-types'

function headersFromRecord(record?: Record<string, string>): RuleHeaderPair[] {
  if (!record) return []
  return Object.entries(record).map(([key, value]) => ({ key, value }))
}

function headersToRecord(headers: RuleHeaderPair[]): Record<string, string> | undefined {
  const pairs = headers.filter(h => h.key.trim())
  if (pairs.length === 0) return undefined
  return Object.fromEntries(pairs.map(h => [h.key, h.value]))
}

function handlerTypeToAction(handler: HandlerRuleDto, index: number): RuleActionDraft | null {
  const t = handler.handlerType as HandlerRuleTypeDto
  const base = {
    id: handler.id != null ? `act-${handler.id}` : `act-${index}`,
    name: handler.name,
    description: handler.description ?? '',
    enabled: handler.enabled,
    order: handler.executionOrder,
  }

  switch (t.type) {
    case 'block':
      return createAction({
        ...base,
        type: 'block',
        config: {
          statusCode: t.statusCode ?? 403,
          reason: t.reason ?? '',
        },
      })
    case 'delay':
      return createAction({
        ...base,
        type: 'delay',
        config: {
          delayMs: t.delayMs ?? 1000,
          varianceMs: t.varianceMs,
          delayType: t.delayType ?? 'beforeRequest',
        },
      })
    case 'proxyForward':
      return createAction({
        ...base,
        type: 'proxyForward',
        config: {
          targetScheme: t.targetScheme ?? 'https',
          targetAuthority: t.targetAuthority ?? '',
          targetPath: t.targetPath ?? '',
        },
      })
    case 'modifyRequest':
      return createAction({
        ...base,
        type: 'modifyRequest',
        config: {
          modifyHeaders: headersFromRecord(t.modifyHeaders),
          modifyMethod: t.modifyMethod ?? '',
          modifyUrl: t.modifyUrl ?? '',
          modifyBody: t.modifyBody ?? '',
        },
      })
    case 'modifyResponse':
      return createAction({
        ...base,
        type: 'modifyResponse',
        config: {
          modifyHeaders: headersFromRecord(t.modifyHeaders),
          modifyStatusCode: t.modifyStatusCode,
          modifyBody: t.modifyBody ?? '',
        },
      })
    case 'localFile':
      return createAction({
        ...base,
        type: 'localFile',
        config: {
          filePath: t.filePath ?? '',
          contentType: t.contentType ?? '',
          statusCode: t.statusCode,
        },
      })
    case 'htmlScriptInjector': {
      const pos = t.injectionPosition ?? 'body-end'
      const injectionPosition = (pos === 'head' || pos === 'body-start' || pos === 'body-end')
        ? pos
        : 'body-end'
      return createAction({
        ...base,
        type: 'htmlScriptInjector',
        config: {
          content: t.content ?? '',
          injectionPosition,
        },
      })
    }
    default:
      return null
  }
}

function actionToHandlerType(action: RuleActionDraft): HandlerRuleTypeDto {
  switch (action.type) {
    case 'block':
      return {
        type: 'block',
        statusCode: action.config.statusCode,
        reason: action.config.reason || undefined,
      }
    case 'delay':
      return {
        type: 'delay',
        delayMs: action.config.delayMs,
        varianceMs: action.config.varianceMs,
        delayType: action.config.delayType,
      }
    case 'proxyForward':
      return {
        type: 'proxyForward',
        targetScheme: action.config.targetScheme,
        targetAuthority: action.config.targetAuthority,
        targetPath: action.config.targetPath,
      }
    case 'modifyRequest':
      return {
        type: 'modifyRequest',
        modifyHeaders: headersToRecord(action.config.modifyHeaders),
        modifyMethod: action.config.modifyMethod || undefined,
        modifyUrl: action.config.modifyUrl || undefined,
        modifyBody: action.config.modifyBody || undefined,
      }
    case 'modifyResponse':
      return {
        type: 'modifyResponse',
        modifyHeaders: headersToRecord(action.config.modifyHeaders),
        modifyStatusCode: action.config.modifyStatusCode,
        modifyBody: action.config.modifyBody || undefined,
      }
    case 'localFile':
      return {
        type: 'localFile',
        filePath: action.config.filePath,
        contentType: action.config.contentType || undefined,
        statusCode: action.config.statusCode,
      }
    case 'htmlScriptInjector':
      return {
        type: 'htmlScriptInjector',
        content: action.config.content,
        injectionPosition: action.config.injectionPosition,
      }
  }
}

export function ruleIdToString(id?: number | null): string {
  if (id == null) return ''
  return String(id)
}

export function parseRuleId(id: string): number | null {
  if (!id || id.startsWith('draft-')) return null
  const n = Number.parseInt(id, 10)
  return Number.isFinite(n) ? n : null
}

export function requestRuleToDraft(rule: RequestRuleDto): RuleDraft {
  const actions = rule.handlers
    .map((h, i) => handlerTypeToAction(h, i))
    .filter((a): a is RuleActionDraft => a != null)
    .sort((a, b) => a.order - b.order)

  return createRuleDraft({
    id: ruleIdToString(rule.id),
    name: rule.name,
    description: rule.description ?? '',
    enabled: rule.enabled,
    priority: rule.priority,
    matchDsl: rule.capture.matchExpr,
    actions: actions.length > 0 ? actions : undefined,
  })
}

export function draftToRequestRule(draft: RuleDraft): RequestRuleDto {
  const numericId = parseRuleId(draft.id)
  const handlers: HandlerRuleDto[] = [...draft.actions]
    .sort((a, b) => a.order - b.order)
    .map((action, index) => {
      const parsedId = action.id.match(/^act-(\d+)$/)
      return {
        id: parsedId ? Number.parseInt(parsedId[1]!, 10) : null,
        handlerType: actionToHandlerType(action),
        name: action.name,
        description: action.description || null,
        executionOrder: action.order || (index + 1) * 10,
        enabled: action.enabled,
      }
    })

  return {
    id: numericId,
    name: draft.name,
    description: draft.description || null,
    enabled: draft.enabled,
    priority: draft.priority,
    capture: {
      id: numericId,
      matchExpr: draft.matchDsl,
    },
    handlers,
  }
}

export function requestRuleToListItem(rule: RequestRuleDto): RuleWorkbenchRuleItem {
  const draft = requestRuleToDraft(rule)
  const errors = getRuleValidationErrors(draft)
  const summary = rule.capture.matchExpr.length > 80
    ? `${rule.capture.matchExpr.slice(0, 77)}...`
    : rule.capture.matchExpr

  return {
    id: ruleIdToString(rule.id),
    name: rule.name,
    enabled: rule.enabled,
    priority: rule.priority,
    summary,
    state: errors.length > 0 ? 'invalid' : 'valid',
  }
}

export function templateToAsset(template: HandlerRuleDto, index: number): ActionAssetTemplate | null {
  const action = handlerTypeToAction(template, index)
  if (!action) return null
  return {
    id: `tpl-${template.id ?? index}`,
    name: template.name,
    description: template.description ?? '',
    category: '模板',
    type: action.type,
    seedConfig: action.config,
  }
}

/** Plain JSON clone — works on Vue reactive proxies (structuredClone cannot). */
export function cloneDraft(draft: RuleDraft): RuleDraft {
  return JSON.parse(JSON.stringify(draft)) as RuleDraft
}
