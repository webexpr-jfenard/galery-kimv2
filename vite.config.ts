import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  esbuild: {
    // Ignore TypeScript errors during build
    logOverride: {
      'this-is-undefined-in-esm': 'silent'
    },
    // Strip console.* and debugger statements from production bundles
    drop: mode === 'production' ? ['console', 'debugger'] : []
  },
  build: {
    // Don't fail build on warnings
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress certain warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        warn(warning)
      }
    }
  }
}))
