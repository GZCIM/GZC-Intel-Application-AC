import React from 'react'
import { quantumTheme } from '../../theme/quantum'

export const SetupDocs: React.FC = () => {
  return (
    <div style={{
      padding: quantumTheme.spacing.lg,
      backgroundColor: quantumTheme.background,
      minHeight: '100%'
    }}>
      <h1 style={quantumTheme.typography.h1}>Setup Documentation</h1>
      <p style={quantumTheme.typography.body}>Architecture and setup guide</p>
    </div>
  )
}

export default SetupDocs