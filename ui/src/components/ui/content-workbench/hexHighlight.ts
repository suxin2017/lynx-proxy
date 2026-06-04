import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

const OFFSET_CLASS = 'cm-hex-offset'
const HEX_CLASS = 'cm-hex-bytes'

function buildHexDecorations(doc: string) {
  const builder = new RangeSetBuilder<Decoration>()
  let offset = 0

  for (const line of doc.split('\n')) {
    const lineStart = offset
    const match = line.match(/^([0-9A-F]{8})(  )(.+)?$/i)

    if (match) {
      builder.add(
        lineStart,
        lineStart + 8,
        Decoration.mark({ class: OFFSET_CLASS }),
      )

      if (match[3]) {
        builder.add(
          lineStart + 10,
          lineStart + line.length,
          Decoration.mark({ class: HEX_CLASS }),
        )
      }
    }

    offset += line.length + 1
  }

  return builder.finish()
}

const hexHighlightPlugin = ViewPlugin.fromClass(class {
  decorations

  constructor(view: EditorView) {
    this.decorations = buildHexDecorations(view.state.doc.toString())
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      this.decorations = buildHexDecorations(update.state.doc.toString())
    }
  }
}, {
  decorations: value => value.decorations,
})

export const hexHighlightTheme = EditorView.theme({
  '.cm-hex-offset': {
    color: 'var(--color-muted-foreground)',
  },
  '.cm-hex-bytes': {
    color: 'var(--color-chart-2)',
  },
})

export const hexHighlightExtension = [hexHighlightPlugin, hexHighlightTheme]
