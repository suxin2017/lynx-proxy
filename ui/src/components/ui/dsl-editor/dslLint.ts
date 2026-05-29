import type { EditorState } from '@codemirror/state'
import type { Diagnostic } from '@codemirror/lint'

import { linter, lintGutter } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'

import { parseDsl } from './dslParse'

export function collectDslSyntaxDiagnostics(state: EditorState): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const doc = state.doc.toString()
  const tree = parseDsl(doc)

  tree.iterate({
    enter(node) {
      if (!node.type.isError) {
        return
      }

      const text = doc.slice(node.from, node.to).trim()
      diagnostics.push({
        from: node.from,
        to: Math.max(node.to, node.from + 1),
        severity: 'error',
        message: text ? `Syntax error: ${text}` : 'Syntax error',
      })
    },
  })

  return diagnostics
}

const dslLinter = linter(view => collectDslSyntaxDiagnostics(view.state))

const dslLintTheme = EditorView.baseTheme({
  '.cm-lintRange-error': {
    backgroundImage: 'none',
    borderBottom: '2px wavy var(--color-destructive)',
  },
  '.cm-gutter-lint .cm-lint-marker-error': {
    color: 'var(--color-destructive)',
  },
  '.cm-tooltip.cm-tooltip-lint': {
    backgroundColor: 'var(--color-popover)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-popover-foreground)',
  },
  '.cm-diagnostic-error': {
    borderLeftColor: 'var(--color-destructive)',
  },
})

export const dslLintExtension = [
  dslLinter,
  lintGutter(),
  dslLintTheme,
]
