import React, { ReactNode } from 'react'
import { useTheme } from '../contexts/ThemeContext'

interface TabContainerProps {
  children: ReactNode
  className?: string
}

/**
 * Content-agnostic tab container
 * Provides consistent styling without knowing about content
 */
export const TabContainer: React.FC<TabContainerProps> = ({ 
  children, 
  className = '' 
}) => {
  const { currentTheme: theme } = useTheme()
  
  return (
    <div 
      className={`tab-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.background,
        color: theme.text,
        padding: theme.spacing.md,
        overflow: 'auto'
      }}
    >
      {children}
    </div>
  )
}

export default TabContainer