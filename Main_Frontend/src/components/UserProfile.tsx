import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "../hooks/useUser";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";

// Helper function to generate initials from a name
const getInitials = (name: string): string => {
    return name
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("");
};

// Helper function to generate a color based on the user's name
const getUserColor = (name: string, theme: any): string => {
    const colors = [
        theme.info || "#3B82F6",
        theme.success || "#10B981",
        theme.secondary || "#8B5CF6",
        theme.warning || "#F59E0B",
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

interface UserProfileProps {
    showSignOut?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({
    showSignOut = true,
}) => {
    const { user, isAuthenticated } = useUser();
    const { logout } = useAuth();
    const { currentTheme: theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    // If not authenticated, show login prompt
    if (!isAuthenticated || !user) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "4px 8px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    color: theme.textSecondary,
                }}
            >
                Not signed in
            </div>
        );
    }

    const initials = getInitials(user.name);
    const userColor = getUserColor(user.name, theme);

    const handleSignOut = async () => {
        try {
            await logout();
            setIsOpen(false);
        } catch (error) {
            console.error("Sign out failed:", error);
        }
    };

    return (
        <div style={{ position: "relative" }}>
            {/* User Avatar and Name */}
            <motion.div
                onClick={showSignOut ? () => setIsOpen(!isOpen) : undefined}
                whileHover={showSignOut ? { scale: 1.02 } : {}}
                whileTap={showSignOut ? { scale: 0.98 } : {}}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "4px 8px",
                    borderRadius: "20px",
                    cursor: showSignOut ? "pointer" : "default",
                    transition: "all 0.2s ease",
                    backgroundColor: isOpen
                        ? `${theme.primary}15`
                        : "transparent",
                    border: `1px solid ${
                        isOpen ? theme.primary : "transparent"
                    }`,
                }}
                onMouseEnter={(e) => {
                    if (!isOpen && showSignOut) {
                        e.currentTarget.style.backgroundColor = `${theme.primary}08`;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isOpen && showSignOut) {
                        e.currentTarget.style.backgroundColor = "transparent";
                    }
                }}
            >
                {/* Avatar */}
                <div
                    style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: userColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: theme.background,
                        fontSize: "10px",
                        fontWeight: "600",
                    }}
                >
                    {initials}
                </div>

                {/* Name */}
                <span
                    style={{
                        color: theme.text,
                        fontSize: "12px",
                        fontWeight: "500",
                        whiteSpace: "nowrap",
                    }}
                >
                    {user.name}
                </span>

                {/* Dropdown Arrow - Only show if sign out is enabled */}
                {showSignOut && (
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            color: theme.textSecondary,
                            fontSize: "10px",
                        }}
                    >
                        ▼
                    </motion.div>
                )}
            </motion.div>

            {/* User Dropdown */}
            <AnimatePresence>
                {isOpen && showSignOut && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: "absolute",
                            top: "100%",
                            right: "0",
                            marginTop: "8px",
                            width: "220px",
                            backgroundColor: theme.surface,
                            borderRadius: "8px",
                            border: `1px solid ${theme.border}`,
                            overflow: "hidden",
                            zIndex: 1000,
                            backdropFilter: "blur(12px)",
                            boxShadow:
                                theme.name.includes("Light") ||
                                theme.name === "Arctic" ||
                                theme.name === "Parchment" ||
                                theme.name === "Pearl"
                                    ? "0 4px 20px rgba(0,0,0,0.1)"
                                    : "0 4px 20px rgba(0,0,0,0.3)",
                        }}
                    >
                        <div style={{ padding: "12px" }}>
                            {/* User Info */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px",
                                    marginBottom: "8px",
                                    borderBottom: `1px solid ${theme.border}`,
                                }}
                            >
                                <div
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        backgroundColor: userColor,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: theme.background,
                                        fontSize: "12px",
                                        fontWeight: "600",
                                    }}
                                >
                                    {initials}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            color: theme.text,
                                        }}
                                    >
                                        {user.name}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "12px",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        {user.email}
                                    </div>
                                </div>
                            </div>

                            {/* Sign Out Button */}
                            <button
                                onClick={handleSignOut}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    border: "none",
                                    backgroundColor: "transparent",
                                    color: "#EF4444",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "rgba(239, 68, 68, 0.1)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "transparent";
                                }}
                            >
                                Sign Out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Click outside to close */}
            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 999,
                    }}
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};
