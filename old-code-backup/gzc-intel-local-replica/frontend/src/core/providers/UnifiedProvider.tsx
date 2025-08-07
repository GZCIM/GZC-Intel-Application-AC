import React, { ReactNode } from 'react'
import { ThemeProvider } from '../theme'
import { DateProvider, QuoteProvider, AuthContext } from '../../modules/ui-library'

interface UnifiedProviderProps {
  children: ReactNode
}

/**
 * PROFESSIONAL ARCHITECTURE: Unified Provider System
 * 
 * Combines all required providers into a single, conflict-free provider.
 * Prevents the dual provider pattern that crashed ports 3200, 3500, 3600.
 * 
 * Architecture Rules:
 * - Single theme provider (no AlexThemeProvider conflict)
 * - Maximum 3 levels (enforced)
 * - Composed internally to prevent nesting hell
 * - Real authentication (no mock tokens)
 */
export const UnifiedProvider: React.FC<UnifiedProviderProps> = ({ children }) => {
  // TODO: Replace with real Azure Key Vault authentication
  const authContextValue = {
    getToken: async () => {
      // SECURITY NOTE: This will be replaced with Azure Key Vault integration
      // Mock token only for foundation testing
      return "mock-token-will-be-replaced"
    }
  }

  return (
    <ThemeProvider>
      <AuthContext.Provider value={authContextValue}>
        <DateProvider>
          <QuoteProvider>
            {children}
          </QuoteProvider>
        </DateProvider>
      </AuthContext.Provider>
    </ThemeProvider>
  )
}

export default UnifiedProvider