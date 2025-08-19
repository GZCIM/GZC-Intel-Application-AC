import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./modules/shell/components/auth/msalConfig";
import "./styles/globals.css";
import App from "./App.tsx";
import "./utils/errorMonitoring";
import { initSentry } from "./config/sentry";
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { clearMsalCache, getStorageInfo } from "./utils/clearMsalCache";

// CRITICAL FIX: Clear MSAL cache from localStorage to prevent quota exceeded errors
// MSAL has been reconfigured to use sessionStorage going forward
try {
    const beforeInfo = getStorageInfo();
    console.log('📊 Storage before cleanup:', beforeInfo);
    
    // Clear all MSAL cache entries that are causing quota issues
    clearMsalCache();
    
    const afterInfo = getStorageInfo();
    console.log('📊 Storage after cleanup:', afterInfo);
    
    // Additional aggressive cleanup if still over 4MB
    if (afterInfo.totalSize > 4 * 1024 * 1024) {
        console.warn('⚠️ Still over 4MB, performing additional cleanup...');
        
        // Remove large items and old data
        const keysToRemove = Object.keys(localStorage).filter(key => {
            const value = localStorage[key];
            const size = new Blob([value]).size;
            return size > 100000 || // Items over 100KB
                   key.includes('-old') || 
                   key.includes('backup') ||
                   key.includes('temp') ||
                   key.includes('cache');
        });
        
        keysToRemove.forEach(key => {
            console.log('🗑️ Removing large/old key:', key);
            localStorage.removeItem(key);
        });
    }
} catch (e) {
    console.error('Storage cleanup failed:', e);
}

// Initialize Application Insights
if (import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING) {
    const appInsights = new ApplicationInsights({
        config: {
            connectionString: import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING,
            enableAutoRouteTracking: true,
            enableCorsCorrelation: true,
            enableRequestHeaderTracking: true,
            enableResponseHeaderTracking: true,
            autoTrackPageVisitTime: true,
        }
    });
    appInsights.loadAppInsights();
    appInsights.trackPageView();
    console.log('✅ Application Insights initialized (Optimized)');
}

// Initialize Sentry
initSentry();

// Add development monitoring
if (import.meta.env.DEV) {
    console.log("🔍 Optimized error monitoring enabled for development");
}

// OPTIMIZED: Streamlined app initialization
const initializeOptimizedApp = async () => {
    try {
        console.log('🚀 Initializing Optimized App...');
        
        // Initialize MSAL
        await msalInstance.initialize();
        console.log('✅ MSAL initialized successfully (Optimized)');
        
        // Make MSAL available globally
        (window as any).msalInstance = msalInstance;
        
        // Handle redirect promise
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
            console.log('✅ Redirect authentication successful (Optimized):', response.account?.username);
            msalInstance.setActiveAccount(response.account);
        }
        
        // Set active account if none is set
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
            console.log('🔄 Setting active account (Optimized):', accounts[0].username);
            msalInstance.setActiveAccount(accounts[0]);
        }
        
        console.log('🔐 MSAL initialized with', accounts.length, 'accounts (Optimized)');
        
    } catch (error) {
        console.error('❌ MSAL initialization failed (Optimized):', error);
    }
    
    // OPTIMIZED: Render with MsalProvider wrapping the app
    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <MsalProvider instance={msalInstance}>
                <App />
            </MsalProvider>
        </StrictMode>
    );
};

// Initialize the optimized app
initializeOptimizedApp();