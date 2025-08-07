import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTabLayout } from '../core/tabs/TabLayoutManager'
import { useTheme } from '../contexts/ThemeContext'
import { ThemeSelector } from './ThemeSelector'
import { GZCLogo } from './GZCLogo'
import { TabContextMenu } from './TabContextMenu'
import { UserProfile } from './UserProfile'

interface Tab {
  id: string
  name: string
  path: string
}

export const ProfessionalHeader = () => {
  const {
    currentLayout,
    activeTabId,
    setActiveTab,
    createTabWithPrompt,
    removeTab,
    toggleTabEditMode
  } = useTabLayout()
  
  const { currentTheme: theme } = useTheme()

  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTab, setActiveTabLocal] = useState('')
  const [draggedTab, setDraggedTab] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [portfolioValue, setPortfolioValue] = useState(84923.45)
  const [dailyPnL, setDailyPnL] = useState(12497.97)
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    tabId: string
    position: { x: number; y: number }
  }>({ isOpen: false, tabId: '', position: { x: 0, y: 0 } })

  useEffect(() => {
    if (currentLayout) {
      const mappedTabs = currentLayout.tabs.map(tab => ({
        id: tab.id,
        name: tab.name,
        path: `/${tab.id}`
      }))
      setTabs(mappedTabs)
      setActiveTabLocal(activeTabId || '')
    }
  }, [currentLayout, activeTabId])

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab.id)
    setActiveTabLocal(tab.id)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTab(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedTab !== null && draggedTab !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedTab === null || draggedTab === dropIndex) return

    const newTabs = [...tabs]
    const [removed] = newTabs.splice(draggedTab, 1)
    newTabs.splice(dropIndex, 0, removed)
    setTabs(newTabs)
    setDraggedTab(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedTab(null)
    setDragOverIndex(null)
  }

  const handleTabRightClick = (e: React.MouseEvent, tab: Tab) => {
    e.preventDefault()
    const tabConfig = currentLayout?.tabs.find(t => t.id === tab.id)
    if (tabConfig?.closable) {
      setContextMenu({
        isOpen: true,
        tabId: tab.id,
        position: { x: e.clientX, y: e.clientY }
      })
    }
  }

  const handleCloseContextMenu = () => {
    setContextMenu({ isOpen: false, tabId: '', position: { x: 0, y: 0 } })
  }


  // Simulate portfolio updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPortfolioValue(prev => prev + (Math.random() - 0.3) * 1000)
      setDailyPnL(prev => prev + (Math.random() - 0.3) * 500)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        borderBottom: `1px solid ${theme.border}`,
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "48px",
        backdropFilter: "blur(12px)",
        backgroundColor: theme.surface,
        position: "relative",
        zIndex: 1000
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: theme.name === 'GZC Light' ? theme.primary : theme.text,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <GZCLogo 
            height={36}
            color={theme.name.includes('Light') || theme.name === 'Arctic' || theme.name === 'Parchment' || theme.name === 'Pearl' 
              ? theme.text 
              : '#E0E0E0'  // Slightly less bright light grey for dark themes
            }
          />
          <div style={{ width: '20px' }} />
        </motion.div>
        
        <nav style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {tabs.map((tab, index) => {
            // Get tab config to check if closable
            const tabConfig = currentLayout?.tabs.find(t => t.id === tab.id);
            return (
              <div key={tab.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <motion.button
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e as any, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: draggedTab === index ? 0.5 : 1, 
                    x: 0,
                    scale: dragOverIndex === index ? 1.05 : 1
                  }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTabClick(tab)}
                  onContextMenu={(e) => handleTabRightClick(e, tab)}
                  style={{
                    background: activeTab === tab.id 
                      ? `${theme.primary}20` // Always use theme primary with transparency
                      : "transparent",
                    color: activeTab === tab.id ? theme.primary : theme.textSecondary,
                    border: dragOverIndex === index ? `2px solid ${theme.primary}` : "none",
                    padding: "6px 12px",
                    paddingRight: "20px", // Space for type indicator
                    fontSize: "12px",
                    fontWeight: "400",
                    borderRadius: "8px",
                    cursor: draggedTab !== null ? "move" : "pointer",
                    transition: "all 0.2s ease",
                    userSelect: "none",
                    position: "relative"
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = `${theme.primary}10` // Lighter transparency for hover
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {tab.name}
                  
                  {/* Tab Type Indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '4px',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: 
                      tabConfig?.type === 'dynamic' ? '#95BD78' :
                      tabConfig?.type === 'static' ? '#64b5f6' :
                      '#ABD38F',
                    opacity: 0.8
                  }} />
                </motion.button>
              </div>
            )
          })}

          {/* Add Tab Button */}
          <motion.button
            onClick={createTabWithPrompt}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              backgroundColor: 'transparent',
              border: `1px dashed ${theme.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              color: theme.textSecondary,
              transition: 'all 0.2s ease',
              marginLeft: '8px',
              fontSize: '16px',
              lineHeight: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = theme.primary
              e.currentTarget.style.backgroundColor = `${theme.primary}10`
              e.currentTarget.style.color = theme.primary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.border
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = theme.textSecondary
            }}
            title="Add New Tab"
          >
            +
          </motion.button>
        </nav>
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px" }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: "flex", alignItems: "center", gap: "16px" }}
        >
          <span style={{ fontSize: "10px", color: theme.textSecondary }}>Month to Date P&L:</span>
          <span style={{ fontSize: "11px", fontWeight: "500", color: portfolioValue > 0 ? theme.success : theme.danger }}>
            {portfolioValue > 0 ? "+" : ""}${Math.abs(portfolioValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ color: theme.textSecondary, opacity: 0.5 }}>|</span>
          <span style={{ fontSize: "10px", color: theme.textSecondary }}>Daily P&L:</span>
          <span style={{ fontSize: "11px", fontWeight: "400", color: theme.text }}>
            {dailyPnL > 0 ? "+" : ""}${Math.abs(dailyPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </motion.div>
        
        {/* User Profile */}
        <UserProfile />
        
        {/* Theme Selector */}
        <ThemeSelector />

        {/* Settings Button */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: theme.textSecondary,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = theme.text
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = theme.textSecondary
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Context Menu */}
      <TabContextMenu
        tabId={contextMenu.tabId}
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={handleCloseContextMenu}
      />

    </motion.div>
  )
}