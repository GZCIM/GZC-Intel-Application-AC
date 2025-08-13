import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { TabManager, setupConsoleHelpers } from './TabUtils'
import { useUserSettings } from '../../hooks/useUserSettings'
import { useViewMemory } from '../../hooks/useViewMemory'
import { TabNameModal } from '../../components/TabNameModal'
import { stateManager } from '../../services/StateManager'
import { useUser } from '../../hooks/useUser'
import { databaseService } from '../../services/databaseService'
import { cosmosConfigService } from '../../services/cosmosConfigService'
import { configSyncService } from '../../services/configSyncService'

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
    editMode: false,  // Initialize editMode to false
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
  const isAuthenticated = !!user?.id  // Check if user is actually authenticated

  // Helper function to get user-specific localStorage key
  const getUserKey = (key: string) => `${key}-${userId}`

  const [layouts, setLayouts] = useState<TabLayout[]>([DEFAULT_LAYOUT])
  const [currentLayout, setCurrentLayout] = useState<TabLayout>(DEFAULT_LAYOUT)
  const [activeTabId, setActiveTabId] = useState<string>('analytics')
  const [showTabModal, setShowTabModal] = useState(false)
  const { saveTabOrder, saveActiveTab, saveLayout } = useViewMemory()
  
  // Start config sync when component mounts
  useEffect(() => {
    configSyncService.startAutoSync(30000) // Sync every 30 seconds
    
    // Listen for config updates from sync
    const handleConfigUpdate = (event: CustomEvent) => {
      const config = event.detail
      if (config?.tabs) {
        const deduplicatedTabs = deduplicateTabs(config.tabs)
        setCurrentLayout(prev => ({
          ...prev,
          tabs: deduplicatedTabs
        }))
      }
    }
    
    window.addEventListener('config-updated' as any, handleConfigUpdate)
    return () => {
      window.removeEventListener('config-updated' as any, handleConfigUpdate)
      configSyncService.stopAutoSync()
    }
  }, [])
  
  // Helper function to deduplicate tabs
  const deduplicateTabs = (tabs: TabConfig[]) => {
    const seen = new Set<string>()
    return tabs.filter(tab => {
      if (seen.has(tab.id)) {
        console.warn(`Removing duplicate tab: ${tab.id}`)
        return false
      }
      seen.add(tab.id)
      return true
    })
  }

  // Load saved layouts from PostgreSQL when user changes
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      // CRITICAL FIX: Wait for MSAL to be initialized first
      const msalInstance = (window as any).msalInstance;
      
      // Check if MSAL is initialized, if not wait
      if (!msalInstance || !msalInstance.getConfiguration) {
        console.log('TabLayoutManager: MSAL not available yet, waiting...')
        await new Promise(resolve => setTimeout(resolve, 1000));
        return; // Let the effect retry
      }
      
      // Try to get accounts safely
      let accounts = [];
      let isUserAuthenticated = false;
      
      try {
        accounts = msalInstance.getAllAccounts() || [];
        isUserAuthenticated = accounts.length > 0;
      } catch (e) {
        // MSAL not initialized yet
        console.log('TabLayoutManager: MSAL not initialized, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try again after waiting
        try {
          accounts = msalInstance.getAllAccounts() || [];
          isUserAuthenticated = accounts.length > 0;
        } catch (e2) {
          console.log('TabLayoutManager: MSAL still not ready, using defaults');
        }
      }
        
      if (!isUserAuthenticated) {
        console.log('TabLayoutManager: No authenticated accounts after wait, using default layout')
        setCurrentLayout(DEFAULT_LAYOUT)
        setLayouts([DEFAULT_LAYOUT])
        setActiveTabId('analytics')
        return
      }
      
      console.log(`TabLayoutManager: Loading layouts for user ${userId}`)
      
      // Try Cosmos DB FIRST (works without backend!)
      try {
        const cosmosConfig = await cosmosConfigService.loadConfiguration()
        if (cosmosConfig?.tabs && cosmosConfig.tabs.length > 0) {
          // Deduplicate tabs when loading
          const tabIds = new Set<string>()
          const uniqueTabs = cosmosConfig.tabs.filter(t => {
            if (tabIds.has(t.id)) {
              console.warn(`Found duplicate tab ${t.id} in loaded config, removing`)
              return false
            }
            tabIds.add(t.id)
            return true
          })
          
          console.log(`TabLayoutManager: Loaded ${uniqueTabs.length} unique tabs from Cosmos DB (${cosmosConfig.tabs.length} total)`)
          const cosmosLayout = { 
            ...DEFAULT_LAYOUT,
            tabs: uniqueTabs,
            id: 'cosmos-layout',
            name: 'Cosmos Layout'
          }
          setCurrentLayout(cosmosLayout)
          setLayouts([DEFAULT_LAYOUT, cosmosLayout])
          
          const activeTabId = uniqueTabs[0]?.id || 'analytics'
          setActiveTabId(activeTabId)
          return // Cosmos DB is source of truth
        }
      } catch (e) {
        console.error('Failed to load from Cosmos DB:', e)
        // Fall through to other methods
      }
      
      // Try database if Cosmos DB fails (for backward compatibility)
      if (isUserAuthenticated && userId !== 'default-user') {
        try {
          const savedTabs = await databaseService.getUserTabs(userId)
          console.log(`TabLayoutManager: Loaded ${savedTabs.length} tabs from database`)
          
          if (savedTabs.length > 0) {
            // Database has tabs - use them as source of truth
            const dbLayout = { tabs: savedTabs }
            // Update localStorage to match database
            localStorage.setItem(getUserKey('gzc-intel-current-layout'), JSON.stringify(dbLayout))
            setCurrentLayout(dbLayout)
            setLayouts([DEFAULT_LAYOUT, dbLayout])
            
            const activeTabId = savedTabs[0]?.id || 'analytics'
            setActiveTabId(activeTabId)
            return // Database is source of truth
          }
        } catch (e) {
          console.error('Failed to load from database:', e)
          // Fall through to localStorage
        }
      }
      
      // Fallback to localStorage if no database data or not authenticated
      const savedLayoutStr = localStorage.getItem(getUserKey('gzc-intel-current-layout'))
      if (savedLayoutStr) {
        try {
          const parsedLayout = JSON.parse(savedLayoutStr)
          console.log('Loaded layout from localStorage:', parsedLayout)
          setCurrentLayout(parsedLayout)
          setLayouts([DEFAULT_LAYOUT, parsedLayout])
          
          // Set active tab from saved layout
          const activeTabId = parsedLayout.tabs?.[0]?.id || 'analytics'
          setActiveTabId(activeTabId)
        } catch (e) {
          console.error('Failed to parse localStorage:', e)
        }
      }
      
      // If no saved data anywhere, initialize with defaults
      if (!currentLayout) {
        console.log('Using default layout')
        setCurrentLayout(DEFAULT_LAYOUT)
        setLayouts([DEFAULT_LAYOUT])
        setActiveTabId('analytics')
      }
    }
    
    checkAuthAndLoad()
  }, [userId, isAuthenticated]) // Re-run when user or auth state changes

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

    // Deduplicate tabs before adding new one
    const existingTabIds = new Set<string>()
    const deduplicatedTabs = currentLayout.tabs.filter(t => {
      if (existingTabIds.has(t.id)) {
        console.warn(`Removing duplicate tab with ID: ${t.id}`)
        return false
      }
      existingTabIds.add(t.id)
      return true
    })

    const updatedLayout = {
      ...currentLayout,
      tabs: [...deduplicatedTabs, newTab],
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

    // Save to Cosmos DB (works without backend!)
    const saveToCosmosDB = async () => {
      try {
        // Deduplicate tabs before saving
        const tabIds = new Set<string>()
        const uniqueTabs = updatedLayout.tabs.filter(t => {
          if (tabIds.has(t.id)) {
            console.warn(`Skipping duplicate tab ${t.id} when saving to Cosmos`)
            return false
          }
          tabIds.add(t.id)
          return true
        })
        
        await cosmosConfigService.saveConfiguration({
          tabs: uniqueTabs,
          layouts: layouts
        })
        console.log('New tab saved to Cosmos DB')
      } catch (error) {
        console.error('Failed to save to Cosmos DB:', error)
      }
    }
    
    // Save to PostgreSQL only if authenticated (legacy - for backward compatibility)
    if (isAuthenticated) {
      const saveToDatabase = async () => {
        try {
          await databaseService.saveTab(userId, {
            tab_id: newTab.id,
            title: newTab.name,
            icon: newTab.icon,
            tab_type: newTab.type,
            components: newTab.components || [], // Send full component objects
            custom_settings: newTab.props
          })
          console.log('New tab saved to database')
        } catch (error) {
          console.error('Failed to save new tab to database:', error)
          // Fallback to localStorage
          localStorage.setItem(getUserKey('gzc-intel-current-layout'), JSON.stringify(updatedLayout))
        }
      }
      
      // Try both Cosmos DB and PostgreSQL
      saveToCosmosDB()
      saveToDatabase()
    } else {
      // If not authenticated, still try Cosmos DB (it has its own auth)
      saveToCosmosDB()
    }

    // No localStorage - Cosmos DB only

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

    // Save updated layout to Cosmos DB
    if (isAuthenticated) {
      const saveToCosmosDB = async () => {
        try {
          // Deduplicate tabs before saving (should already be unique after filter, but double-check)
          const tabIds = new Set<string>()
          const uniqueTabs = updatedLayout.tabs.filter(t => {
            if (tabIds.has(t.id)) {
              console.warn(`Removing duplicate tab ${t.id} in removeTab`)
              return false
            }
            tabIds.add(t.id)
            return true
          })
          
          await cosmosConfigService.saveConfiguration({
            tabs: uniqueTabs,
            layouts: layouts,
            preferences: {
              theme: document.documentElement.getAttribute('data-theme') || 'dark',
              language: 'en'
            }
          })
          console.log('Tab removed, layout saved to Cosmos DB')
        } catch (error) {
          console.error('Failed to save to Cosmos DB after removing tab:', error)
        }
      }
      
      // Delete from PostgreSQL (legacy)
      const deleteFromDatabase = async () => {
        try {
          await databaseService.deleteTab(userId, tabId)
          console.log('Tab deleted from database')
        } catch (error) {
          console.error('Failed to delete tab from database:', error)
        }
      }
      
      saveToCosmosDB()
      deleteFromDatabase()
    }

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
    console.log('UPDATE TAB CALLED:', { tabId, updates })
    
    // Preserve editMode if not explicitly set in updates
    const currentTab = currentLayout.tabs.find(t => t.id === tabId)
    const preservedUpdates = {
      ...updates,
      // If editMode is undefined in updates, preserve current value
      editMode: updates.editMode !== undefined ? updates.editMode : currentTab?.editMode
    }
    
    const updatedLayout = {
      ...currentLayout,
      tabs: currentLayout.tabs.map(t =>
        t.id === tabId ? { ...t, ...preservedUpdates } : t
      ),
      updatedAt: new Date().toISOString()
    }

    console.log('UPDATED LAYOUT:', updatedLayout)
    console.log('UPDATED TAB COMPONENTS:', updatedLayout.tabs.find(t => t.id === tabId)?.components?.length)
    setCurrentLayout(updatedLayout)
    console.log('TabLayoutManager: setCurrentLayout called with', updatedLayout.tabs.find(t => t.id === tabId)?.components?.length, 'components')
    
    // Save to Cosmos DB (primary storage)
    const saveToCosmosDB = async () => {
      try {
        // Deduplicate tabs before saving
        const tabIds = new Set<string>()
        const uniqueTabs = updatedLayout.tabs.filter(t => {
          if (tabIds.has(t.id)) {
            console.warn(`Removing duplicate tab ${t.id} in updateTab`)
            return false
          }
          tabIds.add(t.id)
          return true
        })
        
        await cosmosConfigService.saveConfiguration({
          tabs: uniqueTabs,
          layouts: layouts,
          preferences: {
            theme: document.documentElement.getAttribute('data-theme') || 'dark',
            language: 'en'
          }
        })
        console.log('Tab updated in Cosmos DB with components:', uniqueTabs.find(t => t.id === tabId)?.components?.length)
      } catch (error) {
        console.error('Failed to save to Cosmos DB:', error)
      }
    }
    
    // Save to PostgreSQL (legacy)
    const saveToDatabase = async () => {
      try {
        const tabToUpdate = updatedLayout.tabs.find(t => t.id === tabId)
        if (tabToUpdate) {
          await databaseService.saveTab(userId, {
            tab_id: tabToUpdate.id,
            title: tabToUpdate.name,
            icon: tabToUpdate.icon,
            tab_type: tabToUpdate.type,
            components: tabToUpdate.components,
            editMode: tabToUpdate.editMode,
            custom_settings: tabToUpdate.props
          })
          console.log('Tab saved to database')
        }
      } catch (error) {
        console.error('Failed to save tab to database:', error)
      }
    }
    
    // Save to both storages
    saveToCosmosDB()
    saveToDatabase()
    
    // No localStorage - Cosmos DB only

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

  // Enhanced tab creation - shows styled modal for tab name
  const createTabWithPrompt = () => {
    setShowTabModal(true)
  }

  const handleTabNameConfirm = (tabName: string) => {
    // Check for duplicate names
    const existingTab = currentLayout.tabs.find(t => t.name.toLowerCase() === tabName.toLowerCase())
    if (existingTab) {
      alert(`Tab name "${tabName}" already exists. Please choose a different name.`)
      return
    }
    
    const newTab: Omit<TabConfig, 'id'> = {
      name: tabName,
      component: 'UserTabContainer', // Fixed component ID for all user tabs
      type: 'dynamic', // Always use dynamic type
      icon: 'grid', // Always use grid icon for dynamic tabs
      closable: true,
      gridLayoutEnabled: true,
      components: [],
      editMode: false, // Start in view mode, user can toggle to edit
      memoryStrategy: 'hybrid'
    }

    const createdTab = addTab(newTab)
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

    // Save to PostgreSQL
    const saveToDatabase = async () => {
      try {
        const updatedTab = updatedLayout.tabs.find(t => t.id === tabId)
        if (updatedTab) {
          await databaseService.saveComponentLayouts(userId, tabId, updatedTab.components || [])
          console.log('Component added and saved to database')
        }
      } catch (error) {
        console.error('Failed to save component to database:', error)
      }
    }
    
    saveToDatabase()

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

    // Save to PostgreSQL
    const saveToDatabase = async () => {
      try {
        const updatedTab = updatedLayout.tabs.find(t => t.id === tabId)
        if (updatedTab) {
          await databaseService.saveComponentLayouts(userId, tabId, updatedTab.components || [])
          console.log('Component updated and saved to database')
        }
      } catch (error) {
        console.error('Failed to update component in database:', error)
      }
    }
    
    saveToDatabase()

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
      <TabNameModal
        isOpen={showTabModal}
        onClose={() => setShowTabModal(false)}
        onConfirm={handleTabNameConfirm}
        defaultName={`New Tab ${currentLayout.tabs.filter(t => t.name && t.name.startsWith('New Tab')).length + 1}`}
      />
    </TabLayoutContext.Provider>
  )
}
