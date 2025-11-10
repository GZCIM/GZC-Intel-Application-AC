import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  action?: () => void
  divider?: boolean
  disabled?: boolean
  submenu?: ContextMenuItem[]
  danger?: boolean
}

export interface ContextMenuProps {
  items: ContextMenuItem[]
  position: { x: number; y: number }
  isOpen: boolean
  onClose: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  position,
  isOpen,
  onClose
}) => {
  const { currentTheme: theme } = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('contextmenu', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('contextmenu', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Adjust position to keep menu in viewport, with cursor at top-left for maximum ergonomics
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const { innerWidth, innerHeight } = window

      // Position menu directly at cursor (0px offset) - cursor at top-left corner
      // This makes it most ergonomic - first menu item is right under the cursor
      let x = position.x
      let y = position.y

      // Adjust horizontal position if menu would go off-screen
      if (x + rect.width > innerWidth) {
        // If menu would overflow right, position it to the left of cursor instead
        x = position.x - rect.width
        // If that would go off-screen left, just align to right edge
        if (x < 10) {
          x = innerWidth - rect.width - 10
        }
      }
      // Ensure menu doesn't go off left edge
      if (x < 10) {
        x = 10
      }

      // Adjust vertical position if menu would go off-screen
      if (y + rect.height > innerHeight) {
        // If menu would overflow bottom, position it above cursor instead
        y = position.y - rect.height
        // If that would go off-screen top, just align to bottom edge
        if (y < 10) {
          y = innerHeight - rect.height - 10
        }
      }
      // Ensure menu doesn't go off top edge
      if (y < 10) {
        y = 10
      }

      setAdjustedPosition({ x, y })
    }
  }, [isOpen, position])

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled || item.submenu) return

    if (item.action) {
      item.action()
    }
    onClose()
  }

  const renderMenuItem = (item: ContextMenuItem, index: number) => {
    if (item.divider) {
      return (
        <div
          key={index}
          style={{
            height: '1px',
            backgroundColor: theme.border,
            margin: '4px 0'
          }}
        />
      )
    }

    const hasSubmenu = item.submenu && item.submenu.length > 0

    return (
      <motion.div
        key={index}
        whileHover={{ backgroundColor: item.disabled ? 'transparent' : `${theme.primary}10` }}
        onClick={() => handleItemClick(item)}
        onMouseEnter={() => hasSubmenu && setActiveSubmenu(index)}
        onMouseLeave={() => hasSubmenu && setActiveSubmenu(null)}
        style={{
          padding: '8px 16px',
          fontSize: '13px',
          color: item.disabled
            ? theme.textSecondary
            : item.danger
              ? theme.danger
              : theme.text,
          cursor: item.disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          opacity: item.disabled ? 0.5 : 1,
          position: 'relative',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {item.icon && (
            <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center' }}>
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </div>

        {hasSubmenu && (
          <>
            <span style={{ fontSize: '10px', opacity: 0.6 }}>▶</span>
            <AnimatePresence>
              {activeSubmenu === index && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: -8,
                    marginLeft: '4px',
                    minWidth: '180px',
                    backgroundColor: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    padding: '4px 0',
                    zIndex: 1001
                  }}
                >
                  {item.submenu!.map((subItem, subIndex) =>
                    renderMenuItem(subItem, `${index}-${subIndex}` as any)
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            left: adjustedPosition.x,
            top: adjustedPosition.y,
            minWidth: '200px',
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '4px 0',
            zIndex: 10050
          }}
        >
          {items.map((item, index) => renderMenuItem(item, index))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Helper component for easier usage
export const ContextMenuWrapper: React.FC<{
  children: React.ReactNode
  items: ContextMenuItem[]
}> = ({ children, items }) => {
  const [menuState, setMenuState] = useState({
    isOpen: false,
    position: { x: 0, y: 0 }
  })

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuState({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    })
  }

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>
      <ContextMenu
        items={items}
        position={menuState.position}
        isOpen={menuState.isOpen}
        onClose={() => setMenuState({ ...menuState, isOpen: false })}
      />
    </>
  )
}
