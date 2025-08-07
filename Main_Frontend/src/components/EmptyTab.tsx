import React from 'react'
import { useTheme } from '../contexts/ThemeContext'

interface EmptyTabProps {
  title?: string
  tabId?: string
}

/**
 * Empty tab placeholder component
 * Content-agnostic - just provides structure
 */
export const EmptyTab: React.FC<EmptyTabProps> = ({ title = 'Empty Tab', tabId }) => {
  const { currentTheme: theme } = useTheme()
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: theme.background,
        color: theme.muted,
        textAlign: 'center'
      }}
    >
      <h2 style={{ 
        ...theme.typography.h2, 
        marginBottom: theme.spacing.md,
        color: theme.text
      }}>
        {title}
      </h2>
      <p style={{ 
        ...theme.typography.body,
        color: theme.muted
      }}>
        Clean slate - ready for implementation
      </p>
      {tabId && (
        <p style={{ 
          ...theme.typography.bodySmall,
          color: theme.muted,
          marginTop: theme.spacing.sm,
          opacity: 0.5
        }}>
          Tab ID: {tabId}
        </p>
      )}
    </div>
  )
}

export default EmptyTab