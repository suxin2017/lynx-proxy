import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: 'http://127.0.0.1:7788/api/api-docs/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/services/generated',
      client: 'react-query',
      prettier: true,
      mock: true,
      override: {
        mutator: {
          path: './src/services/customInstance.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
        },
      },
    },
  },
});
