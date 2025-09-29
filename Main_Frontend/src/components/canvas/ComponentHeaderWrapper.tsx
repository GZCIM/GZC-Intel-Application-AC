import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ComponentHeaderWrapperProps {
  componentId: string;
  instanceId: string;
  displayName: string;
  defaultName?: string;
  children: React.ReactNode;
  componentState: 'minimized' | 'normal' | 'maximized';
  onComponentStateChange?: (state: 'minimized' | 'normal' | 'maximized') => void;
  dataQuality?: number;
  lastUpdated?: string;
  isEditMode: boolean;
  onTitleChange?: (title: string) => void;
  onRemove?: () => void;
}

/**
 * ComponentHeaderWrapper adds a unified header with integrated component state controls
 * This moves the component state controls from the grid overlay into the component itself
 * Note: This is for individual component states, NOT the global T/M/F canvas view modes
 */
export const ComponentHeaderWrapper: React.FC<ComponentHeaderWrapperProps> = ({
  componentId,
  instanceId,
  displayName,
  defaultName,
  children,
  componentState = 'normal',
  onComponentStateChange,
  dataQuality = 0,
  lastUpdated = 'Never',
  isEditMode,
  onTitleChange,
  onRemove
}) => {
  const { currentTheme } = useTheme();

  // Track the last non-full state so we can return to it from full in locked mode
  const lastNonFullRef = useRef<'minimized' | 'normal'>(componentState === 'maximized' ? 'normal' : componentState);
  useEffect(() => {
    if (componentState !== 'maximized') {
      lastNonFullRef.current = componentState as 'minimized' | 'normal';
    }
  }, [componentState]);

  // Local state for the input value to prevent controlled/uncontrolled issues
  const [inputValue, setInputValue] = useState(displayName);

  // Update input value when displayName changes (e.g., when switching between components)
  useEffect(() => {
    setInputValue(displayName);
  }, [displayName]);

  // Always render a header with controls; for minimized, we'll hide children content below

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: currentTheme.surface,
      border: `1px solid ${currentTheme.border}`,
      borderRadius: '8px',
      overflow: 'visible'
    }}>
      {/* Component Header with integrated controls (Title + T/M/F) */}
      <div
        onDoubleClick={(e) => {
          if (isEditMode) return;
          e.stopPropagation();
          if (componentState === 'maximized') {
            onComponentStateChange?.(lastNonFullRef.current);
          } else {
            onComponentStateChange?.('maximized');
          }
        }}
        style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        backgroundColor: currentTheme.background,
        borderBottom: `1px solid ${currentTheme.border}`,
        minHeight: '36px',
        flexShrink: 0,
        cursor: isEditMode ? 'default' : 'pointer',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Left: Component Name (editable in edit mode) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          minWidth: 0
        }}>
          {isEditMode ? (
            <input
              type="text"
              value={inputValue}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setInputValue(e.target.value);
              }}
              onInput={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onKeyUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onBlur={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTitleChange?.(e.target.value);
              }}
              onKeyDown={(e) => {
                // Prevent Enter from submitting any parent form and bubbling
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  (e.target as HTMLInputElement).blur();
                } else {
                  // Stop bubbling to header to avoid accidental double-click detection
                  e.stopPropagation();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                background: 'transparent',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '4px',
                padding: '2px 6px',
                color: currentTheme.text,
                fontSize: '12px',
                fontWeight: 600,
                outline: 'none'
              }}
              placeholder={defaultName || 'Enter title...'}
            />
          ) : (
            <h4 style={{
              margin: 0,
              fontSize: '12px',
              fontWeight: '600',
              color: currentTheme.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {displayName}
            </h4>
          )}
        </div>

        {/* Right: Component State Controls - visible only in edit mode */}
        {isEditMode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            marginLeft: '8px',
            flexShrink: 0
          }}>
            {/* Minimize Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComponentStateChange?.('minimized');
              }}
              style={{
                width: '24px',
                height: '24px',
                minWidth: '24px',
                minHeight: '24px',
                flex: '0 0 24px',
                boxSizing: 'border-box',
                padding: '0',
                border: `1px solid ${componentState === 'minimized' ? currentTheme.primary : currentTheme.border}`,
                borderRadius: '4px',
                backgroundColor: componentState === 'minimized' ? `${currentTheme.primary}20` : 'transparent',
                color: componentState === 'minimized' ? currentTheme.primary : currentTheme.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Minimize"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="1" y="2" width="12" height="10" rx="1" />
                <rect x="3" y="4" width="8" height="6" rx="0.5" fill="currentColor" opacity="0.3" />
              </svg>
            </button>

            {/* Normal View Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComponentStateChange?.('normal');
              }}
              style={{
                width: '24px',
                height: '24px',
                minWidth: '24px',
                minHeight: '24px',
                flex: '0 0 24px',
                boxSizing: 'border-box',
                padding: '0',
                border: `1px solid ${componentState === 'normal' ? currentTheme.primary : currentTheme.border}`,
                borderRadius: '4px',
                backgroundColor: componentState === 'normal' ? `${currentTheme.primary}20` : 'transparent',
                color: componentState === 'normal' ? currentTheme.primary : currentTheme.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Normal View"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </button>

            {/* Maximize Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComponentStateChange?.('maximized');
              }}
              style={{
                width: '24px',
                height: '24px',
                minWidth: '24px',
                minHeight: '24px',
                flex: '0 0 24px',
                boxSizing: 'border-box',
                padding: '0',
                border: `1px solid ${componentState === 'maximized' ? currentTheme.primary : currentTheme.border}`,
                borderRadius: '4px',
                backgroundColor: componentState === 'maximized' ? `${currentTheme.primary}20` : 'transparent',
                color: componentState === 'maximized' ? currentTheme.primary : currentTheme.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Maximize"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>

            {/* Remove Button (X) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              style={{
                width: '24px',
                height: '24px',
                minWidth: '24px',
                minHeight: '24px',
                flex: '0 0 24px',
                boxSizing: 'border-box',
                padding: '0',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: currentTheme.error || '#D69A82',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Remove"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Component Content */}
      {componentState === 'minimized' ? null : (
        <div style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative'
        }}>
          {children}
        </div>
      )}
    </div>
  );
};