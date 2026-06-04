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
    type: 'text',
    content: 'Proxy started successfully.\nListening on http://127.0.0.1:3000',
  },
}

export const JsonReadonly: Story = {
  args: {
    title: 'JSON Response',
    type: 'json',
    content: {
      code: 0,
      message: 'ok',
      data: {
        service: 'lynx-proxy',
        enabled: true,
      },
    },
  },
}

export const HtmlSourceReadonly: Story = {
  args: {
    title: 'HTML Source',
    type: 'html-source',
    content: '<section class="card"><h1>Hello</h1><p>Preview only.</p></section>',
  },
}

export const XmlReadonly: Story = {
  args: {
    title: 'XML Response',
    type: 'xml-source',
    content: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<response>',
      '  <status>ok</status>',
      '  <service>lynx-proxy</service>',
      '</response>',
    ].join('\n'),
  },
}

export const CssReadonly: Story = {
  args: {
    title: 'CSS Response',
    type: 'css-source',
    content: [
      ':root {',
      '  --brand: #0f766e;',
      '}',
      '',
      '.panel {',
      '  color: var(--brand);',
      '}',
    ].join('\n'),
  },
}

export const JavascriptReadonly: Story = {
  args: {
    title: 'JavaScript Response',
    type: 'javascript-source',
    content: [
      'window.__LYNX_PROXY_STATE__ = {',
      '  healthy: true,',
      '  version: "1.0.0",',
      '}',
    ].join('\n'),
  },
}

export const TypescriptReadonly: Story = {
  args: {
    title: 'TypeScript Snippet',
    type: 'code',
    language: 'ts',
    content: [
      'interface HealthCheck {',
      '  status: "ok" | "error"',
      '  duration: number',
      '}',
      '',
      'const result: HealthCheck = { status: "ok", duration: 12 }',
    ].join('\n'),
  },
}

export const LongContentDegraded: Story = {
  args: {
    title: 'Large Source Fallback',
    type: 'code',
    language: 'ts',
    content: `export const payload = "${'x'.repeat(12000)}"`,
  },
}

export const CollapsibleReadonly: Story = {
  args: {
    title: 'Collapsible Source',
    type: 'code',
    language: 'ts',
    content: Array.from({ length: 80 }, (_, index) => `const line${index + 1} = ${index + 1}`).join('\n'),
  },
}