import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useTabLayout } from '../core/tabs/TabLayoutManager'

interface TabContextMenuProps {
  tabId: string
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  tabId,
  isOpen,
  position,
  onClose
}) => {
  const { currentTheme } = useTheme()
  const { currentLayout, removeTab, toggleTabEditMode, updateTab } = useTabLayout()
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [newName, setNewName] = useState('')

  const tab = currentLayout?.tabs.find(t => t.id === tabId)

  useEffect(() => {
    const handleClickOutside = () => onClose()
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleRename = () => {
    setNewName(tab.name)
    setShowRenameModal(true)
    onClose()
  }

  const handleRenameSubmit = () => {
    if (newName.trim() && newName !== tab.name) {
      // Check for duplicate names
      const existingTab = currentLayout?.tabs.find(t => 
        t.id !== tabId && t.name.toLowerCase() === newName.toLowerCase()
      )
      if (existingTab) {
        alert(`Tab name "${newName}" already exists. Please choose a different name.`)
        return
      }
      updateTab(tabId, { name: newName.trim() })
    }
    setShowRenameModal(false)
    setNewName('')
  }

  const handleEdit = () => {
    toggleTabEditMode(tabId)
    onClose()
  }

  const handleRemove = () => {
    if (confirm(`Are you sure you want to remove the tab "${tab.name}"?`)) {
      removeTab(tabId)
    }
    onClose()
  }

  // Early return check after all hooks
  if (!tab || !tab.closable) return null

  const menuItems = [
    {
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      label: 'Rename',
      onClick: handleRename
    },
    {
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {tab.editMode ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          )}
        </svg>
      ),
      label: tab.editMode ? 'Save' : 'Edit',
      onClick: handleEdit
    },
    {
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      label: 'Remove',
      onClick: handleRemove,
      dangerous: true
    }
  ]

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'fixed',
              top: position.y,
              left: position.x,
              zIndex: 10000,
              backgroundColor: currentTheme.surface,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '8px',
              padding: '4px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(8px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                onClick={item.onClick}
                whileHover={{ backgroundColor: item.dangerous ? '#ef444420' : `${currentTheme.primary}15` }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: item.dangerous ? '#ef4444' : currentTheme.text,
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease',
                  textAlign: 'left',
                  minWidth: '120px'
                }}
              >
                {item.icon}
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {showRenameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
              backdropFilter: 'blur(8px)'
            }}
            onClick={() => setShowRenameModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: currentTheme.surface,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '8px',
                padding: '20px',
                minWidth: '300px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
              }}
            >
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: currentTheme.text
              }}>
                Rename Tab
              </h3>
              
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit()
                  if (e.key === 'Escape') setShowRenameModal(false)
                }}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  backgroundColor: currentTheme.background,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '6px',
                  color: currentTheme.text,
                  outline: 'none',
                  marginBottom: '16px'
                }}
              />
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowRenameModal(false)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '6px',
                    color: currentTheme.textSecondary,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameSubmit}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    backgroundColor: currentTheme.primary,
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Rename
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}