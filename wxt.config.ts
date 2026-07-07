import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/postcss';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  }),
  manifest: {
    permissions: [
      'sidePanel',
      'storage',
      'tabs'
    ],
    host_permissions: ['<all_urls>']
  }
});