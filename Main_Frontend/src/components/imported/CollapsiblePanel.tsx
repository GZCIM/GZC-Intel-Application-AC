import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../theme';

interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  noPadding?: boolean;
  headerActions?: React.ReactNode;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  children,
  defaultExpanded = true,
  noPadding = false,
  headerActions
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isClicking, setIsClicking] = useState(false);

  return (
    <motion.div
      layout
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1
      }}
    >
      {/* Header */}
      <div
        className="no-drag"
        style={{
          background: isClicking ? theme.primary : theme.surfaceAlt,
          padding: '10px 14px',
          borderBottom: isExpanded ? `1px solid ${theme.border}` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background-color 0.1s ease'
        }}
        onMouseDown={() => setIsClicking(true)}
        onMouseUp={() => setIsClicking(false)}
        onMouseLeave={() => setIsClicking(false)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log('CollapsiblePanel clicked:', title, 'isExpanded:', !isExpanded);
          setIsExpanded(!isExpanded);
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          flex: 1
        }}>
          <span style={{ fontSize: '10px', opacity: 0.6 }}>⋮⋮</span>
          <span style={{ 
            fontSize: theme.typography.h4.fontSize, 
            fontWeight: theme.typography.h4.fontWeight, 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            color: isClicking ? 'white' : theme.text,
            transition: 'color 0.1s ease'
          }}>
            {title}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {headerActions}
          
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            transition={{ duration: 0.2 }}
            style={{
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.textSecondary
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 5L6 8L9 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false} mode="wait">
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              duration: 0.2,
              ease: "easeInOut"
            }}
            style={{ 
              flex: 1,
              padding: noPadding ? 0 : '16px',
              overflow: 'hidden'
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};