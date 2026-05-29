import type { Preview } from '@storybook/vue3-vite'

import { ensureDslWasm } from '../src/components/ui/dsl-editor/dslWasm'
import '../src/style.css'

const preview: Preview = {
  loaders: [
    async () => {
      await ensureDslWasm().catch(() => {})
      return {}
    },
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;