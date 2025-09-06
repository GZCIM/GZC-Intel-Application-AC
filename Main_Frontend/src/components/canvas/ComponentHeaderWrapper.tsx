import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ComponentHeaderWrapperProps {
  componentId: string;
  instanceId: string;
  displayName: string;
  children: React.ReactNode;
  componentState: 'minimized' | 'normal' | 'maximized';
  onComponentStateChange?: (state: 'minimized' | 'normal' | 'maximized') => void;
  dataQuality?: number;
  lastUpdated?: string;
  isEditMode: boolean;
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
  children,
  componentState = 'normal',
  onComponentStateChange,
  dataQuality = 0,
  lastUpdated = 'Never',
  isEditMode
}) => {
  const { currentTheme } = useTheme();

  // In minimized state, show compact display
  if (componentState === 'minimized' && !isEditMode) {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        backgroundColor: currentTheme.surface,
        border: `1px solid ${currentTheme.border}`,
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onClick={() => onComponentStateChange?.('normal')}
      >
        <div style={{ fontSize: '24px', opacity: 0.4, marginBottom: '8px' }}>📊</div>
        <div style={{ 
          fontSize: '11px', 
          color: currentTheme.text,
          fontWeight: '500',
          textAlign: 'center'
        }}>
          {displayName}
        </div>
        <div style={{ 
          fontSize: '10px', 
          color: currentTheme.textSecondary,
          marginTop: '4px'
        }}>
          Click to expand
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: currentTheme.surface,
      border: `1px solid ${currentTheme.border}`,
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Component Header with integrated controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        backgroundColor: currentTheme.background,
        borderBottom: `1px solid ${currentTheme.border}`,
        minHeight: '36px',
        flexShrink: 0
      }}>
        {/* Left: Component Name */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          minWidth: 0
        }}>
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
        </div>

        {/* Center: Status Indicators */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '11px',
          color: currentTheme.textSecondary
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ opacity: 0.7 }}>Data Quality:</span>
            <span style={{ 
              color: dataQuality >= 90 ? '#10b981' : dataQuality >= 70 ? '#f59e0b' : '#ef4444',
              fontWeight: '500'
            }}>
              {dataQuality}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ opacity: 0.7 }}>Updated:</span>
            <span>{lastUpdated}</span>
          </div>
        </div>

        {/* Right: Component State Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          marginLeft: '8px'
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
        </div>
      </div>

      {/* Component Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative'
      }}>
        {children}
      </div>
    </div>
  );
};