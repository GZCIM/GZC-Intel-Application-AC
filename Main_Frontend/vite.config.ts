import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Use automatic JSX runtime
      jsxRuntime: 'automatic'
    }),
    visualizer({
      open: true,
      filename: 'bundle-stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap'
    })
  ],
  server: {
    port: 3500,
    host: true,
    open: false, // Don't auto-open browser
    strictPort: true, // Don't try other ports
    // Add stability settings
    hmr: {
      overlay: false, // Disable error overlay to prevent crashes
      timeout: 60000,  // Increase HMR timeout
      port: 3501, // Use a different port for HMR to avoid conflicts
      protocol: 'ws', // Use WebSocket protocol
      host: 'localhost'
    },
    watch: {
      // Ignore node_modules to reduce file watching overhead
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      // Use polling in case of file system issues
      usePolling: process.platform === 'darwin', // Use polling on macOS
      interval: 1000,
      binaryInterval: 1000,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    },
    cors: true,
    fs: {
      strict: false // Allow serving files outside of root
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'react-grid-layout',
      'framer-motion',
      'lightweight-charts'
    ],
    exclude: ['@azure/msal-browser', '@azure/msal-react'], // These can cause issues
    force: true, // Force pre-bundling of dependencies
    esbuildOptions: {
      target: 'esnext'
    }
  },
  // Build settings
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'analytics': ['lightweight-charts', '@tanstack/react-table']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@ui': path.resolve(__dirname, './src/ui-library'),
      '@themes': path.resolve(__dirname, './src/themes'),
      '@registry': path.resolve(__dirname, './src/registry'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@pages': path.resolve(__dirname, './src/pages')
    }
  },
  css: {
    postcss: './postcss.config.js'
  }
})
