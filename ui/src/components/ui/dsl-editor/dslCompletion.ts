import type { Completion, CompletionContext } from '@codemirror/autocomplete'

import { autocompletion } from '@codemirror/autocomplete'

const KEYWORD_COMPLETIONS: Completion[] = [
  { label: 'AND', type: 'keyword', boost: 10 },
  { label: 'OR', type: 'keyword', boost: 10 },
  { label: 'NOT', type: 'keyword', boost: 10 },
]

/** Keyword completion only when the token is surrounded by whitespace on both sides. */
export function isKeywordCompletionBoundary(doc: string, from: number, to: number) {
  if (from <= 0 || to >= doc.length) {
    return false
  }

  const before = doc[from - 1]
  const after = doc[to]
  return /\s/.test(before) && /\s/.test(after)
}

function keywordCompletions(context: CompletionContext) {
  const word = context.matchBefore(/[A-Za-z_]+/)
  if (!word || (word.from === word.to && !context.explicit)) {
    return null
  }

  const doc = context.state.doc.toString()
  if (!isKeywordCompletionBoundary(doc, word.from, context.pos)) {
    return null
  }

  return {
    from: word.from,
    options: KEYWORD_COMPLETIONS,
    validFor: /^[A-Za-z_]*$/,
  }
}

export const dslAutocompleteExtension = autocompletion({
  override: [keywordCompletions],
})
