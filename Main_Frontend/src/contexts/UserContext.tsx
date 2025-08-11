import React, { createContext, useState, useEffect, ReactNode } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { AccountInfo } from "@azure/msal-browser";

interface User {
    id: string;
    email: string;
    name: string;
    role?: string;
    tenantId?: string;
    accountId?: string;
}

interface UserContextValue {
    user: User | null;
    isAuthenticated: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    msalAccount: AccountInfo | null;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export { UserContext };

export function UserProvider({ children }: { children: ReactNode }) {
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const [user, setUser] = useState<User | null>(null);

    // Convert MSAL account to our User interface
    const convertMsalAccountToUser = (account: AccountInfo): User => {
        return {
            id: account.localAccountId || account.homeAccountId,
            email: account.username,
            name: account.name || account.username,
            tenantId: account.tenantId,
            accountId: account.localAccountId,
        };
    };

    // Sync user state with MSAL authentication
    useEffect(() => {
        if (isAuthenticated && accounts.length > 0) {
            const msalAccount = accounts[0];
            const convertedUser = convertMsalAccountToUser(msalAccount);
            setUser(convertedUser);
            // Store in localStorage for persistence
            try {
                localStorage.setItem(
                    "gzc-intel-user",
                    JSON.stringify(convertedUser)
                );
            } catch (e) {
                if (e instanceof Error && e.name === 'QuotaExceededError') {
                    console.error('localStorage quota exceeded. Clearing old data...');
                    
                    // Clear non-essential data
                    const keysToKeep = ['msal', 'gzc-intel-user'];
                    const allKeys = Object.keys(localStorage);
                    
                    for (const key of allKeys) {
                        // Skip critical keys
                        if (keysToKeep.some(keep => key.includes(keep))) continue;
                        
                        // Remove old/large items
                        if (key.includes('tabLayouts') || key.includes('canvas-state') || 
                            key.includes('-old') || key.includes('backup')) {
                            localStorage.removeItem(key);
                        }
                    }
                    
                    // Try again after cleanup
                    try {
                        localStorage.setItem(
                            "gzc-intel-user",
                            JSON.stringify(convertedUser)
                        );
                    } catch (retryError) {
                        console.error('Still cannot save user after cleanup:', retryError);
                        // Store in sessionStorage as fallback
                        sessionStorage.setItem("gzc-intel-user", JSON.stringify(convertedUser));
                    }
                } else {
                    console.error('Error saving user to localStorage:', e);
                }
            }
        } else {
            // Clear user state when not authenticated
            setUser(null);
            localStorage.removeItem("gzc-intel-user");
        }
    }, [isAuthenticated, accounts]);

    // Wait for MSAL to initialize before checking localStorage
    // This prevents race conditions on page refresh
    useEffect(() => {
        // CRITICAL: Only use localStorage as fallback if MSAL has no accounts
        // Wait a moment for MSAL to initialize from its cache
        const checkAuthState = async () => {
            // CRITICAL: MSAL needs 300-500ms to restore from localStorage
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!isAuthenticated && accounts.length === 0) {
                const storedUser = localStorage.getItem("gzc-intel-user");
                if (storedUser) {
                    try {
                        const parsed = JSON.parse(storedUser);
                        console.log('📋 Using stored user as fallback:', parsed.email);
                        setUser(parsed);
                    } catch (e) {
                        console.error("Failed to parse stored user:", e);
                        localStorage.removeItem("gzc-intel-user");
                    }
                }
            } else if (!isAuthenticated && accounts.length > 0) {
                // MSAL has accounts but isAuthenticated is false - this is the refresh bug
                console.log('🔄 MSAL has accounts but not authenticated, activating...');
                const activeAccount = instance.getActiveAccount();
                if (!activeAccount) {
                    instance.setActiveAccount(accounts[0]);
                }
            }
        };
        
        checkAuthState();
    }, [isAuthenticated, accounts.length]);

    const login = async () => {
        try {
            await instance.loginPopup({
                scopes: [`api://${import.meta.env.VITE_CLIENT_ID}/.default`],
            });
            // User state will be updated automatically through useEffect
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await instance.logoutPopup();
            setUser(null);
            localStorage.removeItem("gzc-intel-user");
        } catch (error) {
            console.error("Logout failed:", error);
            throw error;
        }
    };

    return (
        <UserContext.Provider
            value={{
                user,
                isAuthenticated,
                login,
                logout,
                msalAccount: accounts.length > 0 ? accounts[0] : null,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}
