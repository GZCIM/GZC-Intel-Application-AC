import React from 'react'
import G10YieldCurveAnimator from './G10YieldCurveAnimator'
import { quantumTheme } from '../../theme/quantum'

interface G10YieldCurveAnimatorWrapperProps {
  isFullscreen?: boolean
  onFullscreenToggle?: () => void
}

export const G10YieldCurveAnimatorWrapper: React.FC<G10YieldCurveAnimatorWrapperProps> = ({
  isFullscreen,
  onFullscreenToggle
}) => {
  // Convert our quantum theme to the format expected by the original component
  const theme = {
    primary: quantumTheme.primary,
    secondary: quantumTheme.secondary,
    accent: quantumTheme.accent,
    background: quantumTheme.background,
    surface: quantumTheme.surface,
    surfaceAlt: quantumTheme.surfaceAlt,
    text: quantumTheme.text,
    textSecondary: quantumTheme.textSecondary,
    border: quantumTheme.border,
    success: quantumTheme.success,
    danger: quantumTheme.danger,
    warning: quantumTheme.warning,
    info: '#0288d1',
    gradient: quantumTheme.gradient
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <G10YieldCurveAnimator theme={theme} />
    </div>
  )
}