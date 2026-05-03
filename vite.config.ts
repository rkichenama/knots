import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/knots/' : '/',
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: ['babel-plugin-styled-components'],
      },
    }),
  ],
  build: {
    outDir: mode === 'production' ? 'docs' : 'dist',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
          }
        },
      },
    },
  },
  server: {
    port: 3200,
  },
  test: {
    reporters: ['tree'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      thresholds: { functions: 70 },
    },
    passWithNoTests: true,
    pool: 'threads',
    maxWorkers: '50%',
  },
}))
