/**
 * Test Device Switching Integration
 *
 * This script helps test the device monitoring and config switching functionality.
 * Run in browser console after the app loads.
 */

console.log("🧪 Device Switching Test Suite Loaded");

// Test functions available in browser console
window.testDeviceSwitching = {
    // Check current device detection
    checkCurrentDevice() {
        const deviceType = window.deviceConfig.detectType();
        const deviceInfo = window.deviceConfig.getInfo();

        console.log("📱 Current Device Detection:");
        console.log(`- Device Type: ${deviceType}`);
        console.log(
            `- Screen Size: ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`
        );
        console.log(`- User Agent: ${deviceInfo.userAgent}`);

        return { deviceType, deviceInfo };
    },

    // Test device config API directly
    async testDeviceConfigAPI() {
        try {
            console.log("🔄 Testing device config API...");
            const config = await window.deviceConfig.requestConfig();
            console.log("✅ Device config loaded:", config);
            return config;
        } catch (error) {
            console.error("❌ Device config API failed:", error);
            return null;
        }
    },

    // Test different device types manually
    async testDeviceType(deviceType) {
        if (!["mobile", "laptop", "bigscreen"].includes(deviceType)) {
            console.error(
                "❌ Invalid device type. Use: mobile, laptop, bigscreen"
            );
            return;
        }

        try {
            console.log(`🔄 Testing ${deviceType} configuration...`);

            const backendUrl =
                import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
            const authToken = await window.deviceConfig.service.getAuthToken();

            const response = await fetch(
                `${backendUrl}/api/cosmos/device-config/${deviceType}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.ok) {
                const config = await response.json();
                console.log(`✅ ${deviceType} config:`, config);
                return config;
            } else {
                const error = await response.text();
                console.error(`❌ Failed to load ${deviceType} config:`, error);
                return null;
            }
        } catch (error) {
            console.error(`💥 Error testing ${deviceType}:`, error);
            return null;
        }
    },

    // Simulate device type changes
    simulateResize() {
        console.log("🔄 Simulating device type changes...");
        console.log(
            "💡 Resize your browser window to trigger automatic device switching:"
        );
        console.log("- ≤768px width: Mobile");
        console.log("- 769-1366px width: Laptop");
        console.log("- ≥1367px width: Bigscreen");
        console.log("");
        console.log(
            "📝 Watch the browser console and header for switching indicators!"
        );

        // Start monitoring
        window.deviceConfig.service.startDeviceMonitoring((newDeviceType) => {
            console.log(`🚨 DEVICE CHANGED TO: ${newDeviceType}`);
        });
    },

    // Check what device configs exist for current user
    async checkUserDeviceConfigs() {
        try {
            console.log("📋 Checking user device configurations...");

            const backendUrl =
                import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
            const authToken = await window.deviceConfig.service.getAuthToken();

            const response = await fetch(
                `${backendUrl}/api/cosmos/device-configs`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.ok) {
                const configs = await response.json();
                console.log("✅ User device configurations:", configs);

                console.log("📊 Summary:");
                console.log(`- Total configs: ${configs.total}`);
                console.log(`- User ID: ${configs.userId}`);
                console.log(
                    `- Existing types: ${configs.existingTypes.join(", ")}`
                );
                console.log(
                    `- Missing types: ${configs.missingTypes.join(", ")}`
                );

                return configs;
            } else {
                const error = await response.text();
                console.error("❌ Failed to load device configs:", error);
                return null;
            }
        } catch (error) {
            console.error("💥 Error checking device configs:", error);
            return null;
        }
    },

    // Help function
    help() {
        console.log("🆘 Device Switching Test Commands:");
        console.log("");
        console.log("📱 window.testDeviceSwitching.checkCurrentDevice()");
        console.log("   - Check current device type detection");
        console.log("");
        console.log("🧪 window.testDeviceSwitching.testDeviceConfigAPI()");
        console.log("   - Test device config API for current device");
        console.log("");
        console.log('🎯 window.testDeviceSwitching.testDeviceType("laptop")');
        console.log(
            "   - Test specific device type config (mobile/laptop/bigscreen)"
        );
        console.log("");
        console.log("📋 window.testDeviceSwitching.checkUserDeviceConfigs()");
        console.log("   - List all device configs for current user");
        console.log("");
        console.log("🔄 window.testDeviceSwitching.simulateResize()");
        console.log(
            "   - Start monitoring and instructions for resize testing"
        );
        console.log("");
        console.log("🆘 window.testDeviceSwitching.help()");
        console.log("   - Show this help message");
    },
};

// Show help on load
console.log("");
console.log("🚀 Device Switching Integration Ready!");
console.log("📖 Run window.testDeviceSwitching.help() for available commands");
console.log("");

// Quick status check
window.testDeviceSwitching.checkCurrentDevice();
