import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../modules/shell/components/auth/msalConfig";
import { AccountInfo } from "@azure/msal-browser";

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

    // Development mode fallback
    if (isDevelopmentMode()) {
        console.log("🚧 Using development authentication bypass mode");
        return {
            isAuthenticated: true, // Always authenticated in dev mode
            login: async () => {
                console.log("Development login - no action needed");
            },
            logout: async () => {
                console.log("Development logout - no action needed");
            },
            getAccessToken: async (): Promise<string> => {
                const mockToken = "dev-mock-token-" + Date.now();
                console.log("Returning development mock token");
                return mockToken;
            },
            getAccount: (): AccountInfo | null => {
                return {
                    homeAccountId: "dev-home-account",
                    environment: "development",
                    tenantId: "dev-tenant",
                    username: "dev-user@development.com",
                    localAccountId: "dev-local-account",
                    name: "Development User",
                    nativeAccountId: "dev-native-account",
                    authorityType: "MSSTS",
                    clientInfo: "",
                    idToken: "",
                    idTokenClaims: {},
                    tenantProfiles: new Map(),
                } as AccountInfo;
            },
            accounts: [],
        };
    }

    // Production MSAL authentication
    const login = async () => {
        try {
            await instance.loginPopup(loginRequest);
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
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
            // Fallback to interactive token acquisition
            const response = await instance.acquireTokenPopup(loginRequest);
            return response.accessToken;
        }
    };

    const getAccount = (): AccountInfo | null => {
        return accounts.length > 0 ? accounts[0] : null;
    };

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
