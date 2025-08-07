import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";

// PROFESSIONAL ARCHITECTURE: Unified provider system (no conflicts)
import { UnifiedProvider } from "./core/providers/UnifiedProvider";
import { GridProvider } from "./core/layout";
import { TabLayoutProvider, useTabLayout } from "./core/tabs";
import { ProfessionalHeader } from "./components/ProfessionalHeader";
import { EnhancedComponentLoader } from "./core/tabs/EnhancedComponentLoader";
import { MarketIntelPanel } from "./components/MarketIntelPanel";
import { UserProvider } from "./contexts/UserContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { QuoteProvider } from "./contexts/QuoteContext";
import { EnhancedErrorBoundary } from "./components/EnhancedErrorBoundary";
import { SentryErrorBoundary } from "./config/sentry";
import { UserTabDebugger } from "./components/UserTabDebugger";
import { InventoryDebugger } from "./components/debug/InventoryDebugger";
import { QuoteFlowDebugger } from "./components/debug/QuoteFlowDebugger";
import { AuthDebugger } from "./components/AuthDebugger";
// Portfolio test components hidden
// import { PortfolioTest } from "./components/PortfolioTest";
// import { SimplePortfolioTest } from "./components/SimplePortfolioTest";
import { useAuth } from "./hooks/useAuth";
import LoginModal from "./modules/shell/components/auth/LoginModal";

import "./styles/globals.css";
import "./styles/quantum.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Memory inspector for development (makes memoryInspector available globally)
import "./utils/memoryInspector";

// Fix component IDs on startup
import "./utils/fixComponentIds";

// Inner app component that uses theme and handles authentication
function AppContent() {
    const { currentTheme } = useTheme();
    const { isAuthenticated } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const { currentLayout, activeTabId, toggleTabEditMode } = useTabLayout();
    
    // Get active tab from current layout
    const activeTab = currentLayout?.tabs.find(tab => tab.id === activeTabId);

    // Show login modal if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            setShowLoginModal(true);
        } else {
            setShowLoginModal(false);
        }
    }, [isAuthenticated]);

    const handleLoginModalClose = () => {
        // Only close if user is authenticated, otherwise keep it open
        if (isAuthenticated) {
            setShowLoginModal(false);
        }
    };

    return (
        <>
            <div
                className="min-h-screen flex flex-col"
                style={{
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                }}
            >
                {/* Professional Header from port 3200 */}
                <ProfessionalHeader />

                {/* Main Layout with Market Intel Panel */}
                <div
                    className="flex flex-1 overflow-hidden"
                    style={{ position: "relative" }}
                >
                    {/* Market Intel Panel - Left side */}
                    <MarketIntelPanel />

                    {/* Main Content Area - Right side */}
                    <main
                        className="flex-1 overflow-hidden"
                        style={{
                            backgroundColor: currentTheme.background,
                            paddingBottom: "40px",
                        }}
                    >
                        <EnhancedComponentLoader />
                    </main>
                </div>

                {/* Next-Gen Status Bar - matching PMS NextGen */}
                <div
                    style={{
                        position: "fixed",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: currentTheme.surface + "EE",
                        borderTop: `1px solid ${currentTheme.border}`,
                        padding: "6px 16px",
                        fontSize: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: "40px",
                        zIndex: 1000,
                        backdropFilter: "blur(12px)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            gap: "16px",
                            alignItems: "center",
                        }}
                    >
                        <span style={{ color: currentTheme.success }}>
                            ● All Systems Operational
                        </span>
                        {/* Edit Mode Controls */}
                        {activeTab?.closable && (
                            <button
                                onClick={() => toggleTabEditMode(activeTabId)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    backgroundColor: activeTab?.editMode 
                                        ? currentTheme.primary 
                                        : 'transparent',
                                    color: activeTab?.editMode 
                                        ? '#ffffff' 
                                        : currentTheme.textSecondary,
                                    border: `1px solid ${activeTab?.editMode 
                                        ? currentTheme.primary 
                                        : currentTheme.border}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                title={activeTab?.editMode ? 'Save and lock components' : 'Edit component layout'}
                            >
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {activeTab?.editMode ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    )}
                                </svg>
                                {activeTab?.editMode ? 'Lock' : 'Edit'}
                            </button>
                        )}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            gap: "16px",
                            alignItems: "center",
                        }}
                    >
                        <span style={{ color: currentTheme.textSecondary }}>
                            Month to Date P&L:{" "}
                            <span style={{ color: currentTheme.success }}>
                                +$86,930.45
                            </span>
                        </span>
                        <span style={{ color: currentTheme.textSecondary }}>
                            |
                        </span>
                        <span style={{ color: currentTheme.textSecondary }}>
                            Daily P&L:{" "}
                            <span style={{ color: currentTheme.success }}>
                                +$12,886.81
                            </span>
                        </span>
                    </div>
                </div>

                {/* WebSocket connection debugger - Now available through Tools menu */}

                {/* Debug Components - Only in Development */}
                {process.env.NODE_ENV === "development" && (
                    <>
                        <UserTabDebugger />
                        {/* Temporary inventory debugger */}
                        <InventoryDebugger />
                        <AuthDebugger />
                        {/* Portfolio API Test components hidden */}
                        {/* <PortfolioTest /> */}
                        {/* <SimplePortfolioTest /> */}
                    </>
                )}
            </div>

            {/* Login Modal - Shows automatically when not authenticated */}
            <LoginModal
                isOpen={showLoginModal}
                onLogin={handleLoginModalClose}
            />
        </>
    );
}

function App() {
    return (
        <SentryErrorBoundary
            fallback={({ error }) => (
                <div style={{ padding: "20px", color: "#ff0000" }}>
                    <h2>Application Error</h2>
                    <details style={{ whiteSpace: "pre-wrap" }}>
                        {error?.toString()}
                    </details>
                </div>
            )}
            showDialog
        >
            <ThemeProvider>
                <EnhancedErrorBoundary componentName="App">
                    <UnifiedProvider>
                        <UserProvider>
                            <QuoteProvider mockMode={false} autoConnect={true}>
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
    );
}

export default App;
