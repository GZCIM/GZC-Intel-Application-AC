import React from 'react'

export const TestUserTab: React.FC<{ tabId: string }> = ({ tabId }) => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Test User Tab</h2>
      <p>Tab ID: {tabId}</p>
      <p>This is a test component to verify loading works.</p>
    </div>
  )
}