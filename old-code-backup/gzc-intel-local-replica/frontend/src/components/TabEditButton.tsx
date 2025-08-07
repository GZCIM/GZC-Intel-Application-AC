import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTabLayout } from '../core/tabs/TabLayoutManager'
import { useTheme } from '../contexts/ThemeContext'

interface TabEditButtonProps {
  tabId: string
}

export const TabEditButton: React.FC<TabEditButtonProps> = ({ tabId }) => {
  const { currentLayout, toggleTabEditMode } = useTabLayout()
  const { currentTheme } = useTheme()
  const [isHovered, setIsHovered] = useState(false)

  const tab = currentLayout?.tabs.find(t => t.id === tabId)
  if (!tab || !tab.closable) return null

  const isEditMode = tab.editMode || false

  const handleEditSave = () => {
    if (isEditMode) {
      // For static tabs, trigger save event
      if (tab.type === 'static') {
        // Emit custom event that StaticCanvas can listen to
        window.dispatchEvent(new CustomEvent('save-static-tab', { detail: { tabId } }))
      }
      // For dynamic tabs, auto-save is already handled
    }
    
    toggleTabEditMode(tabId)
  }

  return (
    <motion.button
      onClick={handleEditSave}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        fontSize: '11px',
        fontWeight: '500',
        backgroundColor: isEditMode 
          ? currentTheme.primary 
          : (isHovered && !isEditMode ? `${currentTheme.primary}15` : currentTheme.surface),
        color: isEditMode 
          ? '#ffffff' 
          : (isHovered && !isEditMode ? currentTheme.primary : currentTheme.text),
        border: `1px solid ${isEditMode 
          ? currentTheme.primary 
          : (isHovered && !isEditMode ? currentTheme.primary : currentTheme.border)}`,
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon */}
      <svg 
        width="12" 
        height="12" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {isEditMode ? (
          // Save icon
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 13l4 4L19 7" 
          />
        ) : (
          // Edit icon
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
          />
        )}
      </svg>
      
      {/* Text */}
      {isEditMode ? 'Save' : 'Edit'}
    </motion.button>
  )
}