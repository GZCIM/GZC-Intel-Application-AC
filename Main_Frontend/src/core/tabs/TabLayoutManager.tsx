import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { TabManager, setupConsoleHelpers } from "./TabUtils";
import { useUserSettings } from "../../hooks/useUserSettings";
import { useViewMemory } from "../../hooks/useViewMemory";
import { TabNameModal } from "../../components/TabNameModal";
import { stateManager } from "../../services/StateManager";
import { useUser } from "../../hooks/useUser";
import { databaseService } from "../../services/databaseService";
import { cosmosConfigService } from "../../services/cosmosConfigService";
import { configSyncService } from "../../services/configSyncService";
import { deviceConfigService } from "../../services/deviceConfigService";
import { enhancedConfigService } from "../../services/enhancedConfigService";
import { editingLockService } from "../../services/editingLockService";

// Component in tab configuration for dynamic tabs
export interface ComponentInTab {
    id: string;
    type: string; // Component type from inventory
    position: { x: number; y: number; w: number; h: number };
    props?: Record<string, any>;
    zIndex?: number;
}

// Tab configuration types with hybrid architecture support
export interface TabConfig {
    id: string;
    name: string;
    component: string; // Component identifier to load
    type: "dynamic" | "static"; // Only two types: dynamic or static
    icon?: string;
    closable?: boolean;
    props?: Record<string, any>;
    gridLayoutEnabled?: boolean; // Enable fluid grid layout for this tab
    gridLayout?: any[]; // Store react-grid-layout configuration
    components?: ComponentInTab[]; // For dynamic tabs with multiple components
    editMode?: boolean; // Whether tab is in edit mode
    memoryStrategy?: "local" | "redis" | "hybrid"; // Memory management strategy
}

export interface TabLayout {
    id: string;
    name: string;
    tabs: TabConfig[];
    isDefault?: boolean;
    createdAt: string;
    updatedAt: string;
}

interface TabLayoutContextValue {
    // Current state
    currentLayout: TabLayout | null;
    activeTabId: string | null;

    // Device responsiveness
    currentDeviceType: string | null;
    isDeviceSwitching: boolean;

    // Layout management
    layouts: TabLayout[];
    defaultLayout: TabLayout | null;
    userLayouts: TabLayout[];

    // Actions
    setActiveTab: (tabId: string) => void;
    addTab: (tab: Omit<TabConfig, "id">) => TabConfig;
    removeTab: (tabId: string) => void;
    updateTab: (tabId: string, updates: Partial<TabConfig>) => void;
    reorderTabs: (newTabs: TabConfig[]) => void;

    // Enhanced tab creation with modal
    createTabWithPrompt: () => void;
    showTabModal: boolean;
    setShowTabModal: (show: boolean) => void;

    // Layout actions
    saveCurrentLayout: (name: string) => void;
    loadLayout: (layoutId: string) => void;
    deleteLayout: (layoutId: string) => void;
    resetToDefault: () => void;
    clearUserConfiguration: () => void;

    // Grid layout actions
    updateTabGridLayout: (tabId: string, gridLayout: any[]) => void;
    toggleTabGridLayout: (tabId: string, enabled: boolean) => void;

    // Dynamic tab component management
    addComponentToTab: (tabId: string, component: ComponentInTab) => void;
    removeComponentFromTab: (tabId: string, componentId: string) => void;
    updateComponentInTab: (
        tabId: string,
        componentId: string,
        updates: Partial<ComponentInTab>
    ) => void;

    // Edit mode management
    toggleTabEditMode: (tabId: string) => void;
}

// Default tabs configuration with hybrid types
const DEFAULT_TABS: TabConfig[] = [
    {
        id: "main",
        name: "Main",
        component: "Analytics",
        type: "dynamic",
        icon: "home",
        closable: false, // Main tab should not be closable
        gridLayoutEnabled: true,
        components: [],
        editMode: false,
        memoryStrategy: "hybrid",
    },
];

const DEFAULT_LAYOUT: TabLayout = {
    id: "default",
    name: "Default Layout",
    tabs: DEFAULT_TABS,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const TabLayoutContext = createContext<TabLayoutContextValue | undefined>(
    undefined
);

export function useTabLayout() {
    const context = useContext(TabLayoutContext);
    if (!context) {
        throw new Error("useTabLayout must be used within TabLayoutProvider");
    }
    return context;
}

interface TabLayoutProviderProps {
    children: ReactNode;
}

export function TabLayoutProvider({ children }: TabLayoutProviderProps) {
    const { user } = useUser();

    // Try multiple ways to get a consistent userId across browsers
    const getUserId = () => {
        if (user?.id) return user.id;

        // Try to get from MSAL accounts
        try {
            const msalInstance = (window as any).msalInstance;
            if (msalInstance) {
                const accounts = msalInstance.getAllAccounts();
                if (accounts?.length > 0) {
                    return (
                        accounts[0].homeAccountId ||
                        accounts[0].username ||
                        "msal-user"
                    );
                }
            }
        } catch (e) {
            // Ignore MSAL errors
        }

        // Fallback to a browser-consistent identifier
        return "default-user";
    };

    const userId = getUserId();
    const isAuthenticated = !!user?.id; // Check if user is actually authenticated

    console.log(
        "TabLayoutProvider: Using userId:",
        userId,
        "isAuthenticated:",
        isAuthenticated
    );

    // Helper function to get user-specific localStorage key
    const getUserKey = (key: string) => `${key}-${userId}`;

    const [layouts, setLayouts] = useState<TabLayout[]>([DEFAULT_LAYOUT]);
    const [currentLayout, setCurrentLayout] =
        useState<TabLayout>(DEFAULT_LAYOUT);
    const [activeTabId, setActiveTabId] = useState<string>("main");
    const [showTabModal, setShowTabModal] = useState(false);
    const [currentDeviceType, setCurrentDeviceType] = useState<string | null>(
        null
    );
    const [isDeviceSwitching, setIsDeviceSwitching] = useState(false);
    const { saveTabOrder, saveActiveTab, saveLayout } = useViewMemory();

    // Start config sync when component mounts
    useEffect(() => {
        configSyncService.startAutoSync(30000); // Sync every 30 seconds

        // Listen for config updates from sync
        const handleConfigUpdate = (event: CustomEvent) => {
            const config = event.detail;
            if (config?.tabs) {
                const deduplicatedTabs = deduplicateTabs(config.tabs);
                setCurrentLayout((prev) => ({
                    ...prev,
                    tabs: deduplicatedTabs,
                }));
            }
        };

        window.addEventListener("config-updated" as any, handleConfigUpdate);
        return () => {
            window.removeEventListener(
                "config-updated" as any,
                handleConfigUpdate
            );
            configSyncService.stopAutoSync();
        };
    }, []);

    // Device monitoring for automatic config switching
    useEffect(() => {
        if (!user?.email) return;

        // Initialize current device type
        const initialDeviceType = deviceConfigService.getCurrentDeviceType(); // Use enhanced detection with override support
        setCurrentDeviceType(initialDeviceType);
        console.log(`🖥️ Initial device type detected: ${initialDeviceType}`);

        // Start monitoring for device changes
        deviceConfigService.startDeviceMonitoring(async (newDeviceType) => {
            console.log(
                `📱 Device type changed: ${currentDeviceType} → ${newDeviceType}`
            );

            // Validate the new device type
            if (!deviceConfigService.validateDeviceType(newDeviceType)) {
                console.error(
                    `❌ Invalid device type detected: ${newDeviceType}`
                );
                return;
            }

            setIsDeviceSwitching(true);
            setCurrentDeviceType(newDeviceType);

            try {
                // Show loading indicator
                console.log(`🔄 Loading ${newDeviceType} configuration...`);

                // Load device-specific configuration from backend
                const response = await fetch(
                    `${
                        import.meta.env.VITE_API_BASE_URL ||
                        (import.meta.env.PROD ? "" : "http://localhost:8080")
                    }/api/cosmos/device-config/${newDeviceType}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${await deviceConfigService.getAuthToken()}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (response.ok) {
                    const deviceConfig = await response.json();
                    console.log(
                        `✅ Loaded ${newDeviceType} configuration:`,
                        deviceConfig.name
                    );

                    // Apply device configuration to current layout
                    if (
                        deviceConfig.config?.tabs &&
                        deviceConfig.config.tabs.length > 0
                    ) {
                        const deduplicatedTabs = deduplicateTabs(
                            deviceConfig.config.tabs
                        );
                        setCurrentLayout((prev) => ({
                            ...prev,
                            tabs: deduplicatedTabs,
                            currentLayoutId:
                                deviceConfig.id || prev.currentLayoutId,
                            name:
                                deviceConfig.name ||
                                `${
                                    newDeviceType.charAt(0).toUpperCase() +
                                    newDeviceType.slice(1)
                                } Layout`,
                        }));

                        // Set active tab to first tab or main
                        const firstTab = deduplicatedTabs[0];
                        if (firstTab) {
                            setActiveTabId(firstTab.id);
                        }

                        // Show success notification
                        console.log(
                            `🎉 Switched to ${newDeviceType} configuration with ${deduplicatedTabs.length} tabs`
                        );
                    } else {
                        console.log(
                            `📋 ${newDeviceType} configuration is empty - keeping current tabs`
                        );
                        // If device config is empty, keep current tabs but update device type
                    }
                } else {
                    const errorText = await response.text();
                    console.error(
                        `❌ Failed to load ${newDeviceType} configuration:`,
                        errorText
                    );
                    // Keep current configuration on error
                }
            } catch (error) {
                console.error(
                    `💥 Error switching to ${newDeviceType} configuration:`,
                    error
                );
                // Keep current configuration on error
            } finally {
                setIsDeviceSwitching(false);
            }
        });

        return () => {
            // Device monitoring cleanup is handled by the service itself
            console.log("🧹 Device monitoring cleanup completed");
        };
    }, [user?.email, currentDeviceType]);

    // Helper function to deduplicate tabs
    const deduplicateTabs = (tabs: TabConfig[]) => {
        const seen = new Set<string>();
        return tabs.filter((tab) => {
            if (seen.has(tab.id)) {
                console.warn(`Removing duplicate tab: ${tab.id}`);
                return false;
            }
            seen.add(tab.id);
            return true;
        });
    };

    // Load saved layouts from PostgreSQL when user changes
    useEffect(() => {
        // Set initial default layout immediately to prevent frozen UI
        if (!currentLayout || currentLayout.tabs.length === 0) {
            console.log(
                "TabLayoutManager: Setting initial default layout to prevent freeze"
            );
            setCurrentLayout(DEFAULT_LAYOUT);
            setLayouts([DEFAULT_LAYOUT]);
            setActiveTabId("main");
        }

        const checkAuthAndLoad = async () => {
            // CRITICAL FIX: Non-blocking MSAL check
            let msalInstance = (window as any).msalInstance;

            // Simple check without blocking loops
            if (!msalInstance || !msalInstance.getConfiguration) {
                console.log(
                    "TabLayoutManager: MSAL not ready yet; will attempt token retries while loading"
                );
                // Don't return; we will try to get a token with retries below
            }

            // Try to get accounts safely with better error handling
            let accounts = [];
            let isUserAuthenticated = false;

            try {
                accounts = msalInstance.getAllAccounts() || [];
                isUserAuthenticated = accounts.length > 0;
                console.log(
                    `TabLayoutManager: Found ${accounts.length} authenticated accounts`
                );
            } catch (e) {
                console.log(
                    "TabLayoutManager: Error getting accounts, using defaults",
                    e
                );
                isUserAuthenticated = false;
            }

            if (!isUserAuthenticated) {
                console.log(
                    "TabLayoutManager: No authenticated accounts, but still trying to load from Cosmos DB (works without MSAL)"
                );
                // Don't return early - still try to load from Cosmos DB as it works without backend auth
            }

            console.log(`TabLayoutManager: Loading layouts for user ${userId}`);

            // Try Device-Specific Config FIRST - load appropriate config for current device
            try {
                console.log(
                    "TabLayoutManager: Attempting to load device-specific configuration"
                );

                // Detect current device type and load appropriate config
                const currentDeviceType =
                    deviceConfigService.detectDeviceType();
                console.log(
                    `TabLayoutManager: Detected device type: ${currentDeviceType}`
                );

                // Acquire auth token with short retry to cover hard reload timing
                const getTokenWithRetry = async (): Promise<string> => {
                    const attempts = 4;
                    for (let i = 0; i < attempts; i++) {
                        try {
                            return await deviceConfigService.getAuthToken();
                        } catch (e) {
                            await new Promise((r) => setTimeout(r, 500));
                        }
                    }
                    throw new Error("Auth token not available after retries");
                };

                const token = await getTokenWithRetry();

                const response = await fetch(
                    `${
                        import.meta.env.VITE_API_BASE_URL ||
                        (import.meta.env.PROD ? "" : "http://localhost:8080")
                    }/api/cosmos/device-config/${currentDeviceType}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                let cosmosConfig = null;
                if (response.ok) {
                    const deviceConfig = await response.json();
                    console.log(
                        `TabLayoutManager: Loaded ${currentDeviceType} config:`,
                        deviceConfig.name
                    );
                    cosmosConfig = deviceConfig.config; // Extract the actual config from device config
                } else {
                    console.log(
                        `TabLayoutManager: No ${currentDeviceType} config found, will use default`
                    );
                }

                // Also load via service as a secondary source and pick the richer config
                let serviceConfig = null;
                try {
                    serviceConfig =
                        await cosmosConfigService.loadConfiguration();
                } catch (svcErr) {
                    console.warn(
                        "TabLayoutManager: cosmosConfigService.loadConfiguration failed:",
                        (svcErr as any)?.message || svcErr
                    );
                }

                // Prefer device-specific configuration over the general service config.
                // Only fall back to serviceConfig if the device-specific one is missing or empty.
                const directCount = cosmosConfig?.tabs?.length || 0;
                const serviceCount = serviceConfig?.tabs?.length || 0;
                const bestConfig =
                    directCount > 0
                        ? cosmosConfig
                        : serviceCount > 0
                        ? serviceConfig
                        : null;

                if (bestConfig?.tabs && bestConfig.tabs.length > 0) {
                    // Deduplicate tabs when loading and ensure editMode is false
                    const tabIds = new Set<string>();
                    const uniqueTabs = bestConfig.tabs
                        .filter((t) => {
                            if (tabIds.has(t.id)) {
                                console.warn(
                                    `Found duplicate tab ${t.id} in loaded config, removing`
                                );
                                return false;
                            }
                            tabIds.add(t.id);
                            return true;
                        })
                        .map((t) => ({
                            ...t,
                            editMode: false, // Always start with edit mode OFF when loading
                            // Ensure tabs have proper names - fix the "memory ones" issue
                            name: t.name || `Tab ${t.id}` || "Unnamed Tab",
                            // Ensure tabs have valid component types
                            component:
                                t.component ||
                                (t.type === "dynamic"
                                    ? "UserTabContainer"
                                    : "Analytics"),
                            // Ensure type is valid
                            type:
                                t.type === "static" || t.type === "dynamic"
                                    ? t.type
                                    : "dynamic",
                            // Initialize components array if missing
                            components: t.components || [],
                        }));

                    // ENHANCED VALIDATION: Filter out invalid/auto-generated tabs
                    const validTabs = uniqueTabs.filter(
                        (tab) =>
                            tab.name &&
                            !tab.name.startsWith("user-memory-") &&
                            !tab.name.startsWith("Tab ") && // Filter out "Tab UUID" fallback names
                            tab.name !== "Loading..." &&
                            tab.name !== "Unnamed Tab" &&
                            tab.component !== "placeholder" &&
                            tab.id !== "main" // Keep only user-created tabs, not default main tab
                    );

                    console.log(
                        `TabLayoutManager: Selected ${
                            serviceCount > directCount ? "service" : "direct"
                        } config. Filtered ${
                            uniqueTabs.length
                        } loaded tabs down to ${
                            validTabs.length
                        } valid user tabs`
                    );

                    const hasValidTabs = validTabs.length > 0;

                    if (hasValidTabs) {
                        console.log(
                            `✅ TabLayoutManager: Successfully loaded ${validTabs.length} valid tabs from Cosmos DB`
                        );
                        const cosmosLayout = {
                            ...DEFAULT_LAYOUT,
                            tabs: [DEFAULT_LAYOUT.tabs[0], ...validTabs], // Keep main tab + valid user tabs
                            id: "cosmos-layout",
                            name: "User Saved Layout",
                        };
                        setCurrentLayout(cosmosLayout);
                        setLayouts([DEFAULT_LAYOUT, cosmosLayout]);

                        const activeTabId = validTabs[0]?.id || "main";
                        setActiveTabId(activeTabId);
                        return; // Cosmos DB is source of truth
                    } else {
                        console.log(
                            "TabLayoutManager: Cosmos DB returned placeholder/memory tabs, using defaults instead"
                        );
                        // Fall through to use default tabs
                    }
                } else {
                    console.log(
                        "TabLayoutManager: Cosmos DB returned empty or invalid config, trying fallbacks"
                    );

                    // Fallback: try other device types that might have saved tabs
                    const tryOrder =
                        currentDeviceType === "laptop"
                            ? ["bigscreen", "mobile"]
                            : currentDeviceType === "bigscreen"
                            ? ["laptop", "mobile"]
                            : ["laptop", "bigscreen"];

                    for (const altType of tryOrder) {
                        try {
                            const altResp = await fetch(
                                `${
                                    import.meta.env.VITE_API_BASE_URL ||
                                    (import.meta.env.PROD
                                        ? ""
                                        : "http://localhost:8080")
                                }/api/cosmos/device-config/${altType}`,
                                {
                                    method: "GET",
                                    headers: {
                                        Authorization: `Bearer ${await deviceConfigService.getAuthToken()}`,
                                        "Content-Type": "application/json",
                                    },
                                }
                            );

                            if (altResp.ok) {
                                const altDoc = await altResp.json();
                                const altConfig = altDoc?.config;
                                if (
                                    altConfig?.tabs &&
                                    altConfig.tabs.length > 0
                                ) {
                                    console.log(
                                        `TabLayoutManager: Falling back to ${altType} config with ${altConfig.tabs.length} tabs`
                                    );

                                    // Reuse the same normalization pipeline
                                    const tabIds = new Set<string>();
                                    const uniqueTabs = altConfig.tabs
                                        .filter((t: any) => {
                                            if (tabIds.has(t.id)) {
                                                return false;
                                            }
                                            tabIds.add(t.id);
                                            return true;
                                        })
                                        .map((t: any) => ({
                                            ...t,
                                            editMode: false,
                                            name:
                                                t.name ||
                                                `Tab ${t.id}` ||
                                                "Unnamed Tab",
                                            component:
                                                t.component ||
                                                (t.type === "dynamic"
                                                    ? "UserTabContainer"
                                                    : "Analytics"),
                                            type:
                                                t.type === "static" ||
                                                t.type === "dynamic"
                                                    ? t.type
                                                    : "dynamic",
                                            components: t.components || [],
                                        }));

                                    const validTabs = uniqueTabs.filter(
                                        (tab: any) =>
                                            tab.name &&
                                            !tab.name.startsWith(
                                                "user-memory-"
                                            ) &&
                                            !tab.name.startsWith("Tab ") &&
                                            tab.name !== "Loading..." &&
                                            tab.name !== "Unnamed Tab" &&
                                            tab.component !== "placeholder" &&
                                            tab.id !== "main"
                                    );

                                    if (validTabs.length > 0) {
                                        const cosmosLayout = {
                                            ...DEFAULT_LAYOUT,
                                            tabs: [
                                                DEFAULT_LAYOUT.tabs[0],
                                                ...validTabs,
                                            ],
                                            id: "cosmos-layout",
                                            name: "User Saved Layout",
                                        };
                                        setCurrentLayout(cosmosLayout);
                                        setLayouts([
                                            DEFAULT_LAYOUT,
                                            cosmosLayout,
                                        ]);
                                        setActiveTabId(validTabs[0].id);
                                        return; // Use fallback config
                                    }
                                }
                            }
                        } catch (altErr) {
                            console.warn(
                                `TabLayoutManager: Failed to load fallback device type ${altType}:`,
                                (altErr as any)?.message || altErr
                            );
                        }
                    }
                }
            } catch (e) {
                console.log(
                    "TabLayoutManager: Cosmos DB failed, trying fallbacks:",
                    e.message
                );
            }

            // Try database if Cosmos DB fails (for backward compatibility)
            if (isUserAuthenticated && userId !== "default-user") {
                try {
                    const savedTabs = await databaseService.getUserTabs(userId);
                    console.log(
                        `TabLayoutManager: Loaded ${savedTabs.length} tabs from database`
                    );

                    if (savedTabs.length > 0) {
                        // Database has tabs - use them as source of truth
                        const dbLayout = { tabs: savedTabs };
                        // Cosmos DB is the source of truth - no localStorage needed
                        setCurrentLayout(dbLayout);
                        setLayouts([DEFAULT_LAYOUT, dbLayout]);

                        const activeTabId = savedTabs[0]?.id || "main";
                        setActiveTabId(activeTabId);
                        return; // Database is source of truth
                    }
                } catch (e) {
                    console.error("Failed to load from database:", e);
                    // Fall through to localStorage
                }
            }

            // Fallback to localStorage - try MULTIPLE storage keys to find user data
            console.log("Trying localStorage fallback...");

            // Try the user-specific key first
            let savedLayoutStr = localStorage.getItem(
                getUserKey("gzc-intel-current-layout")
            );

            // If user-specific not found, try default key (for backward compatibility)
            if (!savedLayoutStr) {
                savedLayoutStr = localStorage.getItem(
                    "gzc-intel-current-layout"
                );
                console.log("Trying default localStorage key...");
            }

            // Also try searching for any layout data
            if (!savedLayoutStr) {
                const allKeys = Object.keys(localStorage).filter(
                    (key) => key.includes("layout") || key.includes("tab")
                );
                console.log("Found potential layout keys:", allKeys);

                for (const key of allKeys) {
                    try {
                        const data = localStorage.getItem(key);
                        if (
                            data &&
                            data.includes("components") &&
                            data.includes("Bloomberg")
                        ) {
                            console.log(`Found layout data in key: ${key}`);
                            savedLayoutStr = data;
                            break;
                        }
                    } catch (e) {
                        // Skip invalid keys
                    }
                }
            }

            if (savedLayoutStr) {
                try {
                    const parsedLayout = JSON.parse(savedLayoutStr);
                    console.log(
                        "✅ Successfully loaded layout from localStorage:",
                        parsedLayout
                    );
                    setCurrentLayout(parsedLayout);
                    setLayouts([DEFAULT_LAYOUT, parsedLayout]);

                    // Set active tab from saved layout
                    const activeTabId = parsedLayout.tabs?.[0]?.id || "main";
                    setActiveTabId(activeTabId);
                    return; // Don't fall back to defaults if we found saved data
                } catch (e) {
                    console.error("Failed to parse localStorage:", e);
                }
            }

            // If no saved data anywhere, initialize with defaults
            console.log(
                "⚠️ No saved layout found anywhere, using default layout"
            );
            setCurrentLayout(DEFAULT_LAYOUT);
            setLayouts([DEFAULT_LAYOUT]);
            setActiveTabId("main");
        };

        checkAuthAndLoad();
    }, [userId, isAuthenticated]); // Re-run when user or auth state changes

    // Save layouts when they change
    useEffect(() => {
        // Layouts are saved to Cosmos DB via saveToCosmosDB calls
        // No localStorage needed - trigger global state save for other data
        stateManager.autoSave();
    }, [layouts, userId]);

    // Save current layout to Cosmos DB only
    useEffect(() => {
        // Current layout is saved to Cosmos DB automatically
        // No localStorage needed for layouts
        stateManager.autoSave();
    }, [currentLayout, userId]);

    // Save active tab
    useEffect(() => {
        if (activeTabId) {
            sessionStorage.setItem(
                getUserKey("gzc-intel-active-tab"),
                activeTabId
            );
        }
    }, [activeTabId, userId]);

    const defaultLayout = layouts.find((l) => l.isDefault) || DEFAULT_LAYOUT;
    const userLayouts = layouts.filter((l) => !l.isDefault);

    const addTab = (tab: Omit<TabConfig, "id">) => {
        const newTab: TabConfig = {
            ...tab,
            id: uuidv4(),
        };

        // Deduplicate tabs before adding new one
        const existingTabIds = new Set<string>();
        const deduplicatedTabs = currentLayout.tabs.filter((t) => {
            if (existingTabIds.has(t.id)) {
                console.warn(`Removing duplicate tab with ID: ${t.id}`);
                return false;
            }
            existingTabIds.add(t.id);
            return true;
        });

        const updatedLayout = {
            ...currentLayout,
            tabs: [...deduplicatedTabs, newTab],
            updatedAt: new Date().toISOString(),
        };

        setCurrentLayout(updatedLayout);

        // Update in layouts array
        if (currentLayout.isDefault) {
            // For default layout, we need to update it in the layouts array
            // to ensure the modified default is saved
            setLayouts(
                layouts.map((l) => (l.id === "default" ? updatedLayout : l))
            );
        } else {
            // For user layouts, update normally
            setLayouts(
                layouts.map((l) =>
                    l.id === currentLayout.id ? updatedLayout : l
                )
            );
        }

        // Save to Cosmos DB (works without backend!)
        const saveToCosmosDB = async () => {
            if (!editingLockService.isUnlocked()) {
                console.warn("⏭️ Skipping save (addTab): editing locked");
                return;
            }
            try {
                // Deduplicate tabs before saving
                const tabIds = new Set<string>();
                const uniqueTabs = updatedLayout.tabs.filter((t) => {
                    if (tabIds.has(t.id)) {
                        console.warn(
                            `Skipping duplicate tab ${t.id} when saving to Cosmos`
                        );
                        return false;
                    }
                    tabIds.add(t.id);
                    return true;
                });

                // Save to device-specific config instead of general user config
                const currentDeviceType =
                    deviceConfigService.detectDeviceType();
                const response = await fetch(
                    `${
                        import.meta.env.VITE_API_BASE_URL ||
                        (import.meta.env.PROD ? "" : "http://localhost:8080")
                    }/api/cosmos/device-config/${currentDeviceType}`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${await deviceConfigService.getAuthToken()}`,
                            "Content-Type": "application/json",
                            ...editingLockService.getLockHeaders(),
                        },
                        body: JSON.stringify({
                            tabs: uniqueTabs,
                        }),
                    }
                );

                if (response.ok) {
                    console.log(
                        `New tab saved to ${currentDeviceType} device config`
                    );
                } else {
                    console.error(
                        `Failed to save to ${currentDeviceType} device config:`,
                        await response.text()
                    );
                }

                // Save complete configuration with all user settings
                await enhancedConfigService.saveCompleteConfiguration();
                console.log(
                    "Complete configuration saved with enhanced service"
                );
            } catch (error) {
                console.error("Failed to save to Cosmos DB:", error);
            }
        };

        // Save to PostgreSQL only if authenticated (legacy - for backward compatibility)
        if (isAuthenticated && editingLockService.isUnlocked()) {
            const saveToDatabase = async () => {
                try {
                    await databaseService.saveTab(userId, {
                        tab_id: newTab.id,
                        title: newTab.name,
                        icon: newTab.icon,
                        tab_type: newTab.type,
                        components: newTab.components || [], // Send full component objects
                        custom_settings: newTab.props,
                    });
                    console.log("New tab saved to database");
                } catch (error) {
                    console.error("Failed to save new tab to database:", error);
                    // No localStorage fallback - rely on Cosmos DB for persistence
                }
            };

            // Try both Cosmos DB and PostgreSQL
            saveToCosmosDB();
            saveToDatabase();
        } else {
            // If not authenticated, still try Cosmos DB (it has its own auth)
            saveToCosmosDB();
        }

        // No localStorage - Cosmos DB only

        // Set as active tab
        setActiveTabId(newTab.id);

        // Return the new tab
        return newTab;
    };

    // Initialize TabManager with addTab function
    useEffect(() => {
        TabManager.setAddTabFunction(addTab);
        setupConsoleHelpers();
    }, [addTab]);

    const removeTab = (tabId: string) => {
        // Don't allow removing the last tab or non-closable tabs
        const tab = currentLayout.tabs.find((t) => t.id === tabId);
        if (!tab || tab.closable === false || currentLayout.tabs.length === 1) {
            return;
        }

        const updatedTabs = currentLayout.tabs.filter((t) => t.id !== tabId);
        const updatedLayout = {
            ...currentLayout,
            tabs: updatedTabs,
            updatedAt: new Date().toISOString(),
        };

        setCurrentLayout(updatedLayout);

        // Save updated layout to Cosmos DB
        if (isAuthenticated && editingLockService.isUnlocked()) {
            const saveToCosmosDB = async () => {
                if (!editingLockService.isUnlocked()) {
                    console.warn(
                        "⏭️ Skipping save (removeTab): editing locked"
                    );
                    return;
                }
                try {
                    // Deduplicate tabs before saving (should already be unique after filter, but double-check)
                    const tabIds = new Set<string>();
                    const uniqueTabs = updatedLayout.tabs.filter((t) => {
                        if (tabIds.has(t.id)) {
                            console.warn(
                                `Removing duplicate tab ${t.id} in removeTab`
                            );
                            return false;
                        }
                        tabIds.add(t.id);
                        return true;
                    });

                    // Save to device-specific config instead of general user config
                    const currentDeviceType =
                        deviceConfigService.detectDeviceType();
                    const response = await fetch(
                        `${
                            import.meta.env.VITE_API_BASE_URL ||
                            "http://localhost:8080"
                        }/api/cosmos/device-config/${currentDeviceType}`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${await deviceConfigService.getAuthToken()}`,
                                "Content-Type": "application/json",
                                ...editingLockService.getLockHeaders(),
                            },
                            body: JSON.stringify({
                                tabs: uniqueTabs,
                            }),
                        }
                    );

                    if (response.ok) {
                        console.log(
                            `Tab removed, layout saved to ${currentDeviceType} device config`
                        );
                    } else {
                        console.error(
                            `Failed to save to ${currentDeviceType} device config after removing tab:`,
                            await response.text()
                        );
                    }

                    // Save complete configuration with all user settings
                    await enhancedConfigService.saveCompleteConfiguration();
                    console.log(
                        "Complete configuration saved after tab removal"
                    );
                } catch (error) {
                    console.error(
                        "Failed to save to Cosmos DB after removing tab:",
                        error
                    );
                }
            };

            // Delete from PostgreSQL (legacy)
            const deleteFromDatabase = async () => {
                try {
                    await databaseService.deleteTab(userId, tabId);
                    console.log("Tab deleted from database");
                } catch (error) {
                    console.error("Failed to delete tab from database:", error);
                }
            };

            saveToCosmosDB();
            deleteFromDatabase();
        }

        // Update in layouts array if it's a saved layout
        if (!currentLayout.isDefault) {
            setLayouts(
                layouts.map((l) =>
                    l.id === currentLayout.id ? updatedLayout : l
                )
            );
        }

        // If we removed the active tab, switch to first available
        if (activeTabId === tabId && updatedTabs.length > 0) {
            setActiveTabId(updatedTabs[0].id);
        }
    };

    const updateTab = (tabId: string, updates: Partial<TabConfig>) => {
        console.log("🔄 UPDATE TAB CALLED:", { tabId, updates });
        console.log("🔓 Current edit mode state:", {
            isUnlocked: editingLockService.isUnlocked(),
        });
        console.log(
            "🔓 Current edit mode state type:",
            typeof editingLockService.isUnlocked()
        );
        console.log(
            "🔓 Current edit mode state value:",
            editingLockService.isUnlocked()
        );

        // Log when components are being saved (this means exiting edit mode)
        if (updates.components) {
            console.log("💾 Saving component layout to Cosmos DB:", {
                tabId,
                componentCount: updates.components.length,
                hasEditModeChange: updates.editMode !== undefined,
                editMode: updates.editMode,
                timestamp: new Date().toISOString(),
            });
        }

        // Preserve editMode if not explicitly set in updates
        const currentTab = currentLayout.tabs.find((t) => t.id === tabId);
        const preservedUpdates = {
            ...updates,
            // If editMode is undefined in updates, preserve current value
            editMode:
                updates.editMode !== undefined
                    ? updates.editMode
                    : currentTab?.editMode,
        };

        const updatedLayout = {
            ...currentLayout,
            tabs: currentLayout.tabs.map((t) =>
                t.id === tabId ? { ...t, ...preservedUpdates } : t
            ),
            updatedAt: new Date().toISOString(),
        };

        console.log("UPDATED LAYOUT:", updatedLayout);
        console.log(
            "UPDATED TAB COMPONENTS:",
            updatedLayout.tabs.find((t) => t.id === tabId)?.components?.length
        );
        setCurrentLayout(updatedLayout);
        console.log(
            "TabLayoutManager: setCurrentLayout called with",
            updatedLayout.tabs.find((t) => t.id === tabId)?.components?.length,
            "components"
        );

        // Save to Cosmos DB (primary storage)
        const saveToCosmosDB = async () => {
            console.log("🚀 saveToCosmosDB function called");
            try {
                // Deduplicate tabs before saving
                const tabIds = new Set<string>();
                const uniqueTabs = updatedLayout.tabs.filter((t) => {
                    if (tabIds.has(t.id)) {
                        console.warn(
                            `Removing duplicate tab ${t.id} in updateTab`
                        );
                        return false;
                    }
                    tabIds.add(t.id);
                    return true;
                });
                console.log("🔍 Deduplicated tabs:", uniqueTabs.length);

                console.log(
                    "🚀 Sending to device-specific Cosmos DB config..."
                );

                // Save to device-specific config instead of general user config
                const currentDeviceType =
                    deviceConfigService.detectDeviceType();
                console.log("📱 Current device type:", currentDeviceType);
                const lockHeaders = editingLockService.getLockHeaders();
                console.log("🔒 Lock headers for CosmosDB save:", lockHeaders);
                console.log("🔒 Lock headers type:", typeof lockHeaders);
                console.log(
                    "🔒 Lock headers keys:",
                    Object.keys(lockHeaders || {})
                );
                console.log("🔒 Lock headers value:", lockHeaders);
                console.log("📦 Request body for CosmosDB save:", {
                    tabs: uniqueTabs,
                });
                const authToken = await deviceConfigService.getAuthToken();
                console.log(
                    "🔑 Auth token:",
                    authToken ? "present" : "missing"
                );
                console.log(
                    "🔑 Auth token length:",
                    authToken ? authToken.length : 0
                );
                console.log(
                    "🔑 Auth token preview:",
                    authToken ? authToken.substring(0, 20) + "..." : "none"
                );
                console.log("🔑 Full headers:", {
                    Authorization: `Bearer ${authToken}`,
                    "Content-Type": "application/json",
                    ...lockHeaders,
                });
                console.log(
                    "🔑 Request URL:",
                    `${
                        import.meta.env.PROD ? "" : "http://localhost:8080"
                    }/api/cosmos/device-config/${currentDeviceType}`
                );
                console.log("🔑 Environment variables:", {
                    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
                    PROD: import.meta.env.PROD,
                });
                console.log(
                    "🔑 Final request URL:",
                    `${
                        import.meta.env.VITE_API_BASE_URL ||
                        (import.meta.env.PROD ? "" : "http://localhost:8080")
                    }/api/cosmos/device-config/${currentDeviceType}`
                );
                console.log("🔑 About to make fetch request...");
                console.log("🔑 Fetch request details:", {
                    method: "POST",
                    url: `${
                        import.meta.env.VITE_API_BASE_URL ||
                        (import.meta.env.PROD ? "" : "http://localhost:8080")
                    }/api/cosmos/device-config/${currentDeviceType}`,
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        "Content-Type": "application/json",
                        ...lockHeaders,
                    },
                    body: JSON.stringify({
                        tabs: uniqueTabs,
                    }),
                });
                console.log("🔑 About to make fetch request...");
                console.log("🔑 Final request details:", {
                    method: "POST",
                    url: `${
                        import.meta.env.VITE_API_BASE_URL ||
                        (import.meta.env.PROD ? "" : "http://localhost:8080")
                    }/api/cosmos/device-config/${currentDeviceType}`,
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        "Content-Type": "application/json",
                        ...lockHeaders,
                    },
                    body: JSON.stringify({
                        tabs: uniqueTabs,
                    }),
                });
                const response = await fetch(
                    `${
                        import.meta.env.VITE_API_BASE_URL ||
                        (import.meta.env.PROD ? "" : "http://localhost:8080")
                    }/api/cosmos/device-config/${currentDeviceType}`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                            "Content-Type": "application/json",
                            ...lockHeaders,
                        },
                        body: JSON.stringify({
                            tabs: uniqueTabs,
                        }),
                    }
                );

                if (response.ok) {
                    console.log(
                        `✅ Tab updated in ${currentDeviceType} device config with components:`,
                        uniqueTabs.find((t) => t.id === tabId)?.components
                            ?.length
                    );
                    const responseText = await response.text();
                    console.log("📥 Response from CosmosDB:", responseText);
                    console.log("✅ CosmosDB save completed successfully");

                    // Post-save verification: fetch and compare, retry once if mismatch
                    try {
                        const verifyUrl = `$
                            {import.meta.env.VITE_API_BASE_URL ||
                            (import.meta.env.PROD ? "" : "http://localhost:8080")}
                            /api/cosmos/device-config/${currentDeviceType}`.replace(
                            /\n|\s+/g,
                            ""
                        );
                        const verifyResp = await fetch(verifyUrl, {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${authToken}`,
                                "Content-Type": "application/json",
                            },
                        });
                        if (verifyResp.ok) {
                            const verifyJson = await verifyResp.json();
                            const remoteTabs =
                                verifyJson?.config?.tabs ||
                                verifyJson?.config?.config?.tabs ||
                                [];
                            const normalize = (tabs: any[]) =>
                                [...tabs]
                                    .map((t: any) => ({
                                        id: t.id,
                                        components: (t.components || []).map(
                                            (c: any) => ({
                                                id: c.id,
                                                pos: c.position,
                                                mode:
                                                    c.props?.displayMode ||
                                                    undefined,
                                            })
                                        ),
                                    }))
                                    .sort((a, b) => a.id.localeCompare(b.id));
                            const want = normalize(uniqueTabs as any);
                            const got = normalize(remoteTabs as any);
                            const match =
                                JSON.stringify(want) === JSON.stringify(got);
                            if (!match) {
                                console.warn(
                                    "⚠️ Post-save verification mismatch. Retrying save once…"
                                );
                                await fetch(verifyUrl, {
                                    method: "POST",
                                    headers: {
                                        Authorization: `Bearer ${authToken}`,
                                        "Content-Type": "application/json",
                                        ...lockHeaders,
                                    },
                                    body: JSON.stringify({ tabs: uniqueTabs }),
                                });
                            } else {
                                console.log(
                                    "✅ Post-save verification matched."
                                );
                                // Ensure UI uses the exact saved state from CosmosDB
                                try {
                                    const dedup = (tabs: any[]) => {
                                        const seen = new Set<string>();
                                        return (tabs || []).filter((t: any) => {
                                            if (seen.has(t.id)) return false;
                                            seen.add(t.id);
                                            return true;
                                        });
                                    };
                                    const syncedTabs = dedup(remoteTabs).map(
                                        (t: any) => ({
                                            ...t,
                                            editMode: false,
                                            components: (
                                                t.components || []
                                            ).map((c: any) => ({
                                                ...c,
                                                position: {
                                                    x: c.position?.x ?? 0,
                                                    y: c.position?.y ?? 0,
                                                    w: c.position?.w ?? 4,
                                                    h: c.position?.h ?? 1,
                                                },
                                                props: {
                                                    ...(c.props || {}),
                                                },
                                            })),
                                        })
                                    );
                                    setCurrentLayout((prev) => ({
                                        ...prev,
                                        tabs: [
                                            prev.tabs[0],
                                            ...syncedTabs.filter(
                                                (t: any) => t.id !== "main"
                                            ),
                                        ],
                                        updatedAt: new Date().toISOString(),
                                    }));
                                    console.log(
                                        "🔄 Synchronized UI state with verified CosmosDB config"
                                    );
                                } catch (syncErr) {
                                    console.warn(
                                        "⚠️ Failed to sync UI with verified config:",
                                        syncErr
                                    );
                                }
                            }
                        } else {
                            console.warn(
                                "⚠️ Could not verify saved device config:",
                                await verifyResp.text()
                            );
                        }
                    } catch (verErr) {
                        console.warn("⚠️ Verification step failed:", verErr);
                    }
                } else {
                    console.error(
                        `❌ Failed to save updated tab to ${currentDeviceType} device config:`,
                        await response.text()
                    );
                }
                console.log("🏁 saveToCosmosDB function completed");
            } catch (error) {
                console.error("💥 Failed to save to Cosmos DB:", error);
                console.log("🏁 saveToCosmosDB function completed with error");
            }
        };

        // Save to PostgreSQL (legacy)
        const saveToDatabase = async () => {
            console.log("🗄️ saveToDatabase function called");
            try {
                const tabToUpdate = updatedLayout.tabs.find(
                    (t) => t.id === tabId
                );
                console.log(
                    "🔍 Found tab to update:",
                    tabToUpdate ? tabToUpdate.id : "not found"
                );
                if (tabToUpdate) {
                    await databaseService.saveTab(userId, {
                        tab_id: tabToUpdate.id,
                        title: tabToUpdate.name,
                        icon: tabToUpdate.icon,
                        tab_type: tabToUpdate.type,
                        components: tabToUpdate.components,
                        editMode: tabToUpdate.editMode,
                        custom_settings: tabToUpdate.props,
                    });
                    console.log("✅ Tab saved to database");
                    console.log("✅ Database save completed successfully");
                } else {
                    console.log("⚠️ No tab found to update in database");
                }
                console.log("🏁 saveToDatabase function completed");
            } catch (error) {
                console.error("❌ Failed to save tab to database:", error);
                console.log("🏁 saveToDatabase function completed with error");
            }
        };

        // Save to both storages
        console.log("💾 Calling saveToCosmosDB and saveToDatabase...");
        saveToCosmosDB();
        saveToDatabase();
        console.log("💾 Both save functions called");

        // No localStorage - Cosmos DB only

        // Update in layouts array if it's a saved layout
        if (!currentLayout.isDefault) {
            setLayouts(
                layouts.map((l) =>
                    l.id === currentLayout.id ? updatedLayout : l
                )
            );
        }

        console.log("✅ updateTab function completed successfully");
    };

    const saveCurrentLayout = (name: string) => {
        const newLayout: TabLayout = {
            id: uuidv4(),
            name,
            tabs: currentLayout.tabs,
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setLayouts([...layouts, newLayout]);
        setCurrentLayout(newLayout);
    };

    const loadLayout = (layoutId: string) => {
        const layout = layouts.find((l) => l.id === layoutId);
        if (layout) {
            setCurrentLayout(layout);
            // Set first tab as active
            if (layout.tabs.length > 0) {
                setActiveTabId(layout.tabs[0].id);
            }
        }
    };

    const deleteLayout = (layoutId: string) => {
        // Can't delete default layout
        const layout = layouts.find((l) => l.id === layoutId);
        if (!layout || layout.isDefault) {
            return;
        }

        setLayouts(layouts.filter((l) => l.id !== layoutId));

        // If we deleted the current layout, switch to default
        if (currentLayout.id === layoutId) {
            setCurrentLayout(defaultLayout);
            setActiveTabId(defaultLayout.tabs[0]?.id || "");
        }
    };

    const resetToDefault = async () => {
        console.log("Resetting to default configuration...");

        // Clear all local storage first
        localStorage.clear();
        sessionStorage.clear();

        // Set default layout in memory
        setCurrentLayout(defaultLayout);
        setActiveTabId(defaultLayout.tabs[0]?.id || "");

        // Save default layout to device-specific Cosmos DB config
        try {
            const cleanTabs = defaultLayout.tabs.map((tab) => ({
                ...tab,
                component: tab.component || "dashboard", // Ensure component is never empty
                editMode: false,
                components: [], // Clear any broken components
            }));

            // Save to device-specific config instead of general user config
            const currentDeviceType = deviceConfigService.detectDeviceType();
            const response = await fetch(
                `${
                    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
                }/api/cosmos/device-config/${currentDeviceType}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${await deviceConfigService.getAuthToken()}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        tabs: cleanTabs,
                        layouts: [], // Reset layouts as well
                    }),
                }
            );

            if (response.ok) {
                console.log(
                    `Default configuration saved to ${currentDeviceType} device config`
                );
            } else {
                console.error(
                    `Failed to save default config to ${currentDeviceType} device config:`,
                    await response.text()
                );
            }
        } catch (error) {
            console.error("Error saving default config to Cosmos DB:", error);
        }
    };

    const reorderTabs = (newTabs: TabConfig[]) => {
        const updatedLayout = {
            ...currentLayout,
            tabs: newTabs,
            updatedAt: new Date().toISOString(),
        };

        setCurrentLayout(updatedLayout);

        // Update in layouts array if it's a saved layout
        if (!currentLayout.isDefault) {
            setLayouts(
                layouts.map((l) =>
                    l.id === currentLayout.id ? updatedLayout : l
                )
            );
        }
    };

    const updateTabGridLayout = (tabId: string, gridLayout: any[]) => {
        const updatedLayout = {
            ...currentLayout,
            tabs: currentLayout.tabs.map((t) =>
                t.id === tabId ? { ...t, gridLayout } : t
            ),
            updatedAt: new Date().toISOString(),
        };

        setCurrentLayout(updatedLayout);

        // Update in layouts array if it's a saved layout
        if (!currentLayout.isDefault) {
            setLayouts(
                layouts.map((l) =>
                    l.id === currentLayout.id ? updatedLayout : l
                )
            );
        }
    };

    const toggleTabGridLayout = (tabId: string, enabled: boolean) => {
        const updatedLayout = {
            ...currentLayout,
            tabs: currentLayout.tabs.map((t) =>
                t.id === tabId ? { ...t, gridLayoutEnabled: enabled } : t
            ),
            updatedAt: new Date().toISOString(),
        };

        setCurrentLayout(updatedLayout);

        // Update in layouts array if it's a saved layout
        if (!currentLayout.isDefault) {
            setLayouts(
                layouts.map((l) =>
                    l.id === currentLayout.id ? updatedLayout : l
                )
            );
        }
    };

    // Enhanced tab creation - shows styled modal for tab name
    const createTabWithPrompt = () => {
        setShowTabModal(true);
    };

    const handleTabNameConfirm = (tabName: string) => {
        // Check for duplicate names
        const existingTab = currentLayout.tabs.find(
            (t) => t.name && t.name.toLowerCase() === tabName.toLowerCase()
        );
        if (existingTab) {
            alert(
                `Tab name "${tabName}" already exists. Please choose a different name.`
            );
            return;
        }

        const newTab: Omit<TabConfig, "id"> = {
            name: tabName,
            component: "UserTabContainer", // Fixed component ID for all user tabs
            type: "dynamic", // Always use dynamic type
            icon: "grid", // Always use grid icon for dynamic tabs
            closable: true,
            gridLayoutEnabled: true,
            components: [],
            editMode: false, // Start in view mode, user can toggle to edit
            memoryStrategy: "hybrid",
        };

        const createdTab = addTab(newTab);
        setShowTabModal(false);
    };

    // Helper function to get appropriate icon for tab type
    const getIconForTabType = (type: TabConfig["type"]): string => {
        switch (type) {
            case "dynamic":
                return "grid";
            case "static":
                return "layout";
            default:
                return "square";
        }
    };

    // Dynamic tab component management
    const addComponentToTab = (tabId: string, component: ComponentInTab) => {
        const tab = currentLayout.tabs.find((t) => t.id === tabId);
        if (!tab || tab.type !== "dynamic") return;

        const updatedLayout = {
            ...currentLayout,
            tabs: currentLayout.tabs.map((t) =>
                t.id === tabId
                    ? { ...t, components: [...(t.components || []), component] }
                    : t
            ),
            updatedAt: new Date().toISOString(),
        };

        setCurrentLayout(updatedLayout);

        // Save to PostgreSQL
        const saveToDatabase = async () => {
            try {
                const updatedTab = updatedLayout.tabs.find(
                    (t) => t.id === tabId
                );
                if (updatedTab) {
                    await databaseService.saveComponentLayouts(
                        userId,
                        tabId,
                        updatedTab.components || []
                    );
                    console.log("Component added and saved to database");
                }
            } catch (error) {
                console.error("Failed to save component to database:", error);
            }
        };

        saveToDatabase();

        // Save to view memory for dynamic tabs
        if (tab.memoryStrategy === "hybrid" || tab.memoryStrategy === "redis") {
            saveLayout(
                `tab-${tabId}`,
                updatedLayout.tabs.find((t) => t.id === tabId)?.components
            );
        }

        // Update in layouts array if it's a saved layout
        if (!currentLayout.isDefault) {
            setLayouts(
                layouts.map((l) =>
                    l.id === currentLayout.id ? updatedLayout : l
                )
            );
        }
    };

    const removeComponentFromTab = (tabId: string, componentId: string) => {
        const tab = currentLayout.tabs.find((t) => t.id === tabId);
        if (!tab || tab.type !== "dynamic") return;

        const updatedLayout = {
            ...currentLayout,
            tabs: currentLayout.tabs.map((t) =>
                t.id === tabId
                    ? {
                          ...t,
                          components: (t.components || []).filter(
                              (c) => c.id !== componentId
                          ),
                      }
                    : t
            ),
            updatedAt: new Date().toISOString(),
        };

        setCurrentLayout(updatedLayout);

        // Save to view memory
        if (tab.memoryStrategy === "hybrid" || tab.memoryStrategy === "redis") {
            saveLayout(
                `tab-${tabId}`,
                updatedLayout.tabs.find((t) => t.id === tabId)?.components
            );
        }

        // Update in layouts array if it's a saved layout
        if (!currentLayout.isDefault) {
            setLayouts(
                layouts.map((l) =>
                    l.id === currentLayout.id ? updatedLayout : l
                )
            );
        }
    };

    const updateComponentInTab = (
        tabId: string,
        componentId: string,
        updates: Partial<ComponentInTab>
    ) => {
        const tab = currentLayout.tabs.find((t) => t.id === tabId);
        if (!tab || tab.type !== "dynamic") return;

        const updatedLayout = {
            ...currentLayout,
            tabs: currentLayout.tabs.map((t) =>
                t.id === tabId
                    ? {
                          ...t,
                          components: (t.components || []).map((c) =>
                              c.id === componentId ? { ...c, ...updates } : c
                          ),
                      }
                    : t
            ),
            updatedAt: new Date().toISOString(),
        };

        setCurrentLayout(updatedLayout);

        // Save to PostgreSQL
        const saveToDatabase = async () => {
            try {
                const updatedTab = updatedLayout.tabs.find(
                    (t) => t.id === tabId
                );
                if (updatedTab) {
                    await databaseService.saveComponentLayouts(
                        userId,
                        tabId,
                        updatedTab.components || []
                    );
                    console.log("Component updated and saved to database");
                }
            } catch (error) {
                console.error("Failed to update component in database:", error);
            }
        };

        saveToDatabase();

        // Save to view memory with real-time updates
        if (tab.memoryStrategy === "hybrid" || tab.memoryStrategy === "redis") {
            saveLayout(
                `tab-${tabId}`,
                updatedLayout.tabs.find((t) => t.id === tabId)?.components
            );
        }

        // Update in layouts array if it's a saved layout
        if (!currentLayout.isDefault) {
            setLayouts(
                layouts.map((l) =>
                    l.id === currentLayout.id ? updatedLayout : l
                )
            );
        }
    };

    const toggleTabEditMode = (tabId: string) => {
        const tab = currentLayout.tabs.find((t) => t.id === tabId);
        if (!tab || !tab.closable) return; // Only allow edit mode for user-created tabs

        const updatedLayout = {
            ...currentLayout,
            tabs: currentLayout.tabs.map((t) =>
                t.id === tabId ? { ...t, editMode: !t.editMode } : t
            ),
            updatedAt: new Date().toISOString(),
        };

        setCurrentLayout(updatedLayout);

        // Update in layouts array if it's a saved layout
        if (!currentLayout.isDefault) {
            setLayouts(
                layouts.map((l) =>
                    l.id === currentLayout.id ? updatedLayout : l
                )
            );
        }
    };

    // Clear user configuration and reset to defaults
    const clearUserConfiguration = async () => {
        try {
            console.log(
                "Clearing user configuration from Cosmos DB and localStorage..."
            );

            // Clear ALL localStorage and sessionStorage completely
            localStorage.clear();
            sessionStorage.clear();

            // Clear from device-specific Cosmos DB configs
            try {
                const deviceTypes = ["mobile", "laptop", "bigscreen"];
                for (const deviceType of deviceTypes) {
                    try {
                        const deleteResponse = await fetch(
                            `${
                                import.meta.env.VITE_API_BASE_URL ||
                                "http://localhost:8080"
                            }/api/cosmos/device-config/${deviceType}`,
                            {
                                method: "DELETE",
                                headers: {
                                    Authorization: `Bearer ${await deviceConfigService.getAuthToken()}`,
                                    "Content-Type": "application/json",
                                },
                            }
                        );
                        if (deleteResponse.ok) {
                            console.log(
                                `Deleted ${deviceType} configuration from Cosmos DB`
                            );
                        }
                    } catch (e) {
                        console.log(
                            `No existing ${deviceType} config to delete or delete failed:`,
                            e
                        );
                    }
                }
            } catch (e) {
                console.log("Error during device config cleanup:", e);
            }

            // Create a clean default configuration with valid component types
            const cleanDefaultTabs = [
                {
                    id: "analytics",
                    name: "Analytics",
                    component: "Analytics", // Valid component type
                    type: "dynamic" as const,
                    icon: "bar-chart-2",
                    closable: true,
                    gridLayoutEnabled: true,
                    components: [],
                    editMode: false,
                    memoryStrategy: "hybrid",
                },
            ];

            // Save the clean default to current device-specific config
            try {
                const currentDeviceType =
                    deviceConfigService.detectDeviceType();
                const response = await fetch(
                    `${
                        import.meta.env.VITE_API_BASE_URL ||
                        (import.meta.env.PROD ? "" : "http://localhost:8080")
                    }/api/cosmos/device-config/${currentDeviceType}`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${await deviceConfigService.getAuthToken()}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            tabs: cleanDefaultTabs,
                            layouts: [],
                        }),
                    }
                );

                if (response.ok) {
                    console.log(
                        `Clean default configuration saved to ${currentDeviceType} device config`
                    );
                } else {
                    console.error(
                        `Failed to save clean config to ${currentDeviceType} device config:`,
                        await response.text()
                    );
                }
            } catch (e) {
                console.error("Failed to save clean config to Cosmos DB:", e);
            }

            // Reset to default layout
            console.log("Resetting to default layout...");
            setCurrentLayout(DEFAULT_LAYOUT);
            setLayouts([DEFAULT_LAYOUT]);
            setActiveTabId("main");

            console.log("✅ User configuration cleared and reset successfully");
        } catch (error) {
            console.error("Failed to clear user configuration:", error);
        }
    };

    const value: TabLayoutContextValue = {
        currentLayout,
        activeTabId,
        currentDeviceType,
        isDeviceSwitching,
        layouts,
        defaultLayout,
        userLayouts,
        setActiveTab: setActiveTabId,
        addTab,
        removeTab,
        updateTab,
        reorderTabs,
        createTabWithPrompt,
        showTabModal,
        setShowTabModal,
        saveCurrentLayout,
        loadLayout,
        deleteLayout,
        resetToDefault,
        clearUserConfiguration,
        updateTabGridLayout,
        toggleTabGridLayout,
        addComponentToTab,
        removeComponentFromTab,
        updateComponentInTab,
        toggleTabEditMode,
    };

    // Persist ALL tabs on lock so changes across tabs are saved consistently
    useEffect(() => {
        const onEditToggle = async (e: any) => {
            try {
                const unlocked = !!e?.detail?.unlocked;
                if (!unlocked) {
                    // Locking now – save the entire tabs array to device-config
                    // Debounce slightly to let per-tab updateTab() save finish first
                    setTimeout(async () => {
                        const tabIds = new Set<string>();
                        const uniqueTabs = currentLayout.tabs.filter((t) => {
                            if (tabIds.has(t.id)) return false;
                            tabIds.add(t.id);
                            return true;
                        });

                        // Enforce thumbnail footprint for persistence
                        const tabsToSave = uniqueTabs.map((t) => ({
                            ...t,
                            components: (t.components || []).map((c) => {
                                const isThumb =
                                    c?.props?.displayMode === "thumbnail";
                                const enforcedPosition = isThumb
                                    ? { ...c.position, w: 4, h: 1 }
                                    : c.position;
                                return { ...c, position: enforcedPosition };
                            }),
                        }));

                        const currentDeviceType =
                            deviceConfigService.detectDeviceType();
                        const baseUrl =
                            import.meta.env.VITE_API_BASE_URL ||
                            (import.meta.env.PROD
                                ? ""
                                : "http://localhost:8080");
                        const url = `${baseUrl}/api/cosmos/device-config/${currentDeviceType}`;

                        const auth = await deviceConfigService.getAuthToken();
                        const lockHeaders = editingLockService.getLockHeaders();
                        const requestId = `lock-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2, 8)}`;

                        const normalize = (tabs: any[]) =>
                            [...tabs]
                                .map((t: any) => ({
                                    id: t.id,
                                    components: (t.components || []).map(
                                        (c: any) => ({
                                            id: c.id,
                                            pos: c.position,
                                            mode: c.props?.displayMode,
                                        })
                                    ),
                                }))
                                .sort((a, b) =>
                                    (a.id || "").localeCompare(b.id || "")
                                );

                        const desired = normalize(tabsToSave as any);
                        try {
                            console.log(
                                "📝 Global save (lock): Desired normalized tabs before POST:",
                                JSON.stringify(desired)
                            );
                            console.log(
                                "📦 Global save (lock): Raw tabs payload before POST:",
                                JSON.stringify(
                                    tabsToSave.map((t) => ({
                                        id: t.id,
                                        components: (t.components || []).map(
                                            (c) => ({
                                                id: c.id,
                                                position: c.position,
                                                mode: c?.props?.displayMode,
                                            })
                                        ),
                                    }))
                                )
                            );
                        } catch (e) {}

                        for (let attempt = 1; attempt <= 2; attempt++) {
                            await fetch(url, {
                                method: "POST",
                                headers: {
                                    Authorization: `Bearer ${auth}`,
                                    "Content-Type": "application/json",
                                    ...lockHeaders,
                                    "X-Request-Id": requestId,
                                },
                                body: JSON.stringify({ tabs: tabsToSave }),
                            });

                            // Verify
                            const verifyResp = await fetch(url, {
                                method: "GET",
                                headers: {
                                    Authorization: `Bearer ${auth}`,
                                    "Content-Type": "application/json",
                                    "X-Request-Id": requestId,
                                },
                            });
                            if (verifyResp.ok) {
                                const verifyJson = await verifyResp.json();
                                const remoteTabs =
                                    verifyJson?.config?.tabs ||
                                    verifyJson?.config?.config?.tabs ||
                                    [];
                                const got = normalize(remoteTabs);
                                try {
                                    console.log(
                                        "📝 Global save (lock): Read-back normalized tabs after POST (attempt",
                                        attempt,
                                        "):",
                                        JSON.stringify(got)
                                    );
                                    console.log(
                                        "📥 Global save (lock): Raw tabs read-back after POST:",
                                        JSON.stringify(
                                            (remoteTabs || []).map(
                                                (t: any) => ({
                                                    id: t.id,
                                                    components: (
                                                        t.components || []
                                                    ).map((c: any) => ({
                                                        id: c.id,
                                                        position: c.position,
                                                        mode: c?.props
                                                            ?.displayMode,
                                                    })),
                                                })
                                            )
                                        )
                                    );
                                } catch (e) {}
                                if (
                                    JSON.stringify(desired) ===
                                    JSON.stringify(got)
                                ) {
                                    console.log(
                                        "✅ Global save on lock verified (attempt",
                                        attempt,
                                        ")"
                                    );
                                    break;
                                }
                                if (attempt === 2) {
                                    console.warn(
                                        "⚠️ Global save verification mismatch after retry"
                                    );
                                } else {
                                    await new Promise((r) =>
                                        setTimeout(r, 250)
                                    );
                                }
                            } else {
                                console.warn(
                                    "⚠️ Global save verification GET failed:",
                                    await verifyResp.text()
                                );
                                if (attempt === 2) break;
                                await new Promise((r) => setTimeout(r, 250));
                            }
                        }
                    }, 600);
                }
            } catch (err) {
                console.warn(
                    "Failed to save all tabs on lock:",
                    (err as any)?.message || err
                );
            }
        };
        window.addEventListener(
            "gzc:edit-mode-toggled" as any,
            onEditToggle as any
        );
        return () =>
            window.removeEventListener(
                "gzc:edit-mode-toggled" as any,
                onEditToggle as any
            );
    }, [currentLayout.tabs]);

    return (
        <TabLayoutContext.Provider value={value}>
            {children}
            <TabNameModal
                isOpen={showTabModal}
                onClose={() => setShowTabModal(false)}
                onConfirm={handleTabNameConfirm}
                defaultName={`New Tab ${
                    currentLayout.tabs.filter(
                        (t) => t.name && t.name.startsWith("New Tab")
                    ).length + 1
                }`}
            />
        </TabLayoutContext.Provider>
    );
}
