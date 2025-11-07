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
    // Only enable visualizer in development or when explicitly requested
    ...(process.env.ANALYZE_BUNDLE ? [
      visualizer({
        open: true,
        filename: 'bundle-stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap'
      })
    ] : [])
  ],
  server: {
    port: parseInt(process.env.VITE_PORT || '9000'),
    host: true,
    open: false, // Don't auto-open browser
    strictPort: true, // Don't try other ports
    // Add stability settings
    hmr: {
      overlay: false, // Disable error overlay to prevent crashes
      timeout: 60000,  // Increase HMR timeout
      port: parseInt(process.env.VITE_HMR_PORT || '9001'), // Use a different port for HMR to avoid conflicts
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
  // Optimize dependencies for faster builds
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-grid-layout',
      'framer-motion',
      'lightweight-charts',
      '@azure/msal-browser',
      '@azure/msal-react',
      'ag-grid-react',
      'ag-grid-community',
      'axios',
      'react-datepicker'
    ],
    // Plotly has large CJS bundles that confuse vite import analysis; skip prebundle
    exclude: ['plotly.js', 'plotly.js-dist', 'plotly.js-dist-min', 'react-plotly.js'],
    force: false, // Don't force pre-bundling on every build
    esbuildOptions: {
      target: 'esnext',
      // Optimize for faster builds
      treeShaking: true,
      minifyIdentifiers: false, // Skip identifier minification during dev
      minifySyntax: false, // Skip syntax minification during dev
      minifyWhitespace: false // Skip whitespace minification during dev
    }
  },
  // Build settings - Optimized for faster builds
  build: {
    sourcemap: false, // Disable sourcemaps to reduce memory usage
    outDir: 'dist',
    minify: 'esbuild', // Use esbuild for faster minification
    chunkSizeWarningLimit: 3000, // Increase chunk size warning limit
    target: 'esnext', // Use modern target for faster builds
    cssCodeSplit: false, // Disable CSS code splitting for faster builds
    // Allow CJS + ESM mixing (needed for plotly/react-plotly)
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'analytics': ['lightweight-charts', '@tanstack/react-table'],
          'ag-grid': ['ag-grid-react', 'ag-grid-community']
        },
        // Optimize chunk generation
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // Optimize for faster builds
      maxParallelFileOps: 2, // Further reduce parallel operations to lower memory pressure
      cache: true, // Enable caching for faster subsequent builds
      treeshake: {
        moduleSideEffects: false // Enable aggressive tree shaking
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
