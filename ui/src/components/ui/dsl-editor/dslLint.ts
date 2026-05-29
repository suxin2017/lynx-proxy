import type { EditorState } from '@codemirror/state'
import type { Diagnostic } from '@codemirror/lint'

import { linter, lintGutter } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'

import { collectDslSyntaxDiagnosticsWasm } from './dslWasm'

export function collectDslSyntaxDiagnostics(state: EditorState): Diagnostic[] {
  const doc = state.doc.toString()
  return collectDslSyntaxDiagnosticsWasm(doc).map(item => ({
    from: item.from,
    to: Math.max(item.to, item.from + 1),
    severity: item.severity as Diagnostic['severity'],
    message: item.message,
  }))
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
