import React, { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { componentInventory } from '../../core/components/ComponentInventory'

interface ComponentRendererProps {
  componentId: string
  instanceId: string
  props?: Record<string, any>
  isEditMode: boolean
  onRemove: () => void
  onPropsUpdate?: (props: Record<string, any>) => void
}

// Map component IDs to actual components
const componentMap: Record<string, () => Promise<any>> = {
  // GZC Components from port 3200
  'gzc-portfolio': () => import('../gzc-portfolio/GZCPortfolioComponent'),
  'gzc-analytics': () => import('../gzc-analytics/AnalyticsDashboard'),
  
  // Bloomberg Volatility Analysis
  'bloomberg-volatility': () => import('../bloomberg-volatility'),
  
  // Portfolio component
  'portfolio': () => import('../portfolio/Portfolio'),
  
  // Placeholder components - will show the nice placeholder UI for now
  'line-chart': () => Promise.resolve(null),
  'area-chart': () => Promise.resolve(null),
  'candlestick-chart': () => Promise.resolve(null),
  'market-heatmap': () => Promise.resolve(null),
  'order-book': () => Promise.resolve(null),
  'trade-history': () => Promise.resolve(null),
  'watchlist': () => Promise.resolve(null),
  'sector-performance': () => Promise.resolve(null),
  'news-feed': () => Promise.resolve(null),
  'market-sentiment': () => Promise.resolve(null),
  'options-chain': () => Promise.resolve(null),
  'correlation-matrix': () => Promise.resolve(null),
  'volatility-surface': () => Promise.resolve(null),
  'market-depth': () => Promise.resolve(null),
  'time-and-sales': () => Promise.resolve(null),
  'technical-indicators': () => Promise.resolve(null),
  'fundamental-data': () => Promise.resolve(null),
  'economic-calendar': () => Promise.resolve(null),
  'earnings-calendar': () => Promise.resolve(null),
  'social-sentiment': () => Promise.resolve(null),
  'risk-metrics': () => Promise.resolve(null),
  'portfolio-optimizer': () => Promise.resolve(null),
  'backtesting-engine': () => Promise.resolve(null),
  'alert-manager': () => Promise.resolve(null),
  'scanner-results': () => Promise.resolve(null)
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  componentId,
  instanceId,
  props = {},
  isEditMode,
  onRemove
}) => {
  const { currentTheme } = useTheme()
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const meta = componentInventory.getComponent(componentId)

  useEffect(() => {
    const loadComponent = async () => {
      try {
        setLoading(true)
        setError(null)

        if (componentMap[componentId]) {
          const module = await componentMap[componentId]()
          if (module) {
            // Handle various export patterns
            let LoadedComponent = null
            
            // Try different export patterns
            if (module.default) {
              LoadedComponent = module.default
            } else if (module.Portfolio) {
              LoadedComponent = module.Portfolio
            } else if (module.GZCPortfolioComponent) {
              LoadedComponent = module.GZCPortfolioComponent
            } else if (module.AnalyticsDashboard) {
              LoadedComponent = module.AnalyticsDashboard
            } else if (module.VolatilityAnalysis) {
              LoadedComponent = module.VolatilityAnalysis
            } else if (typeof module === 'function') {
              LoadedComponent = module
            }
            
            if (LoadedComponent) {
              setComponent(() => LoadedComponent)
            } else {
              console.warn(`Component ${componentId} module loaded but no component found`, module)
              setComponent(null)
            }
          } else {
            // Component exists but not implemented yet - no error, will show placeholder
            setComponent(null)
          }
        } else {
          setError(`No component mapping for: ${componentId}`)
        }
      } catch (err) {
        console.error(`Failed to load component ${componentId}:`, err)
        setError(`Failed to load component: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    loadComponent()
  }, [componentId])

  // Component not found in inventory
  if (!meta) {
    return (
      <div style={{
        height: '100%',
        padding: '20px',
        backgroundColor: currentTheme.surface,
        border: `1px solid ${currentTheme.border}`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: currentTheme.textSecondary
      }}>
        Component not found: {componentId}
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div style={{
        height: '100%',
        backgroundColor: currentTheme.surface,
        border: `1px solid ${currentTheme.border}`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: currentTheme.textSecondary
      }}>
        Loading {meta.displayName}...
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{
        height: '100%',
        backgroundColor: currentTheme.surface,
        border: `1px solid ${currentTheme.border}`,
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: currentTheme.textSecondary
      }}>
        <div style={{ fontSize: '24px', opacity: 0.5 }}>⚠️</div>
        <div style={{ fontSize: '12px' }}>{error}</div>
      </div>
    )
  }

  // Render actual component if loaded
  if (Component) {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        position: 'relative'
      }}>
        {isEditMode && (
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to remove ${meta.displayName}?\n\nThis action cannot be undone.`)) {
                onRemove()
              }
            }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 10,
              background: currentTheme.error + '15',
              border: `1px solid ${currentTheme.error}`,
              borderRadius: '50%',
              cursor: 'pointer',
              color: currentTheme.error,
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              opacity: 0.7,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.backgroundColor = currentTheme.error + '25'
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.opacity = '0.7'
              e.currentTarget.style.backgroundColor = currentTheme.error + '15'
            }}
            title={`Remove ${meta.displayName}`}
          >
            ×
          </button>
        )}
        <Component {...props} />
      </div>
    )
  }

  // Fallback placeholder (component not implemented yet)
  return (
    <div style={{
      height: '100%',
      width: '100%',
      backgroundColor: currentTheme.surface,
      border: `1px solid ${currentTheme.border}`,
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Component Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '8px',
        borderBottom: `1px solid ${currentTheme.border}`
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '600',
          color: currentTheme.text
        }}>
          {meta.displayName}
        </h4>
        
        {isEditMode && (
          <button
            onClick={onRemove}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: currentTheme.textSecondary,
              padding: '2px',
              borderRadius: '2px',
              fontSize: '14px'
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Component Content Placeholder */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '12px',
        color: currentTheme.textSecondary,
        fontSize: '12px'
      }}>
        <div style={{ fontSize: '32px', opacity: 0.3 }}>🚧</div>
        <div>{meta.description}</div>
        <div style={{ fontSize: '10px', opacity: 0.7 }}>
          Component implementation coming soon
        </div>
      </div>

      {/* Component Info */}
      <div style={{
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap'
      }}>
        {meta.tags.slice(0, 3).map(tag => (
          <span
            key={tag}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: `${currentTheme.primary}20`,
              color: currentTheme.primary,
              borderRadius: '4px'
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}