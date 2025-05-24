import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { TanStackRouterRspack } from '@tanstack/router-plugin/rspack';
import { env } from 'process';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

import { server } from './src/mock/node';

const useMock = env.MOCK === 'true';

if (useMock) {
  server.listen();
}

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginTypeCheck({
      tsCheckerOptions: {
        issue: {
          // ignore types errors from node_modules
          exclude: [
            ({ file = '' }) => /[\\/]services|ruleManager[\\/]/.test(file),
          ],
        },
      },
    }),
  ].filter(Boolean),
  html: {
    title: 'Lynx Proxy',
  },
  source: {
    define: {
      'process.platform': '"browser"',
    },
  },
  dev: {
    client: {
      overlay: false,
    },
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        onProxyRes(proxyRes, _req, res) {
          res.on('close', () => {
            proxyRes.destroy();
          });
          proxyRes.on('data', () => {
            if (res.closed) {
              proxyRes.destroy();
            }
          });
        },
      },
    },
  },

  tools: {
    rspack: {
      plugins: [TanStackRouterRspack()],
      module: {
        rules: [
          {
            test: /\.md$/,
            type: 'asset/source',
          },
        ],
      },
    },
  },
});
