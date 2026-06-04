import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

const PREFIX_CLASS = 'cm-sse-prefix'
const COMMENT_CLASS = 'cm-sse-comment'
const FIELD_CLASS = 'cm-sse-field'
const BLANK_LINE_CLASS = 'cm-sse-blank-line'

function normalizeLine(line: string): string {
  return line.replace(/\r$/, '')
}

function highlightLine(builder: RangeSetBuilder<Decoration>, lineStart: number, line: string) {
  const normalized = normalizeLine(line)

  if (normalized.length === 0) {
    builder.add(lineStart, lineStart, Decoration.line({ class: BLANK_LINE_CLASS }))
    return
  }

  if (normalized.startsWith(':')) {
    builder.add(lineStart, lineStart + line.length, Decoration.mark({ class: COMMENT_CLASS }))
    return
  }

  const fieldMatch = normalized.match(/^(event|data|id|retry)(:)(.*)$/i)
  if (fieldMatch) {
    const fieldEnd = lineStart + fieldMatch[1].length
    const prefixEnd = lineStart + fieldMatch[1].length + 1
    builder.add(lineStart, fieldEnd, Decoration.mark({ class: FIELD_CLASS }))
    builder.add(fieldEnd, prefixEnd, Decoration.mark({ class: PREFIX_CLASS }))
    return
  }
}

function buildSseDecorations(doc: string) {
  const builder = new RangeSetBuilder<Decoration>()
  let offset = 0

  for (const line of doc.split('\n')) {
    highlightLine(builder, offset, line)
    offset += line.length + 1
  }

  return builder.finish()
}

const sseHighlightPlugin = ViewPlugin.fromClass(class {
  decorations

  constructor(view: EditorView) {
    this.decorations = buildSseDecorations(view.state.doc.toString())
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      this.decorations = buildSseDecorations(update.state.doc.toString())
    }
  }
}, {
  decorations: value => value.decorations,
})

export const sseHighlightTheme = EditorView.theme({
  '.cm-sse-field': {
    color: 'var(--color-chart-4)',
    fontWeight: '600',
  },
  '.cm-sse-prefix': {
    color: 'var(--color-muted-foreground)',
  },
  '.cm-sse-comment': {
    color: 'var(--color-muted-foreground)',
    fontStyle: 'italic',
  },
  '.cm-sse-blank-line': {
    backgroundColor: 'color-mix(in oklab, var(--color-muted) 35%, transparent)',
  },
})

/** One wire line per editor row; omit lineWrapping so long `data:` lines stay single-row. */
export const sseHighlightExtension = [sseHighlightPlugin, sseHighlightTheme]
