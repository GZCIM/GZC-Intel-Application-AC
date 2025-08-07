import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { ComponentImportService } from '../services/ComponentImportService'
import { componentExportService } from '../services/ComponentExportService'
import { componentInventory } from '../core/components/ComponentInventory'

interface Port3200Component {
  id: string
  name: string
  description: string
  quality?: string
}

export const ComponentPortal: React.FC = () => {
  const { currentTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')
  const [port3200Components, setPort3200Components] = useState<Port3200Component[]>([])
  const [localComponents, setLocalComponents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set())
  const [importResults, setImportResults] = useState<Map<string, any>>(new Map())
  
  // Create instance of ComponentImportService
  const componentImportService = new ComponentImportService()

  // Load available components
  useEffect(() => {
    if (activeTab === 'import') {
      loadPort3200Components()
    } else {
      loadLocalComponents()
    }
  }, [activeTab])

  const loadPort3200Components = async () => {
    setLoading(true)
    try {
      const components = await componentImportService.listPort3200Components()
      setPort3200Components(components)
    } catch (error) {
      console.error('Failed to load port 3200 components:', error)
      // Mock data for demo
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
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadLocalComponents = () => {
    const components = componentInventory.searchComponents('')
      .filter(c => c.source === 'internal' || c.quality === 'enhanced')
    setLocalComponents(components)
  }

  const handleImport = async () => {
    setLoading(true)
    const results = new Map()

    for (const componentId of selectedComponents) {
      try {
        const result = await componentImportService.importComponent(componentId)
        results.set(componentId, result)
      } catch (error) {
        results.set(componentId, {
          success: false,
          errors: [`Import failed: ${error.message}`]
        })
      }
    }

    setImportResults(results)
    setSelectedComponents(new Set())
    setLoading(false)
  }

  const handleExport = async () => {
    setLoading(true)
    
    for (const componentId of selectedComponents) {
      try {
        const exportData = await componentExportService.exportAsPackage(componentId)
        if (exportData) {
          // In a real app, this would download or send to port 3200
          console.log(`Exported ${componentId}:`, exportData)
        }
      } catch (error) {
        console.error(`Failed to export ${componentId}:`, error)
      }
    }

    setSelectedComponents(new Set())
    setLoading(false)
  }

  const toggleSelection = (componentId: string) => {
    const newSelection = new Set(selectedComponents)
    if (newSelection.has(componentId)) {
      newSelection.delete(componentId)
    } else {
      newSelection.add(componentId)
    }
    setSelectedComponents(newSelection)
  }

  return (
    <div style={{
      height: '100%',
      width: '100%',
      backgroundColor: currentTheme.background,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        backgroundColor: currentTheme.surface,
        borderBottom: `1px solid ${currentTheme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: currentTheme.text
        }}>
          Component Portal
        </h2>

        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'import' ? currentTheme.primary : 'transparent',
              color: activeTab === 'import' ? 'white' : currentTheme.text,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Import from 3200
          </button>
          <button
            onClick={() => setActiveTab('export')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'export' ? currentTheme.primary : 'transparent',
              color: activeTab === 'export' ? 'white' : currentTheme.text,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Export to 3200
          </button>
        </div>
      </div>

      {/* Component List */}
      <div style={{
        flex: 1,
        padding: '24px',
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {(activeTab === 'import' ? port3200Components : localComponents).map(component => (
              <motion.div
                key={component.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => toggleSelection(component.id)}
                style={{
                  padding: '16px',
                  backgroundColor: currentTheme.surface,
                  border: `2px solid ${selectedComponents.has(component.id) ? currentTheme.primary : currentTheme.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                {/* Selection Checkbox */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: `2px solid ${currentTheme.border}`,
                  backgroundColor: selectedComponents.has(component.id) ? currentTheme.primary : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {selectedComponents.has(component.id) && (
                    <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                  )}
                </div>

                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: currentTheme.text
                }}>
                  {component.name || component.displayName}
                </h3>

                <p style={{
                  margin: '0 0 12px 0',
                  fontSize: '12px',
                  color: currentTheme.textSecondary,
                  lineHeight: 1.4
                }}>
                  {component.description}
                </p>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    backgroundColor: `${currentTheme.primary}20`,
                    color: currentTheme.primary,
                    borderRadius: '4px'
                  }}>
                    {component.quality || 'quality'}
                  </span>
                  {component.tags?.slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        backgroundColor: `${currentTheme.border}`,
                        color: currentTheme.textSecondary,
                        borderRadius: '4px'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Import Result */}
                {importResults.has(component.id) && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    backgroundColor: importResults.get(component.id).success 
                      ? `${currentTheme.success}20` 
                      : `${currentTheme.danger}20`,
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}>
                    {importResults.get(component.id).success ? '✅ Imported' : '❌ Failed'}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      {selectedComponents.size > 0 && (
        <div style={{
          padding: '16px 24px',
          backgroundColor: currentTheme.surface,
          borderTop: `1px solid ${currentTheme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{
            fontSize: '12px',
            color: currentTheme.textSecondary
          }}>
            {selectedComponents.size} component{selectedComponents.size !== 1 ? 's' : ''} selected
          </span>

          <button
            onClick={activeTab === 'import' ? handleImport : handleExport}
            disabled={loading}
            style={{
              padding: '8px 24px',
              backgroundColor: currentTheme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Processing...' : (activeTab === 'import' ? 'Import Selected' : 'Export Selected')}
          </button>
        </div>
      )}
    </div>
  )
}