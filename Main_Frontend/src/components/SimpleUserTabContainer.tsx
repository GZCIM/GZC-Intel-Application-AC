import React from 'react'

// Import DynamicCanvas directly - we know this works
import { DynamicCanvas } from './canvas/DynamicCanvas'

const SimpleUserTabContainer: React.FC<{ tabId: string; type?: string }> = ({ tabId, type }) => {
  // For now, just always return DynamicCanvas since that's what you need
  return <DynamicCanvas tabId={tabId} />
}

export default SimpleUserTabContainer