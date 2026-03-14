import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    host: true,
    port: 9000,
    hmr: false,  // 外部ブラウザ接続時のHMR再接続ループを完全に無効化
  },
});
