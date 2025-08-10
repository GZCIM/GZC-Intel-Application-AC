import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./modules/shell/components/auth/msalConfig";
import "./styles/globals.css";
import App from "./App.tsx";
import "./utils/errorMonitoring";
import { initSentry } from "./config/sentry";
import { eventMonitor } from "./utils/eventMonitor";

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

// Initialize Sentry
initSentry();

// Add development-only monitoring
if (import.meta.env.DEV) {
    console.log("🔍 Error monitoring enabled for development");
    // Event conflict monitor auto-starts in development
    console.log("🎯 Event conflict detection active");
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MsalProvider instance={msalInstance}>
            <App />
        </MsalProvider>
    </StrictMode>
);
