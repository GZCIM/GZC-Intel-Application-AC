/**
 * Cleanup User Configuration Script
 *
 * This script will:
 * 1. Clean up excessive version history from your Cosmos DB config
 * 2. Ensure proper user ID consistency between browsers
 * 3. Sync configuration properly between Chrome and Edge
 */

console.log("🧹 Starting User Configuration Cleanup...");

// Function to clean up user configuration
async function cleanupUserConfig() {
    try {
        console.log("📞 Calling cleanup endpoint...");

        // Get the current backend URL from environment
        const backendUrl =
            import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
        const cleanupUrl = `${backendUrl}/api/cosmos/cleanup`;

        // Get auth token (assuming you're authenticated)
        const response = await fetch(cleanupUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getAuthToken()}`, // You'll need to implement this
            },
        });

        if (response.ok) {
            const result = await response.json();
            console.log("✅ Cleanup successful:", result);

            // Clear local storage to force fresh sync
            console.log("🔄 Clearing local storage...");
            Object.keys(localStorage).forEach((key) => {
                if (
                    key.includes("gzc") ||
                    key.includes("msal") ||
                    key.includes("user")
                ) {
                    localStorage.removeItem(key);
                }
            });

            console.log("🎉 Configuration cleaned! Please refresh the page.");
            return result;
        } else {
            const error = await response.text();
            console.error("❌ Cleanup failed:", error);
            throw new Error(error);
        }
    } catch (error) {
        console.error("💥 Error during cleanup:", error);
        throw error;
    }
}

// Function to get auth token (you'll need to implement this based on your auth system)
function getAuthToken() {
    // This is a placeholder - you'll need to get the actual token from your auth system
    // For MSAL, you might do something like:
    // return msal.acquireTokenSilent({scopes: ['User.Read']}).then(response => response.accessToken);

    console.warn(
        "⚠️ getAuthToken() needs to be implemented for your auth system"
    );
    return "placeholder-token";
}

// Function to check user configuration status
async function checkConfigStatus() {
    try {
        const backendUrl =
            import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
        const configUrl = `${backendUrl}/api/cosmos/config`;

        const response = await fetch(configUrl, {
            headers: {
                Authorization: `Bearer ${getAuthToken()}`,
            },
        });

        if (response.ok) {
            const config = await response.json();
            console.log("📊 Current config status:");
            console.log(`- Config Name: ${config.name || "Unnamed"}`);
            console.log(`- User ID: ${config.userId}`);
            console.log(`- Tabs: ${config.tabs?.length || 0}`);
            console.log(
                `- Version history entries: ${
                    config.previousVersions?.length || 0
                }`
            );
            console.log(`- Last updated: ${config.updatedAt}`);

            return config;
        } else {
            console.error("❌ Failed to fetch config status");
        }
    } catch (error) {
        console.error("💥 Error checking config status:", error);
    }
}

// Export functions for browser console use
window.configCleanup = {
    cleanup: cleanupUserConfig,
    status: checkConfigStatus,

    // Quick cleanup function
    cleanupNow: async () => {
        console.log("🚀 Running immediate cleanup...");
        try {
            await checkConfigStatus();
            await cleanupUserConfig();
            console.log(
                "✨ Cleanup complete! Refresh the page to see changes."
            );
        } catch (error) {
            console.error("💥 Cleanup failed:", error);
        }
    },
};

console.log("📋 Cleanup script loaded. Available commands:");
console.log("- window.configCleanup.status() - Check current config status");
console.log("- window.configCleanup.cleanup() - Run cleanup");
console.log(
    "- window.configCleanup.cleanupNow() - Quick cleanup + status check"
);
