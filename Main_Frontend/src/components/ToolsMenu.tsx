import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useTabLayout } from "../core/tabs/TabLayoutManager";
import { motion, AnimatePresence } from "framer-motion";
import { editingLockService } from "../services/editingLockService";

interface ToolsMenuProps {
    onOpenAuthDebugger: () => void;
    onRequestAddComponent?: (tabId: string) => void;
    trigger?: React.ReactNode; // optional custom trigger (e.g., gear icon)
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
    onOpenAuthDebugger,
    onRequestAddComponent,
    trigger,
}) => {
    const { currentTheme: theme } = useTheme();
    const { activeTabId, resetToDefault, clearUserConfiguration } =
        useTabLayout();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const menuItems = [
        {
            label: editingLockService.isUnlocked()
                ? "🔒 Lock Editing"
                : "🔓 Unlock Editing",
            icon: editingLockService.isUnlocked() ? "🔒" : "🔓",
            onClick: () => {
                const nowUnlocked = editingLockService.toggle();
                const state = nowUnlocked ? "UNLOCKED" : "LOCKED";
                const msg = nowUnlocked
                    ? `Edit mode UNLOCKED\nSession: ${editingLockService.getSessionId()}\nEdits will write to Cosmos DB.`
                    : "Edit mode LOCKED\nConfiguration is read-only; no writes will be sent.";
                alert(msg);
                setIsOpen(false);
            },
        },
        // Add Component option (only if callback provided and active tab exists)
        ...(onRequestAddComponent && activeTabId
            ? [
                  {
                      label: "Add Component",
                      icon: "🧩",
                      onClick: () => {
                          onRequestAddComponent(activeTabId);
                          setIsOpen(false);
                      },
                  },
              ]
            : []),
        {
            label: "Reset to Default Tabs",
            icon: "🔄",
            onClick: () => {
                if (
                    window.confirm(
                        "This will reset all tabs to defaults. Are you sure?"
                    )
                ) {
                    // Clear all localStorage
                    localStorage.clear();
                    sessionStorage.clear();
                    resetToDefault();
                    window.location.reload(); // Reload to apply changes
                }
                setIsOpen(false);
            },
        },
        {
            label: "NUCLEAR RESET - Fix Corrupted Data",
            icon: "☢️",
            onClick: async () => {
                if (
                    window.confirm(
                        "⚠️ NUCLEAR RESET ⚠️\n\nThis will:\n• Delete ALL localStorage data\n• Clear ALL browser caches\n• Remove ALL Cosmos DB documents\n• Force complete app rebuild\n\nThis is the only way to fix the catastrophic data corruption.\n\nProceed with NUCLEAR RESET?"
                    )
                ) {
                    console.log("🔴 NUCLEAR RESET INITIATED");

                    // Step 1: Clear ALL browser storage
                    try {
                        // Clear localStorage
                        localStorage.clear();
                        sessionStorage.clear();
                        console.log("✅ localStorage/sessionStorage cleared");

                        // Clear ALL IndexedDB databases
                        if (window.indexedDB) {
                            const databases = await indexedDB.databases();
                            for (const db of databases) {
                                if (db.name) {
                                    await indexedDB.deleteDatabase(db.name);
                                    console.log(
                                        `✅ Deleted IndexedDB: ${db.name}`
                                    );
                                }
                            }
                        }

                        // Clear service worker caches
                        if ("caches" in window) {
                            const cacheNames = await caches.keys();
                            for (const cacheName of cacheNames) {
                                await caches.delete(cacheName);
                                console.log(`✅ Deleted cache: ${cacheName}`);
                            }
                        }
                    } catch (e) {
                        console.error("Error clearing browser storage:", e);
                    }

                    // Step 2: Delete ALL Cosmos DB documents
                    try {
                        // Try to get token if available
                        let token = null;
                        try {
                            token = await window.msalInstance
                                ?.acquireTokenSilent({
                                    scopes: ["User.Read"],
                                    account:
                                        window.msalInstance?.getAllAccounts()[0],
                                })
                                .then((r) => r.accessToken);
                        } catch (e) {
                            console.log("No auth token, proceeding anyway");
                        }

                        if (token) {
                            // Delete ALL user configs from Cosmos
                            const deleteResponse = await fetch(
                                "/api/cosmos/config",
                                {
                                    method: "DELETE",
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                        "Content-Type": "application/json",
                                    },
                                }
                            );
                            console.log(
                                "✅ Cosmos DB documents deleted:",
                                deleteResponse.status
                            );

                            // Wait a moment for deletion to complete
                            await new Promise((resolve) =>
                                setTimeout(resolve, 1000)
                            );

                            // Create a MINIMAL working configuration
                            const cleanConfig = {
                                tabs: [
                                    {
                                        id: "analytics",
                                        name: "Analytics",
                                        component: "Analytics",
                                        type: "dynamic",
                                        icon: "bar-chart-2",
                                        closable: true,
                                        gridLayoutEnabled: true,
                                        components: [],
                                        editMode: false,
                                    },
                                ],
                                layouts: [],
                                preferences: {
                                    theme: "dark",
                                    language: "en",
                                },
                            };

                            // Save clean configuration
                            const saveResponse = await fetch(
                                "/api/cosmos/config",
                                {
                                    method: "POST",
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify(cleanConfig),
                                }
                            );
                            console.log(
                                "✅ Clean config saved to Cosmos:",
                                saveResponse.status
                            );
                        }
                    } catch (error) {
                        console.error(
                            "Cosmos DB clear error (continuing anyway):",
                            error
                        );
                    }

                    // Step 3: Force hard reload with cache bypass
                    console.log("🔄 INITIATING HARD RELOAD...");

                    // Add timestamp to force cache bypass
                    const newUrl =
                        window.location.origin +
                        window.location.pathname +
                        "?nuclearReset=" +
                        Date.now();

                    // Use location.replace to prevent back button
                    window.location.replace(newUrl);
                }
                setIsOpen(false);
            },
        },
        {
            label: "Clear All Configuration",
            icon: "🗑️",
            onClick: async () => {
                if (
                    window.confirm(
                        "This will clear ALL saved configuration and start fresh. Are you sure?"
                    )
                ) {
                    // Clear all local storage
                    localStorage.clear();
                    sessionStorage.clear();

                    // Clear indexed DB if exists
                    if (window.indexedDB) {
                        try {
                            const databases = await indexedDB.databases();
                            await Promise.all(
                                databases.map((db) =>
                                    db.name
                                        ? indexedDB.deleteDatabase(db.name)
                                        : null
                                )
                            );
                        } catch (e) {
                            console.error("Error clearing IndexedDB:", e);
                        }
                    }

                    // Delete from Cosmos DB
                    try {
                        const token = await window.msalInstance
                            ?.acquireTokenSilent({
                                scopes: ["User.Read"],
                                account:
                                    window.msalInstance?.getAllAccounts()[0],
                            })
                            .then((r) => r.accessToken);

                        if (token) {
                            // Delete user config from Cosmos
                            await fetch("/api/cosmos/config", {
                                method: "DELETE",
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    "Content-Type": "application/json",
                                },
                            });

                            // Create a fresh default configuration
                            const defaultConfig = {
                                tabs: [
                                    {
                                        id: "tab1",
                                        name: "Dashboard",
                                        component: "dashboard",
                                        type: "dynamic",
                                        components: [],
                                    },
                                ],
                                layouts: [],
                                preferences: {
                                    theme: "dark",
                                    language: "en",
                                },
                            };

                            // Save the default configuration
                            await fetch("/api/cosmos/config", {
                                method: "POST",
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify(defaultConfig),
                            });
                        }
                    } catch (error) {
                        console.error(
                            "Error clearing Cosmos DB config:",
                            error
                        );
                    }

                    clearUserConfiguration();
                    window.location.reload(); // Reload to apply changes
                }
                setIsOpen(false);
            },
        },
        {
            label: "Clear Browser Cache",
            icon: "🧹",
            onClick: async () => {
                if (
                    window.confirm(
                        "This will clear all browser caches and reload. Continue?"
                    )
                ) {
                    // Clear all types of storage
                    localStorage.clear();
                    sessionStorage.clear();

                    // Clear service worker caches if any
                    if ("caches" in window) {
                        const cacheNames = await caches.keys();
                        await Promise.all(
                            cacheNames.map((cacheName) =>
                                caches.delete(cacheName)
                            )
                        );
                    }

                    // Clear indexed DB
                    if (window.indexedDB) {
                        const databases = await indexedDB.databases();
                        await Promise.all(
                            databases.map((db) =>
                                db.name
                                    ? indexedDB.deleteDatabase(db.name)
                                    : null
                            )
                        );
                    }

                    // Hard reload without cache
                    window.location.href =
                        window.location.href.split("#")[0] +
                        "?nocache=" +
                        Date.now();
                }
                setIsOpen(false);
            },
        },
        {
            label: "Verify Cosmos DB",
            icon: "🔍",
            onClick: async () => {
                try {
                    // Check Cosmos DB health
                    const healthResponse = await fetch("/api/cosmos/health");
                    const healthData = await healthResponse.json();

                    // Get user config if authenticated
                    let configData = null;
                    try {
                        const token = await window.msalInstance
                            ?.acquireTokenSilent({
                                scopes: ["User.Read"],
                                account:
                                    window.msalInstance?.getAllAccounts()[0],
                            })
                            .then((r) => r.accessToken);

                        if (token) {
                            const configResponse = await fetch(
                                "/api/cosmos/config",
                                {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                    },
                                }
                            );
                            configData = await configResponse.json();
                        }
                    } catch (e) {
                        console.log("Not authenticated or config not found");
                    }

                    alert(
                        `Cosmos DB Status:\n` +
                            `Status: ${healthData.status}\n` +
                            `Database: ${healthData.database}\n` +
                            `Container: ${healthData.container}\n` +
                            `Total Documents: ${healthData.document_count}\n` +
                            `\nYour Config:\n` +
                            `Tabs: ${configData?.tabs?.length || 0}\n` +
                            `User ID: ${
                                configData?.userId || "Not authenticated"
                            }`
                    );
                } catch (error) {
                    alert("Error checking Cosmos DB: " + error);
                }
                setIsOpen(false);
            },
        },
        {
            label: "Authorization Debug",
            icon: "🔌",
            onClick: () => {
                onOpenAuthDebugger();
                setIsOpen(false);
            },
        },
        {
            label: "Bloomberg Volatility Surface",
            icon: "📊",
            onClick: () => {
                // Open in new tab
                window.open(
                    "https://bloomberg-volatility-surface.agreeablepond-1a74a92d.eastus.azurecontainerapps.io/",
                    "_blank"
                );
                setIsOpen(false);
            },
        },
    ];

    return (
        <div ref={menuRef} style={{ position: "relative" }}>
            {trigger ? (
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ cursor: "pointer" }}
                >
                    {trigger}
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        backgroundColor: "transparent",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: theme.textSecondary,
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${theme.primary}10`;
                        e.currentTarget.style.color = theme.text;
                    }}
                    onMouseLeave={(e) => {
                        if (!isOpen) {
                            e.currentTarget.style.backgroundColor =
                                "transparent";
                            e.currentTarget.style.color = theme.textSecondary;
                        }
                    }}
                >
                    <span>Tools</span>
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{
                            transform: isOpen
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                            transition: "transform 0.2s ease",
                        }}
                    >
                        <path
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: "4px",
                            minWidth: "220px",
                            backgroundColor: theme.surface,
                            border: `1px solid ${theme.border}`,
                            borderRadius: "8px",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                            padding: "4px",
                            zIndex: 1000,
                        }}
                    >
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={item.onClick}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    width: "100%",
                                    padding: "8px 12px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    color: theme.text,
                                    textAlign: "left",
                                    transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = `${theme.primary}15`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "transparent";
                                }}
                            >
                                <span style={{ fontSize: "16px" }}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
