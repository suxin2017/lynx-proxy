import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { ref } from 'vue'

import JsonEditor from './JsonEditor.vue'

const meta = {
  title: 'Data Entry/JsonEditor',
  component: JsonEditor,
  args: {
    modelValue: '{\n  "service": "lynx-proxy",\n  "enabled": true\n}',
  },
} satisfies Meta<typeof JsonEditor>

export default meta

type Story = StoryObj<typeof meta>

export const Editable: Story = {
  args: {
    title: 'Request Body',
  },
  render: args => ({
    components: { JsonEditor },
    setup() {
      const value = ref(args.modelValue)

      return { args, value }
    },
    template: '<JsonEditor v-bind="args" v-model="value" />',
  }),
}

export const InvalidJson: Story = {
  args: {
    title: 'Broken JSON',
    modelValue: '{\n  "service": "lynx-proxy",\n}',
  },
  render: args => ({
    components: { JsonEditor },
    setup() {
      const value = ref(args.modelValue)

      return { args, value }
    },
    template: '<JsonEditor v-bind="args" v-model="value" />',
  }),
}

export const Readonly: Story = {
  args: {
    title: 'Readonly Response',
    readOnly: true,
    modelValue: '{\n  "code": 0,\n  "message": "ok"\n}',
  },
}
