import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'

import tailwindcss from '@tailwindcss/vite'

function backendPlugin() {
  let proc: ReturnType<typeof spawn> | null = null;
  return {
    name: 'start-backend',
    configureServer() {
      if (proc) return;
      proc = spawn('node', ['server/index.js'], {
        stdio: 'inherit',
        env: { ...process.env, PORT: '3088', HOST: '127.0.0.1' },
      });
      proc.on('error', (err) => console.error('[Backend]', err.message));
      process.on('exit', () => proc?.kill());
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    backendPlugin(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3088',
        changeOrigin: true,
      }
    }
  }
})

