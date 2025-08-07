import React from 'react'
import { motion } from 'framer-motion'
import { FeatherIcon } from './icons/FeatherIcon'
import { useUser } from '../contexts/UserContext'

// Predefined users
export const PREDEFINED_USERS = [
  {
    id: 'user-ef',
    email: 'edward.filippi@gzc-intel.com',
    name: 'Edward Filippi',
    initials: 'EF',
    color: '#3B82F6'
  },
  {
    id: 'user-mt',
    email: 'mikael.thomas@gzc-intel.com',
    name: 'Mikaël Thomas',
    initials: 'MT',
    color: '#10B981'
  },
  {
    id: 'user-ae',
    email: 'alex.eygenson@gzc-intel.com',
    name: 'Alex Eygenson',
    initials: 'AE',
    color: '#8B5CF6'
  },
  {
    id: 'user-ls',
    email: 'levent.sendur@gzc-intel.com',
    name: 'Levent Sendur',
    initials: 'LS',
    color: '#F59E0B'
  }
]

export function UserSelector() {
  const { user, login } = useUser()
  const [isOpen, setIsOpen] = React.useState(false)

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
    <div className="relative">
      {/* Current User Name */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          color: '#95BD78',
          fontSize: '12px',
          fontWeight: '500',
          cursor: 'pointer'
        }}
      >
        {currentUser.name}
      </div>

      {/* User Dropdown */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
        >
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">
              Switch User
            </div>
            {PREDEFINED_USERS.map((predefinedUser) => (
              <button
                key={predefinedUser.id}
                onClick={() => handleSelectUser(predefinedUser)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: predefinedUser.color }}
                >
                  {predefinedUser.initials}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {predefinedUser.name}
                  </div>
                </div>
                {currentUser.id === predefinedUser.id && (
                  <FeatherIcon name="check" size={16} className="text-green-500" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}