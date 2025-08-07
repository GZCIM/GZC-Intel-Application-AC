import React from 'react'
import { DynamicCanvas } from './canvas/DynamicCanvas'

interface AnalyticsTabProps {
  tabId: string
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ tabId }) => {
  // Analytics tab is just a DynamicCanvas where users can add components
  return <DynamicCanvas tabId={tabId} />
}

export default AnalyticsTab