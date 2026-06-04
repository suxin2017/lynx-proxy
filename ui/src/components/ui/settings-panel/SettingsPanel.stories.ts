import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { WsConnectionState } from '@/lib/ws'
import SettingsPanel from './SettingsPanel.vue'
import { DEFAULT_NETWORK_PREFERENCES, DEFAULT_SETTINGS_PREVIEW } from './types'

const meta = {
  title: 'Preferences/SettingsPanel',
  component: SettingsPanel,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SettingsPanel>

export default meta

type Story = StoryObj<typeof meta>

export const NetworkPreferences: Story = {
  render: () => ({
    components: { SettingsPanel },
    setup() {
      const viewMode = ref(DEFAULT_NETWORK_PREFERENCES.viewMode)
      const splitRatio = ref(DEFAULT_NETWORK_PREFERENCES.splitRatio)
      const tableSplitRatio = ref(DEFAULT_NETWORK_PREFERENCES.tableSplitRatio)
      const streamEnabled = ref(DEFAULT_NETWORK_PREFERENCES.streamEnabled)

      function resetPrefs() {
        viewMode.value = DEFAULT_NETWORK_PREFERENCES.viewMode
        splitRatio.value = DEFAULT_NETWORK_PREFERENCES.splitRatio
        tableSplitRatio.value = DEFAULT_NETWORK_PREFERENCES.tableSplitRatio
        streamEnabled.value = DEFAULT_NETWORK_PREFERENCES.streamEnabled
      }

      return {
        viewMode,
        splitRatio,
        tableSplitRatio,
        streamEnabled,
        connectionState: WsConnectionState.Connected,
        resetPrefs,
      }
    },
    template: `
      <div class="min-h-screen bg-background p-4">
        <div class="mx-auto w-full max-w-3xl">
          <SettingsPanel
            show-network-preferences
            :show-server-settings="false"
            v-model:view-mode="viewMode"
            v-model:split-ratio="splitRatio"
            v-model:table-split-ratio="tableSplitRatio"
            v-model:stream-enabled="streamEnabled"
            :connection-state="connectionState"
            @reset="resetPrefs"
          />
        </div>
      </div>
    `,
  }),
}

export const ServerSettings: Story = {
  render: () => ({
    components: { SettingsPanel },
    setup() {
      return { preview: DEFAULT_SETTINGS_PREVIEW }
    },
    template: `
      <div class="min-h-screen bg-background p-4">
        <div class="mx-auto w-full max-w-3xl">
          <SettingsPanel :preview="preview" />
        </div>
      </div>
    `,
  }),
}

export const FullSettings: Story = {
  render: () => ({
    components: { SettingsPanel },
    setup() {
      const viewMode = ref(DEFAULT_NETWORK_PREFERENCES.viewMode)
      const splitRatio = ref(DEFAULT_NETWORK_PREFERENCES.splitRatio)
      const tableSplitRatio = ref(DEFAULT_NETWORK_PREFERENCES.tableSplitRatio)
      const streamEnabled = ref(DEFAULT_NETWORK_PREFERENCES.streamEnabled)

      return {
        preview: DEFAULT_SETTINGS_PREVIEW,
        viewMode,
        splitRatio,
        tableSplitRatio,
        streamEnabled,
        connectionState: WsConnectionState.Connecting,
      }
    },
    template: `
      <div class="min-h-screen bg-background p-4">
        <div class="mx-auto w-full max-w-3xl">
          <SettingsPanel
            show-network-preferences
            :preview="preview"
            v-model:view-mode="viewMode"
            v-model:split-ratio="splitRatio"
            v-model:table-split-ratio="tableSplitRatio"
            v-model:stream-enabled="streamEnabled"
            :connection-state="connectionState"
          />
        </div>
      </div>
    `,
  }),
}

export const EmptyCaptureRules: Story = {
  render: () => ({
    components: { SettingsPanel },
    setup() {
      return {
        preview: {
          ...DEFAULT_SETTINGS_PREVIEW,
          capture: {
            enabled: false,
            includeDomains: [],
            excludeDomains: [],
          },
        },
      }
    },
    template: `
      <div class="min-h-screen bg-background p-4">
        <div class="mx-auto w-full max-w-3xl">
          <SettingsPanel :preview="preview" />
        </div>
      </div>
    `,
  }),
}
