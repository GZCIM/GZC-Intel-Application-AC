import React, { useState, useEffect } from 'react'
import { DynamicCanvas } from './canvas/DynamicCanvas'
import { StaticCanvas } from './canvas/StaticCanvas'

interface SafeUserTabProps {
  tabId: string
  title?: string
  type?: 'dynamic' | 'static'
}

// This version doesn't use useTabLayout to avoid circular dependencies
export const SafeUserTab: React.FC<SafeUserTabProps> = ({ tabId, type = 'dynamic' }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // Small delay to ensure component mounts properly
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])
  
  if (isLoading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading tab...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'red'
      }}>
        <div>Error: {error}</div>
      </div>
    )
  }
  
  try {
    // Render the appropriate canvas based on type prop
    if (type === 'dynamic') {
      return <DynamicCanvas tabId={tabId} />
    } else {
      return <StaticCanvas tabId={tabId} />
    }
  } catch (err) {
    console.error('SafeUserTab: Error rendering canvas:', err)
    setError(err instanceof Error ? err.message : 'Unknown error')
    return null
  }
}