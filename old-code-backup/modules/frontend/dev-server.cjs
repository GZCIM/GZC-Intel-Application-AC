#!/usr/bin/env node

const { spawn } = require('child_process')
const { createServer } = require('vite')

async function startServer() {
  try {
    // Kill any existing processes
    const { exec } = require('child_process')
    exec('lsof -ti:3500 | xargs kill -9 2>/dev/null || true')
    exec('lsof -ti:3501 | xargs kill -9 2>/dev/null || true')
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('🚀 Starting Vite dev server with high memory...')
    
    // Set high memory and start Vite
    process.env.NODE_OPTIONS = '--max-old-space-size=16384'
    
    const server = await createServer({
      server: {
        port: 3500,
        host: true,
        strictPort: true
      },
      optimizeDeps: {
        force: true
      }
    })
    
    await server.listen()
    
    console.log('✅ Server running at http://localhost:3500')
    
    // Keep alive
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...')
      await server.close()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Server failed:', error.message)
    process.exit(1)
  }
}

startServer()