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
            localStorage.setItem(
                "gzc-intel-user",
                JSON.stringify(convertedUser)
            );
        } else {
            // Clear user state when not authenticated
            setUser(null);
            localStorage.removeItem("gzc-intel-user");
        }
    }, [isAuthenticated, accounts]);

    // Load user from localStorage on mount (backup for page refresh)
    useEffect(() => {
        if (!isAuthenticated) {
            const storedUser = localStorage.getItem("gzc-intel-user");
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error("Failed to parse stored user:", e);
                    localStorage.removeItem("gzc-intel-user");
                }
            }
        }
    }, [isAuthenticated]);

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
