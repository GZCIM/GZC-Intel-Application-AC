import React from 'react'
import { DynamicCanvas } from './canvas/DynamicCanvas'

// Fallback component that directly renders DynamicCanvas
// This avoids the complex import chain that might be causing issues
export default function UserTabContainerFallback({ tabId }: { tabId: string }) {
  return <DynamicCanvas tabId={tabId} />
}