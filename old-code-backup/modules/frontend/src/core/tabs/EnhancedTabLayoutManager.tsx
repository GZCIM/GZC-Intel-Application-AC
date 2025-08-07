import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { TabManager, setupConsoleHelpers } from './TabUtils'
import { useUserSettings } from '../../hooks/useUserSettings'
import { useUser } from '../../contexts/UserContext'

// Tab configuration types (same as before)
export interface TabConfig {
  id: string
  name: string
  component: string
  icon?: string
  closable?: boolean
  props?: Record<string, any>
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
  currentLayout: TabLayout | null
  activeTabId: string | null
  layouts: TabLayout[]
  defaultLayout: TabLayout | null
  userLayouts: TabLayout[]
  
  setActiveTab: (tabId: string) => void
  addTab: (tab: Omit<TabConfig, 'id'>) => TabConfig
  removeTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<TabConfig>) => void
  reorderTabs: (newTabs: TabConfig[]) => void
  
  saveCurrentLayout: (name: string) => void
  loadLayout: (layoutId: string) => void
  deleteLayout: (layoutId: string) => void
  resetToDefault: () => void
  
  // New Redis-backed features
  syncWithRedis: () => Promise<void>
  isRedisConnected: boolean
  isSyncing: boolean
}

// Default tabs configuration
const DEFAULT_TABS: TabConfig[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    component: 'Dashboard',
    icon: '📊',
    closable: false
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    component: 'Portfolio',
    icon: '💼',
    closable: false
  },
  {
    id: 'trading',
    name: 'Trading',
    component: 'TradingApp',
    icon: '📈',
    closable: false
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

export function EnhancedTabLayoutProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const userSettings = useUserSettings(user?.id || 'anonymous')
  
  const [layouts, setLayouts] = useState<TabLayout[]>([DEFAULT_LAYOUT])
  const [currentLayout, setCurrentLayout] = useState<TabLayout>(DEFAULT_LAYOUT)
  const [activeTabId, setActiveTabId] = useState<string>('dashboard')
  const [isRedisConnected, setIsRedisConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Sync layouts with Redis when user settings are loaded
  useEffect(() => {
    if (userSettings.layouts.length > 0 && !userSettings.isLoading) {
      const redisLayouts = userSettings.layouts.map(layout => ({
        ...layout,
        tabs: layout.tabs as TabConfig[]
      }))
      setLayouts([DEFAULT_LAYOUT, ...redisLayouts])
      setIsRedisConnected(true)
      
      // Set active layout if user has a default
      if (userSettings.settings?.defaultLayout) {
        const defaultLayout = redisLayouts.find(l => l.id === userSettings.settings?.defaultLayout)
        if (defaultLayout) {
          setCurrentLayout(defaultLayout)
          if (defaultLayout.tabs.length > 0) {
            setActiveTabId(defaultLayout.tabs[0].id)
          }
        }
      }
    }
  }, [userSettings.layouts, userSettings.settings, userSettings.isLoading])

  // Track tab changes in history
  useEffect(() => {
    if (activeTabId && currentLayout && user?.id) {
      const activeTab = currentLayout.tabs.find(t => t.id === activeTabId)
      if (activeTab) {
        userSettings.addToTabHistory({
          tabId: activeTab.id,
          tabName: activeTab.name,
          component: activeTab.component,
          layoutId: currentLayout.id,
          layoutName: currentLayout.name,
          timestamp: new Date().toISOString()
        })
      }
    }
  }, [activeTabId, currentLayout, user?.id])

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
    
    // Update in layouts array and sync with Redis
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
      if (user?.id) {
        userSettings.saveLayout({
          ...updatedLayout,
          isActive: true
        })
      }
    }
    
    setActiveTabId(newTab.id)
    return newTab
  }

  const removeTab = (tabId: string) => {
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
    
    // Update in layouts array and sync with Redis
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
      if (user?.id) {
        userSettings.saveLayout(updatedLayout)
      }
    }
    
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
    
    // Update in layouts array and sync with Redis
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
      if (user?.id) {
        userSettings.saveLayout(updatedLayout)
      }
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
    
    // Save to Redis
    if (user?.id) {
      userSettings.saveLayout({
        ...newLayout,
        isActive: true
      })
    }
  }

  const loadLayout = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId)
    if (layout) {
      setCurrentLayout(layout)
      if (layout.tabs.length > 0) {
        setActiveTabId(layout.tabs[0].id)
      }
      
      // Update default layout in Redis
      if (user?.id && !layout.isDefault) {
        userSettings.setActiveLayout(layoutId)
      }
    }
  }

  const deleteLayout = (layoutId: string) => {
    if (layouts.find(l => l.id === layoutId)?.isDefault) {
      return
    }
    
    setLayouts(layouts.filter(l => l.id !== layoutId))
    
    // Delete from Redis
    if (user?.id) {
      userSettings.deleteLayout(layoutId)
    }
    
    if (currentLayout.id === layoutId) {
      resetToDefault()
    }
  }

  const resetToDefault = () => {
    setCurrentLayout(DEFAULT_LAYOUT)
    if (DEFAULT_LAYOUT.tabs.length > 0) {
      setActiveTabId(DEFAULT_LAYOUT.tabs[0].id)
    }
  }

  const reorderTabs = (newTabs: TabConfig[]) => {
    const updatedLayout = {
      ...currentLayout,
      tabs: newTabs,
      updatedAt: new Date().toISOString()
    }
    
    setCurrentLayout(updatedLayout)
    
    // Update in layouts array and sync with Redis
    if (!currentLayout.isDefault) {
      setLayouts(layouts.map(l => l.id === currentLayout.id ? updatedLayout : l))
      if (user?.id) {
        userSettings.saveLayout(updatedLayout)
      }
    }
  }

  const syncWithRedis = useCallback(async () => {
    if (!user?.id) return
    
    setIsSyncing(true)
    await userSettings.refresh()
    setIsSyncing(false)
  }, [user?.id, userSettings])

  // Initialize TabManager
  useEffect(() => {
    TabManager.setAddTabFunction(addTab)
    setupConsoleHelpers()
  }, [])

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
    saveCurrentLayout,
    loadLayout,
    deleteLayout,
    resetToDefault,
    syncWithRedis,
    isRedisConnected,
    isSyncing
  }

  return (
    <TabLayoutContext.Provider value={value}>
      {children}
    </TabLayoutContext.Provider>
  )
}