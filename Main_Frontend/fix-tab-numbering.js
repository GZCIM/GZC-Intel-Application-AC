/**
 * Fix Tab Numbering Issue
 * This script addresses the issue where the browser shows Tab 1-26 despite user config having empty tabs array
 */

console.log("🔧 Starting Tab Numbering Fix...");

// Function to clear all tab-related storage
function clearTabStorage() {
    const keys = Object.keys(localStorage);
    const tabKeys = keys.filter(
        (key) =>
            key.includes("tab") ||
            key.includes("layout") ||
            key.includes("gzc-intel")
    );

    console.log("📋 Found tab-related localStorage keys:", tabKeys);

    tabKeys.forEach((key) => {
        const value = localStorage.getItem(key);
        console.log(`🗑️ Removing: ${key} = ${value?.slice(0, 100)}...`);
        localStorage.removeItem(key);
    });
}

// Function to force reload from Cosmos DB
async function forceReloadFromCosmosDB() {
    try {
        console.log("🌐 Forcing reload from Cosmos DB...");

        // Clear local storage first
        clearTabStorage();

        // Get the current user configuration directly
        const response = await fetch("/api/config/load", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            const config = await response.json();
            console.log("✅ Current Cosmos DB config:", config);
            console.log(`📊 Tabs in config: ${config.tabs?.length || 0}`);

            if (config.tabs && config.tabs.length > 0) {
                console.log("📝 Found tabs in config:");
                config.tabs.forEach((tab, i) => {
                    console.log(
                        `  ${i + 1}. ${tab.name || "Unnamed"} (${tab.id})`
                    );
                });
            } else {
                console.log(
                    "✨ Config has empty tabs array - this is correct!"
                );
            }

            return config;
        } else {
            console.error(
                "❌ Failed to load config from Cosmos DB:",
                response.statusText
            );
            return null;
        }
    } catch (error) {
        console.error("❌ Error loading from Cosmos DB:", error);
        return null;
    }
}

// Function to verify tab state in React components
function checkReactTabState() {
    console.log("🔍 Checking React component state...");

    // Check if TabLayoutProvider state is accessible
    if (window.React) {
        console.log("⚛️ React is available");
        // In a real app, we'd need to access the React DevTools or component state
        // For now, we'll check the DOM for actual tab elements
    }

    // Check DOM for tab elements
    const tabElements = document.querySelectorAll(
        '[data-tab-id], .tab, [class*="tab"]'
    );
    console.log(`🏷️ Found ${tabElements.length} tab-like DOM elements:`);

    tabElements.forEach((el, i) => {
        const tabId =
            el.getAttribute("data-tab-id") ||
            el.getAttribute("id") ||
            `element-${i}`;
        const tabText = el.textContent?.trim() || "No text";
        console.log(`  ${i + 1}. ${tabId}: "${tabText}"`);
    });
}

// Main fix function
async function fixTabNumbering() {
    console.log("🚀 Executing Tab Numbering Fix");

    // Step 1: Check current localStorage state
    console.log("\n📋 Step 1: Current localStorage state");
    const tabKeys = Object.keys(localStorage).filter(
        (key) => key.includes("tab") || key.includes("layout")
    );
    tabKeys.forEach((key) => {
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${value?.slice(0, 200)}...`);
    });

    // Step 2: Check DOM state
    console.log("\n🔍 Step 2: Current DOM state");
    checkReactTabState();

    // Step 3: Load fresh config from Cosmos DB
    console.log("\n🌐 Step 3: Loading fresh config from Cosmos DB");
    const freshConfig = await forceReloadFromCosmosDB();

    // Step 4: Clear and reload if needed
    if (freshConfig && (!freshConfig.tabs || freshConfig.tabs.length === 0)) {
        console.log("\n🧹 Step 4: Clearing stale tab data and forcing reload");
        clearTabStorage();

        // Force reload the page to reinitialize with clean state
        console.log("🔄 Reloading page to apply changes...");
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } else if (freshConfig && freshConfig.tabs && freshConfig.tabs.length > 0) {
        console.log(
            "\n⚠️ Step 4: Config actually has tabs - this may be expected"
        );
        console.log(
            "   If you want only 1 tab, you may need to clear the config in Cosmos DB"
        );
    }
}

// Execute the fix
fixTabNumbering().catch((error) => {
    console.error("❌ Tab numbering fix failed:", error);
});

// Also provide manual functions for debugging
window.debugTabs = {
    clearStorage: clearTabStorage,
    reloadConfig: forceReloadFromCosmosDB,
    checkDOM: checkReactTabState,
    fixNow: fixTabNumbering,
};

console.log("🛠️ Debug functions available: window.debugTabs");
console.log("   - window.debugTabs.clearStorage() - Clear all tab storage");
console.log("   - window.debugTabs.reloadConfig() - Reload from Cosmos DB");
console.log("   - window.debugTabs.checkDOM() - Check DOM state");
console.log("   - window.debugTabs.fixNow() - Run full fix");
