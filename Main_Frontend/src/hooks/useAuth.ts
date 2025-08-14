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

    // Check if in development mode (always false, but React doesn't know that)
    const inDevMode = isDevelopmentMode();

    // Safari-compatible authentication - use redirect for Safari, popup for Chrome
    const login = async () => {
        try {
            telemetryService.trackAuthEvent('login_attempt');
            
            // Detect Safari and use redirect instead of popup
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            console.log('Browser detection - Safari:', isSafari, 'UserAgent:', navigator.userAgent);
            
            if (isSafari) {
                console.log('🍎 Safari detected - using redirect authentication');
                // For Safari, use redirect flow which is more reliable
                await instance.loginRedirect(loginRequest);
                // loginRedirect doesn't return response, handled by redirect callback
            } else {
                console.log('🌐 Chrome/Edge detected - using popup authentication');
                const response = await instance.loginPopup(loginRequest);
                telemetryService.trackAuthEvent('login_success', {
                    username: response.account?.username,
                    accountId: response.account?.homeAccountId
                });
                if (response.account) {
                    telemetryService.setUserId(response.account.homeAccountId);
                }
            }
        } catch (error) {
            // Check if it's an interaction_in_progress error
            if (error instanceof Error && error.message.includes('interaction_in_progress')) {
                console.log('MSAL interaction in progress, waiting and retrying...');
                // Wait longer and retry once
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    const response = await instance.loginPopup(loginRequest);
                    telemetryService.trackAuthEvent('login_success_retry', {
                        username: response.account?.username,
                        accountId: response.account?.homeAccountId
                    });
                    if (response.account) {
                        telemetryService.setUserId(response.account.homeAccountId);
                    }
                    return;
                } catch (retryError) {
                    console.error("Login retry also failed:", retryError);
                }
            }
            
            telemetryService.trackAuthEvent('login_failure', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error("Login failed:", error);
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
