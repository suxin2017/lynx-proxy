export interface CaptureRuleDto {
  id?: number | null
  matchExpr: string
}

export type HandlerRuleTypeDto =
  | { type: 'block'; statusCode?: number; reason?: string }
  | { type: 'modifyRequest'; modifyHeaders?: Record<string, string>; modifyBody?: string; modifyMethod?: string; modifyUrl?: string }
  | { type: 'modifyResponse'; modifyHeaders?: Record<string, string>; modifyBody?: string; modifyMethod?: string; modifyStatusCode?: number }
  | { type: 'localFile'; filePath: string; contentType?: string; statusCode?: number }
  | { type: 'proxyForward'; targetScheme?: string; targetAuthority?: string; targetPath?: string }
  | { type: 'htmlScriptInjector'; content?: string; injectionPosition?: string }
  | { type: 'delay'; delayMs: number; varianceMs?: number; delayType?: 'beforeRequest' | 'afterRequest' | 'both' }
  | { type: 'throttle'; preset?: string; downloadKbps?: number; uploadKbps?: number; latencyMs?: number }

export interface HandlerRuleDto {
  id?: number | null
  handlerType: HandlerRuleTypeDto
  name: string
  description?: string | null
  executionOrder: number
  enabled: boolean
}

export interface RequestRuleDto {
  id?: number | null
  name: string
  description?: string | null
  enabled: boolean
  priority: number
  capture: CaptureRuleDto
  handlers: HandlerRuleDto[]
}

export interface RulesListResponse {
  rules: RequestRuleDto[]
}

export interface RuleTemplatesResponse {
  templates: HandlerRuleDto[]
}

export interface RulesGetPayload {
  ruleId: number
}

export interface RulesEnabledPayload {
  ruleId: number
  enabled: boolean
}

export interface RulesDeletePayload {
  ruleId: number
}

export interface RulesDeleteResponse {
  ruleId: number
}
