import React from 'react'
import { useTabLayout } from '../core/tabs/TabLayoutManager'

interface UserTabContainerProps {
  tabId: string
}

const UserTabContainer: React.FC<UserTabContainerProps> = ({ tabId }) => {
  const { currentLayout } = useTabLayout()
  
  // Find the tab configuration
  const tab = currentLayout?.tabs.find(t => t.id === tabId)
  
  if (!tab) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999'
      }}>
        Tab not found
      </div>
    )
  }
  
  // Log for debugging
  console.log('UserTabContainer: Rendering tab', {
    tabId,
    tabName: tab.name,
    tabType: tab.type,
    isEditMode: tab.editMode,
    components: tab.components?.length || 0
  })
  
  // Lazy load the canvas components to avoid circular dependencies
  if (tab.type === 'dynamic') {
    const DynamicCanvas = React.lazy(() => import('./canvas/DynamicCanvas').then(m => ({ 
      default: m.DynamicCanvas || m.default 
    })))
    return (
      <React.Suspense fallback={<div>Loading dynamic canvas...</div>}>
        <DynamicCanvas tabId={tabId} />
      </React.Suspense>
    )
  } else if (tab.type === 'static') {
    const StaticCanvas = React.lazy(() => import('./canvas/StaticCanvas').then(m => ({ 
      default: m.StaticCanvas || m.default 
    })))
    return (
      <React.Suspense fallback={<div>Loading static canvas...</div>}>
        <StaticCanvas tabId={tabId} />
      </React.Suspense>
    )
  } else {
    // Fallback for unknown types
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: '#666'
      }}>
        <div style={{ fontSize: '48px', opacity: 0.3 }}>❓</div>
        <div>Unknown tab type: {tab.type}</div>
      </div>
    )
  }
}

export default UserTabContainer