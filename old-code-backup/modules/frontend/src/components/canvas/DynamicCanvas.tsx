import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Responsive, WidthProvider, Layout } from 'react-grid-layout'
import { useTheme } from '../../contexts/ThemeContext'
import { useTabLayout } from '../../core/tabs/TabLayoutManager'
import { useViewMemory } from '../../hooks/useViewMemory'
import { componentInventory, ComponentMeta } from '../../core/components/ComponentInventory'
import { ComponentRenderer } from './ComponentRenderer'
import { ComponentPortalModal } from '../ComponentPortalModal'

const ResponsiveGridLayout = WidthProvider(Responsive)

interface DynamicCanvasProps {
  tabId: string
}

interface ComponentInstance {
  id: string // unique instance ID
  componentId: string // reference to ComponentMeta
  x: number
  y: number
  w: number
  h: number
  props?: Record<string, any> // Component-specific props
  component?: React.ComponentType<any>
}

export const DynamicCanvas: React.FC<DynamicCanvasProps> = ({ tabId }) => {
  const { currentTheme } = useTheme()
  const { currentLayout, updateTab } = useTabLayout()
  const { saveLayout: saveToMemory, getLayout: loadFromMemory } = useViewMemory()
  const [components, setComponents] = useState<ComponentInstance[]>([])
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({})
  const [isDragging, setIsDragging] = useState(false)
  const [showComponentPortal, setShowComponentPortal] = useState(false)

  const tab = currentLayout?.tabs.find(t => t.id === tabId)
  const isEditMode = tab?.editMode || false

  // Load components from memory or tab configuration
  useEffect(() => {
    // Try to load from memory first
    const memoryData = loadFromMemory(`dynamic-canvas-${tabId}`)
    if (memoryData && memoryData.components) {
      const loadedComponents = memoryData.components.map((comp: any) => ({
        id: comp.id,
        componentId: comp.type,
        x: comp.position.x,
        y: comp.position.y,
        w: comp.position.w,
        h: comp.position.h,
        props: comp.props || {}
      }))
      setComponents(loadedComponents)
      if (memoryData.layouts) {
        setLayouts(memoryData.layouts)
      }
    } else if (tab?.components) {
      // Fall back to tab configuration
      const loadedComponents = tab.components.map(comp => ({
        id: comp.id,
        componentId: comp.type,
        x: comp.position.x,
        y: comp.position.y,
        w: comp.position.w,
        h: comp.position.h,
        props: comp.props || {}
      }))
      setComponents(loadedComponents)
    }
  }, [tabId, tab?.components, loadFromMemory])

  // Handle layout changes
  const handleLayoutChange = (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts)
    // Always save for dynamic tabs (auto-save feature)
    saveLayoutToTab(layout)
  }

  // Save current state
  const saveLayoutToTab = (layout?: Layout[]) => {
    const currentLayout = layout || layouts.lg || []
    
    const tabComponents = components.map(comp => {
      const layoutItem = currentLayout.find(l => l.i === comp.id)
      return {
        id: comp.id,
        type: comp.componentId,
        position: {
          x: layoutItem?.x || comp.x,
          y: layoutItem?.y || comp.y,
          w: layoutItem?.w || comp.w,
          h: layoutItem?.h || comp.h
        },
        props: comp.props || {},
        zIndex: 0
      }
    })

    // Save to tab configuration
    updateTab(tabId, { components: tabComponents })
    
    // Also save to memory for persistence
    saveToMemory(`dynamic-canvas-${tabId}`, {
      components: tabComponents,
      layouts: layouts
    })
  }

  // Add new component to canvas
  const addComponent = (componentMeta: ComponentMeta) => {
    console.log('DynamicCanvas: Adding component:', componentMeta)
    
    const newInstance: ComponentInstance = {
      id: `${componentMeta.id}_${Date.now()}`,
      componentId: componentMeta.id,
      x: 0,
      y: 0,
      w: componentMeta.defaultSize.w,
      h: componentMeta.defaultSize.h
    }

    setComponents(prev => [...prev, newInstance])
    
    // Auto-add to layout
    const newLayout = [...(layouts.lg || []), {
      i: newInstance.id,
      x: newInstance.x,
      y: newInstance.y,
      w: newInstance.w,
      h: newInstance.h,
      minW: componentMeta.minSize.w,
      minH: componentMeta.minSize.h,
      maxW: componentMeta.maxSize?.w,
      maxH: componentMeta.maxSize?.h
    }]

    setLayouts(prev => ({ ...prev, lg: newLayout }))
    
    if (!isEditMode) {
      saveLayoutToTab(newLayout)
    }
  }

  // Remove component
  const removeComponent = (componentId: string) => {
    setComponents(prev => prev.filter(c => c.id !== componentId))
    setLayouts(prev => ({
      ...prev,
      lg: (prev.lg || []).filter(l => l.i !== componentId)
    }))
  }

  // Generate layout from components
  const generateLayout = (): Layout[] => {
    return components.map(comp => ({
      i: comp.id,
      x: comp.x,
      y: comp.y,
      w: comp.w,
      h: comp.h,
      minW: 1,
      minH: 1
    }))
  }


  // Component instance wrapper
  const ComponentInstanceWrapper: React.FC<{ instance: ComponentInstance }> = ({ instance }) => {
    const handlePropsUpdate = (newProps: Record<string, any>) => {
      setComponents(prev => prev.map(comp => 
        comp.id === instance.id 
          ? { ...comp, props: newProps }
          : comp
      ))
      // Trigger save after props update
      saveLayoutToTab()
    }

    return (
      <ComponentRenderer
        componentId={instance.componentId}
        instanceId={instance.id}
        props={instance.props || {}}
        isEditMode={isEditMode}
        onRemove={() => removeComponent(instance.id)}
        onPropsUpdate={handlePropsUpdate}
      />
    )
  }

  return (
    <div style={{
      height: '100%',
      width: '100%',
      backgroundColor: currentTheme.background,
      position: 'relative'
    }}>
      {/* Edit/Save Button is rendered by EnhancedComponentLoader, not here */}
      
      {/* Add Component Button (Edit Mode) */}
      {isEditMode && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            console.log('DynamicCanvas: Opening component portal')
            setShowComponentPortal(true)
          }}
          style={{
            position: 'absolute',
            top: '60px',
            right: '12px',
            padding: '8px 16px',
            backgroundColor: currentTheme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          <span>➕</span> Add Component
        </motion.button>
      )}

      {/* Canvas Area */}
      <div style={{
        height: '100%',
        width: '100%',
        padding: '16px',
        overflow: 'hidden'
      }}>
        {components.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
            color: currentTheme.textSecondary
          }}>
            <div style={{ fontSize: '48px', opacity: 0.3 }}>📊</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              Dynamic Canvas
            </div>
            <div style={{ fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
              {isEditMode 
                ? 'Click "Add Component" button to add components. Drag and resize to arrange them.'
                : 'Click Edit to add and arrange components. Changes auto-save.'
              }
            </div>
            {isEditMode && (
              <button
                onClick={() => setShowComponentPortal(true)}
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  backgroundColor: currentTheme.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>➕</span> Add Your First Component
              </button>
            )}
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            onDragStart={() => setIsDragging(true)}
            onDragStop={() => setIsDragging(false)}
            onResizeStart={() => setIsDragging(true)}
            onResizeStop={() => setIsDragging(false)}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            margin={[8, 8]}
            containerPadding={[0, 0]}
            rowHeight={60}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          >
            {components.map(instance => (
              <div key={instance.id} style={{
                background: currentTheme.surface,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <ComponentInstanceWrapper instance={instance} />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Component Portal Modal */}
      <ComponentPortalModal
        isOpen={showComponentPortal}
        onClose={() => {
          console.log('DynamicCanvas: Closing component portal')
          setShowComponentPortal(false)
        }}
        onComponentSelect={(componentId) => {
          console.log('DynamicCanvas: Component selected:', componentId)
          const meta = componentInventory.getComponent(componentId)
          if (meta) {
            addComponent(meta)
            setShowComponentPortal(false)
          } else {
            console.error('DynamicCanvas: Component not found in inventory:', componentId)
          }
        }}
      />
    </div>
  )
}