import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import LoginCard from './LoginCard.vue'
import LoginDialog from './LoginDialog.vue'

const meta = {
  title: 'Auth/LoginCard',
  component: LoginCard,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof LoginCard>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { LoginCard },
    setup() {
      const lastSubmit = ref<{ username: string, password: string } | null>(null)
      return { lastSubmit }
    },
    template: `
      <div class="h-screen">
        <LoginCard @submit="lastSubmit = $event" />
        <div
          v-if="lastSubmit"
          class="fixed bottom-4 left-4 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm"
        >
          submit: <span class="font-mono text-foreground">{{ lastSubmit.username }}</span>
        </div>
      </div>
    `,
  }),
}

export const Loading: Story = {
  args: {
    loading: true,
    defaultUsername: 'admin',
  },
}

export const ErrorState: Story = {
  args: {
    defaultUsername: 'admin',
    error: '账号或密码错误',
  },
}

export const DialogBlocking: Story = {
  render: () => ({
    components: { LoginDialog },
    setup() {
      return { open: true, loading: false, error: null }
    },
    template: `
      <div class="h-screen bg-muted/20">
        <p class="p-6 text-sm text-muted-foreground">背景页面被遮罩阻断</p>
        <LoginDialog :open="open" :loading="loading" :error="error" />
      </div>
    `,
  }),
}

