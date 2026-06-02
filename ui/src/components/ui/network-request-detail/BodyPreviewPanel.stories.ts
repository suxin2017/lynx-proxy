import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { MAX_BODY_RENDER_BYTES } from '@/lib/http/body-display-limits'
import { base64ToBytes } from '@/lib/http/body-transport'

import BodyPreviewPanel from './BodyPreviewPanel.vue'

const meta = {
  title: 'Data Display/BodyPreviewPanel',
  component: BodyPreviewPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '网络详情 Body 预览：文本类视图统一使用只读 CodeMirror（语法高亮）。按 Content-Type 提供 Json / Text / Hex / Form / Media / SSE 等 pill 切换。',
      },
    },
  },
  decorators: [
    () => ({
      template: `
        <div
          class="overflow-hidden rounded-lg border border-border bg-background"
          style="height: 420px; max-width: 920px; display: flex; flex-direction: column;"
        >
          <story />
        </div>
      `,
    }),
  ],
} satisfies Meta<typeof BodyPreviewPanel>

export default meta

type Story = StoryObj<typeof meta>

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function jsonBytes(value: unknown): Uint8Array {
  return utf8(JSON.stringify(value, null, 2))
}

/** 1×1 红色 PNG */
const TINY_PNG_BYTES = base64ToBytes(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
)

const SAMPLE_JSON = {
  code: 0,
  message: 'ok',
  data: { service: 'lynx-proxy', enabled: true, tags: ['network', 'preview'] },
}

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
  <head><title>Preview</title></head>
  <body>
    <main class="card">
      <h1>Hello Lynx</h1>
      <p>HTML Body 预览（ContentWorkbench）</p>
    </main>
  </body>
</html>`

const SAMPLE_MULTIPART = [
  '--lynx-demo-boundary',
  'Content-Disposition: form-data; name="username"',
  '',
  'alice',
  '--lynx-demo-boundary',
  'Content-Disposition: form-data; name="note"',
  '',
  'storybook preview',
  '--lynx-demo-boundary',
  'Content-Disposition: form-data; name="avatar"; filename="dot.png"',
  'Content-Type: image/png',
  '',
  '(binary omitted in story)',
  '--lynx-demo-boundary--',
].join('\r\n')

const SAMPLE_SSE = [
  'id: evt-1',
  'event: message',
  'data: {"hello":"world","n":1}',
  '',
  'id: evt-2',
  'event: ping',
  'data: keep-alive',
  'data: second line',
  '',
  ': comment ignored',
  'data: done',
  '',
].join('\n')

export const Json: Story = {
  name: 'Json',
  args: {
    bytes: jsonBytes(SAMPLE_JSON),
    contentType: 'application/json; charset=utf-8',
    emptyLabel: '无 Body',
  },
}

export const Html: Story = {
  name: 'Html',
  args: {
    bytes: utf8(SAMPLE_HTML),
    contentType: 'text/html; charset=utf-8',
  },
}

export const Xml: Story = {
  name: 'Xml',
  args: {
    bytes: utf8([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<response>',
      '  <status>ok</status>',
      '  <service>lynx-proxy</service>',
      '</response>',
    ].join('\n')),
    contentType: 'application/xml; charset=utf-8',
  },
}

export const Css: Story = {
  name: 'Css',
  args: {
    bytes: utf8([
      '.card {',
      '  border: 1px solid var(--border);',
      '  border-radius: 8px;',
      '  padding: 12px;',
      '}',
    ].join('\n')),
    contentType: 'text/css; charset=utf-8',
  },
}

export const Javascript: Story = {
  name: 'Javascript',
  args: {
    bytes: utf8([
      'export function greet(name) {',
      '  return `Hello, ${name}!`',
      '}',
      'console.log(greet("lynx"))',
    ].join('\n')),
    contentType: 'application/javascript; charset=utf-8',
  },
}

export const PlainText: Story = {
  name: 'Plain Text',
  args: {
    bytes: utf8('Proxy log line 1\nProxy log line 2\n非 ASCII 示例：你好'),
    contentType: 'text/plain; charset=utf-8',
  },
}

export const FormUrlEncoded: Story = {
  name: 'Form (urlencoded)',
  args: {
    bytes: utf8('q=lynx+proxy&page=1&filter=active&empty='),
    contentType: 'application/x-www-form-urlencoded',
  },
}

export const FormMultipart: Story = {
  name: 'Form (multipart)',
  args: {
    bytes: utf8(SAMPLE_MULTIPART),
    contentType: 'multipart/form-data; boundary=lynx-demo-boundary',
  },
}

export const Sse: Story = {
  name: 'SSE',
  args: {
    bytes: utf8(SAMPLE_SSE),
    contentType: 'text/event-stream; charset=utf-8',
  },
}

export const Image: Story = {
  name: 'Media · Image',
  args: {
    bytes: TINY_PNG_BYTES,
    contentType: 'image/png',
  },
}

export const BinaryHex: Story = {
  name: 'Binary · Hex / Base64',
  args: {
    bytes: new Uint8Array([
      0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff, 0xfe, 0xfd,
      0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x0a,
    ]),
    contentType: 'application/octet-stream',
  },
  parameters: {
    docs: {
      description: {
        story: '默认 Text（CodeMirror）；切换到 **Hex**（offset/字节分色）或 **Base64** pill。',
      },
    },
  },
}

export const Empty: Story = {
  name: 'Empty',
  args: {
    bytes: undefined,
    contentType: undefined,
    emptyLabel: '无请求 Body',
  },
}

export const TooLarge: Story = {
  name: 'Too Large (no render)',
  args: {
    reportedByteLength: MAX_BODY_RENDER_BYTES + 1,
    contentType: 'application/json',
  },
  parameters: {
    docs: {
      description: {
        story: '超过 `MAX_BODY_RENDER_BYTES` 时不解码、不展示 pill，仅显示过大提示。',
      },
    },
  },
}

export const TruncatedHint: Story = {
  name: 'Truncated hint',
  args: {
    bytes: jsonBytes({ partial: true, note: 'store capped' }),
    contentType: 'application/json',
    truncated: true,
  },
}

export const WebSocketText: Story = {
  name: 'WebSocket (text default)',
  args: {
    bytes: utf8('{"type":"ping","ts":1710000000}'),
    contentType: 'application/octet-stream',
    isWebSocket: true,
  },
}

/** 一屏浏览所有典型 Body 预览（便于对比 pill 与布局） */
export const Showcase: Story = {
  name: 'Showcase · All variants',
  render: () => ({
    components: { BodyPreviewPanel },
    setup() {
      const variants: {
        title: string
        hint?: string
        bytes?: Uint8Array
        reportedByteLength?: number
        contentType?: string
        truncated?: boolean
        isWebSocket?: boolean
      }[] = [
        { title: 'Json', bytes: jsonBytes(SAMPLE_JSON), contentType: 'application/json' },
        { title: 'Html', bytes: utf8(SAMPLE_HTML), contentType: 'text/html' },
        { title: 'Form urlencoded', bytes: utf8('a=1&b=2'), contentType: 'application/x-www-form-urlencoded' },
        { title: 'Form multipart', bytes: utf8(SAMPLE_MULTIPART), contentType: 'multipart/form-data; boundary=lynx-demo-boundary' },
        { title: 'SSE', bytes: utf8(SAMPLE_SSE), contentType: 'text/event-stream' },
        { title: 'Image', bytes: TINY_PNG_BYTES, contentType: 'image/png' },
        { title: 'Binary', bytes: new Uint8Array([0xde, 0xad, 0xbe, 0xef]), contentType: 'application/octet-stream', hint: '切 Hex / Base64' },
        { title: 'Empty', bytes: undefined },
        {
          title: 'Too large',
          reportedByteLength: MAX_BODY_RENDER_BYTES + 1,
          contentType: 'application/json',
        },
        {
          title: 'Truncated',
          bytes: jsonBytes({ ok: true }),
          contentType: 'application/json',
          truncated: true,
        },
      ]

      return { variants }
    },
    template: `
      <div class="flex flex-col gap-6 p-2" style="max-width: 960px;">
        <p class="text-xs text-muted-foreground">
          每个区块内可切换 preview pill；文本类均为 CodeMirror 只读高亮。Showcase 用于快速对比不同 Content-Type 的默认 Tab。
        </p>
        <section
          v-for="item in variants"
          :key="item.title"
          class="overflow-hidden rounded-lg border border-border bg-background"
          style="height: 320px; display: flex; flex-direction: column;"
        >
          <header class="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-foreground">{{ item.title }}</span>
            <span v-if="item.hint" class="text-[10px] text-muted-foreground">{{ item.hint }}</span>
          </header>
          <BodyPreviewPanel
            class="min-h-0 flex-1"
            :bytes="item.bytes"
            :reported-byte-length="item.reportedByteLength"
            :content-type="item.contentType"
            :truncated="item.truncated"
            :is-web-socket="item.isWebSocket"
            empty-label="无 Body"
          />
        </section>
      </div>
    `,
  }),
  decorators: [],
  parameters: {
    layout: 'fullscreen',
  },
}
