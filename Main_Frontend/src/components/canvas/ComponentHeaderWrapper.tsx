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

  // Responsive header helpers
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerWidth, setHeaderWidth] = useState<number>(0);
  useEffect(() => {
    if (!headerRef.current) return;
    const el = headerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setHeaderWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setHeaderWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

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
      {/* Inline header: title before the component's first row of controls */}
      <div ref={headerRef} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', gap: '6px', backgroundColor: currentTheme.background, borderBottom: `1px solid ${currentTheme.border}`, position: 'relative', paddingRight: isEditMode ? 120 : undefined, minHeight: isEditMode ? 40 : undefined }}>
        {isEditMode ? (
          <input
            type="text"
            value={inputValue}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={(e) => onTitleChange?.(e.target.value)}
            style={{
              background: 'transparent',
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '4px',
              padding: '2px 6px',
              color: currentTheme.text,
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              maxWidth: '30%'
            }}
            placeholder={defaultName || 'Enter title...'}
          />
        ) : (
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: currentTheme.text,
            whiteSpace: 'nowrap'
          }}>
            {displayName}
          </span>
        )}
        {/* Children should start right after the title */}
        <div style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {children}
        </div>
        {/* Edit controls floated right, only in edit mode */}
        {isEditMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px', position: 'absolute', right: 8, top: 6 }}>
            <button onClick={() => onComponentStateChange?.('minimized')} style={{ width: 24, height: 24, border: `1px solid ${componentState === 'minimized' ? currentTheme.primary : currentTheme.border}`, borderRadius: 4, background: 'transparent', color: componentState === 'minimized' ? currentTheme.primary : currentTheme.textSecondary, cursor: 'pointer' }} title="Minimize">–</button>
            <button onClick={() => onComponentStateChange?.('normal')} style={{ width: 24, height: 24, border: `1px solid ${componentState === 'normal' ? currentTheme.primary : currentTheme.border}`, borderRadius: 4, background: 'transparent', color: componentState === 'normal' ? currentTheme.primary : currentTheme.textSecondary, cursor: 'pointer' }} title="Normal">□</button>
            <button onClick={() => onComponentStateChange?.('maximized')} style={{ width: 24, height: 24, border: `1px solid ${componentState === 'maximized' ? currentTheme.primary : currentTheme.border}`, borderRadius: 4, background: 'transparent', color: componentState === 'maximized' ? currentTheme.primary : currentTheme.textSecondary, cursor: 'pointer' }} title="Maximize">▣</button>
            <button onClick={onRemove} style={{ width: 24, height: 24, border: `1px solid ${currentTheme.border}`, borderRadius: 4, background: 'transparent', color: currentTheme.error || '#D69A82', cursor: 'pointer' }} title="Remove">×</button>
          </div>
        )}
      </div>
      {componentState === 'minimized' ? null : (
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }} />
      )}
    </div>
  );
};