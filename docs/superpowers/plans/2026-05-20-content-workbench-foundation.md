# Content Workbench Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable content workbench foundation in `ui` with a CodeMirror 6 base and preview-only first release for text, JSON, HTML source, and code content.

**Architecture:** Use a container component to own title, copy, collapse, and performance guards, then route content to either a lightweight preview renderer or a readonly CodeMirror surface. Keep mode routing and content normalization in pure TypeScript utilities so the first slice is testable without DOM-heavy editor setup.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS v4, CodeMirror 6, Vitest, Storybook

---

### Task 1: Define Workbench Routing Utilities

**Files:**
- Create: `ui/src/components/ui/content-workbench/utils.ts`
- Create: `ui/src/components/ui/content-workbench/utils.test.ts`
- Test: `ui/src/components/ui/content-workbench/utils.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import {
  normalizeWorkbenchContent,
  resolveWorkbenchSurface,
} from './utils'

describe('resolveWorkbenchSurface', () => {
  it('routes plain text content to preview surface', () => {
    expect(resolveWorkbenchSurface({ type: 'text', content: 'hello' })).toBe('preview')
  })

  it('routes json content to readonly code surface', () => {
    expect(resolveWorkbenchSurface({ type: 'json', content: '{"ok":true}' })).toBe('readonly-code')
  })

  it('degrades oversized code content to preview surface', () => {
    expect(resolveWorkbenchSurface({ type: 'code', content: 'x'.repeat(12_000) })).toBe('preview')
  })
})

describe('normalizeWorkbenchContent', () => {
  it('formats object json input', () => {
    expect(normalizeWorkbenchContent({ type: 'json', content: { ok: true } }).displayValue)
      .toContain('\n  "ok": true\n')
  })

  it('falls back to raw input when json parsing fails', () => {
    const normalized = normalizeWorkbenchContent({ type: 'json', content: '{bad json}' })

    expect(normalized.displayValue).toBe('{bad json}')
    expect(normalized.hasFormattingError).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/wx/codes/lynx-proxy/ui && npm run test:unit -- src/components/ui/content-workbench/utils.test.ts`
Expected: FAIL with module not found or missing export errors for `./utils`

- [ ] **Step 3: Write minimal implementation**

```ts
export type WorkbenchType = 'text' | 'json' | 'html-source' | 'code'
export type WorkbenchSurface = 'preview' | 'readonly-code'

export interface ResolveWorkbenchSurfaceInput {
  type: WorkbenchType
  content: unknown
  degradeThreshold?: number
}

export interface NormalizeWorkbenchContentInput {
  type: WorkbenchType
  content: unknown
}

export interface NormalizedWorkbenchContent {
  displayValue: string
  hasFormattingError: boolean
}

const DEFAULT_DEGRADE_THRESHOLD = 10_000

function toDisplayString(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (content == null) {
    return ''
  }

  return String(content)
}

export function resolveWorkbenchSurface(input: ResolveWorkbenchSurfaceInput): WorkbenchSurface {
  const content = toDisplayString(input.content)
  const threshold = input.degradeThreshold ?? DEFAULT_DEGRADE_THRESHOLD

  if (content.length > threshold) {
    return 'preview'
  }

  return input.type === 'text' ? 'preview' : 'readonly-code'
}

export function normalizeWorkbenchContent(
  input: NormalizeWorkbenchContentInput,
): NormalizedWorkbenchContent {
  if (input.type !== 'json') {
    return {
      displayValue: toDisplayString(input.content),
      hasFormattingError: false,
    }
  }

  try {
    const source = typeof input.content === 'string'
      ? JSON.parse(input.content)
      : input.content

    return {
      displayValue: JSON.stringify(source, null, 2),
      hasFormattingError: false,
    }
  }
  catch {
    return {
      displayValue: toDisplayString(input.content),
      hasFormattingError: true,
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/wx/codes/lynx-proxy/ui && npm run test:unit -- src/components/ui/content-workbench/utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/src/components/ui/content-workbench/utils.ts ui/src/components/ui/content-workbench/utils.test.ts
git commit -m "test: add content workbench routing utilities"
```

### Task 2: Add Readonly Workbench UI Skeleton

**Files:**
- Create: `ui/src/components/ui/content-workbench/ContentWorkbench.vue`
- Create: `ui/src/components/ui/content-workbench/PreviewRenderer.vue`
- Create: `ui/src/components/ui/content-workbench/index.ts`
- Modify: `ui/src/components/index.ts`
- Test: `ui/src/components/ui/content-workbench/utils.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('keeps oversized content on preview surface even for code-like types', () => {
  expect(resolveWorkbenchSurface({ type: 'html-source', content: 'x'.repeat(12_000) })).toBe('preview')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/wx/codes/lynx-proxy/ui && npm run test:unit -- src/components/ui/content-workbench/utils.test.ts`
Expected: FAIL if the utility does not cover oversized `html-source`

- [ ] **Step 3: Write minimal implementation**

```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { computed } from 'vue'

import { cn } from '@/lib/utils'

import PreviewRenderer from './PreviewRenderer.vue'
import { normalizeWorkbenchContent, resolveWorkbenchSurface } from './utils'

interface Props {
  title?: string
  type: 'text' | 'json' | 'html-source' | 'code'
  content: unknown
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const normalized = computed(() => normalizeWorkbenchContent({ type: props.type, content: props.content }))
const surface = computed(() => resolveWorkbenchSurface({ type: props.type, content: normalized.value.displayValue }))
</script>

<template>
  <section :class="cn('rounded-lg border border-border bg-card', props.class)">
    <header v-if="title" class="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
      {{ title }}
    </header>

    <PreviewRenderer
      v-if="surface === 'preview'"
      :content="normalized.displayValue"
      :has-formatting-error="normalized.hasFormattingError"
    />

    <div v-else class="px-4 py-3 text-sm text-muted-foreground">
      CodeMirror surface placeholder
    </div>
  </section>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/wx/codes/lynx-proxy/ui && npm run test:unit -- src/components/ui/content-workbench/utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/src/components/ui/content-workbench/ContentWorkbench.vue ui/src/components/ui/content-workbench/PreviewRenderer.vue ui/src/components/ui/content-workbench/index.ts ui/src/components/index.ts
git commit -m "feat: add content workbench preview shell"
```

### Task 3: Integrate CodeMirror Readonly Surface

**Files:**
- Create: `ui/src/components/ui/content-workbench/CodeMirrorSurface.vue`
- Modify: `ui/package.json`
- Modify: `ui/src/components/ui/content-workbench/ContentWorkbench.vue`
- Test: `ui/src/components/ui/content-workbench/utils.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('keeps small code content on readonly code surface', () => {
  expect(resolveWorkbenchSurface({ type: 'code', content: 'const ok = true' })).toBe('readonly-code')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/wx/codes/lynx-proxy/ui && npm run test:unit -- src/components/ui/content-workbench/utils.test.ts`
Expected: FAIL if routing regressed while introducing the UI shell

- [ ] **Step 3: Write minimal implementation**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
  content: string
}>()

const rootEl = ref<HTMLElement | null>(null)

onMounted(async () => {
  const [{ EditorState }, { EditorView, lineNumbers }, { basicSetup }] = await Promise.all([
    import('@codemirror/state'),
    import('@codemirror/view'),
    import('codemirror'),
  ])

  if (!rootEl.value) {
    return
  }

  const state = EditorState.create({
    doc: props.content,
    extensions: [basicSetup, lineNumbers(), EditorView.editable.of(false)],
  })

  new EditorView({
    state,
    parent: rootEl.value,
  })
})
</script>

<template>
  <div ref="rootEl" class="px-4 py-3" />
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/wx/codes/lynx-proxy/ui && npm run test:unit -- src/components/ui/content-workbench/utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/package.json ui/src/components/ui/content-workbench/CodeMirrorSurface.vue ui/src/components/ui/content-workbench/ContentWorkbench.vue
git commit -m "feat: add readonly codemirror surface"
```

### Task 4: Add Storybook Coverage

**Files:**
- Create: `ui/src/components/ui/content-workbench/ContentWorkbench.stories.ts`
- Test: `ui/src/components/ui/content-workbench/ContentWorkbench.stories.ts`

- [ ] **Step 1: Write the failing story test target**

```ts
export const LongContentDegraded = {
  args: {
    title: 'Large HTML Source',
    type: 'html-source',
    content: '<div>' + 'x'.repeat(12_000) + '</div>',
  },
}
```

- [ ] **Step 2: Run storybook-focused verification to verify it fails or is missing**

Run: `cd /Users/wx/codes/lynx-proxy/ui && npm run test:unit -- src/components/ui/content-workbench/utils.test.ts`
Expected: PASS on utilities, while Storybook file is still absent

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ContentWorkbench from './ContentWorkbench.vue'

const meta = {
  title: 'Data Display/ContentWorkbench',
  component: ContentWorkbench,
} satisfies Meta<typeof ContentWorkbench>

export default meta

type Story = StoryObj<typeof meta>

export const TextPreview: Story = {
  args: {
    title: 'Plain text',
    type: 'text',
    content: 'hello\nworld',
  },
}
```

- [ ] **Step 4: Run focused verification**

Run: `cd /Users/wx/codes/lynx-proxy/ui && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/src/components/ui/content-workbench/ContentWorkbench.stories.ts
git commit -m "docs: add content workbench stories"
```