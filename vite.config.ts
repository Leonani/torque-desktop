import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            // __dirname se define mediante fileURLToPath(import.meta.url)
            // en src/main/index.ts, compatible con ESM y asar.
          },
        },
      },
      {
        entry: 'src/main/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist/preload',
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@components': path.resolve(__dirname, './src/renderer/components'),
      '@pages': path.resolve(__dirname, './src/renderer/pages'),
      '@services': path.resolve(__dirname, './src/renderer/services'),
      '@utils': path.resolve(__dirname, './src/renderer/utils'),
      '@types': path.resolve(__dirname, './src/renderer/types'),
      '@store': path.resolve(__dirname, './src/renderer/store'),
      '@hooks': path.resolve(__dirname, './src/renderer/hooks'),
    },
  },
  server: {
    port: 3005,
  },
  build: {
    outDir: 'dist/renderer',
    // En Electron todo se carga desde disco local, no hay penalidad de red
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-state': ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
})
