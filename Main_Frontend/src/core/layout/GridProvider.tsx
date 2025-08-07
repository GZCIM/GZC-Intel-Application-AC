import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { GridState, GridLayout, GridItem, GridContextValue, GridBreakpoints, GridColumns } from './types'

// Default breakpoints and columns
const defaultBreakpoints: GridBreakpoints = {
  xxl: 1400,
  xl: 1200,
  lg: 992,
  md: 768,
  sm: 576,
  xs: 480
}

const defaultColumns: GridColumns = {
  xxl: 12,
  xl: 12,
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4
}

// Grid reducer
type GridAction =
  | { type: 'SET_LAYOUT'; payload: string }
  | { type: 'CREATE_LAYOUT'; payload: GridLayout }
  | { type: 'UPDATE_LAYOUT'; payload: { id: string; updates: Partial<GridLayout> } }
  | { type: 'DELETE_LAYOUT'; payload: string }
  | { type: 'ADD_ITEM'; payload: GridItem }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<GridItem> } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'SET_BREAKPOINT'; payload: string }
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'SET_RESIZING'; payload: boolean }
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'TOGGLE_PREVIEW_MODE' }
  | { type: 'LOAD_PERSISTED_STATE'; payload: Partial<GridState> }

const gridReducer = (state: GridState, action: GridAction): GridState => {
  switch (action.type) {
    case 'SET_LAYOUT':
      return {
        ...state,
        currentLayout: action.payload
      }

    case 'CREATE_LAYOUT':
      const newLayouts = new Map(state.layouts)
      newLayouts.set(action.payload.id, action.payload)
      return {
        ...state,
        layouts: newLayouts,
        currentLayout: action.payload.id
      }

    case 'UPDATE_LAYOUT':
      const updatedLayouts = new Map(state.layouts)
      const existingLayout = updatedLayouts.get(action.payload.id)
      if (existingLayout) {
        updatedLayouts.set(action.payload.id, {
          ...existingLayout,
          ...action.payload.updates,
          updatedAt: new Date()
        })
      }
      return {
        ...state,
        layouts: updatedLayouts
      }

    case 'DELETE_LAYOUT':
      const filteredLayouts = new Map(state.layouts)
      filteredLayouts.delete(action.payload)
      return {
        ...state,
        layouts: filteredLayouts,
        currentLayout: state.currentLayout === action.payload ? 
          Array.from(filteredLayouts.keys())[0] || '' : state.currentLayout
      }

    case 'ADD_ITEM':
      const currentLayoutForAdd = state.layouts.get(state.currentLayout)
      if (!currentLayoutForAdd) return state

      const layoutWithNewItem = {
        ...currentLayoutForAdd,
        items: [...currentLayoutForAdd.items, action.payload],
        updatedAt: new Date()
      }

      const layoutsWithNewItem = new Map(state.layouts)
      layoutsWithNewItem.set(state.currentLayout, layoutWithNewItem)

      return {
        ...state,
        layouts: layoutsWithNewItem
      }

    case 'UPDATE_ITEM':
      const currentLayoutForUpdate = state.layouts.get(state.currentLayout)
      if (!currentLayoutForUpdate) return state

      const updatedItems = currentLayoutForUpdate.items.map(item =>
        item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
      )

      const layoutWithUpdatedItem = {
        ...currentLayoutForUpdate,
        items: updatedItems,
        updatedAt: new Date()
      }

      const layoutsWithUpdatedItem = new Map(state.layouts)
      layoutsWithUpdatedItem.set(state.currentLayout, layoutWithUpdatedItem)

      return {
        ...state,
        layouts: layoutsWithUpdatedItem
      }

    case 'REMOVE_ITEM':
      const currentLayoutForRemove = state.layouts.get(state.currentLayout)
      if (!currentLayoutForRemove) return state

      const filteredItems = currentLayoutForRemove.items.filter(item => item.id !== action.payload)

      const layoutWithRemovedItem = {
        ...currentLayoutForRemove,
        items: filteredItems,
        updatedAt: new Date()
      }

      const layoutsWithRemovedItem = new Map(state.layouts)
      layoutsWithRemovedItem.set(state.currentLayout, layoutWithRemovedItem)

      return {
        ...state,
        layouts: layoutsWithRemovedItem
      }

    case 'SET_BREAKPOINT':
      return {
        ...state,
        breakpoint: action.payload
      }

    case 'SET_DRAGGING':
      return {
        ...state,
        isDragging: action.payload
      }

    case 'SET_RESIZING':
      return {
        ...state,
        isResizing: action.payload
      }

    case 'TOGGLE_EDIT_MODE':
      return {
        ...state,
        editMode: !state.editMode
      }

    case 'TOGGLE_PREVIEW_MODE':
      return {
        ...state,
        previewMode: !state.previewMode
      }

    case 'LOAD_PERSISTED_STATE':
      return {
        ...state,
        ...action.payload
      }

    default:
      return state
  }
}

// Create default layout
const createDefaultLayout = (): GridLayout => ({
  id: 'default',
  name: 'Default Layout',
  description: 'Default dashboard layout',
  items: [],
  breakpoints: defaultBreakpoints,
  cols: defaultColumns,
  rowHeight: 60,
  margin: [10, 10],
  containerPadding: [10, 10],
  compactType: 'vertical',
  preventCollision: false,
  isDraggable: true,
  isResizable: true,
  useCSSTransforms: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDefault: true
})

const initialState: GridState = {
  layouts: new Map([['default', createDefaultLayout()]]),
  currentLayout: 'default',
  breakpoint: 'lg',
  isDragging: false,
  isResizing: false,
  editMode: false,
  previewMode: false
}

const GridContext = createContext<GridContextValue | undefined>(undefined)

interface GridProviderProps {
  children: ReactNode
  persistenceKey?: string
}

export function GridProvider({ children, persistenceKey = 'gzc-intel-grid' }: GridProviderProps) {
  const [state, dispatch] = useReducer(gridReducer, initialState)

  // Load persisted state
  useEffect(() => {
    try {
      const persisted = localStorage.getItem(persistenceKey)
      if (persisted) {
        const parsed = JSON.parse(persisted)
        // Convert layout entries back to Map
        if (parsed.layouts) {
          parsed.layouts = new Map(parsed.layouts)
        }
        dispatch({ type: 'LOAD_PERSISTED_STATE', payload: parsed })
      }
    } catch (error) {
      console.warn('Failed to load persisted grid state:', error)
    }
  }, [persistenceKey])

  // Persist state changes
  useEffect(() => {
    try {
      const toStore = {
        ...state,
        layouts: Array.from(state.layouts.entries())
      }
      localStorage.setItem(persistenceKey, JSON.stringify(toStore))
    } catch (error) {
      console.warn('Failed to persist grid state:', error)
    }
  }, [state, persistenceKey])

  const contextValue: GridContextValue = {
    state,
    currentLayout: state.layouts.get(state.currentLayout) || null,
    
    setLayout: (layoutId: string) => {
      dispatch({ type: 'SET_LAYOUT', payload: layoutId })
    },

    createLayout: (layout: Omit<GridLayout, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = `layout-${Date.now()}`
      const newLayout: GridLayout = {
        ...layout,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      dispatch({ type: 'CREATE_LAYOUT', payload: newLayout })
      return id
    },

    updateLayout: (layoutId: string, updates: Partial<GridLayout>) => {
      dispatch({ type: 'UPDATE_LAYOUT', payload: { id: layoutId, updates } })
    },

    deleteLayout: (layoutId: string) => {
      dispatch({ type: 'DELETE_LAYOUT', payload: layoutId })
    },

    duplicateLayout: (layoutId: string, newName: string) => {
      const layout = state.layouts.get(layoutId)
      if (!layout) return ''

      const newId = `layout-${Date.now()}`
      const duplicatedLayout: GridLayout = {
        ...layout,
        id: newId,
        name: newName,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      }
      dispatch({ type: 'CREATE_LAYOUT', payload: duplicatedLayout })
      return newId
    },

    addItem: (item: Omit<GridItem, 'id'>) => {
      const id = `item-${Date.now()}`
      const newItem: GridItem = { ...item, id }
      dispatch({ type: 'ADD_ITEM', payload: newItem })
    },

    updateItem: (itemId: string, updates: Partial<GridItem>) => {
      dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, updates } })
    },

    removeItem: (itemId: string) => {
      dispatch({ type: 'REMOVE_ITEM', payload: itemId })
    },

    moveItem: (itemId: string, x: number, y: number) => {
      dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, updates: { x, y } } })
    },

    resizeItem: (itemId: string, w: number, h: number) => {
      dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, updates: { w, h } } })
    },

    toggleEditMode: () => {
      dispatch({ type: 'TOGGLE_EDIT_MODE' })
    },

    togglePreviewMode: () => {
      dispatch({ type: 'TOGGLE_PREVIEW_MODE' })
    },

    saveLayout: (layoutId: string) => {
      // This would typically sync with a backend
      console.log('Saving layout:', layoutId)
    },

    loadLayout: (layoutId: string) => {
      // This would typically load from a backend
      console.log('Loading layout:', layoutId)
    },

    exportLayout: (layoutId: string) => {
      const layout = state.layouts.get(layoutId)
      if (!layout) return ''
      return JSON.stringify(layout, null, 2)
    },

    importLayout: (layoutData: string) => {
      try {
        const layout = JSON.parse(layoutData)
        const id = `imported-${Date.now()}`
        const importedLayout: GridLayout = {
          ...layout,
          id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        dispatch({ type: 'CREATE_LAYOUT', payload: importedLayout })
        return id
      } catch (error) {
        console.error('Failed to import layout:', error)
        return ''
      }
    },

    resetLayout: (layoutId: string) => {
      const layout = state.layouts.get(layoutId)
      if (!layout) return

      const resetLayout: GridLayout = {
        ...layout,
        items: [],
        updatedAt: new Date()
      }
      dispatch({ type: 'UPDATE_LAYOUT', payload: { id: layoutId, updates: resetLayout } })
    },

    getAvailableLayouts: () => Array.from(state.layouts.values()),

    getLayoutsByCategory: (category: string) => 
      Array.from(state.layouts.values()).filter(layout => layout.category === category)
  }

  return (
    <GridContext.Provider value={contextValue}>
      {children}
    </GridContext.Provider>
  )
}

export function useGrid() {
  const context = useContext(GridContext)
  if (!context) {
    throw new Error('useGrid must be used within a GridProvider')
  }
  return context
}