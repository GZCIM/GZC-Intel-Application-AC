import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./modules/shell/components/auth/msalConfig";
import "./styles/globals.css";
import App from "./App.tsx";
import "./utils/errorMonitoring";
import { initSentry } from "./config/sentry";
import { eventMonitor } from "./utils/eventMonitor";
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { telemetryService } from './services/telemetryService';

// Emergency storage cleanup on app start to prevent MSAL authentication failures
try {
    // Clear largest localStorage items if quota is near limit
    const storageSize = Object.keys(localStorage).reduce((total, key) => {
        return total + (localStorage[key]?.length || 0);
    }, 0);
    
    if (storageSize > 3 * 1024 * 1024) { // If over 3MB
        console.warn('🧹 Emergency localStorage cleanup - size:', (storageSize / 1024 / 1024).toFixed(2) + 'MB');
        
        // Remove known large items
        const keysToRemove = Object.keys(localStorage).filter(key => 
            key.includes('tabLayouts') || 
            key.includes('canvas-state') || 
            key.includes('-old') || 
            key.includes('backup') ||
            localStorage[key]?.length > 100000
        );
        
        keysToRemove.forEach(key => {
            console.log('🗑️ Removing large localStorage key:', key, (localStorage[key]?.length / 1024).toFixed(1) + 'KB');
            localStorage.removeItem(key);
        });
    }
} catch (e) {
    console.error('Storage cleanup failed:', e);
    // If all else fails, clear everything except critical auth data
    try {
        const critical = ['msal.', 'gzc-intel-user'];
        const backup = {};
        critical.forEach(prefix => {
            Object.keys(localStorage).forEach(key => {
                if (key.includes(prefix)) {
                    backup[key] = localStorage[key];
                }
            });
        });
        localStorage.clear();
        Object.entries(backup).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });
        console.log('🚨 Emergency localStorage reset completed');
    } catch (e2) {
        console.error('Emergency reset failed:', e2);
        localStorage.clear();
    }
}

// Initialize Application Insights if connection string is available
if (import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING) {
    const appInsights = new ApplicationInsights({
        config: {
            connectionString: import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING,
            enableAutoRouteTracking: true, // Automatically track page views
            enableCorsCorrelation: true,   // Track AJAX/fetch requests
            enableRequestHeaderTracking: true,
            enableResponseHeaderTracking: true,
            autoTrackPageVisitTime: true,  // Track time spent on pages
        }
    });
    appInsights.loadAppInsights();
    appInsights.trackPageView(); // Initial page view
    console.log('✅ Application Insights initialized');
} else {
    console.warn('⚠️ Application Insights connection string not found');
}

// Initialize Sentry (fallback error tracking)
initSentry();

// Add development-only monitoring
if (import.meta.env.DEV) {
    console.log("🔍 Error monitoring enabled for development");
    // Event conflict monitor auto-starts in development
    console.log("🎯 Event conflict detection active");
}

// CRITICAL: Handle page refresh authentication restoration
// This must happen BEFORE React renders to prevent authentication state loss
const initializeApp = async () => {
    try {
        // Debug MSAL configuration before initialization
        const config = msalInstance.getConfiguration();
        console.log('🔍 MSAL Configuration:', {
            clientId: config?.auth?.clientId || 'NOT SET',
            authority: config?.auth?.authority || 'NOT SET',
            redirectUri: config?.auth?.redirectUri || 'NOT SET',
        });
        
        // Initialize MSAL instance first
        await msalInstance.initialize();
        console.log('✅ MSAL initialized successfully');
        
        // Make MSAL available globally AFTER initialization
        (window as any).msalInstance = msalInstance;
        
        // Handle redirect promise for returning from auth redirects
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
            console.log('✅ Redirect authentication successful:', response.account?.username);
            msalInstance.setActiveAccount(response.account);
        }
        
        // Check for existing accounts after initialization
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            // Set the first account as active if none is set
            const activeAccount = msalInstance.getActiveAccount();
            if (!activeAccount) {
                console.log('🔄 Setting active account after page refresh:', accounts[0].username);
                msalInstance.setActiveAccount(accounts[0]);
            }
        }
        
        console.log('🔐 MSAL initialized with', accounts.length, 'accounts');
        
    } catch (error) {
        console.error('❌ MSAL initialization failed:', error);
        console.error('❌ Error details:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
        });
        // Still render the app even if MSAL fails, so users can see error messages
    }
    
    // Render React app after MSAL is properly initialized
    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <MsalProvider instance={msalInstance}>
                <App />
            </MsalProvider>
        </StrictMode>
    );
};

// Initialize the app
initializeApp();
