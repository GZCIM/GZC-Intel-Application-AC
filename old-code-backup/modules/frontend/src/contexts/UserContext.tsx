import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  role?: string
}

interface UserContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('gzc-intel-user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error('Failed to parse stored user:', e)
      }
    } else {
      // Default to Mikaël Thomas
      const defaultUser: User = {
        id: 'user-mt',
        email: 'mikael.thomas@gzc-intel.com',
        name: 'Mikaël Thomas'
      }
      setUser(defaultUser)
      localStorage.setItem('gzc-intel-user', JSON.stringify(defaultUser))
    }
  }, [])

  const login = (newUser: User) => {
    setUser(newUser)
    localStorage.setItem('gzc-intel-user', JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('gzc-intel-user')
  }

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout
      }}
    >
      {children}
    </UserContext.Provider>
  )
}