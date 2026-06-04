/** UI select value for proxy-forward target scheme. */
export type RuleProxyForwardSchemeChoice = 'inherit' | 'http' | 'https'

export const PROXY_FORWARD_SCHEME_OPTIONS: ReadonlyArray<{
  value: RuleProxyForwardSchemeChoice
  label: string
}> = [
  { value: 'inherit', label: '继承 Scheme' },
  { value: 'http', label: 'http / ws' },
  { value: 'https', label: 'https / wss' },
]

/** Map stored scheme (http/https/ws/wss/empty) to dropdown value. */
export function proxyForwardSchemeToChoice(scheme: string): RuleProxyForwardSchemeChoice {
  const normalized = scheme.trim().toLowerCase()
  if (!normalized) return 'inherit'
  if (normalized === 'https' || normalized === 'wss') return 'https'
  if (normalized === 'http' || normalized === 'ws') return 'http'
  return 'inherit'
}

/** Map dropdown value to persisted scheme (empty = inherit). */
export function proxyForwardChoiceToScheme(choice: RuleProxyForwardSchemeChoice): string {
  if (choice === 'inherit') return ''
  return choice
}

/** Short label for rule summaries. */
export function proxyForwardSchemeSummaryLabel(scheme: string): string {
  const choice = proxyForwardSchemeToChoice(scheme)
  if (choice === 'inherit') return '*'
  if (choice === 'https') return 'https/wss'
  return 'http/ws'
}

/** Normalize API/legacy scheme values for the workbench config. */
export function proxyForwardSchemeFromDto(value?: string): string {
  return proxyForwardChoiceToScheme(proxyForwardSchemeToChoice(value ?? ''))
}
