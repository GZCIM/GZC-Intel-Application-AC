import React from 'react'
import { DynamicCanvas } from './canvas/DynamicCanvas'

interface UserTabProps {
  tabId: string
  title?: string
  type?: 'dynamic' | 'static'
}

export const UserTabSimple: React.FC<UserTabProps> = ({ tabId, type = 'dynamic' }) => {
  console.log('UserTabSimple rendering:', { tabId, type })
  
  // Always use DynamicCanvas (simplified architecture)
  return <DynamicCanvas tabId={tabId} />
}