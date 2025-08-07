import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { TabManager, setupConsoleHelpers } from './TabUtils'
import { useUserSettings } from '../../hooks/useUserSettings'
import { useViewMemory } from '../../hooks/useViewMemory'
import { TabCreationModal } from '../../components/TabCreationModal'
import { stateManager } from '../../services/StateManager'
import { useUser } from '../../contexts/UserContext'

// Component in tab configuration for dynamic tabs
export interface ComponentInTab {
  id: string
  type: string // Component type from inventory
  position: { x: number; y: number; w: number; h: number }
  props?: Record<string, any>
  zIndex?: number
}

// Tab configuration types with hybrid architecture support
export interface TabConfig {
  id: string
  name: string
  component: string // Component identifier to load
  type: 'dynamic' | 'static' // Only two types: dynamic or static
  icon?: string
  closable?: boolean
  props?: Record<string, any>
  gridLayoutEnabled?: boolean // Enable fluid grid layout for this tab
  gridLayout?: any[] // Store react-grid-layout configuration
  components?: ComponentInTab[] // For dynamic tabs with multiple components
  editMode?: boolean // Whether tab is in edit mode
  memoryStrategy?: 'local' | 'redis' | 'hybrid' // Memory management strategy
}

export interface TabLayout {
  id: string
  name: string
  tabs: TabConfig[]
  isDefault?: boolean
  createdAt: string
  updatedAt: string
}

interface TabLayoutContextValue {
  // Current state
  currentLayout: TabLayout | null
  activeTabId: string | null
  
  // Layout management
  layouts: TabLayout[]
  defaultLayout: TabLayout | null
  userLayouts: TabLayout[]
  
  // Actions
  setActiveTab: (tabId: string) => void
  addTab: (tab: Omit<TabConfig, 'id'>) => TabConfig
  removeTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<TabConfig>) => void
  reorderTabs: (newTabs: TabConfig[]) => void
  
  // Enhanced tab creation with modal
  createTabWithPrompt: () => void
  showTabModal: boolean
  setShowTabModal: (show: boolean) => void
  handleCreateTab: (title: string, type: string) => void
  
  // Layout actions
  saveCurrentLayout: (name: string) => void
  loadLayout: (layoutId: string) => void
  deleteLayout: (layoutId: string) => void
  resetToDefault: () => void
  
  // Grid layout actions
  updateTabGridLayout: (tabId: string, gridLayout: any[]) => void
  toggleTabGridLayout: (tabId: string, enabled: boolean) => void
  
  // Dynamic tab component management
  addComponentToTab: (tabId: string, component: ComponentInTab) => void
  removeComponentFromTab: (tabId: string, componentId: string) => void
  updateComponentInTab: (tabId: string, componentId: string, updates: Partial<ComponentInTab>) => void
  
  // Edit mode management
  toggleTabEditMode: (tabId: string) => void
}

// Default tabs configuration with hybrid types
const DEFAULT_TABS: TabConfig[] = [
  {
    id: 'analytics',
    name: 'Analytics',
    component: 'Analytics',
    type: 'dynamic',
    icon: 'bar-chart-2',
    closable: true,  // Changed to true so Edit button appears
    gridLayoutEnabled: true,
    components: [],
    memoryStrategy: 'hybrid'
  },
  {
    id: 'documentation',
    name: 'Documentation',
    component: 'Documentation',
    type: 'static',
    icon: 'book-open',
    closable: false,
    gridLayoutEnabled: false,
    memoryStrategy: 'local'
  }
]

const DEFAULT_LAYOUT: TabLayout = {
  id: 'default',
  name: 'Default Layout',
  tabs: DEFAULT_TABS,
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

const TabLayoutContext = createContext<TabLayoutContextValue | undefined>(undefined)

export function useTabLayout() {
  const context = useContext(TabLayoutContext)
  if (!context) {
    throw new Error('useTabLayout must be used within TabLayoutProvider')
  }
  return context
}

interface TabLayoutProviderProps {
  children: ReactNode
}

export function TabLayoutProvider({ children }: TabLayoutProviderProps) {
  const { user } = useUser()
  const userId = user?.id || 'default-user'

  // Helper function to get user-specific localStorage key
  const getUserKey = (key: string) => `${key}-${userId}`

  const [layouts, setLayouts] = useState<TabLayout[]>([DEFAULT_LAYOUT])
  const [currentLayout, setCurrentLayout] = useState<TabLayout>(DEFAULT_LAYOUT)
  const [activeTabId, setActiveTabId] = useState<string>('analytics')
  const [showTabModal, setShowTabModal] = useState(false)
  const { saveTabOrder, saveActiveTab, saveLayout } = useViewMemory()

  // Load saved layouts from localStorage when user changes
  useEffect(() => {
    console.log(`TabLayoutManager: Loading layouts for user ${userId}`)
    
    // First, load all saved layouts for this user
    let allLayouts = [DEFAULT_LAYOUT]
    const savedLayouts = localStorage.getItem(getUserKey('gzc-intel-layouts'))
    if (savedLayouts) {
      try {
        const parsed = JSON.parse(savedLayouts)
        console.log(`TabLayoutManager: Found saved layouts for user ${userId}:`, parsed)
        allLayouts = [DEFAULT_LAYOUT, ...parsed]
        setLayouts(allLayouts)
      } catch (e) {
        console.error('Failed to load saved layouts:', e)
      }
    } else {
      console.log(`TabLayoutManager: No saved layouts for user ${userId}, using defaults`)
      setLayouts([DEFAULT_LAYOUT])
    }

    // Load the current layout with all its tabs for this user
    let layoutToUse = DEFAULT_LAYOUT
    const savedCurrentLayoutStr = localStorage.getItem(getUserKey('gzc-intel-current-layout'))
    
    if (savedCurrentLayoutStr) {
      try {
        const parsedCurrentLayout = JSON.parse(savedCurrentLayoutStr)
        console.log(`TabLayoutManager: Restoring current layout for user ${userId}:`, parsedCurrentLayout)
        layoutToUse = parsedCurrentLayout
        setCurrentLayout(parsedCurrentLayout)
      } catch (e) {
        console.error('Failed to load current layout:', e)
      }
    } else {
      // Fallback: try to load by ID
      const lastLayoutId = localStorage.getItem(getUserKey('gzc-intel-active-layout'))
      if (lastLayoutId && lastLayoutId !== 'default') {
        const savedLayout = allLayouts.find(l => l.id === lastLayoutId)
        if (savedLayout) {
          console.log(`TabLayoutManager: Loading layout by ID for user ${userId}:`, savedLayout)
          layoutToUse = savedLayout
          setCurrentLayout(savedLayout)
        }
      } else {
        // No saved layout, use default
        setCurrentLayout(DEFAULT_LAYOUT)
      }
    }

    // Set initial active tab based on what layout we ended up with
    const lastActiveTab = sessionStorage.getItem(getUserKey('gzc-intel-active-tab'))
    if (lastActiveTab && layoutToUse.tabs.some((t: TabConfig) => t.id === lastActiveTab)) {
      setActiveTabId(lastActiveTab)
    } else if (layoutToUse.tabs.length > 0) {
      setActiveTabId(layoutToUse.tabs[0].id)
    }
  }, [userId]) // Re-run when user changes

  // Save layouts to localStorage whenever they change
  useEffect(() => {
    const userLayouts = layouts.filter(l => !l.isDefault)
    localStorage.setItem(getUserKey('gzc-intel-layouts'), JSON.stringify(userLayouts))
    // Trigger global state save
    stateManager.autoSave()
  }, [layouts, userId])

  // Save current layout ID and the layout itself
  useEffect(() => {
    localStorage.setItem(getUserKey('gzc-intel-active-layout'), currentLayout.id)
    // Also save the current layout data
    localStorage.setItem(getUserKey('gzc-intel-current-layout'), JSON.stringify(currentLayout))
    stateManager.autoSave()
  }, [currentLayout, userId])

  // Save active tab
  useEffect(() => {
    if (activeTabId) {
      sessionStorage.setItem(getUserKey('gzc-intel-active-tab'), activeTabId)
    }
  }, [activeTabId, userId])

  const defaultLayout = layouts.find(l => l.isDefault) || DEFAULT_LAYOUT
  const userLayouts = layouts.filter(l => !l.isDefault)

  const addTab = (tab: Omit<TabConfig, 'id'>) => {
    const newTab: TabConfig = {
      ...tab,
      id: uuidv4()
    }
    
    const updatedLayout = {
      ...currentLayout,
      tabs: [...currentLayout.tabs, newTab],
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Update in layouts array
    if (currentLayout.isDefault) {
      // For default layout, we need to update it in the layouts array
      // to ensure the modified default is saved
      setLayouts(layouts.map(l => l.id === 'default' ? updatedLayout : l))
    } else {
      // For user layouts, update normally
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
    
    // Force save current layout immediately
    localStorage.setItem(getUserKey('gzc-intel-current-layout'), JSON.stringify(updatedLayout))
    
    // Set as active tab
    setActiveTabId(newTab.id)
    
    // Return the new tab
    return newTab
  }

  // Initialize TabManager with addTab function
  useEffect(() => {
    TabManager.setAddTabFunction(addTab)
    setupConsoleHelpers()
  }, [addTab])

  const removeTab = (tabId: string) => {
    // Don't allow removing the last tab or non-closable tabs
    const tab = currentLayout.tabs.find(t => t.id === tabId)
    if (!tab || tab.closable === false || currentLayout.tabs.length === 1) {
      return
    }
    
    const updatedTabs = currentLayout.tabs.filter(t => t.id !== tabId)
    const updatedLayout = {
      ...currentLayout,
      tabs: updatedTabs,
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Update in layouts array if it's a saved layout
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
    
    // If we removed the active tab, switch to first available
    if (activeTabId === tabId && updatedTabs.length > 0) {
      setActiveTabId(updatedTabs[0].id)
    }
  }

  const updateTab = (tabId: string, updates: Partial<TabConfig>) => {
    const updatedLayout = {
      ...currentLayout,
      tabs: currentLayout.tabs.map(t => 
        t.id === tabId ? { ...t, ...updates } : t
      ),
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Update in layouts array if it's a saved layout
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
  }

  const saveCurrentLayout = (name: string) => {
    const newLayout: TabLayout = {
      id: uuidv4(),
      name,
      tabs: currentLayout.tabs,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setLayouts([...layouts, newLayout])
    setCurrentLayout(newLayout)
  }

  const loadLayout = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId)
    if (layout) {
      setCurrentLayout(layout)
      // Set first tab as active
      if (layout.tabs.length > 0) {
        setActiveTabId(layout.tabs[0].id)
      }
    }
  }

  const deleteLayout = (layoutId: string) => {
    // Can't delete default layout
    const layout = layouts.find(l => l.id === layoutId)
    if (!layout || layout.isDefault) {
      return
    }
    
    setLayouts(layouts.filter(l => l.id !== layoutId))
    
    // If we deleted the current layout, switch to default
    if (currentLayout.id === layoutId) {
      setCurrentLayout(defaultLayout)
      setActiveTabId(defaultLayout.tabs[0]?.id || '')
    }
  }

  const resetToDefault = () => {
    setCurrentLayout(defaultLayout)
    setActiveTabId(defaultLayout.tabs[0]?.id || '')
  }

  const reorderTabs = (newTabs: TabConfig[]) => {
    const updatedLayout = {
      ...currentLayout,
      tabs: newTabs,
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Update in layouts array if it's a saved layout
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
  }

  const updateTabGridLayout = (tabId: string, gridLayout: any[]) => {
    const updatedLayout = {
      ...currentLayout,
      tabs: currentLayout.tabs.map(t => 
        t.id === tabId ? { ...t, gridLayout } : t
      ),
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Update in layouts array if it's a saved layout
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
  }

  const toggleTabGridLayout = (tabId: string, enabled: boolean) => {
    const updatedLayout = {
      ...currentLayout,
      tabs: currentLayout.tabs.map(t => 
        t.id === tabId ? { ...t, gridLayoutEnabled: enabled } : t
      ),
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Update in layouts array if it's a saved layout
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
  }

  // Enhanced tab creation with modal - opens in edit mode by default
  const createTabWithPrompt = () => {
    setShowTabModal(true)
  }

  const handleCreateTab = (title: string, selectedType: string) => {
    // Check for duplicate names
    const existingTab = currentLayout.tabs.find(t => t.name.toLowerCase() === title.toLowerCase())
    if (existingTab) {
      alert(`Tab name "${title}" already exists. Please choose a different name.`)
      return
    }
    
    const newTab: Omit<TabConfig, 'id'> = {
      name: title,
      component: 'UserTabContainer', // Fixed component ID for all user tabs
      type: selectedType as TabConfig['type'],
      icon: getIconForTabType(selectedType as TabConfig['type']),
      closable: true,
      gridLayoutEnabled: selectedType === 'dynamic',
      components: selectedType === 'dynamic' ? [] : undefined,
      editMode: false, // Start in view mode, user can toggle to edit
      memoryStrategy: selectedType === 'dynamic' ? 'hybrid' : 'local'
    }

    const createdTab = addTab(newTab)
    
    // Auto-save tab immediately
    if (!currentLayout.isDefault) {
      // Update existing layout
      const updatedLayout = {
        ...currentLayout,
        tabs: [...currentLayout.tabs, { ...newTab, id: createdTab.id }],
        updatedAt: new Date().toISOString()
      }
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
    
    setShowTabModal(false)
  }

  // Helper function to get appropriate icon for tab type
  const getIconForTabType = (type: TabConfig['type']): string => {
    switch (type) {
      case 'dynamic': return 'grid'
      case 'static': return 'layout'
      default: return 'square'
    }
  }

  // Dynamic tab component management
  const addComponentToTab = (tabId: string, component: ComponentInTab) => {
    const tab = currentLayout.tabs.find(t => t.id === tabId)
    if (!tab || tab.type !== 'dynamic') return

    const updatedLayout = {
      ...currentLayout,
      tabs: currentLayout.tabs.map(t => 
        t.id === tabId 
          ? { ...t, components: [...(t.components || []), component] }
          : t
      ),
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Save to view memory for dynamic tabs
    if (tab.memoryStrategy === 'hybrid' || tab.memoryStrategy === 'redis') {
      saveLayout(`tab-${tabId}`, updatedLayout.tabs.find(t => t.id === tabId)?.components)
    }
    
    // Update in layouts array if it's a saved layout
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
  }

  const removeComponentFromTab = (tabId: string, componentId: string) => {
    const tab = currentLayout.tabs.find(t => t.id === tabId)
    if (!tab || tab.type !== 'dynamic') return

    const updatedLayout = {
      ...currentLayout,
      tabs: currentLayout.tabs.map(t => 
        t.id === tabId 
          ? { ...t, components: (t.components || []).filter(c => c.id !== componentId) }
          : t
      ),
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Save to view memory
    if (tab.memoryStrategy === 'hybrid' || tab.memoryStrategy === 'redis') {
      saveLayout(`tab-${tabId}`, updatedLayout.tabs.find(t => t.id === tabId)?.components)
    }
    
    // Update in layouts array if it's a saved layout
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
  }

  const updateComponentInTab = (tabId: string, componentId: string, updates: Partial<ComponentInTab>) => {
    const tab = currentLayout.tabs.find(t => t.id === tabId)
    if (!tab || tab.type !== 'dynamic') return

    const updatedLayout = {
      ...currentLayout,
      tabs: currentLayout.tabs.map(t => 
        t.id === tabId 
          ? { 
              ...t, 
              components: (t.components || []).map(c => 
                c.id === componentId ? { ...c, ...updates } : c
              )
            }
          : t
      ),
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Save to view memory with real-time updates
    if (tab.memoryStrategy === 'hybrid' || tab.memoryStrategy === 'redis') {
      saveLayout(`tab-${tabId}`, updatedLayout.tabs.find(t => t.id === tabId)?.components)
    }
    
    // Update in layouts array if it's a saved layout
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
  }

  const toggleTabEditMode = (tabId: string) => {
    const tab = currentLayout.tabs.find(t => t.id === tabId)
    if (!tab || !tab.closable) return // Only allow edit mode for user-created tabs

    const updatedLayout = {
      ...currentLayout,
      tabs: currentLayout.tabs.map(t => 
        t.id === tabId ? { ...t, editMode: !t.editMode } : t
      ),
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Update in layouts array if it's a saved layout
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
    }
  }

  const value: TabLayoutContextValue = {
    currentLayout,
    activeTabId,
    layouts,
    defaultLayout,
    userLayouts,
    setActiveTab: setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    reorderTabs,
    createTabWithPrompt,
    showTabModal,
    setShowTabModal,
    handleCreateTab,
    saveCurrentLayout,
    loadLayout,
    deleteLayout,
    resetToDefault,
    updateTabGridLayout,
    toggleTabGridLayout,
    addComponentToTab,
    removeComponentFromTab,
    updateComponentInTab,
    toggleTabEditMode
  }

  return (
    <TabLayoutContext.Provider value={value}>
      {children}
      <TabCreationModal 
        isOpen={showTabModal}
        onClose={() => setShowTabModal(false)}
        onCreateTab={handleCreateTab}
      />
    </TabLayoutContext.Provider>
  )
}