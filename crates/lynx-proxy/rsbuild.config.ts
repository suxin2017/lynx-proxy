import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { TanStackRouterRspack } from '@tanstack/router-plugin/rspack';
import { env } from 'process';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';
import { GenerateSW } from 'workbox-webpack-plugin';

import { server } from './src/mock/node';

const useMock = env.MOCK === 'true';

if (useMock) {
  server.listen();
}

const isDevelopment = env.NODE_ENV === 'development';

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
    favicon: './public/favicon.ico',
    tags: [
      {
        tag: 'meta',
        attrs: {
          name: 'theme-color',
          content: '#f8fafc',
        },
      },
      {
        tag: 'meta',
        attrs: {
          name: 'theme-color',
          content: '#0d0d0d',
          media: '(prefers-color-scheme: dark)',
        },
      },
      {
        tag: 'link',
        attrs: {
          rel: 'manifest',
          href: '/manifest.json',
        },
      },
      {
        tag: 'meta',
        attrs: {
          name: 'apple-mobile-web-app-capable',
          content: 'yes',
        },
      },
      {
        tag: 'meta',
        attrs: {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'default',
        },
      },
      {
        tag: 'meta',
        attrs: {
          name: 'apple-mobile-web-app-title',
          content: 'Lynx Proxy',
        },
      },
    ],
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
    compress: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7788',
        changeOrigin: true,
        onProxyRes(proxyRes, req, res) {
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
      plugins: [
        TanStackRouterRspack(),
        // 只在生产环境下添加 Workbox 插件用于生成 Service Worker
        ...(isDevelopment ? [] : [
          new GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'google-fonts-stylesheets',
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-webfonts',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                  },
                },
              },
              {
                urlPattern: /\/api\//,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 5, // 5 minutes
                  },
                },
              },
            ],
            // 排除不需要缓存的文件
            exclude: [/\.map$/, /manifest$/, /\.htaccess$/],
          }),
        ]),
      ],
      module: {
        rules: [
          {
            test: /\.md$/,
            type: 'asset/source',
          },
        ],
      },
      // 忽略特定的警告
      ignoreWarnings: [
        {
          module: /monaco-editor/,
          message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
        },
      ],
    },
  },
});
