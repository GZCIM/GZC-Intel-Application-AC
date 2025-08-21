/**
 * Cross-Device Memory Service
 * Syncs all user memory (tabs, components, preferences, state) across devices
 */

import { cosmosConfigService } from "./cosmosConfigService";
import { editingLockService } from "./editingLockService";
import { toastManager } from "../components/Toast";

interface UserMemory {
    tabs: any[];
    layouts: any[];
    preferences: {
        theme: string;
        language: string;
        lastActiveTab?: string;
        customSettings?: any;
    };
    componentStates: {
        [componentId: string]: any;
    };
    sessionData: {
        lastDevice?: string;
        lastBrowser?: string;
        lastSync?: string;
    };
}

class MemoryService {
    private memory: UserMemory = {
        tabs: [],
        layouts: [],
        preferences: {
            theme: "dark",
            language: "en",
        },
        componentStates: {},
        sessionData: {},
    };

    /**
     * Initialize memory service
     */
    async initialize() {
        // Load memory from cloud
        await this.loadMemory();

        // Track device info
        this.updateSessionData();

        // Auto-save on changes
        this.setupAutoSave();
    }

    /**
     * Load memory from Cosmos DB
     */
    async loadMemory() {
        try {
            const config = await cosmosConfigService.loadConfiguration();

            if (config) {
                this.memory = {
                    tabs: config.tabs || [],
                    layouts: config.layouts || [],
                    preferences: config.preferences || this.memory.preferences,
                    componentStates: config.componentStates || {},
                    sessionData: config.sessionData || {},
                };

                console.log("Memory loaded from cloud:", {
                    tabs: this.memory.tabs.length,
                    hasPreferences: !!this.memory.preferences,
                    componentStates: Object.keys(this.memory.componentStates)
                        .length,
                });

                // Apply preferences
                this.applyPreferences();
            }
        } catch (error) {
            console.error("Failed to load memory:", error);
        }
    }

    /**
     * Save memory to Cosmos DB
     */
    async saveMemory(showToast = false) {
        try {
            // Do not persist when locked
            if (!editingLockService.isUnlocked()) {
                return;
            }
            await cosmosConfigService.saveConfiguration({
                ...this.memory,
                timestamp: new Date().toISOString(),
                version: "2.1",
            });

            if (showToast) {
                toastManager.show("✓ Memory synced across devices", "success");
            }
        } catch (error) {
            console.error("Failed to save memory:", error);
            if (showToast) {
                toastManager.show("Failed to sync memory", "error");
            }
        }
    }

    /**
     * Update component state
     */
    updateComponentState(componentId: string, state: any) {
        this.memory.componentStates[componentId] = {
            ...this.memory.componentStates[componentId],
            ...state,
            lastUpdated: new Date().toISOString(),
        };

        // Debounced save
        this.debouncedSave();
    }

    /**
     * Get component state
     */
    getComponentState(componentId: string): any {
        return this.memory.componentStates[componentId] || {};
    }

    /**
     * Update preferences
     */
    updatePreferences(updates: Partial<typeof this.memory.preferences>) {
        this.memory.preferences = {
            ...this.memory.preferences,
            ...updates,
        };

        this.applyPreferences();
        this.debouncedSave();
    }

    /**
     * Apply preferences to UI
     */
    private applyPreferences() {
        const { theme, language } = this.memory.preferences;

        // Apply theme
        if (theme) {
            document.documentElement.setAttribute("data-theme", theme);
        }

        // Apply language (if i18n is set up)
        if (language && (window as any).i18n) {
            (window as any).i18n.changeLanguage(language);
        }
    }

    /**
     * Update session data
     */
    private updateSessionData() {
        const userAgent = navigator.userAgent;
        let browser = "Unknown";
        let device = "Unknown";

        // Detect browser
        if (userAgent.includes("Chrome")) browser = "Chrome";
        else if (userAgent.includes("Safari")) browser = "Safari";
        else if (userAgent.includes("Firefox")) browser = "Firefox";
        else if (userAgent.includes("Edge")) browser = "Edge";

        // Detect device
        if (userAgent.includes("Mobile")) device = "Mobile";
        else if (userAgent.includes("Tablet")) device = "Tablet";
        else device = "Desktop";

        this.memory.sessionData = {
            lastDevice: device,
            lastBrowser: browser,
            lastSync: new Date().toISOString(),
        };
    }

    /**
     * Setup auto-save with debouncing
     */
    private saveTimeout: NodeJS.Timeout | null = null;

    private setupAutoSave() {
        // Save on visibility change
        document.addEventListener("visibilitychange", () => {
            if (document.hidden && editingLockService.isUnlocked()) {
                this.saveMemory(false);
            }
        });

        // Save on beforeunload
        window.addEventListener("beforeunload", () => {
            if (editingLockService.isUnlocked()) {
                this.saveMemory(false);
            }
        });
    }

    private debouncedSave = () => {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            if (editingLockService.isUnlocked()) {
                this.saveMemory(false);
            }
        }, 2000); // Save after 2 seconds of inactivity
    };

    /**
     * Get full memory object
     */
    getMemory(): UserMemory {
        return this.memory;
    }

    /**
     * Clear all memory (for logout)
     */
    clearMemory() {
        this.memory = {
            tabs: [],
            layouts: [],
            preferences: {
                theme: "dark",
                language: "en",
            },
            componentStates: {},
            sessionData: {},
        };
    }
}

// Export singleton
export const memoryService = new MemoryService();
