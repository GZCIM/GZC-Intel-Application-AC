import React from 'react'
// Direct import without any complexity
import { DynamicCanvas } from './canvas/DynamicCanvas'

function DirectUserTabContainer({ tabId }: { tabId: string }) {
  return <DynamicCanvas tabId={tabId} />
}

export default DirectUserTabContainer