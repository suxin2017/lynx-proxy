<script setup lang="ts">
import type { Extension } from '@codemirror/state'
import type { WorkbenchLanguage } from '../content-workbench/utils'

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
  modelValue: string
  language?: WorkbenchLanguage
  /** Provide a custom CodeMirror language extension (overrides `language`). */
  languageExtension?: Extension
  /** Additional CodeMirror extensions to load (e.g. autocomplete, lint). */
  extensions?: Extension
  showLineNumbers?: boolean
  readOnly?: boolean
}>(), {
  language: 'json',
  showLineNumbers: true,
  readOnly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootEl = ref<HTMLElement | null>(null)
const editorView = shallowRef<EditorView | null>(null)
const languageCompartment = new Compartment()
const lineNumbersCompartment = new Compartment()
const editableCompartment = new Compartment()
const extraExtensionsCompartment = new Compartment()
let isApplyingExternalChange = false

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

function resolveEffectiveLanguageExtension(): Extension {
  return props.languageExtension ?? resolveLanguageExtension(props.language)
}

function resolveLineNumberExtension(showLineNumbers: boolean): Extension {
  return showLineNumbers ? lineNumbers() : []
}

function resolveEditableExtension(readOnly: boolean): Extension {
  return [
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
  ]
}

function createEditor() {
  if (!rootEl.value) {
    return
  }

  editorView.value?.destroy()

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      basicSetup,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || isApplyingExternalChange) {
          return
        }

        emit('update:modelValue', update.state.doc.toString())
      }),
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
        '.cm-activeLineGutter': {
          backgroundColor: 'transparent',
        },
        '.cm-activeLine': {
          backgroundColor: 'color-mix(in oklab, var(--color-muted) 30%, transparent)',
        },
        '&.cm-focused': {
          outline: 'none',
        },
        '.cm-cursor, .cm-dropCursor': {
          borderLeftColor: 'var(--color-foreground)',
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
          backgroundColor: 'color-mix(in oklab, var(--color-muted) 60%, transparent)',
        },
      }),
      languageCompartment.of(resolveEffectiveLanguageExtension()),
      lineNumbersCompartment.of(resolveLineNumberExtension(props.showLineNumbers)),
      editableCompartment.of(resolveEditableExtension(props.readOnly)),
      extraExtensionsCompartment.of(props.extensions ?? []),
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

watch(() => props.modelValue, (modelValue) => {
  const view = editorView.value
  if (!view) {
    return
  }

  const current = view.state.doc.toString()
  if (current === modelValue) {
    return
  }

  isApplyingExternalChange = true

  view.dispatch({
    changes: {
      from: 0,
      to: current.length,
      insert: modelValue,
    },
  })

  isApplyingExternalChange = false
})

watch(() => props.language, () => {
  const view = editorView.value
  if (!view) {
    return
  }

  view.dispatch({
    effects: languageCompartment.reconfigure(resolveEffectiveLanguageExtension()),
  })
})

watch(() => props.languageExtension, () => {
  const view = editorView.value
  if (!view) {
    return
  }

  view.dispatch({
    effects: languageCompartment.reconfigure(resolveEffectiveLanguageExtension()),
  })
})

watch(() => props.extensions, (extensions) => {
  const view = editorView.value
  if (!view) {
    return
  }

  view.dispatch({
    effects: extraExtensionsCompartment.reconfigure(extensions ?? []),
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

watch(() => props.readOnly, (readOnly) => {
  const view = editorView.value
  if (!view) {
    return
  }

  view.dispatch({
    effects: editableCompartment.reconfigure(resolveEditableExtension(readOnly)),
  })
})

onBeforeUnmount(() => {
  editorView.value?.destroy()
})
</script>

<template>
  <div ref="rootEl" class="min-w-0" />
</template>
