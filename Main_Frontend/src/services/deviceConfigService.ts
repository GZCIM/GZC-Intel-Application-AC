/**
 * Device Configuration Service
 *
 * Detects device type and requests appropriate configuration from backend
 */

interface DeviceInfo {
    screenWidth: number;
    screenHeight: number;
    userAgent: string;
    platform: string;
    timezone: string;
    deviceId?: string;
}

interface DeviceConfigRequest {
    screenWidth: number;
    screenHeight: number;
    userAgent: string;
    platform: string;
    timezone: string;
    deviceId?: string;
}

export type DeviceType = "mobile" | "laptop" | "bigscreen";

class DeviceConfigService {
    private currentDeviceType: DeviceType | null = null;
    private currentConfig: any = null;

    /**
     * Detect current device type based on screen size and user agent
     */
    detectDeviceType(): DeviceType {
        // Use multiple detection methods for accuracy
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const innerWidth = window.innerWidth;
        const innerHeight = window.innerHeight;
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;

        // Debug logging to understand why detection is wrong
        console.log(`🔍 Enhanced Device Detection:`);
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
        let deviceType: DeviceType;

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
     * Validate device type is one of the supported types
     */
    validateDeviceType(deviceType: DeviceType): boolean {
        const validTypes = ["mobile", "laptop", "bigscreen"];
        if (!validTypes.includes(deviceType)) {
            console.error(`❌ Invalid device type: ${deviceType}`);
            return false;
        }
        return true;
    }

    /**
     * Manually override device type for debugging/testing
     */
    overrideDeviceType(deviceType: DeviceType): void {
        if (!this.validateDeviceType(deviceType)) {
            console.error(
                `Cannot override to invalid device type: ${deviceType}`
            );
            return;
        }

        console.log(`🔧 Manually overriding device type to: ${deviceType}`);
        this.currentDeviceType = deviceType;
        localStorage.setItem("gzc-device-type", deviceType);
    }

    /**
     * Get current device information
     */
    getDeviceInfo(): DeviceInfo {
        return {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            deviceId: localStorage.getItem("gzc-device-id") || undefined,
        };
    }

    /**
     * Request device-appropriate configuration from backend
     */
    async requestDeviceConfig(): Promise<any> {
        try {
            const deviceInfo = this.getDeviceInfo();
            const deviceType = this.getCurrentDeviceType(); // Use enhanced detection with override support

            // Validate device type before making API call
            if (!this.validateDeviceType(deviceType)) {
                throw new Error(`Invalid device type detected: ${deviceType}`);
            }

            console.log(
                `🖥️ Requesting ${deviceType} configuration for ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`
            );

            // Get backend URL from environment
            const backendUrl =
                import.meta.env.VITE_API_BASE_URL ||
                (import.meta.env.PROD ? "" : "http://localhost:8080");
            const configUrl = `${backendUrl}/api/cosmos/config/device`;

            // Get auth token (this would need to be implemented based on your auth system)
            const authToken = await this.getAuthToken();

            const response = await fetch(configUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(deviceInfo),
            });

            if (response.ok) {
                const config = await response.json();
                console.log(
                    `✅ Received ${config.deviceType} configuration:`,
                    config.name
                );

                this.currentDeviceType = deviceType;
                this.currentConfig = config;

                // Store device type for future reference
                localStorage.setItem("gzc-device-type", deviceType);

                return config;
            } else {
                const error = await response.text();
                console.error("❌ Failed to get device config:", error);
                throw new Error(`Failed to get device config: ${error}`);
            }
        } catch (error) {
            console.error("💥 Error requesting device config:", error);
            throw error;
        }
    }

    /**
     * Check if device type has changed (e.g., screen rotation, external monitor)
     */
    hasDeviceChanged(): boolean {
        const currentType = this.detectDeviceType();
        const storedType = localStorage.getItem(
            "gzc-device-type"
        ) as DeviceType;

        return currentType !== storedType;
    }

    /**
     * Monitor for device/screen changes
     */
    startDeviceMonitoring(onDeviceChange: (newDeviceType: DeviceType) => void) {
        // Monitor screen size changes
        const mediaQueries = [
            window.matchMedia("(max-width: 768px)"), // Mobile
            window.matchMedia("(max-width: 1366px)"), // Laptop
            window.matchMedia("(min-width: 1367px)"), // Bigscreen
        ];

        mediaQueries.forEach((mq) => {
            mq.addEventListener("change", () => {
                const newDeviceType = this.detectDeviceType();
                if (newDeviceType !== this.currentDeviceType) {
                    console.log(
                        `📱 Device type changed: ${this.currentDeviceType} → ${newDeviceType}`
                    );
                    this.currentDeviceType = newDeviceType;
                    onDeviceChange(newDeviceType);
                }
            });
        });

        // Monitor orientation changes (mobile/tablet)
        window.addEventListener("orientationchange", () => {
            setTimeout(() => {
                // Wait for orientation change to complete
                const newDeviceType = this.detectDeviceType();
                if (newDeviceType !== this.currentDeviceType) {
                    console.log(
                        `🔄 Orientation changed, device type: ${this.currentDeviceType} → ${newDeviceType}`
                    );
                    this.currentDeviceType = newDeviceType;
                    onDeviceChange(newDeviceType);
                }
            }, 500);
        });
    }

    /**
     * Get auth token from MSAL
     */
    async getAuthToken(): Promise<string> {
        try {
            // Get MSAL instance from window (more reliable)
            const msalInstance = (window as any).msalInstance;

            if (!msalInstance) {
                console.warn("MSAL not initialized yet, trying fallback");
                // Try importing as fallback
                try {
                    const { msalInstance: importedMsal } = await import(
                        "../hooks/useAuth"
                    );
                    if (!importedMsal) {
                        throw new Error("MSAL not available");
                    }
                    const accounts = importedMsal.getAllAccounts();
                    if (accounts.length > 0) {
                        const response = await importedMsal.acquireTokenSilent({
                            scopes: ["User.Read"],
                            account: accounts[0],
                        });
                        return response.accessToken;
                    }
                } catch (importError) {
                    console.error("MSAL import failed:", importError);
                }
                throw new Error("MSAL not initialized - please login first");
            }

            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                const response = await msalInstance.acquireTokenSilent({
                    scopes: ["User.Read"],
                    account: accounts[0],
                });
                return response.accessToken;
            }

            throw new Error("No authenticated accounts found - please login");
        } catch (error) {
            console.error("Failed to get auth token:", error);
            throw new Error(
                "Authentication required for device config requests"
            );
        }
    }

    /**
     * Get current device type (with override support)
     */
    getCurrentDeviceType(): DeviceType {
        // Highest priority: explicit override set via ToolsMenu
        const override = localStorage.getItem("gzc-device-override");
        if (override && this.validateDeviceType(override as DeviceType)) {
            return override as DeviceType;
        }
        // Next: previously stored detected type
        const stored = localStorage.getItem("gzc-device-type");
        if (stored && this.validateDeviceType(stored as DeviceType)) {
            return stored as DeviceType;
        }
        return this.detectDeviceType();
    }

    /**
     * Get current config
     */
    getCurrentConfig(): any {
        return this.currentConfig;
    }

    /**
     * Force refresh of device configuration
     */
    async refreshDeviceConfig(): Promise<any> {
        console.log("🔄 Forcing device config refresh...");
        return await this.requestDeviceConfig();
    }
}

// Export singleton instance
export const deviceConfigService = new DeviceConfigService();

// Export for browser console debugging
declare global {
    interface Window {
        deviceConfig: {
            service: DeviceConfigService;
            detectType: () => DeviceType;
            getInfo: () => DeviceInfo;
            requestConfig: () => Promise<any>;
            refresh: () => Promise<any>;
        };
    }
}

window.deviceConfig = {
    service: deviceConfigService,
    detectType: () => deviceConfigService.detectDeviceType(),
    getInfo: () => deviceConfigService.getDeviceInfo(),
    requestConfig: () => deviceConfigService.requestDeviceConfig(),
    refresh: () => deviceConfigService.refreshDeviceConfig(),
};

console.log("📱 Device Config Service loaded. Available commands:");
console.log("- window.deviceConfig.detectType() - Detect current device type");
console.log("- window.deviceConfig.getInfo() - Get device information");
console.log(
    "- window.deviceConfig.requestConfig() - Request device-specific config"
);
console.log("- window.deviceConfig.refresh() - Force refresh configuration");
