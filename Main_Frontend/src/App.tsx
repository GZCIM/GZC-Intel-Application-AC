import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
// import { clearCorruptStorage } from './utils/clearCorruptStorage';

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
import { DebugPanel } from "./components/debug/DebugPanel";
import { debugLogger } from "./utils/debugLogger";
import { getVersionString } from "./utils/version";
// Debug components - disabled
// import { UserTabDebugger } from "./components/UserTabDebugger";
// import { InventoryDebugger } from "./components/debug/InventoryDebugger";
// import { QuoteFlowDebugger } from "./components/debug/QuoteFlowDebugger";
// import { AuthDebugger } from "./components/AuthDebugger";
// Portfolio test components hidden
// import { PortfolioTest } from "./components/PortfolioTest";
// import { SimplePortfolioTest } from "./components/SimplePortfolioTest";
import { useAuth } from "./hooks/useAuth";
import LoginModal from "./modules/shell/components/auth/LoginModal";
import { Toast, toastManager } from "./components/Toast";
import { memoryService } from "./services/memoryService";
// Removed LayoutController - integrated into navigation

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
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    
    // Subscribe to toast notifications
    useEffect(() => {
        const unsubscribe = toastManager.subscribe((newToast) => {
            setToast(newToast);
        });
        return unsubscribe;
    }, []);
    
    // Get active tab from current layout
    const activeTab = currentLayout?.tabs.find(tab => tab.id === activeTabId);

    // Show login modal if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            setShowLoginModal(true);
        } else {
            setShowLoginModal(false);
            // Initialize memory service when authenticated
            memoryService.initialize();
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
                        <span style={{ color: currentTheme.textSecondary, fontSize: "11px" }}>
                            {getVersionString()}
                        </span>
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

                {/* Debug Components - Completely removed for production */}
                
                {/* Layout Controller removed - integrated into navigation */}
                
                {/* Toast Notifications */}
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>

            {/* Login Modal - Shows automatically when not authenticated */}
            <LoginModal
                isOpen={showLoginModal}
                onLogin={handleLoginModalClose}
            />
            
            {/* Debug Panel - Shows in development mode */}
            {!import.meta.env.PROD && <DebugPanel />}
        </>
    );
}

function App() {
    // Disabled corruption check - was causing infinite loops
    // useEffect(() => {
    //     clearCorruptStorage()
    // }, [])

    useEffect(() => {
        debugLogger.info('App initialized', {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            localStorage: {
                keys: Object.keys(localStorage),
                size: new Blob(Object.values(localStorage)).size
            }
        })
    }, [])

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
