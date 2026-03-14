import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Three.js is intentionally large and split into its own lazy chunk
    chunkSizeWarningLimit: 700,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // Three.js into a dedicated chunk — only downloaded when Globe renders
          if (id.includes('node_modules/three')) {
            return 'three';
          }
          // React + ReactDOM into a stable vendor chunk for long-term caching
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
        },
      },
    },

    // Target modern browsers — reduces polyfill overhead
    target: 'es2020',

    minify: 'esbuild',
    sourcemap: false,
  },

  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
