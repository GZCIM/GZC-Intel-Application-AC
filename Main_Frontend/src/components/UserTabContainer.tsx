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
  
  // Always use DynamicCanvas for all tab types (simplified architecture)
  const DynamicCanvas = React.lazy(() => import('./canvas/DynamicCanvas').then(m => ({ 
    default: m.DynamicCanvas || m.default 
  })))
  return (
    <React.Suspense fallback={<div>Loading canvas...</div>}>
      <DynamicCanvas tabId={tabId} />
    </React.Suspense>
  )
}

export default UserTabContainer