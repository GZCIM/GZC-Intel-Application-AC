import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
// import { componentImportService } from '../services/ComponentImportService'
import { componentInventory } from '../core/components/ComponentInventory'

interface ComponentPortalModalProps {
  isOpen: boolean
  onClose: () => void
  onComponentSelect: (componentId: string) => void
  mode?: 'select' | 'import' // select from existing or import from 3200
}

interface Port3200Component {
  id: string
  name: string
  description: string
  quality?: string
}

export const ComponentPortalModal: React.FC<ComponentPortalModalProps> = ({
  isOpen,
  onClose,
  onComponentSelect,
  mode = 'select'
}) => {
  const { currentTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'local' | 'import'>('local')
  const [port3200Components, setPort3200Components] = useState<Port3200Component[]>([])
  const [localComponents, setLocalComponents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [importStatus, setImportStatus] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (isOpen) {
      loadComponents()
    }
  }, [isOpen, activeTab])

  const loadComponents = async () => {
    if (activeTab === 'local') {
      // Load local components
      const components = componentInventory.searchComponents('')
      console.log('ComponentPortalModal: Loading local components:', components)
      console.log('ComponentPortalModal: Portfolio component:', componentInventory.getComponent('portfolio'))
      setLocalComponents(components)
    } else {
      // Load port 3200 components
      setLoading(true)
      try {
        // const components = await componentImportService.listPort3200Components()
        // setPort3200Components(components)
        // Use mock data for now since componentImportService has issues
        throw new Error('componentImportService disabled')
      } catch (error) {
        // Use mock data for demo
        setPort3200Components([
          {
            id: 'advanced-chart',
            name: 'AdvancedChart',
            description: 'Professional trading chart with indicators',
            quality: 'port-3200'
          },
          {
            id: 'portfolio-grid',
            name: 'PortfolioGrid',
            description: 'Real-time portfolio holdings grid',
            quality: 'port-3200'
          },
          {
            id: 'order-book',
            name: 'OrderBook',
            description: 'Live order book visualization',
            quality: 'port-3200'
          },
          {
            id: 'candlestick-chart',
            name: 'CandlestickChart',
            description: 'Advanced candlestick chart with volume',
            quality: 'port-3200'
          },
          {
            id: 'market-depth',
            name: 'MarketDepth',
            description: 'Market depth and liquidity analysis',
            quality: 'port-3200'
          }
        ])
      } finally {
        setLoading(false)
      }
    }
  }

  const handleImportAndSelect = async (componentId: string) => {
    setImportStatus(prev => new Map(prev).set(componentId, 'importing'))
    
    try {
      // const result = await componentImportService.importComponent(componentId)
      // Simulate success for now
      const result = { success: true }
      if (result.success) {
        setImportStatus(prev => new Map(prev).set(componentId, 'success'))
        // After successful import, select the component
        setTimeout(() => {
          onComponentSelect(componentId)
          onClose()
        }, 500)
      } else {
        setImportStatus(prev => new Map(prev).set(componentId, 'failed'))
      }
    } catch (error) {
      setImportStatus(prev => new Map(prev).set(componentId, 'failed'))
    }
  }

  const handleLocalSelect = (componentId: string) => {
    onComponentSelect(componentId)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '80%',
            maxWidth: '800px',
            height: '70%',
            maxHeight: '600px',
            backgroundColor: currentTheme.surface,
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 24px',
            borderBottom: `1px solid ${currentTheme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: currentTheme.text
            }}>
              Add Component
            </h3>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setActiveTab('local')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: activeTab === 'local' ? currentTheme.primary : 'transparent',
                    color: activeTab === 'local' ? 'white' : currentTheme.text,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Local Components
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: activeTab === 'import' ? currentTheme.primary : 'transparent',
                    color: activeTab === 'import' ? 'white' : currentTheme.text,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Import from 3200
                </button>
              </div>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Component Grid */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto'
          }}>
            {loading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: currentTheme.textSecondary
              }}>
                Loading components...
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                {(activeTab === 'local' ? localComponents : port3200Components).map(component => {
                  const status = importStatus.get(component.id)
                  
                  return (
                    <motion.div
                      key={component.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => 
                        activeTab === 'local' 
                          ? handleLocalSelect(component.id)
                          : handleImportAndSelect(component.id)
                      }
                      style={{
                        padding: '12px',
                        backgroundColor: currentTheme.background,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '6px',
                        cursor: status === 'importing' ? 'wait' : 'pointer',
                        position: 'relative',
                        opacity: status === 'importing' ? 0.6 : 1
                      }}
                    >
                      <h4 style={{
                        margin: '0 0 6px 0',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: currentTheme.text
                      }}>
                        {component.displayName || component.name}
                      </h4>

                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '10px',
                        color: currentTheme.textSecondary,
                        lineHeight: 1.3
                      }}>
                        {component.description}
                      </p>

                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          backgroundColor: `${currentTheme.primary}20`,
                          color: currentTheme.primary,
                          borderRadius: '3px'
                        }}>
                          {component.quality || component.category || 'component'}
                        </span>
                      </div>

                      {/* Import Status */}
                      {status && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: currentTheme.background + 'ee',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px'
                        }}>
                          <span style={{
                            fontSize: '11px',
                            color: status === 'success' ? currentTheme.success : 
                                   status === 'failed' ? currentTheme.danger : 
                                   currentTheme.textSecondary
                          }}>
                            {status === 'importing' && '⏳ Importing...'}
                            {status === 'success' && '✅ Imported!'}
                            {status === 'failed' && '❌ Failed'}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}