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
        const width = window.screen.width;
        const height = window.screen.height;
        const userAgent = navigator.userAgent;

        // Mobile detection
        const mobileKeywords = [
            "Mobile",
            "Android",
            "iPhone",
            "iPad",
            "iPod",
            "BlackBerry",
            "Windows Phone",
        ];
        const isMobileUA = mobileKeywords.some((keyword) =>
            userAgent.includes(keyword)
        );

        // Screen size thresholds (same as backend)
        if (width <= 768 || isMobileUA) {
            return "mobile";
        } else if (width <= 1366) {
            // Typical laptop resolution
            return "laptop";
        } else {
            // Large screens, external monitors
            return "bigscreen";
        }
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
            const deviceType = this.detectDeviceType();

            console.log(
                `🖥️ Requesting ${deviceType} configuration for ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`
            );

            // Get backend URL from environment
            const backendUrl =
                import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
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
            // Import MSAL instance dynamically to avoid circular dependencies
            const { msalInstance } = await import("../hooks/useAuth");
            const accounts = msalInstance.getAllAccounts();

            if (accounts.length > 0) {
                const response = await msalInstance.acquireTokenSilent({
                    scopes: [
                        "User.Read",
                        "api://a873f2d7-2ab9-4d59-a54c-90859226bf2e/access_as_user",
                    ],
                    account: accounts[0],
                });
                return response.accessToken;
            }

            throw new Error("No authenticated accounts found");
        } catch (error) {
            console.error("Failed to get auth token:", error);
            throw new Error(
                "Authentication required for device config requests"
            );
        }
    }

    /**
     * Get current device type
     */
    getCurrentDeviceType(): DeviceType {
        return this.currentDeviceType || this.detectDeviceType();
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
