import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, '../../core'),
    },
  },
  test: {
    // node por default: lo que se testea son funciones puras. Los specs que
    // necesitan DOM (renderHook, componentes) declaran arriba
    // `// @vitest-environment jsdom`, y por eso el include acepta .tsx.
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
  },
})