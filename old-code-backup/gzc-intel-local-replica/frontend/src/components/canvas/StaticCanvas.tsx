import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { useTabLayout } from '../../core/tabs/TabLayoutManager'
import { useViewMemory } from '../../hooks/useViewMemory'
import { componentInventory, ComponentMeta } from '../../core/components/ComponentInventory'
import { ComponentRenderer } from './ComponentRenderer'
import { ComponentPortalModal } from '../ComponentPortalModal'

interface StaticCanvasProps {
  tabId: string
}

interface ComponentSlot {
  id: string
  x: number // percentage
  y: number // percentage
  width: number // percentage
  height: number // percentage
  componentId?: string
  locked?: boolean
}

const DEFAULT_LAYOUT: ComponentSlot[] = [
  { id: 'header', x: 0, y: 0, width: 100, height: 15, locked: true },
  { id: 'main-left', x: 0, y: 15, width: 60, height: 70 },
  { id: 'main-right', x: 60, y: 15, width: 40, height: 70 },
  { id: 'footer', x: 0, y: 85, width: 100, height: 15, locked: true }
]

export const StaticCanvas: React.FC<StaticCanvasProps> = ({ tabId }) => {
  const { currentTheme } = useTheme()
  const { currentLayout, updateTab } = useTabLayout()
  const { saveLayout: saveToMemory, loadLayout: loadFromMemory } = useViewMemory()
  const [slots, setSlots] = useState<ComponentSlot[]>(DEFAULT_LAYOUT)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [draggingSlot, setDraggingSlot] = useState<string | null>(null)
  const [resizingSlot, setResizingSlot] = useState<string | null>(null)
  const [showComponentPortal, setShowComponentPortal] = useState(false)

  const tab = currentLayout?.tabs.find(t => t.id === tabId)
  const isEditMode = tab?.editMode || false

  // Load layout from memory or tab configuration
  useEffect(() => {
    const loadLayout = async () => {
      // Try to load from memory first
      const memoryLayout = await loadFromMemory(`static-canvas-${tabId}`)
      if (memoryLayout) {
        setSlots(memoryLayout)
      } else if (tab?.components && tab.components.length > 0) {
        // Convert tab components to slots
        const loadedSlots = tab.components.map(comp => ({
          id: comp.id,
          x: comp.position.x,
          y: comp.position.y, 
          width: comp.position.w,
          height: comp.position.h,
          componentId: comp.type === 'empty' ? undefined : comp.type,
          locked: false
        }))
        setSlots(loadedSlots)
      }
    }
    loadLayout()
  }, [tabId, tab?.components])

  // Listen for save events from edit button
  useEffect(() => {
    const handleSaveEvent = (event: CustomEvent) => {
      if (event.detail.tabId === tabId) {
        saveLayout()
      }
    }

    window.addEventListener('save-static-tab', handleSaveEvent as EventListener)
    return () => window.removeEventListener('save-static-tab', handleSaveEvent as EventListener)
  }, [tabId, slots])

  // Manual save function (triggered by Save button)
  const saveLayout = async () => {
    const tabComponents = slots.map(slot => ({
      id: slot.id,
      type: slot.componentId || 'empty',
      position: {
        x: slot.x,
        y: slot.y,
        w: slot.width,
        h: slot.height
      },
      props: {},
      zIndex: 0
    }))

    // Save to tab configuration
    updateTab(tabId, { components: tabComponents })
    
    // Save to memory for persistence
    await saveToMemory(`static-canvas-${tabId}`, slots)
    
    setHasUnsavedChanges(false)
  }

  // Assign component to slot
  const assignComponent = (slotId: string, componentMeta: ComponentMeta) => {
    setSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, componentId: componentMeta.id }
        : slot
    ))
    setHasUnsavedChanges(true)
    setSelectedSlot(null)
  }

  // Add new slot
  const addSlot = () => {
    const newSlot: ComponentSlot = {
      id: `slot_${Date.now()}`,
      x: 10,
      y: 10,
      width: 30,
      height: 30,
      locked: false
    }
    setSlots(prev => [...prev, newSlot])
    setHasUnsavedChanges(true)
  }

  // Remove slot
  const removeSlot = (slotId: string) => {
    setSlots(prev => prev.filter(slot => slot.id !== slotId))
    setHasUnsavedChanges(true)
  }

  // Remove component from slot
  const removeComponent = (slotId: string) => {
    setSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, componentId: undefined }
        : slot
    ))
    setHasUnsavedChanges(true)
  }

  // Handle slot dragging
  const handleSlotDrag = (slotId: string, deltaX: number, deltaY: number) => {
    setSlots(prev => prev.map(slot => {
      if (slot.id === slotId && !slot.locked) {
        return {
          ...slot,
          x: Math.max(0, Math.min(100 - slot.width, slot.x + deltaX)),
          y: Math.max(0, Math.min(100 - slot.height, slot.y + deltaY))
        }
      }
      return slot
    }))
    setHasUnsavedChanges(true)
  }

  // Handle slot resizing
  const handleSlotResize = (slotId: string, deltaWidth: number, deltaHeight: number) => {
    setSlots(prev => prev.map(slot => {
      if (slot.id === slotId && !slot.locked) {
        return {
          ...slot,
          width: Math.max(10, Math.min(100 - slot.x, slot.width + deltaWidth)),
          height: Math.max(10, Math.min(100 - slot.y, slot.height + deltaHeight))
        }
      }
      return slot
    }))
    setHasUnsavedChanges(true)
  }

  // Render component in slot
  const renderSlotContent = (slot: ComponentSlot) => {
    if (!slot.componentId) {
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px dashed ${currentTheme.border}`,
          borderRadius: '8px',
          color: currentTheme.textSecondary,
          fontSize: '12px',
          textAlign: 'center',
          padding: '16px'
        }}>
          {isEditMode ? (
            <>
              <div>
                <div style={{ marginBottom: '8px', fontSize: '24px', opacity: 0.5 }}>📦</div>
                <div>Click to add component</div>
                <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>
                  Slot: {slot.id}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ marginBottom: '8px', fontSize: '24px', opacity: 0.3 }}>📄</div>
                <div>Empty slot</div>
              </div>
            </>
          )}
        </div>
      )
    }

    // Use ComponentRenderer for actual components
    return (
      <ComponentRenderer
        componentId={slot.componentId}
        instanceId={`${slot.id}_${slot.componentId}`}
        props={{}}
        isEditMode={isEditMode}
        onRemove={() => removeComponent(slot.id)}
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

      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 12px',
          backgroundColor: '#f59e0b',
          color: 'white',
          fontSize: '11px',
          borderRadius: '6px',
          zIndex: 999
        }}>
          ⚠️ Unsaved changes - Click Save to persist
        </div>
      )}

      {/* Add/Remove Slot Controls (Edit Mode) */}
      {isEditMode && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          display: 'flex',
          gap: '8px',
          zIndex: 1000
        }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addSlot}
            style={{
              padding: '8px 16px',
              backgroundColor: currentTheme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>➕</span> Add Slot
          </motion.button>
        </div>
      )}

      {/* Canvas Area */}
      <div style={{
        height: '100%',
        width: '100%',
        padding: '16px',
        position: 'relative'
      }}>
        {slots.map(slot => (
          <motion.div
            key={slot.id}
            drag={isEditMode && !slot.locked}
            dragMomentum={false}
            dragElastic={false}
            onDragEnd={(e, info) => {
              const container = e.currentTarget.parentElement
              if (!container) return
              const rect = container.getBoundingClientRect()
              const deltaX = (info.offset.x / rect.width) * 100
              const deltaY = (info.offset.y / rect.height) * 100
              handleSlotDrag(slot.id, deltaX, deltaY)
              setDraggingSlot(null)
            }}
            onDragStart={() => setDraggingSlot(slot.id)}
            onClick={() => {
              if (isEditMode && !slot.componentId) {
                setSelectedSlot(slot.id)
                setShowComponentPortal(true)
              }
            }}
            whileHover={isEditMode && !slot.componentId ? { scale: 1.02 } : {}}
            style={{
              position: 'absolute',
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.width}%`,
              height: `${slot.height}%`,
              cursor: isEditMode ? (slot.locked ? 'not-allowed' : 'move') : 'default',
              transition: draggingSlot === slot.id ? 'none' : 'all 0.2s ease'
            }}
          >
            {/* Slot Controls (Edit Mode) */}
            {isEditMode && (
              <>
                {/* Delete Button */}
                {!slot.locked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSlot(slot.id)
                    }}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: currentTheme.danger,
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10
                    }}
                  >
                    ×
                  </button>
                )}
                
                {/* Resize Handle */}
                {!slot.locked && (
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      setResizingSlot(slot.id)
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      width: '12px',
                      height: '12px',
                      backgroundColor: currentTheme.primary,
                      cursor: 'nwse-resize',
                      borderRadius: '2px'
                    }}
                  />
                )}
              </>
            )}
            
            {renderSlotContent(slot)}
          </motion.div>
        ))}

        {/* Empty State */}
        {slots.every(slot => !slot.componentId) && !isEditMode && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: currentTheme.textSecondary
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
              Static Canvas
            </div>
            <div style={{ fontSize: '12px', maxWidth: '300px' }}>
              This tab uses a fixed layout. Click Edit to assign components to specific slots.
            </div>
          </div>
        )}
      </div>

      {/* Component Portal Modal */}
      <ComponentPortalModal
        isOpen={showComponentPortal}
        onClose={() => {
          setShowComponentPortal(false)
          setSelectedSlot(null)
        }}
        onComponentSelect={(componentId) => {
          if (selectedSlot) {
            const meta = componentInventory.getComponent(componentId)
            if (meta) {
              assignComponent(selectedSlot, meta)
            }
          }
          setShowComponentPortal(false)
          setSelectedSlot(null)
        }}
      />
    </div>
  )
}