import { isDslWasmLoaded } from '@/components/ui/dsl-editor/dslWasm'
import { validateDslDocument } from '@/components/ui/dsl-editor/formatDsl'

import type { RuleDraft } from './types'
import { getActionValidationErrors } from './types'

export function getMatchDslValidationErrors(matchDsl: string): string[] {
  if (!matchDsl.trim()) {
    return ['匹配表达式不能为空']
  }

  if (!isDslWasmLoaded()) {
    return []
  }

  const { isValid } = validateDslDocument(matchDsl)
  if (!isValid) {
    return ['匹配表达式语法无效']
  }

  return []
}

export function getRuleValidationErrors(draft: RuleDraft): string[] {
  return [
    ...getMatchDslValidationErrors(draft.matchDsl),
    ...draft.actions.flatMap(action => getActionValidationErrors(action)),
  ]
}
