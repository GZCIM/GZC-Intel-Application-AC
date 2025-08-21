/**
 * Cosmos DB Configuration Service
 * Uses FastAPI backend to access Cosmos DB (backend handles managed identity)
 */

import { PublicClientApplication } from "@azure/msal-browser";
import { toastManager } from "../components/Toast";
import { editingLockService } from "./editingLockService";

interface UserConfiguration {
    id: string;
    userId: string;
    tabs: any[];
    layouts: any[];
    preferences: Record<string, any>;
    componentStates: Record<string, any>; // Component-specific data
    userMemory: Record<string, any>; // General key-value storage
    timestamp: string;
    type: "user-config";
}

class CosmosConfigService {
    // In production, use relative URL so it goes through nginx proxy to Main Gateway
    private backendUrl =
        import.meta.env.VITE_BACKEND_URL ||
        (import.meta.env.PROD ? "" : "http://localhost:5300"); // Local dev: Main Gateway at 5300, Production: proxied through nginx to port 5000

    // Lazy-load MSAL instance to avoid initialization race condition
    private get msalInstance(): PublicClientApplication | null {
        if (typeof window !== "undefined" && (window as any).msalInstance) {
            return (window as any).msalInstance;
        }
        return null;
    }

    /**
     * Get Azure AD token for backend API access - NO RETRY LOOPS
     */
    private async getAccessToken(): Promise<string> {
        const msal = this.msalInstance;
        if (!msal) {
            throw new Error("MSAL not initialized - authentication required");
        }

        // Check if MSAL is actually initialized (no retries to avoid loops)
        let accounts: any[] = [];
        try {
            accounts = msal.getAllAccounts();
        } catch (e) {
            throw new Error("MSAL not properly initialized: " + e.message);
        }

        if (accounts.length === 0) {
            throw new Error("No authenticated user - login required");
        }

        try {
            // Silent token acquisition first
            const response = await msal.acquireTokenSilent({
                scopes: ["User.Read"],
                account: accounts[0],
            });
            return response.accessToken;
        } catch (error) {
            console.error("Failed to get token silently:", error);

            // Check if it's interaction_in_progress error - NO RETRY LOOPS
            if (
                error instanceof Error &&
                error.message.includes("interaction_in_progress")
            ) {
                throw new Error("Authentication in progress - please wait");
            }

            // For other errors, require user to login manually
            throw new Error(
                "Token acquisition failed - please refresh and login"
            );
        }
    }

    /**
     * Save user configuration via backend API (Cosmos DB only)
     */
    async saveConfiguration(config: Partial<UserConfiguration>): Promise<void> {
        try {
            // Check if user is authenticated first
            const msal = this.msalInstance;
            if (!msal) {
                console.log(
                    "🚨 MSAL not initialized, cannot save to Cosmos DB"
                );
                toastManager.show(
                    "❌ Configuration not saved - authentication required",
                    "error"
                );
                return;
            }

            const accounts = msal.getAllAccounts();
            if (accounts.length === 0) {
                console.log(
                    "🚨 No authenticated user, cannot save to Cosmos DB"
                );
                toastManager.show(
                    "❌ Configuration not saved - login required",
                    "error"
                );
                return;
            }

            // Protect against overwriting with empty payloads
            const hasTabs =
                Array.isArray(config.tabs) && config.tabs.length > 0;
            const hasLayouts =
                Array.isArray(config.layouts) && config.layouts.length > 0;
            const hasPrefs =
                !!config.preferences &&
                Object.keys(config.preferences || {}).length > 0;
            const hasComponentStates =
                !!config.componentStates &&
                Object.keys(config.componentStates || {}).length > 0;
            if (!hasTabs && !hasLayouts && !hasPrefs && !hasComponentStates) {
                console.warn(
                    "⏭️ Skipping cloud save: empty payload (prevents wiping tabs/layouts)"
                );
                return;
            }

            try {
                const token = await this.getAccessToken();

                console.log("💾 Saving to Cosmos DB:", {
                    tabsCount: config.tabs?.length || 0,
                    layoutsCount: config.layouts?.length || 0,
                    hasPreferences: !!config.preferences,
                    backend: this.backendUrl,
                });

                // Add timeout to prevent hanging (increased for comprehensive data)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for comprehensive config

                // Detect device type and use device-specific endpoint
                const deviceType = this.detectDeviceType();
                const response = await fetch(
                    `${this.backendUrl}/api/cosmos/device-config/${deviceType}`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            ...editingLockService.getLockHeaders(),
                        },
                        body: JSON.stringify(config),
                        signal: controller.signal,
                    }
                );

                clearTimeout(timeoutId);

                if (response.ok) {
                    console.log("✅ Configuration saved to Cosmos DB");
                    toastManager.show(
                        "✓ Configuration saved to cloud",
                        "success"
                    );
                } else {
                    throw new Error(
                        `HTTP ${response.status}: ${response.statusText}`
                    );
                }
            } catch (tokenError) {
                console.error(
                    "Token/Network error, cannot save to Cosmos DB:",
                    (tokenError as any).message || tokenError
                );
                toastManager.show(
                    "❌ Configuration not saved - cloud unavailable",
                    "error"
                );
                throw tokenError;
            }
        } catch (error) {
            console.error("Error saving configuration:", error);
            toastManager.show("❌ Configuration not saved", "error");
            throw error;
        }
    }

    /**
     * Detect device type based on screen size
     */
    private detectDeviceType(): string {
        // Use multiple detection methods for accuracy
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const innerWidth = window.innerWidth;
        const innerHeight = window.innerHeight;
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;

        console.log(`🔍 CosmosConfigService Device Detection:`);
        console.log(`  - Screen: ${screenWidth}x${screenHeight}`);
        console.log(`  - Inner: ${innerWidth}x${innerHeight}`);
        console.log(`  - User Agent: ${userAgent}`);
        console.log(`  - Platform: ${platform}`);

        // More sophisticated mobile detection
        const mobileKeywords = [
            "Mobile",
            "Android",
            "iPhone",
            "iPad",
            "iPod",
            "BlackBerry",
            "Windows Phone",
            "Mobile Safari",
        ];

        // Check if it's actually a mobile device
        const isMobileUA = mobileKeywords.some((keyword) =>
            userAgent.includes(keyword)
        );

        // Check if it's a touch device (more reliable than UA)
        const isTouchDevice =
            "ontouchstart" in window || navigator.maxTouchPoints > 0;

        // Check if it's a small screen device
        const isSmallScreen = screenWidth <= 768 || innerWidth <= 768;

        console.log(`  - Mobile UA detected: ${isMobileUA}`);
        console.log(`  - Touch Device: ${isTouchDevice}`);
        console.log(`  - Small Screen: ${isSmallScreen}`);

        // Enhanced detection logic
        let deviceType: string;

        if ((isSmallScreen && isMobileUA) || (isTouchDevice && isSmallScreen)) {
            deviceType = "mobile";
        } else if (screenWidth <= 1366 || innerWidth <= 1366) {
            deviceType = "laptop";
        } else {
            deviceType = "bigscreen";
        }

        console.log(`  - Final device type: ${deviceType}`);
        console.log(
            `  - Threshold checks: screenWidth <= 768 = ${
                screenWidth <= 768
            }, innerWidth <= 768 = ${innerWidth <= 768}`
        );

        return deviceType;
    }

    /**
     * Load user configuration via backend API (Cosmos DB only)
     */
    async loadConfiguration(): Promise<UserConfiguration | null> {
        try {
            // Check if user is authenticated first
            const msal = this.msalInstance;
            if (!msal) {
                console.log(
                    "🚨 MSAL not initialized, cannot load from Cosmos DB"
                );
                return null;
            }

            const accounts = msal.getAllAccounts();
            console.log("🔍 MSAL accounts found:", accounts.length);
            if (accounts.length === 0) {
                console.log(
                    "🚨 No authenticated user, cannot load from Cosmos DB"
                );
                return null;
            }

            try {
                console.log("🔑 Getting access token for Cosmos DB...");
                const token = await this.getAccessToken();
                console.log("✅ Token acquired, making Cosmos DB request");

                // Add timeout to prevent hanging (increased for comprehensive data)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for comprehensive config

                // Detect device type and use device-specific endpoint
                const deviceType = this.detectDeviceType();
                const response = await fetch(
                    `${this.backendUrl}/api/cosmos/device-config/${deviceType}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controller.signal,
                    }
                );

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    // Device config returns { config: {...}, deviceType, userId, etc }
                    const config = data.config || data;
                    if (config && (config.tabs || data.isEmpty)) {
                        console.log("✅ Configuration loaded from Cosmos DB:", {
                            deviceType: data.deviceType || deviceType,
                            tabsCount: config.tabs?.length || 0,
                            userId: data.userId,
                            timestamp: data.updatedAt || config.timestamp,
                        });
                        return config;
                    }
                } else {
                    console.log(
                        "🚨 Cosmos DB request failed:",
                        response.status,
                        response.statusText
                    );
                    return null;
                }
            } catch (tokenError) {
                console.log("🚨 Token acquisition failed:", tokenError.message);
                return null;
            }
        } catch (error) {
            console.error("Error loading configuration:", error);
            return null;
        }
    }

    /**
     * Update specific fields in configuration
     */
    async updateConfiguration(
        updates: Partial<UserConfiguration>
    ): Promise<void> {
        try {
            const token = await this.getAccessToken();

            // Prevent overwriting with empty updates
            const hasTabs =
                Array.isArray(updates.tabs) && updates.tabs.length > 0;
            const hasLayouts =
                Array.isArray(updates.layouts) && updates.layouts.length > 0;
            const hasPrefs =
                !!updates.preferences &&
                Object.keys(updates.preferences || {}).length > 0;
            const hasComponentStates = updates.componentStates !== undefined; // allow setting empty object explicitly
            const hasAny =
                hasTabs || hasLayouts || hasPrefs || hasComponentStates;
            if (!hasAny) {
                console.warn(
                    "⏭️ Skipping cloud update: no meaningful fields provided"
                );
                return;
            }

            // Detect device type and use device-specific endpoint
            const deviceType = this.detectDeviceType();
            const response = await fetch(
                `${this.backendUrl}/api/cosmos/device-config/${deviceType}`,
                {
                    method: "POST", // Device config uses POST for updates
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        ...editingLockService.getLockHeaders(),
                    },
                    body: JSON.stringify(updates),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to update config: ${response.statusText}`
                );
            }

            console.log("Configuration updated in Cosmos DB via backend");
            toastManager.show("✓ Configuration updated", "success");
        } catch (error) {
            console.error("Error updating Cosmos DB:", error);
            toastManager.show("Failed to update configuration", "error");
            throw error; // No fallback - require Cosmos DB
        }
    }

    /**
     * Delete user configuration
     */
    async deleteConfiguration(): Promise<void> {
        try {
            const token = await this.getAccessToken();

            // Detect device type and use device-specific endpoint
            const deviceType = this.detectDeviceType();
            const response = await fetch(
                `${this.backendUrl}/api/cosmos/device-config/${deviceType}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok && response.status !== 404) {
                throw new Error(
                    `Failed to delete config: ${response.statusText}`
                );
            }

            console.log("Configuration deleted from Cosmos DB via backend");
        } catch (error) {
            console.error("Error deleting from Cosmos DB:", error);
        }
    }

    /**
     * Check Cosmos DB health via backend
     */
    async checkHealth(): Promise<{ status: string; message?: string }> {
        try {
            const response = await fetch(
                `${this.backendUrl}/api/cosmos/health`
            );

            if (response.ok) {
                return await response.json();
            }

            return { status: "error", message: "Backend not reachable" };
        } catch (error) {
            return {
                status: "error",
                message: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Get user ID from authenticated user
     */
    private getUserId(): string {
        const msal = this.msalInstance;
        if (!msal) {
            // Fallback to temporary user ID for testing
            return `temp_user_${Date.now()}`;
        }

        try {
            const accounts = msal.getAllAccounts();
            if (accounts.length > 0) {
                return accounts[0].homeAccountId || accounts[0].username;
            }
        } catch (e) {
            // MSAL not initialized yet
            console.warn("MSAL not initialized in getUserId");
        }

        return `temp_user_${Date.now()}`;
    }

    /**
     * Fallback: Save to localStorage
     */
    private saveToLocalStorage(config: Partial<UserConfiguration>): void {
        const userId = this.getUserId();
        const key = `gzc-intel-config-${userId}`;
        const existing = this.loadFromLocalStorage() || {};

        const updated = {
            ...existing,
            ...config,
            timestamp: new Date().toISOString(),
        };

        localStorage.setItem(key, JSON.stringify(updated));
        console.log("Configuration saved to localStorage (fallback)");
    }

    /**
     * Fallback: Load from localStorage
     */
    private loadFromLocalStorage(): UserConfiguration | null {
        const userId = this.getUserId();
        const key = `gzc-intel-config-${userId}`;
        const stored = localStorage.getItem(key);

        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse localStorage config:", e);
            }
        }

        return null;
    }

    /**
     * Update specific component state (Cosmos DB only)
     */
    async updateComponentState(componentId: string, state: any): Promise<void> {
        try {
            const config = await this.loadConfiguration();
            if (!config) {
                console.error(
                    "No configuration available, cannot update component state"
                );
                throw new Error("Authentication required");
            }
            if (!config.componentStates) config.componentStates = {};
            config.componentStates[componentId] = state;
            await this.saveConfiguration(config);
        } catch (error) {
            console.error("Failed to update component state:", error);
            throw error;
        }
    }

    /**
     * Get specific component state
     */
    async getComponentState(componentId: string): Promise<any> {
        try {
            const config = await this.loadConfiguration();
            return config?.componentStates?.[componentId] || {};
        } catch (error) {
            console.error("Failed to get component state:", error);
            return {};
        }
    }

    /**
     * Update user preference (Cosmos DB only)
     */
    async updatePreference(key: string, value: any): Promise<void> {
        try {
            const config = await this.loadConfiguration();
            if (!config) {
                console.error(
                    "No configuration available, cannot update preference"
                );
                throw new Error("Authentication required");
            }
            if (!config.preferences) config.preferences = {};
            config.preferences[key] = value;
            await this.saveConfiguration(config);
        } catch (error) {
            console.error("Failed to update preference:", error);
            throw error;
        }
    }

    /**
     * Get user preference
     */
    async getPreference(key: string): Promise<any> {
        try {
            const config = await this.loadConfiguration();
            return config?.preferences?.[key] || null;
        } catch (error) {
            console.error("Failed to get preference:", error);
            return null;
        }
    }

    /**
     * Get default configuration structure
     */
    private getDefaultConfig(): UserConfiguration {
        return {
            id: `user-${this.getUserId()}`,
            userId: this.getUserId(),
            tabs: [],
            layouts: [],
            preferences: {},
            componentStates: {},
            userMemory: {},
            timestamp: new Date().toISOString(),
            type: "user-config",
        };
    }

    /**
     * Clear localStorage
     */
    private clearLocalStorage(): void {
        const userId = this.getUserId();
        const key = `gzc-intel-config-${userId}`;
        localStorage.removeItem(key);
    }
}

// Export singleton instance
export const cosmosConfigService = new CosmosConfigService();

// Export helper functions for backward compatibility
export const saveTabsToCosmosDB = async (tabs: any[]) => {
    await cosmosConfigService.saveConfiguration({ tabs });
};

export const loadTabsFromCosmosDB = async (): Promise<any[]> => {
    const config = await cosmosConfigService.loadConfiguration();
    return config?.tabs || [];
};

export const saveLayoutsToCosmosDB = async (layouts: any[]) => {
    await cosmosConfigService.saveConfiguration({ layouts });
};

export const loadLayoutsFromCosmosDB = async (): Promise<any[]> => {
    const config = await cosmosConfigService.loadConfiguration();
    return config?.layouts || [];
};
