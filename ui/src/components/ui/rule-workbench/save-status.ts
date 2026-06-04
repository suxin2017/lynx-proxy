export interface RuleSaveStatusInput {
  loading?: boolean
  saving?: boolean
  dirty?: boolean
  valid?: boolean
  invalid?: boolean
  hasSelection?: boolean
}

export function getRuleSaveStatusLabel(input: RuleSaveStatusInput): string {
  if (input.loading) return '正在加载'
  if (input.invalid) return '无效'
  if (!input.dirty) return '已保存'
  if (input.valid) return '可保存'
  return '有变更'
}

export function isRuleSaveDisabled(input: RuleSaveStatusInput): boolean {
  return !!(input.loading || input.saving || input.invalid || !input.hasSelection)
}
