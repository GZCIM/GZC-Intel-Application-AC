// Force refresh component inventory - temporary debug utility
import { componentInventory } from '../core/components/ComponentInventory'

export function forceRefreshInventory() {
  console.log('=== FORCE REFRESH INVENTORY ===')
  
  // Check current state
  const beforeCount = componentInventory.searchComponents('').length
  const bloombergBefore = componentInventory.getComponent('bloomberg-volatility')
  
  console.log('Before refresh:')
  console.log('- Total components:', beforeCount)
  console.log('- Bloomberg component exists:', !!bloombergBefore)
  
  // Force add Bloomberg component again
  if (!bloombergBefore) {
    componentInventory.addComponent({
      id: 'bloomberg-volatility',
      name: 'BloombergVolatility',
      displayName: 'Bloomberg Volatility Surface',
      category: 'bloomberg',
      subcategory: 'volatility',
      description: 'Real-time FX options volatility surfaces with 3D visualization, smile analysis, and term structure from Bloomberg Terminal',
      defaultSize: { w: 10, h: 8 },
      minSize: { w: 8, h: 6 },
      maxSize: { w: 12, h: 12 },
      tags: ['bloomberg', 'volatility', 'fx', 'options', 'surface', '3d', 'smile', 'term-structure', 'real-time'],
      complexity: 'complex',
      quality: 'production',
      source: 'internal'
    })
  }
  
  // Rebuild search index
  componentInventory.rebuildSearchIndex()
  
  // Check after
  const afterCount = componentInventory.searchComponents('').length
  const bloombergAfter = componentInventory.getComponent('bloomberg-volatility')
  
  console.log('After refresh:')
  console.log('- Total components:', afterCount)
  console.log('- Bloomberg component exists:', !!bloombergAfter)
  console.log('- All component IDs:', componentInventory.searchComponents('').map(c => c.id))
  
  // Make it available globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).forceRefreshInventory = forceRefreshInventory
  }
}

// Run on import
forceRefreshInventory()