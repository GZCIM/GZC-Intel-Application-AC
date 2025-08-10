import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

interface TabNameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string) => void
  defaultName?: string
}

export const TabNameModal: React.FC<TabNameModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultName = 'New Tab 1'
}) => {
  const { currentTheme } = useTheme()
  const [tabName, setTabName] = useState(defaultName)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTabName(defaultName)
    }
  }, [isOpen, defaultName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tabName.trim()) {
      onConfirm(tabName.trim())
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={onClose}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: currentTheme.surface,
              borderRadius: '12px',
              padding: '24px',
              minWidth: '400px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
            }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: currentTheme.textSecondary
                }}>
                  Enter tab name:
                </label>
                <input
                  type="text"
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    backgroundColor: currentTheme.background,
                    border: `2px solid ${currentTheme.primary}`,
                    borderRadius: '8px',
                    color: currentTheme.text,
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    backgroundColor: `${currentTheme.textSecondary}20`,
                    border: 'none',
                    borderRadius: '24px',
                    color: currentTheme.text,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    backgroundColor: currentTheme.primary,
                    border: 'none',
                    borderRadius: '24px',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  OK
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}