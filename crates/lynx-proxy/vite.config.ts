import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import markdownRawPlugin from 'vite-raw-plugin';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    markdownRawPlugin({
      fileRegex: /\.md$/,
    }),
  ],
  server: {
    port: 8080,
    proxy: {
      '/__self_service_path__': {
        target: 'http://127.0.0.1:3000',
        // onProxyRes(proxyRes, _req, res) {
        //   res.on('close', () => {
        //     proxyRes.destroy();
        //   });
        //   proxyRes.on('data', () => {
        //     if (res.closed) {
        //       proxyRes.destroy();
        //     }
        //   });
        // },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
