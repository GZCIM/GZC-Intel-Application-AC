import React, { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { componentInventory } from '../../core/components/ComponentInventory'

export const InventoryDebugger: React.FC = () => {
  const { currentTheme: theme } = useTheme()
  const [isVisible, setIsVisible] = useState(true)
  
  // Get all components from inventory
  const allComponents = componentInventory.searchComponents('')
  const categories = componentInventory.getCategories()
  
  // Check if portfolio exists
  const portfolioComponent = componentInventory.getComponent('portfolio')
  
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '8px 16px',
          backgroundColor: theme.primary,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 9999
        }}
      >
        Show Debug
      </button>
    )
  }
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '60px',
      right: '20px',
      width: '400px',
      maxHeight: '500px',
      backgroundColor: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: '8px',
      padding: '16px',
      overflowY: 'auto',
      fontSize: '12px',
      color: theme.text,
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
          Component Inventory Debug
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: theme.text,
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px',
            lineHeight: 1,
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          ×
        </button>
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Portfolio Component:</div>
        {portfolioComponent ? (
          <pre style={{
            backgroundColor: theme.background,
            padding: '8px',
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            {JSON.stringify(portfolioComponent, null, 2)}
          </pre>
        ) : (
          <div style={{ color: theme.danger }}>NOT FOUND in inventory!</div>
        )}
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          Total Components: {allComponents.length}
        </div>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {allComponents.map(comp => (
            <div key={comp.id} style={{
              padding: '4px 8px',
              backgroundColor: comp.id === 'portfolio' ? `${theme.primary}20` : 'transparent',
              borderRadius: '4px',
              marginBottom: '2px'
            }}>
              <span style={{ fontWeight: '500' }}>{comp.id}</span> - {comp.displayName}
              <span style={{ 
                marginLeft: '8px', 
                fontSize: '10px', 
                color: theme.textSecondary 
              }}>
                ({comp.category})
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          Categories: {categories.length}
        </div>
        {categories.map(cat => (
          <div key={cat.id} style={{ marginBottom: '2px' }}>
            {cat.name} ({componentInventory.getComponentsByCategory(cat.id).length} components)
          </div>
        ))}
      </div>
    </div>
  )
}