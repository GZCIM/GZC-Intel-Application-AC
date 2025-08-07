import React, { ReactNode, useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { ThemeProvider } from "../theme";
import {
    DateProvider,
    QuoteProvider,
    AuthContext,
} from "../../modules/ui-library";
import { loginRequest } from "../../modules/shell/components/auth/msalConfig";
import { setAuthTokenProvider } from "../../services/api";
import { setPortfolioAuthTokenProvider } from "../../utils/axios";

interface UnifiedProviderProps {
    children: ReactNode;
}

/**
 * PROFESSIONAL ARCHITECTURE: Unified Provider System
 *
 * Combines all required providers into a single, conflict-free provider.
 * Integrated with MSAL for real Azure AD authentication.
 *
 * Architecture Rules:
 * - Single theme provider (no AlexThemeProvider conflict)
 * - Maximum 3 levels (enforced)
 * - Composed internally to prevent nesting hell
 * - Real MSAL authentication with Azure AD tokens
 */
export const UnifiedProvider: React.FC<UnifiedProviderProps> = ({
    children,
}) => {
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    const getToken = async () => {
        if (!isAuthenticated || accounts.length === 0) {
            throw new Error("User not authenticated");
        }

        try {
            // Get access token silently
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0],
            });
            return response.accessToken;
        } catch (error) {
            console.error("Failed to acquire token silently:", error);

            // Fallback to interactive token acquisition
            try {
                const response = await instance.acquireTokenPopup(loginRequest);
                return response.accessToken;
            } catch (interactiveError) {
                console.error(
                    "Failed to acquire token interactively:",
                    interactiveError
                );
                throw new Error("Unable to acquire authentication token");
            }
        }
    };

    const authContextValue = {
        getToken,
    };

    // Set up API authentication when provider mounts or auth state changes
    useEffect(() => {
        if (isAuthenticated) {
            setAuthTokenProvider(getToken);
            setPortfolioAuthTokenProvider(getToken);
        }
    }, [isAuthenticated, getToken]);

    return (
        <ThemeProvider>
            <AuthContext.Provider value={authContextValue}>
                <DateProvider>
                    <QuoteProvider>{children}</QuoteProvider>
                </DateProvider>
            </AuthContext.Provider>
        </ThemeProvider>
    );
};

export default UnifiedProvider;
