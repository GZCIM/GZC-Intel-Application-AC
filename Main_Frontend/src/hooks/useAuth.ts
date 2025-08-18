import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../modules/shell/components/auth/msalConfig";
import { AccountInfo } from "@azure/msal-browser";
import { telemetryService } from "../services/telemetryService";

/**
 * Check if we're in development mode without Azure AD configured
 * Force MSAL authentication even in development
 */
const isDevelopmentMode = () => {
    // Always use real MSAL authentication - no development bypass
    return false;
};

/**
 * Custom hook for MSAL authentication operations
 * Provides simplified interface for login, logout, and token management
 * Falls back to mock authentication in development when Azure AD is not configured
 */
export function useAuth() {
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    
    // Debug authentication state
    console.log("🔐 useAuth hook state:", {
        isAuthenticated,
        accountsLength: accounts.length,
        hasAccounts: accounts.length > 0,
        timestamp: new Date().toISOString()
    });

    // Check if in development mode (always false, but React doesn't know that)
    const inDevMode = isDevelopmentMode();

    // Safari-compatible authentication - use redirect for Safari, popup for Chrome
    const login = async () => {
        console.log("🔐 useAuth.login() called");
        console.log("🔐 useAuth.login() - MSAL instance:", !!instance);
        console.log("🔐 useAuth.login() - Accounts count:", accounts.length);
        
        // Additional safety check
        if (!instance) {
            const error = new Error("MSAL instance not initialized");
            console.error("🔐 useAuth.login() - MSAL not initialized:", error);
            throw error;
        }
        
        try {
            telemetryService.trackAuthEvent('login_attempt');
            
            // Check current authentication state
            console.log("🔐 useAuth.login() - Current isAuthenticated:", isAuthenticated);
            if (isAuthenticated && accounts.length > 0) {
                console.log("🔐 useAuth.login() - Already authenticated, skipping login");
                return;
            }
            
            // Detect Safari and use redirect instead of popup
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            console.log('🔐 useAuth.login() - Browser detection - Safari:', isSafari, 'UserAgent:', navigator.userAgent);
            
            if (isSafari) {
                console.log('🍎 useAuth.login() - Safari detected - using redirect authentication');
                // For Safari, use redirect flow which is more reliable
                await instance.loginRedirect(loginRequest);
                // loginRedirect doesn't return response, handled by redirect callback
            } else {
                console.log('🌐 useAuth.login() - Chrome/Edge detected - using popup authentication');
                const response = await instance.loginPopup(loginRequest);
                console.log('🔐 useAuth.login() - Popup response received:', !!response);
                telemetryService.trackAuthEvent('login_success', {
                    username: response.account?.username,
                    accountId: response.account?.homeAccountId
                });
                if (response.account) {
                    telemetryService.setUserId(response.account.homeAccountId);
                }
            }
        } catch (error) {
            console.log("🔐 useAuth.login() - Error caught:", error);
            
            // Check if it's an interaction_in_progress error
            if (error instanceof Error && error.message.includes('interaction_in_progress')) {
                console.log('🔐 useAuth.login() - MSAL interaction in progress, checking for redirect response...');
                
                // For Safari, check if we're coming back from a redirect
                try {
                    const response = await instance.handleRedirectPromise();
                    if (response && response.account) {
                        console.log('✅ useAuth.login() - Found redirect response, login successful');
                        telemetryService.trackAuthEvent('login_success_redirect', {
                            username: response.account?.username,
                            accountId: response.account?.homeAccountId
                        });
                        telemetryService.setUserId(response.account.homeAccountId);
                        return;
                    }
                } catch (redirectError) {
                    console.error("🔐 useAuth.login() - Redirect promise handling failed:", redirectError);
                }
                
                // Otherwise wait and skip retry to avoid loops
                console.log('⏳ useAuth.login() - Auth in progress, please complete the login in the popup/redirect');
                return;
            }
            
            console.error("🔐 useAuth.login() - Login failed:", error);
            telemetryService.trackAuthEvent('login_failure', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    };

    const logout = async () => {
        try {
            telemetryService.trackAuthEvent('logout');
            await instance.logoutPopup();
        } catch (error) {
            console.error("Logout failed:", error);
            throw error;
        }
    };

    const getAccessToken = async (): Promise<string> => {
        if (!isAuthenticated || accounts.length === 0) {
            throw new Error("User not authenticated");
        }

        try {
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0],
            });
            return response.accessToken;
        } catch (error) {
            // Safari-compatible fallback - use redirect for Safari, popup for Chrome
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            
            if (isSafari) {
                console.log('🍎 Safari token acquisition - using redirect');
                // For Safari, use redirect flow which is more reliable
                await instance.acquireTokenRedirect(loginRequest);
                throw new Error("Token acquisition redirected - will complete after redirect");
            } else {
                console.log('🌐 Chrome token acquisition - using popup');
                const response = await instance.acquireTokenPopup(loginRequest);
                return response.accessToken;
            }
        }
    };

    const getAccount = (): AccountInfo | null => {
        return accounts.length > 0 ? accounts[0] : null;
    };

    // Since inDevMode is always false, we always return production auth
    // But keeping the variable ensures React sees consistent hook usage
    return {
        isAuthenticated,
        login,
        logout,
        getAccessToken,
        getAccount,
        accounts,
    };
}

/**
 * Hook for getting user claims from the MSAL account
 */
export function useUserClaims() {
    const { getAccount } = useAuth();
    const account = getAccount();

    if (!account) {
        return null;
    }

    return {
        email: account.username,
        name: account.name || account.username,
        tenantId: account.tenantId,
        accountId: account.localAccountId,
        roles: account.idTokenClaims?.roles || [],
        groups: account.idTokenClaims?.groups || [],
    };
}
