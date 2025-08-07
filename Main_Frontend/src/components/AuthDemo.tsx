import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useUser } from "../hooks/useUser";
import { useUserClaims } from "../hooks/useAuth";

/**
 * MSAL Authentication Demo Component
 *
 * Demonstrates the new MSAL authentication integration:
 * - Login/Logout functionality
 * - Access token retrieval
 * - User information display
 * - Claims and roles
 */
export const AuthDemo: React.FC = () => {
    const { isAuthenticated, login, logout, getAccessToken } = useAuth();
    const { user, msalAccount } = useUser();
    const userClaims = useUserClaims();

    const handleGetToken = async () => {
        try {
            const token = await getAccessToken();
            console.log("Access Token:", token);
            alert("Token logged to console");
        } catch (error) {
            console.error("Failed to get token:", error);
            alert("Failed to get token. Check console for details.");
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                MSAL Authentication Demo
            </h2>

            {/* Authentication Status */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <span
                        className={`w-3 h-3 rounded-full ${
                            isAuthenticated ? "bg-green-500" : "bg-red-500"
                        }`}
                    />
                    <span className="font-medium">
                        Status:{" "}
                        {isAuthenticated
                            ? "Authenticated"
                            : "Not Authenticated"}
                    </span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
                {!isAuthenticated ? (
                    <button
                        onClick={login}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
                    >
                        Sign In with Microsoft
                    </button>
                ) : (
                    <>
                        <button
                            onClick={logout}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition"
                        >
                            Sign Out
                        </button>
                        <button
                            onClick={handleGetToken}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition"
                        >
                            Get Access Token
                        </button>
                    </>
                )}
            </div>

            {/* User Information */}
            {isAuthenticated && user && (
                <div className="space-y-4">
                    <div className="border rounded-lg p-4 dark:border-gray-600">
                        <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                            User Information
                        </h3>
                        <div className="space-y-1 text-sm">
                            <p>
                                <strong>Name:</strong> {user.name}
                            </p>
                            <p>
                                <strong>Email:</strong> {user.email}
                            </p>
                            <p>
                                <strong>User ID:</strong> {user.id}
                            </p>
                            {user.tenantId && (
                                <p>
                                    <strong>Tenant ID:</strong> {user.tenantId}
                                </p>
                            )}
                        </div>
                    </div>

                    {userClaims && (
                        <div className="border rounded-lg p-4 dark:border-gray-600">
                            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                                User Claims
                            </h3>
                            <div className="space-y-1 text-sm">
                                <p>
                                    <strong>Account ID:</strong>{" "}
                                    {userClaims.accountId}
                                </p>
                                <p>
                                    <strong>Tenant ID:</strong>{" "}
                                    {userClaims.tenantId}
                                </p>
                                {userClaims.roles.length > 0 && (
                                    <p>
                                        <strong>Roles:</strong>{" "}
                                        {userClaims.roles.join(", ")}
                                    </p>
                                )}
                                {userClaims.groups.length > 0 && (
                                    <p>
                                        <strong>Groups:</strong>{" "}
                                        {userClaims.groups.join(", ")}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {msalAccount && (
                        <div className="border rounded-lg p-4 dark:border-gray-600">
                            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                                MSAL Account
                            </h3>
                            <div className="space-y-1 text-sm">
                                <p>
                                    <strong>Username:</strong>{" "}
                                    {msalAccount.username}
                                </p>
                                <p>
                                    <strong>Home Account ID:</strong>{" "}
                                    {msalAccount.homeAccountId}
                                </p>
                                <p>
                                    <strong>Local Account ID:</strong>{" "}
                                    {msalAccount.localAccountId}
                                </p>
                                <p>
                                    <strong>Environment:</strong>{" "}
                                    {msalAccount.environment}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Setup Instructions */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                    Setup Required
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    To use MSAL authentication, set these environment variables:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                    <li>
                        • <code>VITE_CLIENT_ID</code> - Your Azure AD
                        application client ID
                    </li>
                    <li>
                        • <code>VITE_TENANT_ID</code> - Your Azure AD tenant ID
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default AuthDemo;
