import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

interface TabCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateTab: (title: string, type: string) => void
}

export const TabCreationModal: React.FC<TabCreationModalProps> = ({
  isOpen,
  onClose,
  onCreateTab
}) => {
  const { currentTheme } = useTheme()
  const [title, setTitle] = useState('')
  const [selectedType, setSelectedType] = useState('static')
  const [step, setStep] = useState<'title' | 'type'>('title')

  const tabTypes = [
    { value: 'dynamic', label: 'Dynamic', description: 'Full drag & drop components', color: '#95BD78' },
    { value: 'static', label: 'Static', description: 'Fixed layout components', color: '#64b5f6' }
  ]

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setSelectedType('static')
      setStep('title')
    }
  }, [isOpen])

  const handleSubmitTitle = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      setStep('type')
    }
  }

  const handleSelectType = (type: string) => {
    setSelectedType(type)
    onCreateTab(title, type)
    onClose()
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
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(8px)'
          }}
          onClick={onClose}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: currentTheme.surface,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '8px',
              padding: '16px',
              minWidth: '320px',
              maxWidth: '400px',
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.15)`,
              position: 'relative'
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: currentTheme.textSecondary,
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.primary}20`
                e.currentTarget.style.color = currentTheme.primary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = currentTheme.textSecondary
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {step === 'title' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: currentTheme.text
                }}>
                  Create New Tab
                </h2>
                
                <form onSubmit={handleSubmitTitle}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: currentTheme.text
                    }}>
                      Tab Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter tab name..."
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: '13px',
                        backgroundColor: currentTheme.background,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '6px',
                        color: currentTheme.text,
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = currentTheme.primary
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.primary}20`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = currentTheme.border
                        e.currentTarget.style.boxShadow = 'none'
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
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: 'transparent',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '6px',
                        color: currentTheme.textSecondary,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.background
                        e.currentTarget.style.color = currentTheme.text
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = currentTheme.textSecondary
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!title.trim()}
                      style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: title.trim() ? currentTheme.primary : currentTheme.border,
                        border: 'none',
                        borderRadius: '6px',
                        color: title.trim() ? '#ffffff' : currentTheme.textSecondary,
                        cursor: title.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (title.trim()) {
                          e.currentTarget.style.backgroundColor = currentTheme.primary
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (title.trim()) {
                          e.currentTarget.style.backgroundColor = currentTheme.primary
                          e.currentTarget.style.transform = 'translateY(0)'
                        }
                      }}
                    >
                      Next
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 'type' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h2 style={{
                  margin: '0 0 8px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: currentTheme.text
                }}>
                  Select Tab Type
                </h2>
                
                <p style={{
                  margin: '0 0 20px 0',
                  fontSize: '14px',
                  color: currentTheme.textSecondary
                }}>
                  Creating: <strong style={{ color: currentTheme.text }}>{title}</strong>
                </p>

                <div style={{ marginBottom: '20px' }}>
                  {tabTypes.map((type) => (
                    <motion.button
                      key={type.value}
                      onClick={() => handleSelectType(type.value)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        width: '100%',
                        padding: '16px',
                        marginBottom: '12px',
                        backgroundColor: selectedType === type.value 
                          ? `${currentTheme.primary}15` 
                          : currentTheme.background,
                        border: selectedType === type.value 
                          ? `2px solid ${currentTheme.primary}` 
                          : `1px solid ${currentTheme.border}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedType !== type.value) {
                          e.currentTarget.style.backgroundColor = `${currentTheme.primary}08`
                          e.currentTarget.style.borderColor = currentTheme.primary
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedType !== type.value) {
                          e.currentTarget.style.backgroundColor = currentTheme.background
                          e.currentTarget.style.borderColor = currentTheme.border
                        }
                      }}
                    >
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: type.color,
                          flexShrink: 0
                        }}
                      />
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: currentTheme.text,
                          marginBottom: '4px'
                        }}>
                          {type.label}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: currentTheme.textSecondary
                        }}>
                          {type.description}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => setStep('title')}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: 'transparent',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '6px',
                      color: currentTheme.textSecondary,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.background
                      e.currentTarget.style.color = currentTheme.text
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = currentTheme.textSecondary
                    }}
                  >
                    Back
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}