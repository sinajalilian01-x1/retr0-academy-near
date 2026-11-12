import { defineConfig } from 'vite'

export default defineConfig({
  server: { host: '0.0.0.0', port: 43123, strictPort: true },
  preview: { host: '0.0.0.0', port: 43124, strictPort: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 800,
  },
})
