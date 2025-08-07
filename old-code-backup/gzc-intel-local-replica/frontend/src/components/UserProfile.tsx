import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../contexts/UserContext'
import { useTheme } from '../contexts/ThemeContext'

// Predefined users with theme-aware colors
const getUserColor = (userId: string, theme: any) => {
  // Use theme colors for consistency
  const colorMap: Record<string, string> = {
    'user-ef': theme.info || '#3B82F6',     // Blue
    'user-mt': theme.success || '#10B981',  // Green
    'user-ae': theme.secondary || '#8B5CF6', // Purple
    'user-ls': theme.warning || '#F59E0B'   // Orange
  }
  return colorMap[userId] || theme.primary
}

export const PREDEFINED_USERS = [
  {
    id: 'user-ef',
    email: 'edward.filippi@gzc-intel.com',
    name: 'Edward Filippi',
    initials: 'EF'
  },
  {
    id: 'user-mt',
    email: 'mikael.thomas@gzc-intel.com',
    name: 'Mikaël Thomas',
    initials: 'MT'
  },
  {
    id: 'user-ae',
    email: 'alex.eygenson@gzc-intel.com',
    name: 'Alex Eygenson',
    initials: 'AE'
  },
  {
    id: 'user-ls',
    email: 'levent.sendur@gzc-intel.com',
    name: 'Levent Sendur',
    initials: 'LS'
  }
]

interface UserProfileProps {
  showUserSwitcher?: boolean
}

export const UserProfile: React.FC<UserProfileProps> = ({ showUserSwitcher = process.env.NODE_ENV === 'development' }) => {
  const { user, login } = useUser()
  const { currentTheme: theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const currentUser = PREDEFINED_USERS.find(u => u.id === user?.id) || PREDEFINED_USERS[1] // Default to Mikaël

  const handleSelectUser = (selectedUser: typeof PREDEFINED_USERS[0]) => {
    login({
      id: selectedUser.id,
      email: selectedUser.email,
      name: selectedUser.name
    })
    setIsOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* User Avatar and Name */}
      <motion.div
        onClick={showUserSwitcher ? () => setIsOpen(!isOpen) : undefined}
        whileHover={showUserSwitcher ? { scale: 1.02 } : {}}
        whileTap={showUserSwitcher ? { scale: 0.98 } : {}}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          borderRadius: '20px',
          cursor: showUserSwitcher ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          backgroundColor: isOpen ? `${theme.primary}15` : 'transparent',
          border: `1px solid ${isOpen ? theme.primary : 'transparent'}`
        }}
        onMouseEnter={(e) => {
          if (!isOpen && showUserSwitcher) {
            e.currentTarget.style.backgroundColor = `${theme.primary}08`
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen && showUserSwitcher) {
            e.currentTarget.style.backgroundColor = 'transparent'
          }
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: getUserColor(currentUser.id, theme),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.background, // Use theme background for text on colored bg
            fontSize: '10px',
            fontWeight: '600'
          }}
        >
          {currentUser.initials}
        </div>
        
        {/* Name */}
        <span
          style={{
            color: theme.text,
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}
        >
          {currentUser.name}
        </span>

        {/* Dropdown Arrow - Only show in dev mode */}
        {showUserSwitcher && (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              color: theme.textSecondary,
              fontSize: '10px'
            }}
          >
            ▼
          </motion.div>
        )}
      </motion.div>

      {/* User Dropdown */}
      <AnimatePresence>
        {isOpen && showUserSwitcher && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              marginTop: '8px',
              width: '220px',
              backgroundColor: theme.surface,
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              overflow: 'hidden',
              zIndex: 1000,
              backdropFilter: 'blur(12px)',
              boxShadow: theme.name.includes('Light') || theme.name === 'Arctic' || theme.name === 'Parchment' || theme.name === 'Pearl'
                ? '0 4px 20px rgba(0,0,0,0.1)'
                : '0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ padding: '8px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '500',
                  color: theme.textSecondary,
                  padding: '6px 8px 8px',
                  borderBottom: `1px solid ${theme.border}`,
                  marginBottom: '6px'
                }}
              >
                SWITCH USER
              </div>
              
              {PREDEFINED_USERS.map((predefinedUser) => (
                <button
                  key={predefinedUser.id}
                  onClick={() => handleSelectUser(predefinedUser)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: currentUser.id === predefinedUser.id 
                      ? theme.name === 'Institutional' 
                        ? 'rgba(122, 158, 101, 0.1)'
                        : theme.name === 'Arctic'
                        ? 'rgba(0, 0, 0, 0.05)'
                        : `${theme.primary}20`
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    marginBottom: '2px',
                    fontSize: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (currentUser.id !== predefinedUser.id) {
                      e.currentTarget.style.backgroundColor = theme.name === 'Institutional'
                        ? 'rgba(122, 158, 101, 0.05)'
                        : theme.name === 'Arctic'
                        ? 'rgba(0, 0, 0, 0.02)'
                        : 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentUser.id !== predefinedUser.id) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: getUserColor(predefinedUser.id, theme),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.background, // Use theme background for text on colored bg
                      fontSize: '9px',
                      fontWeight: '600'
                    }}
                  >
                    {predefinedUser.initials}
                  </div>
                  
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: '400',
                        color: theme.text
                      }}
                    >
                      {predefinedUser.name}
                    </div>
                  </div>
                  
                  {currentUser.id === predefinedUser.id && (
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: theme.success,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.background, // Use theme background for checkmark
                        fontSize: '8px'
                      }}
                    >
                      ✓
                    </div>
                  )}
                </button>
              ))}
              
              {/* Online Status */}
              <div
                style={{
                  marginTop: '6px',
                  padding: '6px 8px',
                  borderTop: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: theme.success
                  }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    color: theme.textSecondary,
                    fontWeight: '400'
                  }}
                >
                  Online
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: '0',
            zIndex: 999
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}