import React, { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { useTheme } from '../contexts/ThemeContext'
import { motion } from 'framer-motion'

export const UserTabDebugger: React.FC = () => {
  const { user } = useUser()
  const { currentTheme: theme } = useTheme()
  const [storageData, setStorageData] = useState<any>({})
  const [isExpanded, setIsExpanded] = useState(false)

  // Function to get user-specific storage
  const getUserStorage = () => {
    if (!user) return {}
    
    const userId = user.id
    const data: any = {
      user: user.name,
      userId: userId,
      currentLayout: null,
      layouts: null,
      activeTab: null,
      tabCount: 0
    }

    // Get current layout
    const currentLayoutStr = localStorage.getItem(`gzc-intel-current-layout-${userId}`)
    if (currentLayoutStr) {
      try {
        const layout = JSON.parse(currentLayoutStr)
        data.currentLayout = layout.name
        data.tabCount = layout.tabs.length
        data.tabs = layout.tabs.map((t: any) => ({ name: t.name, type: t.type }))
      } catch (e) {}
    }

    // Get layouts count
    const layoutsStr = localStorage.getItem(`gzc-intel-layouts-${userId}`)
    if (layoutsStr) {
      try {
        const layouts = JSON.parse(layoutsStr)
        data.layoutCount = layouts.length
      } catch (e) {}
    }

    // Get active tab
    data.activeTab = sessionStorage.getItem(`gzc-intel-active-tab-${userId}`)

    return data
  }

  // Update on user change or storage events
  useEffect(() => {
    const updateData = () => setStorageData(getUserStorage())
    updateData()

    // Listen for storage changes
    const handleStorage = () => updateData()
    window.addEventListener('storage', handleStorage)
    
    // Update every second to catch changes
    const interval = setInterval(updateData, 1000)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [user])

  if (!user) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '8px',
        padding: '12px',
        fontSize: '11px',
        zIndex: 9999,
        minWidth: '200px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={{ fontWeight: '600', color: theme.text }}>
          🐛 Tab Debug: {storageData.user}
        </span>
        <span style={{ color: theme.textSecondary }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ color: theme.textSecondary, marginBottom: '4px' }}>
            User ID: <span style={{ color: theme.text }}>{storageData.userId}</span>
          </div>
          <div style={{ color: theme.textSecondary, marginBottom: '4px' }}>
            Current Layout: <span style={{ color: theme.text }}>
              {storageData.currentLayout || 'None'}
            </span>
          </div>
          <div style={{ color: theme.textSecondary, marginBottom: '4px' }}>
            Tab Count: <span style={{ color: theme.text }}>{storageData.tabCount}</span>
          </div>
          <div style={{ color: theme.textSecondary, marginBottom: '4px' }}>
            Active Tab: <span style={{ color: theme.text }}>
              {storageData.activeTab || 'None'}
            </span>
          </div>
          
          {storageData.tabs && storageData.tabs.length > 0 && (
            <div style={{ marginTop: '8px', borderTop: `1px solid ${theme.border}`, paddingTop: '8px' }}>
              <div style={{ color: theme.textSecondary, marginBottom: '4px' }}>Tabs:</div>
              {storageData.tabs.map((tab: any, i: number) => (
                <div key={i} style={{ 
                  color: theme.text, 
                  marginLeft: '8px',
                  fontSize: '10px'
                }}>
                  • {tab.name} ({tab.type})
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}