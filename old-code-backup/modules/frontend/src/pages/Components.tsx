import React from 'react'
import { quantumTheme } from '../theme/quantum'

export const Components: React.FC = () => {
  return (
    <div style={{
      padding: quantumTheme.spacing.lg,
      backgroundColor: quantumTheme.background,
      minHeight: '100%'
    }}>
      <h1 style={quantumTheme.typography.h1}>Components</h1>
      <p style={quantumTheme.typography.body}>Component library overview</p>
    </div>
  )
}

export default Components