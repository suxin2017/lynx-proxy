import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { computed, ref, watch } from 'vue'

import DslEditor from './DslEditor.vue'
import { defaultDslStoryExample, dslStoryExamples } from './dslEditorStoryFixtures'
import { formatDslAst } from './formatDslAst'

const meta = {
  title: 'Data Entry/DslEditor',
  component: DslEditor,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    modelValue: defaultDslStoryExample.value,
  },
} satisfies Meta<typeof DslEditor>

export default meta

type Story = StoryObj<typeof meta>

const scrollableStoryShell = 'h-[100dvh] overflow-y-auto overscroll-contain p-4'
const editorStoryClass = 'min-h-[220px] overflow-visible [&>div]:max-h-[min(45vh,24rem)] [&>div]:overflow-y-auto'

const editorWithAstAndPickerTemplate = `
  <div :class="shellClass">
    <div class="mx-auto grid w-full max-w-5xl gap-4">
      <label class="grid gap-1.5 text-sm">
        <span class="font-medium text-foreground">Example</span>
        <select
          v-model="selectedIndex"
          class="h-9 w-full max-w-md rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option v-for="(example, index) in examples" :key="example.label" :value="index">
            {{ example.label }}
          </option>
        </select>
      </label>
      <DslEditor v-bind="args" v-model="value" :class="editorClass" />
      <section class="grid gap-2">
        <div class="text-xs font-medium text-foreground">AST (Lezer)</div>
        <pre class="overflow-x-auto rounded border border-border/70 bg-muted/20 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre"><code>{{ ast }}</code></pre>
      </section>
    </div>
  </div>
`

function renderWithAstAndPicker(args: Record<string, unknown>) {
  return {
    components: { DslEditor },
    setup() {
      const examples = dslStoryExamples
      const selectedIndex = ref(0)
      const value = ref(examples[0]!.value)
      const ast = computed(() => formatDslAst(value.value))
      const shellClass = scrollableStoryShell
      const editorClass = editorStoryClass

      watch(selectedIndex, (index) => {
        const example = examples[index]
        if (example) {
          value.value = example.value
        }
      })

      return { args, examples, selectedIndex, value, ast, shellClass, editorClass }
    },
    template: editorWithAstAndPickerTemplate,
  }
}

const editorWithAstTemplate = `
  <div :class="shellClass">
    <div class="mx-auto grid w-full max-w-5xl gap-4">
      <DslEditor v-bind="args" v-model="value" :class="editorClass" />
      <section class="grid gap-2">
        <div class="text-xs font-medium text-foreground">AST (Lezer)</div>
        <pre class="overflow-x-auto rounded border border-border/70 bg-muted/20 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre"><code>{{ ast }}</code></pre>
      </section>
    </div>
  </div>
`

function renderWithAst(args: Record<string, unknown>) {
  return {
    components: { DslEditor },
    setup() {
      const value = ref((args as { modelValue: string }).modelValue)
      const ast = computed(() => formatDslAst(value.value))
      const shellClass = scrollableStoryShell
      const editorClass = editorStoryClass

      return { args, value, ast, shellClass, editorClass }
    },
    template: editorWithAstTemplate,
  }
}

export const Editable: Story = {
  render: args => renderWithAstAndPicker(args as Record<string, unknown>),
}

export const Readonly: Story = {
  args: {
    readOnly: true,
    modelValue: '(example.com OR /api/) AND NOT https://example.com/health',
  },
  render: args => renderWithAst(args as Record<string, unknown>),
}

export const InvalidSyntax: Story = {
  args: {
    modelValue: 'example.com AND (',
  },
  render: args => renderWithAst(args as Record<string, unknown>),
}

export const WithoutLineNumbers: Story = {
  args: {
    showLineNumbers: false,
    modelValue: 'example.com OR /api/ AND https://example.com/health',
  },
  render: args => ({
    components: { DslEditor },
    setup() {
      const value = ref((args as { modelValue: string }).modelValue)
      return {
        args,
        value,
        shellClass: scrollableStoryShell,
        editorClass: editorStoryClass,
      }
    },
    template: `
      <div :class="shellClass">
        <div class="mx-auto w-full max-w-5xl">
          <DslEditor v-bind="args" v-model="value" :class="editorClass" />
        </div>
      </div>
    `,
  }),
}
