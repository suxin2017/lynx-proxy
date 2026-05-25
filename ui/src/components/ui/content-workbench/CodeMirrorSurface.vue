<script setup lang="ts">
import type { Extension } from '@codemirror/state'
import type { WorkbenchLanguage } from './utils'

import { basicSetup } from 'codemirror'
import { css } from '@codemirror/lang-css'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

const props = withDefaults(defineProps<{
  content: string
  language?: WorkbenchLanguage
  showLineNumbers?: boolean
}>(), {
  language: 'plaintext',
  showLineNumbers: true,
})

const rootEl = ref<HTMLElement | null>(null)
const editorView = shallowRef<EditorView | null>(null)
const languageCompartment = new Compartment()
const lineNumbersCompartment = new Compartment()

function resolveLanguageExtension(language: WorkbenchLanguage): Extension {
  switch (language) {
    case 'json':
      return json()
    case 'html':
      return html()
    case 'xml':
      return xml()
    case 'css':
      return css()
    case 'javascript':
      return javascript()
    case 'typescript':
      return javascript({ typescript: true })
    default:
      return []
  }
}

function resolveLineNumberExtension(showLineNumbers: boolean): Extension {
  return showLineNumbers ? lineNumbers() : []
}

function createEditor() {
  if (!rootEl.value) {
    return
  }

  editorView.value?.destroy()

  const state = EditorState.create({
    doc: props.content,
    extensions: [
      basicSetup,
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.theme({
        '&': {
          backgroundColor: 'transparent',
          fontSize: '0.75rem',
        },
        '.cm-scroller': {
          fontFamily: 'var(--font-mono)',
          lineHeight: '1.35rem',
          overflow: 'auto',
        },
        '.cm-content': {
          padding: '0.375rem 0.5rem 0.5rem',
        },
        '.cm-gutters': {
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--color-muted-foreground)',
          paddingRight: '0.25rem',
        },
        '.cm-gutterElement': {
          padding: '0 0.25rem 0 0',
        },
        '.cm-activeLine, .cm-activeLineGutter': {
          backgroundColor: 'transparent',
        },
        '.cm-focused': {
          outline: 'none',
        },
      }),
      languageCompartment.of(resolveLanguageExtension(props.language)),
      lineNumbersCompartment.of(resolveLineNumberExtension(props.showLineNumbers)),
    ],
  })

  editorView.value = new EditorView({
    state,
    parent: rootEl.value,
  })
}

onMounted(() => {
  createEditor()
})

watch(() => props.content, (content) => {
  const view = editorView.value
  if (!view) {
    return
  }

  const current = view.state.doc.toString()
  if (current === content) {
    return
  }

  view.dispatch({
    changes: {
      from: 0,
      to: current.length,
      insert: content,
    },
  })
})

watch(() => props.language, (language) => {
  const view = editorView.value
  if (!view) {
    return
  }

  view.dispatch({
    effects: languageCompartment.reconfigure(resolveLanguageExtension(language)),
  })
})

watch(() => props.showLineNumbers, (showLineNumbers) => {
  const view = editorView.value
  if (!view) {
    return
  }

  view.dispatch({
    effects: lineNumbersCompartment.reconfigure(resolveLineNumberExtension(showLineNumbers)),
  })
})

onBeforeUnmount(() => {
  editorView.value?.destroy()
})
</script>

<template>
  <div ref="rootEl" class="min-w-0" />
</template>