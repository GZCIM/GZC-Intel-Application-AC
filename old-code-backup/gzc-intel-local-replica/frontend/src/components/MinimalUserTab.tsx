import React from 'react'

// Absolute minimal component with zero dependencies
export const MinimalUserTab: React.FC<{ tabId: string; type?: string }> = ({ tabId, type }) => {
  // Log to confirm component is loading
  console.log('MinimalUserTab: LOADED AND RENDERING', { tabId, type })
  
  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f0f0',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Minimal User Tab</h1>
      <p>Tab ID: {tabId}</p>
      <p>Type: {type || 'not specified'}</p>
      <p style={{ marginTop: '20px', color: 'green' }}>
        ✅ If you see this, component loading is working!
      </p>
    </div>
  )
}