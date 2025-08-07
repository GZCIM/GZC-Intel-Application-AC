import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

interface ThemeOption {
  value: string
  label: string
  description?: string
}

const themeOptions: ThemeOption[] = [
  // Dark themes
  { value: 'gzc-dark', label: 'GZC Dark', description: 'Professional dark theme' },
  { value: 'analytics-dark', label: 'Analytics Dark', description: 'Data visualization optimized' },
  { value: 'terminal-green', label: 'Terminal Green', description: 'Bloomberg inspired' },
  { value: 'trading-ops', label: 'Trading Operations', description: 'High contrast trading' },
  { value: 'midnight-trading', label: 'Midnight Trading', description: 'Ultra dark for long sessions' },
  { value: 'quantum-analytics', label: 'Quantum Analytics', description: 'Modern gradient theme' },
  { value: 'professional', label: 'Professional', description: 'Sea blue risk theme' },
  // Light themes
  { value: 'institutional', label: 'GZC Light', description: 'Clean light theme' },
  { value: 'arctic', label: 'Arctic', description: 'Cool blue-grey theme' },
  { value: 'parchment', label: 'Parchment', description: 'Warm sepia theme' },
  { value: 'pearl', label: 'Pearl', description: 'Soft purple theme' }
]

export const ThemeSelector = () => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { currentTheme, themeName, setTheme } = useTheme()
  const theme = currentTheme
  
  const selectedOption = themeOptions.find(t => t.value === themeName) || themeOptions[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minWidth: 'auto',
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          color: theme.textSecondary,
          fontSize: '11px',
          fontWeight: 400,
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = theme.text
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = theme.textSecondary
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <span style={{ marginRight: '4px' }}>{selectedOption.label}</span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          width="10" height="10" viewBox="0 0 24 24" fill="none"
        >
          <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              minWidth: '140px',
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: theme.name === 'Institutional'
                ? '0 2px 8px rgba(0, 0, 0, 0.08)'
                : '0 4px 12px rgba(0, 0, 0, 0.3)',
              zIndex: 1000
            }}
          >
            {themeOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => {
                  setTheme(option.value)
                  setIsOpen(false)
                }}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: selectedOption.value === option.value ? theme.primary : theme.text,
                  background: selectedOption.value === option.value 
                    ? theme.name === 'Institutional'
                      ? 'rgba(122, 158, 101, 0.08)'
                      : 'rgba(149, 189, 120, 0.08)'
                    : 'transparent',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  if (selectedOption.value !== option.value) {
                    e.currentTarget.style.background = theme.name === 'Institutional'
                      ? 'rgba(0, 0, 0, 0.03)'
                      : 'rgba(255, 255, 255, 0.03)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedOption.value !== option.value) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span>{option.label}</span>
                {selectedOption.value === option.value && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}