import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3311,
    strictPort: true,
    // Backend de pagos/pedidos (server/) — ver server/README.md
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3312',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
})
