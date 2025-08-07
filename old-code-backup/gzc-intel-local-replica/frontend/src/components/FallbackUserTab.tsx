import React from 'react'

interface FallbackUserTabProps {
  tabId: string
  type?: string
  error?: string
}

export const FallbackUserTab: React.FC<FallbackUserTabProps> = ({ tabId, type, error }) => {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <h2>Tab Loading Error</h2>
      <p>Tab ID: {tabId}</p>
      <p>Type: {type || 'unknown'}</p>
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          maxWidth: '500px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <p style={{ marginTop: '20px', color: '#666' }}>
        This is a fallback component. The actual tab content could not be loaded.
      </p>
    </div>
  )
}