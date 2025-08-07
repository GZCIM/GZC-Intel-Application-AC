import React from 'react'
import { DynamicCanvas } from './canvas/DynamicCanvas'
import { StaticCanvas } from './canvas/StaticCanvas'

interface UserTabProps {
  tabId: string
  title?: string
  type?: 'dynamic' | 'static'
}

export const UserTabSimple: React.FC<UserTabProps> = ({ tabId, type = 'dynamic' }) => {
  console.log('UserTabSimple rendering:', { tabId, type })
  
  // Render the appropriate canvas based on type prop
  if (type === 'dynamic') {
    return <DynamicCanvas tabId={tabId} />
  } else {
    return <StaticCanvas tabId={tabId} />
  }
}