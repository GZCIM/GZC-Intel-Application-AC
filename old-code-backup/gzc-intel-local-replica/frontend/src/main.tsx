import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import './utils/errorMonitoring'
import { initSentry } from './config/sentry'
import { eventMonitor } from './utils/eventMonitor'

// Initialize Sentry
initSentry()

// Add development-only monitoring
if (import.meta.env.DEV) {
  console.log('🔍 Error monitoring enabled for development')
  // Event conflict monitor auto-starts in development
  console.log('🎯 Event conflict detection active')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
