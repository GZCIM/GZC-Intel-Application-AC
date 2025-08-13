import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Responsive, WidthProvider, Layout } from 'react-grid-layout'
import { useTheme } from '../../contexts/ThemeContext'
import { useTabLayout } from '../../core/tabs/TabLayoutManager'
import { useViewMemory } from '../../hooks/useViewMemory'
import { useDebouncedUserMemory } from '../../hooks/useUserMemory'
import { componentInventory, ComponentMeta } from '../../core/components/ComponentInventory'
import { ComponentRenderer } from './ComponentRenderer'
import { ComponentPortalModal } from '../ComponentPortalModal'
import '../../styles/analytics-dashboard.css'
import '../../styles/dynamic-canvas.css'

// Memoize WidthProvider for better performance (Context7 recommendation)
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
  const { saveLayout: saveLayoutDebounced } = useDebouncedUserMemory()
  const [components, setComponents] = useState<ComponentInstance[]>([])
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({})
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [showComponentPortal, setShowComponentPortal] = useState(false)
  const [isLayoutReady, setIsLayoutReady] = useState(false)

  const tab = useMemo(() => currentLayout?.tabs.find(t => t.id === tabId), [currentLayout?.tabs, tabId])
  const isEditMode = tab?.editMode || false
  
  console.log('DynamicCanvas render - tabId:', tabId, 'isEditMode:', isEditMode, 'components:', components.length)

  // Load components from tab configuration (prioritize tab over memory for live updates)
  useEffect(() => {
    console.log('DynamicCanvas useEffect - tab components:', tab?.components?.length, 'editMode:', tab?.editMode)
    console.log('FULL TAB OBJECT:', tab)
    
    if (tab?.components && tab.components.length > 0) {
      // Always use tab configuration when it has components
      console.log('Loading components from tab:', tab.components)
      console.log('WILL SET COMPONENTS TO:', tab.components.length, 'items')
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
    } else if (!tab?.components || tab.components.length === 0) {
      // Only load from memory if we don't already have components
      if (components.length === 0) {
        console.log('No tab components and no existing components, checking memory...')
        const memoryData = loadFromMemory(`dynamic-canvas-${tabId}`)
        if (memoryData && memoryData.components) {
          console.log('Loading components from memory:', memoryData.components.length)
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
        }
      } else {
        console.log('Tab has no components but canvas has', components.length, 'components - keeping them')
      }
    }
  }, [tabId, tab?.components?.length])

  // Update component positions based on layout - MOVED BEFORE handleLayoutChange to fix temporal dead zone
  const updateComponentPositions = useCallback((layout: Layout[]) => {
    setComponents(prev => prev.map(comp => {
      const layoutItem = layout.find(l => l.i === comp.id)
      if (layoutItem) {
        return {
          ...comp,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h
        }
      }
      return comp
    }))
  }, [])

  // Handle layout changes - ACTUALLY FIXED to prevent component disappearance
  const handleLayoutChange = useCallback((layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    console.log('📊 Layout change - isDragging:', isDragging, 'isResizing:', isResizing)
    
    // CRITICAL FIX: Always update layouts but don't trigger component re-renders during drag/resize
    setLayouts(allLayouts)
    
    // Only update component positions when NOT actively dragging/resizing
    if (!isDragging && !isResizing) {
      updateComponentPositions(layout)
    }
  }, [isDragging, isResizing, updateComponentPositions])

  // Drag handlers - prevent state updates during drag
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    console.log('🔄 Drag started - preventing state updates')
  }, [])
  
  const handleDragStop = useCallback((layout: Layout[]) => {
    setIsDragging(false)
    console.log('✅ Drag stopped - applying final layout')
    
    // Now safe to update state and save
    setLayouts(prev => ({ ...prev, lg: layout }))
    updateComponentPositions(layout)
    
    // Debounced save to prevent excessive database writes
    const layoutData = {
      components: components.map(comp => {
        const layoutItem = layout.find(l => l.i === comp.id)
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
      }),
      layouts: { lg: layout }
    }
    saveLayoutDebounced(`dynamic-canvas-${tabId}`, layoutData)
    
    // Also save to tab configuration
    saveLayoutToTab(layout)
  }, [components, tabId, updateComponentPositions, saveLayoutDebounced])

  // Resize handlers - prevent state updates during resize
  const handleResizeStart = useCallback(() => {
    setIsResizing(true)
    console.log('🔄 Resize started - preventing state updates')
  }, [])
  
  const handleResizeStop = useCallback((layout: Layout[]) => {
    setIsResizing(false)
    console.log('✅ Resize stopped - applying final layout')
    
    // Now safe to update state and save
    setLayouts(prev => ({ ...prev, lg: layout }))
    updateComponentPositions(layout)
    
    // Debounced save to prevent excessive database writes
    const layoutData = {
      components: components.map(comp => {
        const layoutItem = layout.find(l => l.i === comp.id)
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
      }),
      layouts: { lg: layout }
    }
    saveLayoutDebounced(`dynamic-canvas-${tabId}`, layoutData)
    
    // Also save to tab configuration
    saveLayoutToTab(layout)
  }, [components, tabId, updateComponentPositions, saveLayoutDebounced])

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
    console.log('🟢 DynamicCanvas.addComponent: Called with meta:', componentMeta)
    console.log('🟢 DynamicCanvas.addComponent: Current components:', components)
    
    const newInstance: ComponentInstance = {
      id: `${componentMeta.id}_${Date.now()}`,
      componentId: componentMeta.id,
      x: 0,
      y: 0,
      w: componentMeta.defaultSize.w,
      h: componentMeta.defaultSize.h
    }
    
    console.log('🟢 DynamicCanvas.addComponent: Creating new instance:', newInstance)

    setComponents(prev => {
      const updated = [...prev, newInstance]
      console.log('🟢 DynamicCanvas.addComponent: Updated components list:', updated)
      return updated
    })
    
    // Auto-add to layout with proper constraints
    const newLayoutItem = {
      i: newInstance.id,
      x: newInstance.x,
      y: newInstance.y,
      w: newInstance.w,
      h: newInstance.h,
      minW: componentMeta.minSize.w,
      minH: componentMeta.minSize.h,
      maxW: componentMeta.maxSize?.w || 12,
      maxH: componentMeta.maxSize?.h || 20,
      isDraggable: true,  // Allow dragging in all modes
      isResizable: true  // Allow resizing in all modes
    }

    setLayouts(prev => ({ 
      ...prev, 
      lg: [...(prev.lg || []), newLayoutItem] 
    }))
    
    if (!isEditMode) {
      saveLayoutToTab([...(layouts.lg || []), newLayoutItem])
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

  // Memoize layout generation to prevent infinite re-renders
  const generateLayout = useMemo((): Layout[] => {
    return components.map(comp => {
      const meta = componentInventory.getComponent(comp.componentId)
      return {
        i: comp.id,
        x: comp.x,
        y: comp.y,
        w: comp.w,
        h: comp.h,
        minW: meta?.minSize?.w || 2,
        minH: meta?.minSize?.h || 2,
        maxW: meta?.maxSize?.w || 12,
        maxH: meta?.maxSize?.h || 20,
        isDraggable: true,  // Allow dragging in all modes
        isResizable: true  // Allow resizing in all modes
      }
    })
  }, [components, isEditMode])

  // Memoize grid children to prevent hook order violations
  const gridChildren = useMemo(() => components.map(instance => (
    <div 
      key={instance.id}
      className="grid-item"  // Better control class
      style={{
        background: currentTheme.surface,
        border: `1px solid ${currentTheme.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transition: isDragging || isResizing ? 'none' : 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',  // Disable transition during drag for fluidity
        boxShadow: isEditMode 
          ? `0 4px 16px ${currentTheme.primary}20, 0 2px 8px rgba(0,0,0,0.1)` 
          : `0 2px 8px rgba(0,0,0,0.06)`,
        transform: isEditMode ? 'scale(1.02)' : 'scale(1)',
        willChange: 'transform',  // Optimize for transform animations
        cursor: 'move'  // Visual feedback
      }}
    >
      <ComponentRenderer
        componentId={instance.componentId}
        instanceId={instance.id}
        props={instance.props || {}}
        isEditMode={isEditMode}
        onRemove={() => removeComponent(instance.id)}
        onPropsUpdate={(newProps: Record<string, any>) => {
          setComponents(prev => prev.map(comp => 
            comp.id === instance.id 
              ? { ...comp, props: newProps }
              : comp
          ))
          // Trigger save after props update
          saveLayoutToTab()
        }}
      />
    </div>
  )), [components, currentTheme, isDragging, isResizing, isEditMode, removeComponent, saveLayoutToTab])

  // Set layout ready after initial render
  useEffect(() => {
    const timer = setTimeout(() => setIsLayoutReady(true), 100)
    return () => clearTimeout(timer)
  }, [components.length])




  return (
    <>
      {/* CSS Animations for smooth component transitions */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.8; }
          100% { opacity: 1; }
        }
        
        .react-grid-item {
          transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1) !important;
        }
        
        .react-grid-item.react-grid-placeholder {
          background: ${currentTheme.primary}20 !important;
          border: 2px dashed ${currentTheme.primary}60 !important;
          border-radius: 8px !important;
          opacity: 0.8 !important;
        }
      `}</style>
      
      <div 
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: currentTheme.background,
          position: 'relative'
        }}
      >
      {/* Floating Add Component Button - Always visible in edit mode */}
      {isEditMode && components.length > 0 && (
        <button
          onClick={() => setShowComponentPortal(true)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 1000,
            padding: '10px 20px',
            backgroundColor: currentTheme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
            animation: 'pulse 2s infinite'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = `0 4px 16px ${currentTheme.primary}40, 0 2px 8px rgba(0,0,0,0.2)`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          <span>➕</span> Add Component
        </button>
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
            className={`layout ${isLayoutReady ? 'layout-ready' : ''}`}
            layouts={layouts.lg ? layouts : { lg: generateLayout }}
            onLayoutChange={handleLayoutChange}
            onDragStart={handleDragStart}
            onDragStop={handleDragStop}
            onResizeStart={handleResizeStart}
            onResizeStop={handleResizeStop}
            isDraggable={true}  // Allow dragging in all modes
            isResizable={true}  // Allow resizing in all modes
            useCSSTransforms={true}  // 6x faster paint performance
            transformScale={1}  // Important for smooth scaling
            margin={[8, 8]}
            containerPadding={[0, 0]}
            rowHeight={60}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            compactType="vertical"
            preventCollision={false}
            draggableCancel=".no-drag"  // Prevent dragging on specific elements like buttons
          >
            {gridChildren}
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
          console.log('🔵 DynamicCanvas: Component selected:', componentId)
          console.log('🔵 DynamicCanvas: Getting component from inventory...')
          
          const allComponents = componentInventory.getAllComponents()
          console.log('🔵 DynamicCanvas: All inventory components:', allComponents.map(c => c.id))
          
          const meta = componentInventory.getComponent(componentId)
          console.log('🔵 DynamicCanvas: Component meta retrieved:', meta)
          
          if (meta) {
            console.log('✅ DynamicCanvas: Adding component to canvas:', meta)
            addComponent(meta)
            setShowComponentPortal(false)
            console.log('✅ DynamicCanvas: Component added successfully')
          } else {
            console.error('❌ DynamicCanvas: Component not found in inventory:', componentId)
            console.error('❌ DynamicCanvas: Available components in inventory:', allComponents.map(c => c.id))
          }
        }}
      />
      </div>
    </>
  )
}