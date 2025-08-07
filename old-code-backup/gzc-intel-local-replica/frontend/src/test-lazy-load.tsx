// Test lazy loading directly
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'

// Test direct import
import { UserTabSimple } from './components/UserTabSimple'

// Test lazy import
const LazyUserTab = lazy(() => import('./components/UserTabSimple').then(m => ({ default: m.UserTabSimple })))

function TestApp() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Testing Component Loading</h1>
      
      <h2>Direct Import:</h2>
      <UserTabSimple tabId="test-direct" type="dynamic" />
      
      <h2>Lazy Import:</h2>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyUserTab tabId="test-lazy" type="static" />
      </Suspense>
    </div>
  )
}

// Mount if this is run directly
if (import.meta.hot) {
  const root = document.createElement('div')
  root.id = 'test-root'
  document.body.appendChild(root)
  ReactDOM.createRoot(root).render(<TestApp />)
}