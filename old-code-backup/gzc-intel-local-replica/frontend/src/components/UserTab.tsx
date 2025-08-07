import React from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useTabLayout } from '../core/tabs/TabLayoutManager'
import { DynamicCanvas } from './canvas/DynamicCanvas'
import { StaticCanvas } from './canvas/StaticCanvas'

interface UserTabProps {
  tabId: string
  title?: string
}

export const UserTab: React.FC<UserTabProps> = ({ tabId, title }) => {
  const { currentTheme } = useTheme()
  const { currentLayout } = useTabLayout()
  
  const tab = currentLayout?.tabs.find(t => t.id === tabId)
  
  if (!tab) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: currentTheme.background,
        color: currentTheme.textSecondary
      }}>
        Tab not found
      </div>
    )
  }

  // Render the appropriate canvas based on tab type
  if (tab.type === 'dynamic') {
    return <DynamicCanvas tabId={tabId} />
  } else {
    return <StaticCanvas tabId={tabId} />
  }
}