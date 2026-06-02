import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

const PAYLOAD_CLASS = 'cm-base64-payload'
const PADDING_CLASS = 'cm-base64-padding'

function buildBase64Decorations(doc: string) {
  const builder = new RangeSetBuilder<Decoration>()
  let offset = 0

  for (const line of doc.split('\n')) {
    const paddingIndex = line.indexOf('=')
    const payloadEnd = paddingIndex >= 0 ? offset + paddingIndex : offset + line.length

    if (line.length > 0) {
      builder.add(
        offset,
        payloadEnd,
        Decoration.mark({ class: PAYLOAD_CLASS }),
      )
    }

    if (paddingIndex >= 0) {
      builder.add(
        offset + paddingIndex,
        offset + line.length,
        Decoration.mark({ class: PADDING_CLASS }),
      )
    }

    offset += line.length + 1
  }

  return builder.finish()
}

const base64HighlightPlugin = ViewPlugin.fromClass(class {
  decorations

  constructor(view: EditorView) {
    this.decorations = buildBase64Decorations(view.state.doc.toString())
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      this.decorations = buildBase64Decorations(update.state.doc.toString())
    }
  }
}, {
  decorations: value => value.decorations,
})

export const base64HighlightTheme = EditorView.theme({
  '.cm-base64-payload': {
    color: 'var(--color-foreground)',
  },
  '.cm-base64-padding': {
    color: 'var(--color-chart-5)',
  },
})

export const base64HighlightExtension = [base64HighlightPlugin, base64HighlightTheme]
