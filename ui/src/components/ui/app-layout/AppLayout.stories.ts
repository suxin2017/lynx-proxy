import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref } from 'vue'
import { Bell, FileCode2, FolderKanban, PanelsTopLeft, Search, Settings } from '@lucide/vue'
import AppLayout, { type AppLayoutMenuItem } from './AppLayout.vue'

const MENU_ITEMS: AppLayoutMenuItem[] = [
  { key: 'explorer', label: 'Explorer', icon: PanelsTopLeft },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'source', label: 'Source', icon: FileCode2 },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'settings', label: 'Settings', icon: Settings },
]

const PAGE_COPY: Record<string, { title: string, subtitle: string, blocks: string[] }> = {
  explorer: {
    title: 'Workspace Explorer',
    subtitle: '项目目录和运行资源在这里聚合展示。',
    blocks: ['Pinned folders', 'Recent network captures', 'Runtime snapshots'],
  },
  search: {
    title: 'Global Search',
    subtitle: '跨请求与脚本做实时检索。',
    blocks: ['Regex search', 'Filter by method/status', 'Saved query presets'],
  },
  projects: {
    title: 'Project Hub',
    subtitle: '聚合服务实例、环境标签和联调入口。',
    blocks: ['Environments', 'Service map', 'Shared traces'],
  },
  source: {
    title: 'Source Studio',
    subtitle: '编辑和预览转换规则、注入脚本与模板。',
    blocks: ['Rule editor', 'Live diff', 'Version compare'],
  },
  notifications: {
    title: 'Notification Center',
    subtitle: '事件告警和系统提醒统一处理。',
    blocks: ['Error feed', 'Delivery status', 'Retention policy'],
  },
  settings: {
    title: 'Preferences',
    subtitle: '工作台偏好与连接参数配置。',
    blocks: ['Theme tokens', 'Proxy endpoint', 'Keyboard shortcuts'],
  },
}

const meta = {
  title: 'Layout/AppLayout',
  component: AppLayout,
  args: {
    items: MENU_ITEMS,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AppLayout>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { AppLayout },
    setup() {
      const active = ref('explorer')
      const page = computed(() => PAGE_COPY[active.value] ?? PAGE_COPY.explorer)
      return { active, page, items: MENU_ITEMS }
    },
    template: `
      <div class="h-screen bg-muted/20 p-4">
        <AppLayout v-model="active" :items="items" class="h-full">
          <template #default="{ activeKey }">
            <section class="grid h-full grid-rows-[auto_1fr]">
              <header class="border-b border-border px-6 py-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{{ activeKey }}</p>
                <h1 class="text-xl font-semibold text-foreground">{{ page.title }}</h1>
                <p class="text-sm text-muted-foreground">{{ page.subtitle }}</p>
              </header>
              <div class="grid gap-3 p-6 md:grid-cols-3">
                <article
                  v-for="block in page.blocks"
                  :key="block"
                  class="rounded-md border border-border bg-card p-4"
                >
                  <h2 class="text-sm font-medium text-foreground">{{ block }}</h2>
                  <p class="mt-2 text-xs leading-5 text-muted-foreground">
                    Placeholder content for visual review. 可以在下一阶段替换成真实业务面板。
                  </p>
                </article>
              </div>
            </section>
          </template>
        </AppLayout>
      </div>
    `,
  }),
}

export const ActiveState: Story = {
  render: () => ({
    components: { AppLayout },
    setup() {
      const active = ref('source')
      const page = computed(() => PAGE_COPY[active.value] ?? PAGE_COPY.explorer)
      const items = MENU_ITEMS.map(item => (
        item.key === 'notifications'
          ? { ...item, disabled: true }
          : item
      ))
      return { active, page, items }
    },
    template: `
      <div class="h-screen bg-muted/20 p-4">
        <AppLayout v-model="active" :items="items" class="h-full">
          <template #default="{ activeKey }">
            <section class="h-full p-6">
              <div class="mb-4 rounded-md border border-dashed border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
                Active item: <span class="font-mono text-foreground">{{ activeKey }}</span>
              </div>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <article
                  v-for="block in page.blocks"
                  :key="block"
                  class="rounded-md border border-border bg-card p-4"
                >
                  <h2 class="text-sm font-medium text-foreground">{{ block }}</h2>
                  <p class="mt-2 text-xs text-muted-foreground">
                    This story demonstrates selected and disabled icon states in the left rail.
                  </p>
                </article>
              </div>
            </section>
          </template>
        </AppLayout>
      </div>
    `,
  }),
}

export const Responsive: Story = {
  render: () => ({
    components: { AppLayout },
    setup() {
      const active = ref('projects')
      return { active, items: MENU_ITEMS }
    },
    template: `
      <div class="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <div class="w-full max-w-[760px]">
          <AppLayout v-model="active" :items="items" class="min-h-[420px]">
            <template #default="{ activeKey }">
              <section class="h-full p-5 sm:p-6">
                <h2 class="text-lg font-semibold text-foreground">Narrow Container Preview</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                  当前激活菜单：{{ activeKey }}。这个场景用于审查窄屏和受限容器下的可读性。
                </p>
                <div class="mt-4 space-y-3">
                  <div class="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">Panel A</div>
                  <div class="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">Panel B</div>
                  <div class="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">Panel C</div>
                </div>
              </section>
            </template>
          </AppLayout>
        </div>
      </div>
    `,
  }),
}
