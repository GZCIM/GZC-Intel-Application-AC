import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'

// PROFESSIONAL ARCHITECTURE: Unified provider system (no conflicts)
import { UnifiedProvider } from './core/providers/UnifiedProvider'
import { GridProvider } from './core/layout'
import { TabLayoutProvider } from './core/tabs'
import { ProfessionalHeader } from './components/ProfessionalHeader'
import { EnhancedComponentLoader } from './core/tabs/EnhancedComponentLoader'
import { MarketIntelPanel } from './components/MarketIntelPanel'
import { UserProvider } from './contexts/UserContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { QuoteProvider } from './contexts/QuoteContext'
import { EnhancedErrorBoundary } from './components/EnhancedErrorBoundary'
import { SentryErrorBoundary } from './config/sentry'
import { UserTabDebugger } from './components/UserTabDebugger'
import { InventoryDebugger } from './components/debug/InventoryDebugger'

import './styles/globals.css'
import './styles/quantum.css'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// Memory inspector for development (makes memoryInspector available globally)
import './utils/memoryInspector'

// Fix component IDs on startup
import './utils/fixComponentIds'

// Inner app component that uses theme
function AppContent() {
  const { currentTheme } = useTheme()
  
  return (
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundColor: currentTheme.background, 
      color: currentTheme.text 
    }}>
      {/* Professional Header from port 3200 */}
      <ProfessionalHeader />
      
      {/* Main Layout with Market Intel Panel */}
      <div className="flex flex-1 overflow-hidden" style={{ position: 'relative' }}>
        {/* Market Intel Panel - Left side */}
        <MarketIntelPanel />
        
        {/* Main Content Area - Right side */}
        <main className="flex-1 overflow-hidden" style={{ 
          backgroundColor: currentTheme.background, 
          paddingBottom: '40px' 
        }}>
          <EnhancedComponentLoader />
        </main>
      </div>
      
      {/* Next-Gen Status Bar - matching PMS NextGen */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: currentTheme.surface + 'EE',
        borderTop: `1px solid ${currentTheme.border}`,
        padding: "6px 16px",
        fontSize: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: "40px",
        zIndex: 1000,
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ color: currentTheme.success }}>● All Systems Operational</span>
          <span style={{ color: currentTheme.textSecondary }}>Latency: 8ms</span>
          <span style={{ color: currentTheme.textSecondary }}>AI Models: 12/12 Online</span>
          <span style={{ color: currentTheme.textSecondary }}>Blockchain Sync: 100%</span>
          <span style={{ color: currentTheme.textSecondary }}>Layout: LG</span>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ color: currentTheme.textSecondary }}>Gas: 45 gwei</span>
          <span style={{ color: currentTheme.textSecondary }}>BTC: $67,234</span>
          <span style={{ color: currentTheme.textSecondary }}>ETH: $3,456</span>
          <span style={{ color: currentTheme.textSecondary }}>
            24h P&L: <span style={{ color: currentTheme.success }}>
              +$12,497.97
            </span>
          </span>
        </div>
      </div>
      
      {/* Debug Components - Only in Development */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <UserTabDebugger />
          {/* Temporary inventory debugger */}
          <InventoryDebugger />
        </>
      )}
    </div>
  )
}

function App() {
  return (
    <SentryErrorBoundary fallback={({ error }) => (
      <div style={{ padding: '20px', color: '#ff0000' }}>
        <h2>Application Error</h2>
        <details style={{ whiteSpace: 'pre-wrap' }}>
          {error?.toString()}
        </details>
      </div>
    )} showDialog>
      <ThemeProvider>
        <EnhancedErrorBoundary componentName="App">
          <UnifiedProvider>
            <UserProvider>
              <QuoteProvider mockMode={true} autoConnect={true}>
                <GridProvider>
                  <TabLayoutProvider>
                    <Router>
                      <AppContent />
                    </Router>
                  </TabLayoutProvider>
                </GridProvider>
              </QuoteProvider>
            </UserProvider>
          </UnifiedProvider>
        </EnhancedErrorBoundary>
      </ThemeProvider>
    </SentryErrorBoundary>
  )
}

export default App