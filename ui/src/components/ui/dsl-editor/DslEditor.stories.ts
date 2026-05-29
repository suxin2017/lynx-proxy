import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { computed, ref } from 'vue'

import DslEditor from './DslEditor.vue'
import { dslBoundaryCaseExamples } from './dslEditorStoryFixtures'
import { formatDslAst } from './formatDslAst'

const meta = {
  title: 'Data Entry/DslEditor',
  component: DslEditor,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    modelValue: dslBoundaryCaseExamples,
  },
} satisfies Meta<typeof DslEditor>

export default meta

type Story = StoryObj<typeof meta>

const scrollableStoryShell = 'h-[100dvh] overflow-y-auto overscroll-contain p-4'
const editorStoryClass = 'min-h-[220px] overflow-visible [&>div]:max-h-[min(45vh,24rem)] [&>div]:overflow-y-auto'

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

export const BoundaryCases: Story = {
  render: args => renderWithAst(args as Record<string, unknown>),
}

export const Editable: Story = {
  render: args => renderWithAst(args as Record<string, unknown>),
}

export const Readonly: Story = {
  args: {
    readOnly: true,
    modelValue: [
      '(example.com OR /api/)',
      'AND NOT https://example.com/health',
    ].join('\n'),
  },
  render: args => renderWithAst(args as Record<string, unknown>),
}

export const InvalidSyntax: Story = {
  args: {
    modelValue: [
      '# Unclosed paren and incomplete OR group',
      'example.com AND (',
      '(example.com OR /api',
    ].join('\n'),
  },
  render: args => renderWithAst(args as Record<string, unknown>),
}

export const WithoutLineNumbers: Story = {
  args: {
    showLineNumbers: false,
    modelValue: 'example.com OR /api/ AND https://example.com/api?v=1',
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
