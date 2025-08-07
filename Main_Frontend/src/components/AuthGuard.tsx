import React, { ReactNode, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import LoginModal from "../modules/shell/components/auth/LoginModal";

interface AuthGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
    requireAuth?: boolean;
}

/**
 * Authentication Guard Component
 *
 * Protects routes and components by requiring MSAL authentication.
 * Shows login modal when user is not authenticated.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
    children,
    fallback,
    requireAuth = true,
}) => {
    const { isAuthenticated } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);

    // If authentication is not required, always show children
    if (!requireAuth) {
        return <>{children}</>;
    }

    // If user is authenticated, show children
    if (isAuthenticated) {
        return <>{children}</>;
    }

    // If not authenticated, show login modal or fallback
    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Authentication Required
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Please sign in to access GZC Intel Dashboard
                    </p>
                    <button
                        onClick={() => setShowLoginModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
                    >
                        Sign In
                    </button>
                </div>
            </div>

            <LoginModal
                isOpen={showLoginModal}
                onLogin={() => setShowLoginModal(false)}
            />
        </>
    );
};

export default AuthGuard;
