import React from "react";
import { useUser } from "../hooks/useUser";
import { useAuth } from "../hooks/useAuth";

// Helper function to generate initials from a name
const getInitials = (name: string): string => {
    return name
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("");
};

// Helper function to generate a color based on the user's name
const getUserColor = (name: string): string => {
    const colors = [
        "#3B82F6",
        "#10B981",
        "#8B5CF6",
        "#F59E0B",
        "#EF4444",
        "#06B6D4",
        "#84CC16",
        "#F97316",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export function UserSelector() {
    const { user, isAuthenticated } = useUser();
    const { logout } = useAuth();

    // If not authenticated, show login prompt
    if (!isAuthenticated || !user) {
        return (
            <div
                style={{
                    color: "#95BD78",
                    fontSize: "12px",
                    fontWeight: "500",
                }}
            >
                Not signed in
            </div>
        );
    }

    // Show the real MSAL user
    const initials = getInitials(user.name);
    const userColor = getUserColor(user.name);

    const handleSignOut = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Sign out failed:", error);
        }
    };

    return (
        <div className="relative group">
            {/* Current User Name */}
            <div
                style={{
                    color: "#95BD78",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                }}
            >
                <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{
                        backgroundColor: userColor,
                    }}
                >
                    {initials}
                </div>
                {user.name}
            </div>

            {/* Hover tooltip with sign out option */}
            <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                <div className="p-3">
                    <div className="flex items-center gap-3 mb-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{
                                backgroundColor: userColor,
                            }}
                        >
                            {initials}
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {user.email}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
