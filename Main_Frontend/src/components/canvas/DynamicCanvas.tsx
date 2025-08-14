import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  // Removed gridKey - using containerWidth and debounced updates instead for smoother rendering
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined) // Force width recalculation

  const tab = useMemo(() => currentLayout?.tabs.find(t => t.id === tabId), [currentLayout?.tabs, tabId])
  const isEditMode = tab?.editMode || false
  const prevEditModeRef = useRef(isEditMode)

  // Load components from tab configuration (prioritize tab over memory for live updates)
  useEffect(() => {
    
    if (tab?.components && tab.components.length > 0) {
      // Always use tab configuration when it has components
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
        }
      }
    }
  }, [tabId, tab?.components?.length])

  // Save current state - MOVED UP to fix temporal dead zone
  const saveLayoutToTab = useCallback((layout?: Layout[]) => {
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
  }, [components, layouts, tabId, updateTab, saveToMemory])

  // Update component positions based on layout
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
    // Only process layout changes when in edit mode
    if (!isEditMode) return
    
    // Update layouts for visual feedback
    setLayouts(allLayouts)
    
    // Only update component positions when NOT actively dragging/resizing
    if (!isDragging && !isResizing) {
      updateComponentPositions(layout)
    }
  }, [isDragging, isResizing, updateComponentPositions, isEditMode])

  // Drag handlers - prevent state updates during drag
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])
  
  const handleDragStop = useCallback((layout: Layout[]) => {
    setIsDragging(false)
    
    // Update positions and save immediately for better UX
    if (isEditMode) {
      // Update visual state
      setLayouts(prev => ({ ...prev, lg: layout }))
      updateComponentPositions(layout)
      
      // Save the drag immediately so it persists
      setTimeout(() => saveLayoutToTab(layout), 100)
    }
  }, [isEditMode, updateComponentPositions, saveLayoutToTab])

  // Resize handlers - prevent state updates during resize
  const handleResizeStart = useCallback(() => {
    setIsResizing(true)
  }, [])
  
  const handleResizeStop = useCallback((layout: Layout[]) => {
    setIsResizing(false)
    
    // Update positions and save immediately for better UX
    if (isEditMode) {
      // Update visual state
      setLayouts(prev => ({ ...prev, lg: layout }))
      updateComponentPositions(layout)
      
      // Save the resize immediately so it persists
      setTimeout(() => saveLayoutToTab(layout), 100)
    }
  }, [isEditMode, updateComponentPositions, saveLayoutToTab])

  // Save when exiting edit mode
  useEffect(() => {
    // If we were in edit mode and now we're not, save the layout
    if (prevEditModeRef.current && !isEditMode) {
      console.log('🔄 Exiting edit mode - saving layout to Cosmos DB', {
        tabId,
        componentCount: components.length,
        timestamp: new Date().toISOString()
      })
      saveLayoutToTab()
      
      // Also force a save to user memory for extra persistence
      setTimeout(() => {
        console.log('✅ Layout saved to Cosmos DB successfully')
      }, 500)
    }
    prevEditModeRef.current = isEditMode
  }, [isEditMode, saveLayoutToTab])

  // Add new component to canvas
  const addComponent = (componentMeta: ComponentMeta) => {
    const newInstance: ComponentInstance = {
      id: `${componentMeta.id}_${Date.now()}`,
      componentId: componentMeta.id,
      x: 0,
      y: 0,
      w: componentMeta.defaultSize.w,
      h: componentMeta.defaultSize.h
    }

    setComponents(prev => [...prev, newInstance])
    
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
    
    // Don't save when adding - wait for edit mode exit
  }

  // Remove component
  const removeComponent = (componentId: string) => {
    setComponents(prev => prev.filter(c => c.id !== componentId))
    setLayouts(prev => ({
      ...prev,
      lg: (prev.lg || []).filter(l => l.i !== componentId)
    }))
    // Save the change
    setTimeout(() => saveLayoutToTab(), 100)
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
        border: isEditMode 
          ? `1px solid ${currentTheme.primary}` 
          : `1px solid ${currentTheme.border}`,
        borderRadius: '4px',
        overflow: 'visible', // Allow 3D transforms
        transition: isDragging || isResizing ? 'none' : 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
        boxShadow: isEditMode 
          ? `0 2px 8px ${currentTheme.primary}20` 
          : `0 1px 4px rgba(0,0,0,0.04)`,
        transform: isEditMode ? 'scale(1.01)' : 'scale(1)',
        willChange: 'transform',
        cursor: 'auto',  // Normal cursor - drag only from handle
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Drag handle header - only in edit mode */}
      {isEditMode && (
        <div 
          className="drag-handle"
          style={{
            height: '24px',
            background: `linear-gradient(to right, ${currentTheme.primary}10, transparent)`,
            borderBottom: `1px solid ${currentTheme.border}`,
            borderRadius: '4px 4px 0 0',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            cursor: 'move',
            userSelect: 'none'
          }}
        >
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: currentTheme.text,
            opacity: 0.7
          }}>
            {componentInventory.getComponent(instance.componentId)?.displayName || 'Component'}
          </span>
        </div>
      )}
      
      {/* Component content */}
      <div style={{ flex: 1, position: 'relative' }}>
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
            // Save component props immediately for better UX
            setTimeout(() => saveLayoutToTab(), 100)
          }}
        />
      </div>
    </div>
  )), [components, currentTheme, isDragging, isResizing, isEditMode, removeComponent, saveLayoutToTab])

  // Set layout ready after initial render and measure initial container width
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLayoutReady(true)
      // Measure initial container width
      const dashboardContent = document.querySelector('.dashboard-content')
      if (dashboardContent) {
        const initialWidth = dashboardContent.clientWidth
        console.log('📏 Initial container width:', initialWidth)
        setContainerWidth(initialWidth)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [components.length])

  // Force re-render when window resizes (includes left panel toggle)
  useEffect(() => {
    const handleResize = () => {
      // Let ResponsiveGridLayout handle resize naturally
      console.log('🔄 Window resize detected')
    }
    
    // Listen for resize events
    window.addEventListener('resize', handleResize)
    
    // Debounced panel toggle handler to prevent flashing
    let panelToggleTimeout: NodeJS.Timeout | null = null
    
    const handlePanelToggle = () => {
      console.log('🔄 Panel toggle detected - using debounced update')
      
      // Clear any existing timeout to prevent multiple updates
      if (panelToggleTimeout) {
        clearTimeout(panelToggleTimeout)
      }
      
      // Single, debounced update after animation completes
      panelToggleTimeout = setTimeout(() => {
        const dashboardContent = document.querySelector('.dashboard-content')
        if (dashboardContent) {
          const newWidth = dashboardContent.clientWidth
          console.log('📏 Final container width measurement:', newWidth)
          
          // Single update instead of multiple
          setContainerWidth(newWidth)
          // Only trigger resize event, let ResponsiveGridLayout handle it naturally
          window.dispatchEvent(new Event('resize'))
        }
      }, 400) // Wait for CSS animation to complete (350ms + buffer)
    }
    window.addEventListener('panel-toggled', handlePanelToggle as any)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('panel-toggled', handlePanelToggle as any)
    }
  }, [])




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
        
        /* In edit mode, disable component interaction except for remove button */
        ${isEditMode ? `
          .grid-item .react-resizable-handle {
            pointer-events: auto !important;
          }
          
          /* Keep remove button always interactive */
          .grid-item button.remove-component {
            pointer-events: auto !important;
          }
        ` : `
          /* In normal mode, ensure all component interactions work */
          .grid-item {
            pointer-events: auto !important;
          }
          
          .grid-item * {
            pointer-events: auto !important;
          }
          
          /* Disable grid drag handle in normal mode */
          .react-grid-item > .react-resizable-handle {
            display: none !important;
          }
        `}
      `}</style>
      
      <div 
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: currentTheme.background,
          position: 'relative'
        }}
      >
      {/* Edit Mode Indicator */}
      {isEditMode && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          padding: '8px 16px',
          backgroundColor: `${currentTheme.primary}`,
          color: 'white',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          animation: 'pulse 2s infinite ease-in-out'
        }}>
          ✏️ EDIT MODE
        </div>
      )}

      {/* Removed floating Add Component button - use context menu or tab edit button instead */}

      {/* Canvas Area */}
      <div style={{
        height: '100%',
        width: '100%',
        padding: '4px',
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
          <div 
            key={`container-${containerWidth || 'auto'}`} // Stable key based on width only
            style={{ 
              height: '100%', 
              width: '100%', 
              position: 'relative',
              // Force layout recalculation
              minWidth: 0 
            }}
          >
          <ResponsiveGridLayout
            key={`grid-${containerWidth || 'auto'}`} // Stable key - only changes when width actually changes
            className={`layout ${isLayoutReady ? 'layout-ready' : ''}`}
            layouts={layouts.lg ? layouts : { lg: generateLayout }}
            onLayoutChange={handleLayoutChange}
            onDragStart={handleDragStart}
            onDragStop={handleDragStop}
            onResizeStart={handleResizeStart}
            onResizeStop={handleResizeStop}
            isDraggable={isEditMode}  // Only allow dragging in edit mode
            isResizable={isEditMode}  // Only allow resizing in edit mode
            useCSSTransforms={true}  // 6x faster paint performance
            transformScale={1}  // Important for smooth scaling
            margin={[1, 1]}
            containerPadding={[0, 0]}
            rowHeight={60}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            compactType="vertical"
            preventCollision={false}
            draggableHandle=".drag-handle"  // Only allow dragging from handle
            draggableCancel=".no-drag"  // Prevent dragging on specific elements like buttons
          >
            {gridChildren}
          </ResponsiveGridLayout>
          </div>
        )}
      </div>

      {/* Component Portal Modal */}
      <ComponentPortalModal
        isOpen={showComponentPortal}
        onClose={() => {
          setShowComponentPortal(false)
        }}
        onComponentSelect={(componentId) => {
          const meta = componentInventory.getComponent(componentId)
          
          if (meta) {
            addComponent(meta)
            setShowComponentPortal(false)
          } else {
            console.error('Component not found in inventory:', componentId)
          }
        }}
      />
      </div>
    </>
  )
}