import { useEffect, useRef, useState, useCallback } from 'react'
import { VolatilityAnalysis } from './VolatilityAnalysis'
import { useTheme } from '../../contexts/ThemeContext'

interface ResponsiveVolatilityAnalysisProps {
  theme?: 'light' | 'dark'
  apiEndpoint?: string
}

/**
 * Responsive wrapper for VolatilityAnalysis component
 * Handles proper resizing with ResizeObserver and smooth transitions
 */
export function ResponsiveVolatilityAnalysis(props: ResponsiveVolatilityAnalysisProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const resizeTimeoutRef = useRef<NodeJS.Timeout>()
  const { currentTheme } = useTheme()

  // Debounced resize handler for smooth resizing
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    // Clear existing timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current)
    }

    // Get new dimensions
    for (const entry of entries) {
      const { width, height } = entry.contentRect
      
      // Only update if dimensions actually changed to prevent infinite loops
      setDimensions(prevDimensions => {
        const newWidth = Math.round(width)
        const newHeight = Math.round(height)
        
        if (Math.round(prevDimensions.width) !== newWidth || Math.round(prevDimensions.height) !== newHeight) {
          setIsResizing(true)
          return { width: newWidth, height: newHeight }
        }
        return prevDimensions
      })
    }

    // Mark resize as complete after delay
    resizeTimeoutRef.current = setTimeout(() => {
      setIsResizing(false)
    }, 150)
  }, [])

  // Set up ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    // Initial measurement
    const rect = containerRef.current.getBoundingClientRect()
    setDimensions({ width: rect.width, height: rect.height })

    return () => {
      resizeObserver.disconnect()
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [handleResize])

  // Calculate responsive layout based on width
  const getLayout = () => {
    const { width } = dimensions
    
    if (width < 600) {
      // Mobile: Stack vertically
      return {
        layout: 'vertical',
        leftColumnWidth: '100%',
        rightColumnWidth: '100%',
        flexDirection: 'column' as const
      }
    } else if (width < 900) {
      // Tablet: 60/40 split
      return {
        layout: 'horizontal-compact',
        leftColumnWidth: '60%',
        rightColumnWidth: '40%',
        flexDirection: 'row' as const
      }
    } else {
      // Desktop: 50/50 split
      return {
        layout: 'horizontal',
        leftColumnWidth: '50%',
        rightColumnWidth: '50%',
        flexDirection: 'row' as const
      }
    }
  }

  const layout = getLayout()

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: isResizing ? 'none' : 'all 0.3s ease',
        backgroundColor: currentTheme.background
      }}
    >
      {/* Loading overlay during resize */}
      {isResizing && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: currentTheme.background + 'ee',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: 0.3,
          transition: 'opacity 0.2s ease'
        }}>
          <div style={{
            fontSize: '12px',
            color: currentTheme.textSecondary,
            fontWeight: 500
          }}>
            Resizing...
          </div>
        </div>
      )}

      {/* Wrapped component with responsive styles */}
      <div style={{
        width: '100%',
        height: '100%',
        transform: isResizing ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.2s ease',
        opacity: isResizing ? 0.95 : 1
      }}>
        <VolatilityAnalysis {...props} />
      </div>

      {/* Size indicator for debugging (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          fontSize: '10px',
          color: currentTheme.textSecondary,
          backgroundColor: currentTheme.surface + 'dd',
          padding: '4px 8px',
          borderRadius: '4px',
          border: `1px solid ${currentTheme.border}`,
          pointerEvents: 'none',
          zIndex: 100
        }}>
          {Math.round(dimensions.width)} × {Math.round(dimensions.height)} | {layout.layout}
        </div>
      )}
    </div>
  )
}

// Export as default for easier importing
export default ResponsiveVolatilityAnalysis