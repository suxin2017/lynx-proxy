import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { TanStackRouterRspack } from '@tanstack/router-plugin/rspack';
import { env } from 'process';
import { pluginMockServer } from 'rspack-plugin-mock/rsbuild';

const useMock = env.MOCK === 'true';

export default defineConfig({
  plugins: [
    pluginReact(),
    useMock && pluginMockServer(/* pluginOptions */),
  ].filter(Boolean),
  output: {
    assetPrefix: '/__self_service_path__/',
  },
  html: {
    title: 'Lynx Proxy',
  },
  source: {
    define: {
      'process.platform': '"browser"',
    },
  },
  server: {
    port: 8080,
    proxy: {
      // '/__self_service_path__': 'http://127.0.0.1:3000',
      // http://localhost:3000/api -> http://localhost:3000/api
      // http://localhost:3000/api/foo -> http://localhost:3000/api/foo
      '/__self_service_path__': {
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
