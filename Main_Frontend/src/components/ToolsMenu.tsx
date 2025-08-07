import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolsMenuProps {
  onOpenAuthDebugger: () => void;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({ onOpenAuthDebugger }) => {
  const { currentTheme: theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    {
      label: 'Authorization Debug',
      icon: '🔌',
      onClick: () => {
        onOpenAuthDebugger();
        setIsOpen(false);
      },
    },
    {
      label: 'Bloomberg Volatility Surface',
      icon: '📊',
      onClick: () => {
        // Open in new tab
        window.open('https://bloomberg-volatility-surface.agreeablepond-1a74a92d.eastus.azurecontainerapps.io/', '_blank');
        setIsOpen(false);
      },
    },
  ];

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          color: theme.textSecondary,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = `${theme.primary}10`;
          e.currentTarget.style.color = theme.text;
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = theme.textSecondary;
          }
        }}
      >
        <span>Tools</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              minWidth: '220px',
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              padding: '4px',
              zIndex: 1000,
            }}
          >
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: theme.text,
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${theme.primary}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};