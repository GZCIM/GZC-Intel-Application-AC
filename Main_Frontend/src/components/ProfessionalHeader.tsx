import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTabLayout } from "../core/tabs/TabLayoutManager";
import { useTheme } from "../contexts/ThemeContext";
import { ThemeSelector } from "./ThemeSelector";
import { GZCLogo } from "./GZCLogo";
import { TabContextMenu } from "./TabContextMenu";
import { ComponentPortalModal } from "./ComponentPortalModal";
import {
    ComponentMeta,
    componentInventory,
} from "../core/components/ComponentInventory";
import { UserProfile } from "./UserProfile";
import { ToolsMenu } from "./ToolsMenu";
import { SchemaSelector } from "./SchemaSelector";
import { DraggableWindow } from "./DraggableWindow";
import { AuthDebugWindow } from "./AuthDebugWindow";
import { useAuth } from "../hooks/useAuth";
import { editingLockService } from "../services/editingLockService";

interface Tab {
    id: string;
    name: string;
    path: string;
}

export const ProfessionalHeader = () => {
    const {
        currentLayout,
        activeTabId,
        setActiveTab,
        createTabWithPrompt,
        updateTab,
        currentDeviceType,
        isDeviceSwitching,
    } = useTabLayout();

    const { currentTheme: theme } = useTheme();
    const { isAuthenticated } = useAuth();

    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTabLocal] = useState("");
    const [draggedTab, setDraggedTab] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        tabId: string;
        position: { x: number; y: number };
    }>({ isOpen: false, tabId: "", position: { x: 0, y: 0 } });
    const [showAuthDebugger, setShowAuthDebugger] = useState(false);
    const [showComponentPortal, setShowComponentPortal] = useState(false);
    const [componentPortalTabId, setComponentPortalTabId] =
        useState<string>("");
    const [editUnlocked, setEditUnlocked] = useState(
        typeof window !== "undefined"
            ? localStorage.getItem("gzc-edit-mode") === "unlocked"
            : false
    );
    const [tabDropdownOpen, setTabDropdownOpen] = useState(false);
    const [isLandscapeCompact, setIsLandscapeCompact] = useState(
        typeof window !== "undefined" ? window.innerHeight <= 420 : false
    );
    // Mobile detection used for responsive header layout
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === "undefined") return false;
        try {
            const override = localStorage.getItem("gzc-device-override");
            if (override === "mobile") return true;
        } catch {}
        return window.innerWidth <= 768;
    });
    useEffect(() => {
        const onResize = () => {
            setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 420);
            setIsLandscapeCompact(window.innerHeight <= 420);
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        console.log("ProfessionalHeader: State changed:", {
            hasCurrentLayout: !!currentLayout,
            isAuthenticated,
            tabsCount: currentLayout?.tabs?.length || 0,
        });

        if (!isAuthenticated) {
            console.log(
                "ProfessionalHeader: User not authenticated, showing fallback tabs"
            );
            // Show fallback tabs for unauthenticated users
            setTabs([
                { id: "login-required", name: "Please Login", path: "/" },
            ]);
            setActiveTabLocal("login-required");
            return;
        }

        if (currentLayout) {
            console.log(
                "ProfessionalHeader: Processing authenticated layout with tabs:",
                currentLayout.tabs
            );

            // IMPORTANT FIX: Only show tabs if they have valid names - ignore unnamed/auto-generated tabs
            const validTabs = currentLayout.tabs.filter((tab) => {
                const hasValidName =
                    tab.name &&
                    !tab.name.startsWith("Tab ") &&
                    tab.name !== "Unnamed Tab" &&
                    tab.name !== "Loading...";
                console.log("ProfessionalHeader: validating tab:", {
                    id: tab.id,
                    name: tab.name,
                    hasValidName,
                });
                return hasValidName;
            });

            console.log(
                `ProfessionalHeader: Filtered ${currentLayout.tabs.length} tabs down to ${validTabs.length} valid tabs`
            );

            const mappedTabs = validTabs.map((tab) => ({
                id: tab.id,
                name: tab.name, // No fallback - only show tabs with real names
                path: `/${tab.id}`,
            }));

            console.log("ProfessionalHeader: mappedTabs:", mappedTabs);
            setTabs(mappedTabs);
            setActiveTabLocal(activeTabId || mappedTabs[0]?.id || "main");
        } else {
            console.log(
                "ProfessionalHeader: No currentLayout, showing loading tabs"
            );
            setTabs([{ id: "loading", name: "Loading...", path: "/" }]);
            setActiveTabLocal("loading");
        }
    }, [currentLayout, activeTabId, isAuthenticated]);

    // Listen for edit mode toggle to refresh visual state immediately
    useEffect(() => {
        const handler = (e: any) => {
            const unlocked = !!e?.detail?.unlocked;
            // Update local state so active tab color updates instantly
            setEditUnlocked(unlocked);
        };
        window.addEventListener("gzc:edit-mode-toggled", handler as any);
        return () => {
            window.removeEventListener("gzc:edit-mode-toggled", handler as any);
        };
    }, []);

    const handleTabClick = (tab: Tab) => {
        // Don't try to activate special tabs
        if (tab.id === "login-required" || tab.id === "loading") {
            console.log(
                "ProfessionalHeader: Ignoring click on special tab:",
                tab.id
            );
            return;
        }

        setActiveTab(tab.id);
        setActiveTabLocal(tab.id);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedTab(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (draggedTab !== null && draggedTab !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedTab === null || draggedTab === dropIndex) return;

        const newTabs = [...tabs];
        const [removed] = newTabs.splice(draggedTab, 1);
        newTabs.splice(dropIndex, 0, removed);
        setTabs(newTabs);
        setDraggedTab(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedTab(null);
        setDragOverIndex(null);
    };

    const handleTabRightClick = (e: React.MouseEvent, tab: Tab) => {
        e.preventDefault();
        console.log("RIGHT CLICK on tab:", tab.id, tab.name);
        const tabConfig = currentLayout?.tabs.find((t) => t.id === tab.id);
        console.log("Tab config:", tabConfig);
        console.log("Is closable?", tabConfig?.closable);

        if (tabConfig?.closable) {
            console.log("Setting context menu open for tab:", tab.id);
            setContextMenu({
                isOpen: true,
                tabId: tab.id,
                position: { x: e.clientX, y: e.clientY },
            });
        } else {
            console.log("Tab is NOT closable, context menu not shown");
        }
    };

    const handleCloseContextMenu = () => {
        setContextMenu({ isOpen: false, tabId: "", position: { x: 0, y: 0 } });
    };

    const handleRequestAddComponent = (tabId: string) => {
        if (!editingLockService.isUnlocked()) {
            alert("Unlock editing from Tools to add components.");
            return;
        }
        console.log(
            "ProfessionalHeader: handleRequestAddComponent called for tab:",
            tabId
        );
        setComponentPortalTabId(tabId);
        setShowComponentPortal(true);
    };

    const handleComponentSelected = (componentMeta: ComponentMeta) => {
        console.log("ProfessionalHeader: Component selected:", componentMeta);

        // Safety guard for componentPortalTabId
        if (!componentPortalTabId) {
            console.error("No componentPortalTabId set - cannot add component");
            return;
        }

        const tab = currentLayout?.tabs.find(
            (t) => t.id === componentPortalTabId
        );
        if (!tab) {
            console.error("Tab not found for ID:", componentPortalTabId);
            return;
        }

        const currentComponents = tab.components || [];

        // Find next available position
        const existingPositions = currentComponents.map((c) => ({
            x: c.position.x,
            y: c.position.y,
        }));
        let x = 0,
            y = 0;
        while (existingPositions.some((pos) => pos.x === x && pos.y === y)) {
            x += 2;
            if (x > 10) {
                x = 0;
                y += 2;
            }
        }

        const newComponent = {
            id: `${componentMeta.id}-${Date.now()}`,
            type: componentMeta.id,
            position: {
                x,
                y,
                w: componentMeta.defaultSize?.w || 4,
                h: componentMeta.defaultSize?.h || 4,
            },
            props: componentMeta.defaultProps || {},
        };

        // Only update components
        updateTab(componentPortalTabId, {
            components: [...currentComponents, newComponent],
        });

        setShowComponentPortal(false);
        setComponentPortalTabId("");
    };

    // Dedicated mobile layout; switch to single row in landscape-compact
    if (isMobile) {
        const singleRow = isLandscapeCompact;
        return (
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                    borderBottom: `1px solid ${theme.border}`,
                    padding: singleRow ? "6px 8px" : "6px 12px 4px",
                    display: "flex",
                    flexDirection: singleRow ? "row" : "column",
                    alignItems: singleRow ? "center" : undefined,
                    gap: 6,
                    backgroundColor: theme.surface,
                    position: "relative",
                    zIndex: 1000,
                }}
            >
                {/* Logo */}
                <div style={{ display: "flex", alignItems: "center" }}>
                    <GZCLogo
                        height={singleRow ? 28 : 32}
                        color={
                            theme.name.includes("Light") ||
                            theme.name === "Arctic" ||
                            theme.name === "Parchment" ||
                            theme.name === "Pearl"
                                ? theme.text
                                : "#E0E0E0"
                        }
                    />
                </div>

                {/* Controls */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        flex: 1,
                        marginLeft: singleRow ? 10 : 0,
                    }}
                >
                    <div style={{ flex: 1 }}>
                        <div style={{ position: "relative" }}>
                            <button
                                onClick={() =>
                                    setTabDropdownOpen(!tabDropdownOpen)
                                }
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: singleRow ? "4px 8px" : "6px 12px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    color: theme.text,
                                    transition: "all 0.2s ease",
                                    width: singleRow ? "auto" : "100%",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = `${theme.primary}10`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "transparent";
                                }}
                            >
                                <span style={{ fontSize: "16px" }}>📑</span>
                                <span style={{ flex: 1, textAlign: "left" }}>
                                    {tabs.find((t) => t.id === activeTab)
                                        ?.name || "Select Tab"}
                                </span>
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    style={{
                                        transform: tabDropdownOpen
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

                            <AnimatePresence>
                                {tabDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        style={{
                                            position: "absolute",
                                            top: "100%",
                                            left: 0,
                                            right: 0,
                                            marginTop: "4px",
                                            backgroundColor: theme.surface,
                                            border: `1px solid ${theme.border}`,
                                            borderRadius: "8px",
                                            boxShadow:
                                                "0 4px 20px rgba(0, 0, 0, 0.15)",
                                            padding: "4px",
                                            zIndex: 1000,
                                        }}
                                    >
                                        {tabs.map((tab) => (
                                            <div
                                                key={tab.id}
                                                onClick={() => {
                                                    handleTabClick(tab);
                                                    setTabDropdownOpen(false);
                                                }}
                                                style={{
                                                    padding: "6px 12px",
                                                    cursor: "pointer",
                                                    fontSize: "11px",
                                                    color:
                                                        activeTab === tab.id
                                                            ? theme.primary
                                                            : theme.text,
                                                    background:
                                                        activeTab === tab.id
                                                            ? theme.name ===
                                                              "Institutional"
                                                                ? "rgba(122, 158, 101, 0.08)"
                                                                : "rgba(149, 189, 120, 0.08)"
                                                            : "transparent",
                                                    transition:
                                                        "all 0.15s ease",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent:
                                                        "space-between",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (activeTab !== tab.id) {
                                                        e.currentTarget.style.background =
                                                            theme.name ===
                                                            "Institutional"
                                                                ? "rgba(0, 0, 0, 0.03)"
                                                                : "rgba(255, 255, 255, 0.03)";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (activeTab !== tab.id) {
                                                        e.currentTarget.style.background =
                                                            "transparent";
                                                    }
                                                }}
                                            >
                                                <span>
                                                    {tab.name ||
                                                        `Tab ${tab.id}`}
                                                </span>
                                                {activeTab === tab.id && (
                                                    <svg
                                                        width="12"
                                                        height="12"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                    >
                                                        <path
                                                            d="M20 6L9 17l-5-5"
                                                            stroke={
                                                                theme.primary
                                                            }
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <SchemaSelector isMobile={true} />
                        <ToolsMenu
                            onOpenAuthDebugger={() => setShowAuthDebugger(true)}
                            onRequestAddComponent={handleRequestAddComponent}
                            trigger={
                                <svg
                                    width="18"
                                    height="18"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    style={{ cursor: "pointer" }}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                            }
                        />
                        <UserProfile compact />
                    </div>
                </div>

                {/* Context menu and modals */}
                <TabContextMenu
                    tabId={contextMenu.tabId}
                    isOpen={contextMenu.isOpen}
                    position={contextMenu.position}
                    onClose={handleCloseContextMenu}
                    onRequestAddComponent={handleRequestAddComponent}
                />
                {showComponentPortal && (
                    <ComponentPortalModal
                        isOpen={showComponentPortal}
                        onClose={() => {
                            setShowComponentPortal(false);
                            setComponentPortalTabId("");
                        }}
                        onComponentSelect={(componentId) => {
                            const componentMeta =
                                componentInventory.getComponent(componentId);
                            if (componentMeta) {
                                handleComponentSelected(componentMeta);
                            }
                        }}
                    />
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
                borderBottom: `1px solid ${theme.border}`,
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "48px",
                backdropFilter: "blur(12px)",
                backgroundColor: theme.surface,
                position: "relative",
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    flex: 1,
                    minWidth: 0,
                }}
            >
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color:
                            theme.name === "GZC Light"
                                ? theme.primary
                                : theme.text,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                    }}
                >
                    <GZCLogo
                        height={36}
                        color={
                            theme.name.includes("Light") ||
                            theme.name === "Arctic" ||
                            theme.name === "Parchment" ||
                            theme.name === "Pearl"
                                ? theme.text
                                : "#E0E0E0" // Slightly less bright light grey for dark themes
                        }
                    />

                    {/* Device switching indicator */}
                    {isDeviceSwitching && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                backgroundColor: theme.background,
                                border: `1px solid ${theme.border}`,
                                borderRadius: "8px",
                                padding: "4px 8px",
                                fontSize: "12px",
                                color: theme.textSecondary,
                            }}
                        >
                            <div
                                style={{
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "50%",
                                    backgroundColor: theme.primary,
                                    animation: "pulse 2s infinite",
                                }}
                            />
                            Switching to {currentDeviceType}...
                        </motion.div>
                    )}

                    <div style={{ width: "20px" }} />
                </motion.div>

                {/* Tabs: dropdown on mobile (theme-style) */}
                {typeof window !== "undefined" && window.innerWidth <= 768 ? (
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setTabDropdownOpen(!tabDropdownOpen)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "6px 12px",
                                backgroundColor: "transparent",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "13px",
                                color: theme.text,
                                transition: "all 0.2s ease",
                                maxWidth: "220px",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${theme.primary}10`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    "transparent";
                            }}
                        >
                            <span style={{ fontSize: "16px" }}>📑</span>
                            <span style={{ flex: 1, textAlign: "left" }}>
                                {tabs.find((t) => t.id === activeTab)?.name ||
                                    "Select Tab"}
                            </span>
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                style={{
                                    transform: tabDropdownOpen
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
                        <AnimatePresence>
                            {tabDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        marginTop: "4px",
                                        backgroundColor: theme.surface,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: "8px",
                                        boxShadow:
                                            "0 4px 20px rgba(0, 0, 0, 0.15)",
                                        padding: "4px",
                                        zIndex: 1000,
                                    }}
                                >
                                    {tabs.map((t) => (
                                        <div
                                            key={t.id}
                                            onClick={() => {
                                                handleTabClick(t);
                                                setTabDropdownOpen(false);
                                            }}
                                            style={{
                                                padding: "6px 12px",
                                                cursor: "pointer",
                                                fontSize: "11px",
                                                color:
                                                    activeTab === t.id
                                                        ? theme.primary
                                                        : theme.text,
                                                background:
                                                    activeTab === t.id
                                                        ? theme.name ===
                                                          "Institutional"
                                                            ? "rgba(122, 158, 101, 0.08)"
                                                            : "rgba(149, 189, 120, 0.08)"
                                                        : "transparent",
                                                transition: "all 0.15s ease",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (activeTab !== t.id) {
                                                    e.currentTarget.style.background =
                                                        theme.name ===
                                                        "Institutional"
                                                            ? "rgba(0, 0, 0, 0.03)"
                                                            : "rgba(255, 255, 255, 0.03)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (activeTab !== t.id) {
                                                    e.currentTarget.style.background =
                                                        "transparent";
                                                }
                                            }}
                                        >
                                            <span>
                                                {t.name || `Tab ${t.id}`}
                                            </span>
                                            {activeTab === t.id && (
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                >
                                                    <path
                                                        d="M20 6L9 17l-5-5"
                                                        stroke={theme.primary}
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <nav
                        style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            flexWrap: "nowrap",
                            overflowX: "auto",
                            maxWidth: "100%",
                        }}
                    >
                        {tabs.map((tab, index) => {
                            // Get tab config to check if closable
                            const tabConfig = currentLayout?.tabs.find(
                                (t) => t.id === tab.id
                            );
                            return (
                                <div
                                    key={tab.id}
                                    style={{
                                        position: "relative",
                                        display: "flex",
                                        alignItems: "center",
                                    }}
                                >
                                    <motion.button
                                        draggable
                                        onDragStart={(e) =>
                                            handleDragStart(e, index)
                                        }
                                        onDragOver={(e) =>
                                            handleDragOver(e as any, index)
                                        }
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={handleDragEnd}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{
                                            opacity:
                                                draggedTab === index ? 0.5 : 1,
                                            x: 0,
                                            scale:
                                                dragOverIndex === index
                                                    ? 1.05
                                                    : 1,
                                        }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleTabClick(tab)}
                                        onContextMenu={(e) =>
                                            handleTabRightClick(e, tab)
                                        }
                                        style={{
                                            background: "transparent",
                                            color:
                                                activeTab === tab.id
                                                    ? editUnlocked ||
                                                      editingLockService.isUnlocked()
                                                        ? "#ff6b6b" // reddish when unlocked
                                                        : theme.primary
                                                    : theme.textSecondary,
                                            border:
                                                dragOverIndex === index
                                                    ? `2px solid ${theme.primary}`
                                                    : "none",
                                            padding: "6px 12px",
                                            paddingRight: "20px", // Space for type indicator
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            borderRadius: "12px",
                                            cursor:
                                                draggedTab !== null
                                                    ? "move"
                                                    : "pointer",
                                            transition: "all 0.2s ease",
                                            userSelect: "none",
                                            position: "relative",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (activeTab !== tab.id) {
                                                e.currentTarget.style.background = `${theme.primary}10`; // Lighter transparency for hover
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (activeTab !== tab.id) {
                                                e.currentTarget.style.background =
                                                    "transparent";
                                            }
                                        }}
                                    >
                                        {/* DEBUG: Log tab info for empty names */}
                                        {!tab.name &&
                                            console.log(
                                                "Empty tab name detected:",
                                                tab
                                            )}
                                        {tab.name ||
                                            `Tab ${tab.id}` ||
                                            "Unnamed Tab"}

                                        {/* Tab Type Indicator */}
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: "2px",
                                                right: "4px",
                                                width: "4px",
                                                height: "4px",
                                                borderRadius: "50%",
                                                backgroundColor:
                                                    tabConfig?.type ===
                                                    "dynamic"
                                                        ? "#95BD78"
                                                        : tabConfig?.type ===
                                                          "static"
                                                        ? "#64b5f6"
                                                        : "#ABD38F",
                                                opacity: 0.8,
                                            }}
                                        />
                                    </motion.button>
                                </div>
                            );
                        })}

                        {/* Add Tab Button */}
                        <motion.button
                            onClick={createTabWithPrompt}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "32px",
                                height: "32px",
                                backgroundColor: "transparent",
                                border: `1px dashed ${theme.border}`,
                                borderRadius: "6px",
                                cursor: "pointer",
                                color: theme.textSecondary,
                                transition: "all 0.2s ease",
                                marginLeft: "8px",
                                fontSize: "16px",
                                lineHeight: 1,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor =
                                    theme.primary;
                                e.currentTarget.style.backgroundColor = `${theme.primary}10`;
                                e.currentTarget.style.color = theme.primary;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                    theme.border;
                                e.currentTarget.style.backgroundColor =
                                    "transparent";
                                e.currentTarget.style.color =
                                    theme.textSecondary;
                            }}
                            title="Add New Tab"
                        >
                            +
                        </motion.button>
                    </nav>
                )}
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    fontSize: "13px",
                    flexShrink: 0,
                }}
            >
                {/* Theme Selector (desktop only) */}
                <div
                    style={{
                        display: window.innerWidth > 768 ? "block" : "none",
                    }}
                >
                    <ThemeSelector />
                </div>

                {/* Tools Menu */}
                <ToolsMenu
                    onOpenAuthDebugger={() => setShowAuthDebugger(true)}
                    onRequestAddComponent={handleRequestAddComponent}
                    trigger={
                        <svg
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            style={{ cursor: "pointer" }}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    }
                />

                {/* User Profile - compact on small screens (avatar only), full on desktop */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <div
                        style={{
                            display: window.innerWidth > 768 ? "block" : "none",
                        }}
                    >
                        <UserProfile />
                    </div>
                    <div
                        style={{
                            display:
                                window.innerWidth <= 768 ? "block" : "none",
                        }}
                    >
                        <UserProfile compact />
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            <TabContextMenu
                tabId={contextMenu.tabId}
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                onClose={handleCloseContextMenu}
                onRequestAddComponent={handleRequestAddComponent}
            />

            {/* Component Portal Modal */}
            {showComponentPortal && (
                <ComponentPortalModal
                    isOpen={showComponentPortal}
                    onClose={() => {
                        setShowComponentPortal(false);
                        setComponentPortalTabId("");
                    }}
                    onComponentSelect={(componentId) => {
                        console.log("Component selected:", componentId);
                        const componentMeta =
                            componentInventory.getComponent(componentId);
                        if (componentMeta) {
                            handleComponentSelected(componentMeta);
                        }
                    }}
                />
            )}

            {/* Authorization Debug Window */}
            <DraggableWindow
                title="Authorization Debug"
                isOpen={showAuthDebugger}
                onClose={() => setShowAuthDebugger(false)}
                defaultPosition={{ x: window.innerWidth - 450, y: 100 }}
                width={400}
                height={600}
            >
                <AuthDebugWindow />
            </DraggableWindow>
        </motion.div>
    );
};
