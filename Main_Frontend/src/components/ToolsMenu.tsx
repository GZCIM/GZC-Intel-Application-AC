import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useTabLayout } from "../core/tabs/TabLayoutManager";
import { deviceConfigService } from "../services/deviceConfigService";
import { motion, AnimatePresence } from "framer-motion";
import { editingLockService } from "../services/editingLockService";
// Schema selector is rendered in the header for mobile, not inside this menu

interface ToolsMenuProps {
    onOpenAuthDebugger: () => void;
    onRequestAddComponent?: (tabId: string) => void;
    trigger?: React.ReactNode; // optional custom trigger (e.g., gear icon)
}

interface MenuItem {
    label: string;
    icon: string;
    isSelected?: boolean;
    isComponent?: boolean;
    component?: React.ReactNode;
    onClick?: () => void;
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideMenu = menuRef.current?.contains(target);
            const clickedTrigger = containerRef.current?.contains(target);
            // Debug
            try {
                console.log("[ToolsMenu] document click", {
                    targetTag: (target as HTMLElement)?.tagName,
                    clickedInsideMenu,
                    clickedTrigger,
                });
            } catch {}
            if (!clickedInsideMenu && !clickedTrigger) {
                console.log("[ToolsMenu] closing via outside click");
                setIsOpen(false);
            }
        };

        document.addEventListener("click", handleClickOutside, true);
        return () =>
            document.removeEventListener("click", handleClickOutside, true);
    }, []);

    // Get current device selection
    const getCurrentDevice = () => {
        const override = localStorage.getItem("gzc-device-override");
        if (!override) return "auto";
        return override;
    };

    const currentDevice = getCurrentDevice();
    const detectedDevice = deviceConfigService.getCurrentDeviceType();

    // Detect orientation for display purposes
    const isPortrait =
        typeof window !== "undefined" && window.innerHeight > window.innerWidth;
    const orientationLabel = isPortrait ? "Portrait" : "Landscape";

    // Helper: copy current layout to specific device config in CosmosDB
    const copyCurrentLayoutToDevice = async (
        targetDevice: "laptop" | "mobile" | "bigscreen"
    ) => {
        try {
            // Lazy import to avoid circular refs
            const { deviceConfigService } = await import(
                "../services/deviceConfigService"
            );
            const { editingLockService } = await import(
                "../services/editingLockService"
            );

            // Access current tabs from TabLayout context
            const { useTabLayout } = await import(
                "../core/tabs/TabLayoutManager"
            );
            // Note: useTabLayout can only be used inside components; instead, read from window if exposed
            // Fallback: try to read serialized layout from window or localStorage if available
            const tabsFromWindow: any[] = (window as any)?.gzcCurrentTabs || [];

            // Best-effort: if not available via window, ask app to emit current tabs
            let tabsToSave: any[] = [];
            try {
                const evt = new CustomEvent("gzc:request-current-tabs");
                window.dispatchEvent(evt);
                // Give app a moment to set window.gzcCurrentTabs
                await new Promise((r) => setTimeout(r, 50));
                tabsToSave = (window as any)?.gzcCurrentTabs || [];
            } catch {}

            if (!tabsToSave || tabsToSave.length === 0) {
                // As a last resort, try to parse a known storage key if present
                try {
                    const ls = localStorage.getItem("gzc-intel-current-layout");
                    if (ls) {
                        const parsed = JSON.parse(ls);
                        tabsToSave = parsed?.tabs || [];
                    }
                } catch {}
            }

            // Normalize & deduplicate
            const seen = new Set<string>();
            const uniqueTabs = (tabsToSave || [])
                .filter((t: any) => {
                    if (!t?.id) return false;
                    if (seen.has(t.id)) return false;
                    seen.add(t.id);
                    return true;
                })
                .map((t: any) => ({
                    ...t,
                    editMode: false,
                }));

            const auth = await deviceConfigService.getAuthToken();
            const baseUrl =
                import.meta.env.VITE_API_BASE_URL ||
                (import.meta.env.PROD ? "" : "http://localhost:8080");

            const doPost = async (
                device: "laptop" | "mobile" | "bigscreen"
            ) => {
                const url = `${baseUrl}/api/cosmos/device-config/${device}`;
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${auth}`,
                        "Content-Type": "application/json",
                        ...editingLockService.getLockHeaders(),
                    },
                    body: JSON.stringify({ tabs: uniqueTabs }),
                });
                if (!res.ok) throw new Error(await res.text());
            };

            if (targetDevice === "laptop") await doPost("laptop");
            if (targetDevice === "mobile") await doPost("mobile");
            if (targetDevice === "bigscreen") await doPost("bigscreen");

            window.dispatchEvent(
                new CustomEvent("gzc:toast", {
                    detail: {
                        message: `Layout copied to ${targetDevice} configuration`,
                        type: "success",
                        timeout: 2000,
                    },
                })
            );
        } catch (err: any) {
            console.error("Failed to copy layout:", err);
            window.dispatchEvent(
                new CustomEvent("gzc:toast", {
                    detail: {
                        message: `Copy failed: ${err?.message || err}`,
                        type: "error",
                        timeout: 3000,
                    },
                })
            );
        }
    };

    const copyCurrentLayoutToAllDevices = async () => {
        try {
            await copyCurrentLayoutToDevice("bigscreen");
            await copyCurrentLayoutToDevice("laptop");
            await copyCurrentLayoutToDevice("mobile");
            window.dispatchEvent(
                new CustomEvent("gzc:toast", {
                    detail: {
                        message:
                            "Layout copied to Bigscreen, Laptop and Mobile",
                        type: "success",
                        timeout: 2500,
                    },
                })
            );
        } catch {}
    };

    // Check if mobile view
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    const menuItems: MenuItem[] = [
        // Device Mode selector
        {
            label: `Device: Auto (${detectedDevice}, ${orientationLabel})`,
            icon: "🖥️",
            isSelected: currentDevice === "auto",
            onClick: () => {
                try {
                    localStorage.removeItem("gzc-device-override");
                    console.info("🔧 Device override cleared (auto-detect)");
                    window.dispatchEvent(
                        new CustomEvent("gzc:toast", {
                            detail: {
                                message:
                                    "Device set to Auto (default). Reloading…",
                                type: "info",
                                timeout: 2000,
                            },
                        })
                    );
                } catch {}
                setTimeout(() => window.location.reload(), 250);
                setIsOpen(false);
            },
        },
        {
            label: "Device: Bigscreen",
            icon: "🖥️",
            isSelected: currentDevice === "bigscreen",
            onClick: () => {
                try {
                    localStorage.setItem("gzc-device-override", "bigscreen");
                    console.info("🔧 Device override: bigscreen");
                    window.dispatchEvent(
                        new CustomEvent("gzc:toast", {
                            detail: {
                                message:
                                    "Switched to Bigscreen layout. Reloading…",
                                type: "success",
                                timeout: 2000,
                            },
                        })
                    );
                } catch {}
                setTimeout(() => window.location.reload(), 250);
                setIsOpen(false);
            },
        },
        {
            label: "Device: Laptop",
            icon: "💻",
            isSelected: currentDevice === "laptop",
            onClick: () => {
                try {
                    localStorage.setItem("gzc-device-override", "laptop");
                    console.info("🔧 Device override: laptop");
                    window.dispatchEvent(
                        new CustomEvent("gzc:toast", {
                            detail: {
                                message:
                                    "Switched to Laptop layout. Reloading…",
                                type: "success",
                                timeout: 2000,
                            },
                        })
                    );
                } catch {}
                setTimeout(() => window.location.reload(), 250);
                setIsOpen(false);
            },
        },
        {
            label: `Device: Mobile (${orientationLabel})`,
            icon: "📱",
            isSelected: currentDevice === "mobile",
            onClick: () => {
                try {
                    localStorage.setItem("gzc-device-override", "mobile");
                    console.info("🔧 Device override: mobile");
                    window.dispatchEvent(
                        new CustomEvent("gzc:toast", {
                            detail: {
                                message:
                                    "Switched to Mobile layout. Reloading…",
                                type: "success",
                                timeout: 2000,
                            },
                        })
                    );
                } catch {}
                setTimeout(() => window.location.reload(), 250);
                setIsOpen(false);
            },
        },
        // Copy layout actions
        {
            label: "Copy current layout → Bigscreen",
            icon: "📤",
            onClick: async () => {
                await copyCurrentLayoutToDevice("bigscreen");
                setIsOpen(false);
            },
        },
        {
            label: "Copy current layout → Laptop",
            icon: "📤",
            onClick: async () => {
                await copyCurrentLayoutToDevice("laptop");
                setIsOpen(false);
            },
        },
        {
            label: "Copy current layout → Mobile",
            icon: "📤",
            onClick: async () => {
                await copyCurrentLayoutToDevice("mobile");
                setIsOpen(false);
            },
        },
        {
            label: "Copy current layout → All devices",
            icon: "📦",
            onClick: async () => {
                await copyCurrentLayoutToAllDevices();
                setIsOpen(false);
            },
        },
        {
            label: "Copy current layout → Other user…",
            icon: "👥",
            onClick: async () => {
                try {
                    const email = (
                        window.prompt("Enter target email (@gzcim.com):") || ""
                    ).trim();
                    if (!email) return;
                    if (!email.toLowerCase().endsWith("@gzcim.com")) {
                        window.dispatchEvent(
                            new CustomEvent("gzc:toast", {
                                detail: {
                                    message:
                                        "Only @gzcim.com emails are allowed",
                                    type: "error",
                                    timeout: 2500,
                                },
                            })
                        );
                        return;
                    }

                    // Collect current tabs similarly to copy helpers
                    const requestTabs = async (): Promise<any[]> => {
                        let tabs: any[] = [];
                        try {
                            const evt = new CustomEvent(
                                "gzc:request-current-tabs"
                            );
                            window.dispatchEvent(evt);
                            await new Promise((r) => setTimeout(r, 50));
                            tabs = (window as any)?.gzcCurrentTabs || [];
                        } catch {}
                        if (!tabs || tabs.length === 0) {
                            try {
                                const ls = localStorage.getItem(
                                    "gzc-intel-current-layout"
                                );
                                if (ls) tabs = JSON.parse(ls)?.tabs || [];
                            } catch {}
                        }
                        const seen = new Set<string>();
                        return (tabs || [])
                            .filter(
                                (t: any) =>
                                    t?.id &&
                                    !seen.has(t.id) &&
                                    (seen.add(t.id) || true)
                            )
                            .map((t: any) => ({ ...t, editMode: false }));
                    };

                    const tabs = await requestTabs();
                    const { deviceConfigService } = await import(
                        "../services/deviceConfigService"
                    );
                    const auth = await deviceConfigService.getAuthToken();
                    const baseUrl =
                        import.meta.env.VITE_API_BASE_URL ||
                        (import.meta.env.PROD ? "" : "http://localhost:8080");

                    const res = await fetch(
                        `${baseUrl}/api/cosmos/device-config/copy-to`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${auth}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                targetEmail: email,
                                deviceTypes: "all",
                                tabs,
                            }),
                        }
                    );

                    if (res.ok) {
                        window.dispatchEvent(
                            new CustomEvent("gzc:toast", {
                                detail: {
                                    message: `Layout copied to ${email} (all devices)`,
                                    type: "success",
                                    timeout: 2500,
                                },
                            })
                        );
                    } else {
                        const txt = await res.text();
                        throw new Error(txt);
                    }
                } catch (err: any) {
                    console.error(err);
                    window.dispatchEvent(
                        new CustomEvent("gzc:toast", {
                            detail: {
                                message: `Copy to user failed: ${
                                    err?.message || err
                                }`,
                                type: "error",
                                timeout: 3000,
                            },
                        })
                    );
                } finally {
                    setIsOpen(false);
                }
            },
        },
        {
            label: editingLockService.isUnlocked()
                ? "🔒 Lock Editing"
                : "🔓 Unlock Editing",
            icon: editingLockService.isUnlocked() ? "🔒" : "🔓",
            onClick: () => {
                const nowUnlocked = editingLockService.toggle();
                const state = nowUnlocked ? "unlocked" : "locked";
                const msg = nowUnlocked
                    ? "Editing enabled. Your changes will be saved when you lock."
                    : "Editing locked. Saving your layout…";
                console.info(`📝 Edit mode ${state}.`);
                try {
                    window.dispatchEvent(
                        new CustomEvent("gzc:toast", {
                            detail: {
                                message: msg,
                                type: nowUnlocked ? "info" : "success",
                                timeout: 2500,
                            },
                        })
                    );
                } catch {}
                // Broadcast edit mode change so header/canvas can refresh immediately
                try {
                    window.dispatchEvent(
                        new CustomEvent("gzc:edit-mode-toggled", {
                            detail: {
                                unlocked: nowUnlocked,
                                tabId: activeTabId,
                            },
                        })
                    );
                    // Nudge layout recalculation
                    setTimeout(
                        () => window.dispatchEvent(new Event("resize")),
                        50
                    );
                } catch (e) {
                    // no-op
                }
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
        <div ref={containerRef} style={{ position: "relative" }}>
            {trigger ? (
                <div
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        (e as any).nativeEvent?.stopImmediatePropagation?.();
                        const next = !isOpen;
                        console.log("[ToolsMenu] trigger mousedown", { next });
                        setIsOpen(next);
                        if (next) {
                            const rect = containerRef.current?.getBoundingClientRect();
                            console.log("[ToolsMenu] rect (mousedown)", rect);
                            setMenuPos({
                                top: Math.round((rect?.bottom ?? 56) + 4),
                                left: Math.round(Math.max(8, (rect?.right ?? window.innerWidth - 240) - 240)),
                            });
                        }
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        (e as any).nativeEvent?.stopImmediatePropagation?.();
                        const next = !isOpen;
                        console.log("[ToolsMenu] trigger click", { next });
                        setIsOpen(next);
                        if (next) {
                            const rect = containerRef.current?.getBoundingClientRect();
                            console.log("[ToolsMenu] rect (click)", rect);
                            setMenuPos({
                                top: Math.round((rect?.bottom ?? 56) + 4),
                                left: Math.round(Math.max(8, (rect?.right ?? window.innerWidth - 240) - 240)),
                            });
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = containerRef.current?.getBoundingClientRect();
                            setIsOpen(true);
                            setMenuPos({
                                top: Math.round((rect?.bottom ?? 56) + 4),
                                left: Math.round(Math.max(8, (rect?.right ?? window.innerWidth - 240) - 240)),
                            });
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                >
                    {trigger}
                </div>
            ) : (
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        (e as any).nativeEvent?.stopImmediatePropagation?.();
                        const next = !isOpen;
                        console.log("[ToolsMenu] button mousedown", { next });
                        setIsOpen(next);
                        if (next) {
                            const rect = containerRef.current?.getBoundingClientRect();
                            console.log("[ToolsMenu] rect (button mousedown)", rect);
                            setMenuPos({
                                top: Math.round((rect?.bottom ?? 56) + 4),
                                left: Math.round(Math.max(8, (rect?.right ?? window.innerWidth - 240) - 240)),
                            });
                        }
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        (e as any).nativeEvent?.stopImmediatePropagation?.();
                        const next = !isOpen;
                        console.log("[ToolsMenu] button click", { next });
                        setIsOpen(next);
                        if (next) {
                            const rect = containerRef.current?.getBoundingClientRect();
                            console.log("[ToolsMenu] rect (button click)", rect);
                            setMenuPos({
                                top: Math.round((rect?.bottom ?? 56) + 4),
                                left: Math.round(Math.max(8, (rect?.right ?? window.innerWidth - 240) - 240)),
                            });
                        }
                    }}
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
                    createPortal(
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                position: "fixed",
                                top: menuPos.top,
                                left: menuPos.left,
                                minWidth: "220px",
                                backgroundColor: theme.surface,
                                border: `1px solid ${theme.border}`,
                                borderRadius: "8px",
                                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                                padding: "4px",
                                zIndex: 20070,
                            }}
                            ref={menuRef}
                            onMouseDown={(e) => {
                                // prevent closing when clicking inside
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                        {menuItems.map((item, index) => (
                            <div key={index}>
                                {item.isComponent ? (
                                    <div
                                        style={{
                                            padding: "8px 12px",
                                            borderBottom: `1px solid ${theme.border}`,
                                            marginBottom: "4px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                marginBottom: "6px",
                                                fontSize: "13px",
                                                color: theme.text,
                                                fontWeight: "600",
                                            }}
                                        >
                                            <span style={{ fontSize: "16px" }}>
                                                {item.icon}
                                            </span>
                                            <span>{item.label}</span>
                                        </div>
                                        {item.component}
                                    </div>
                                ) : (
                                    <button
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
                                        <span style={{ flex: 1 }}>
                                            {item.label}
                                        </span>
                                        {item.isSelected && (
                                            <span
                                                style={{
                                                    fontSize: "14px",
                                                    color: theme.primary,
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                ✓
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                        </motion.div>,
                        document.body
                    )
                )}
            </AnimatePresence>
        </div>
    );
};
