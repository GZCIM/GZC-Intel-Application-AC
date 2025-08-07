import React, { useEffect, useState } from 'react'
import { componentInventory } from '../core/components/ComponentInventory'

export const DebugComponentInventory: React.FC = () => {
  const [components, setComponents] = useState<any[]>([])
  const [bloombergComponent, setBloombergComponent] = useState<any>(null)
  
  useEffect(() => {
    // Get all components
    const allComponents = componentInventory.searchComponents('')
    setComponents(allComponents)
    
    // Check Bloomberg component specifically
    const bloomberg = componentInventory.getComponent('bloomberg-volatility')
    setBloombergComponent(bloomberg)
    
    // Log to console for debugging
    console.log('=== COMPONENT INVENTORY DEBUG ===')
    console.log('Total components:', allComponents.length)
    console.log('Component IDs:', allComponents.map(c => c.id))
    console.log('Bloomberg component:', bloomberg)
    console.log('Categories:', componentInventory.getCategories().map(c => c.id))
    console.log('Bloomberg category components:', componentInventory.getComponentsByCategory('bloomberg'))
  }, [])
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      background: 'rgba(0,0,0,0.9)', 
      color: 'white', 
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 99999
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>Component Inventory Debug</h4>
      <div>Total components: {components.length}</div>
      <div>Component IDs: {components.map(c => c.id).join(', ')}</div>
      <div style={{ marginTop: '10px' }}>
        Bloomberg component: {bloombergComponent ? '✅ Found' : '❌ Not Found'}
      </div>
      {bloombergComponent && (
        <div style={{ fontSize: '10px', marginTop: '5px' }}>
          ID: {bloombergComponent.id}<br/>
          Name: {bloombergComponent.displayName}<br/>
          Category: {bloombergComponent.category}
        </div>
      )}
    </div>
  )
}