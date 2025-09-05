import puppeteer from "puppeteer";

(async () => {
    console.log("🧪 Testing multiple component addition in production...");

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
    });
    const page = await browser.newPage();

    try {
        // Go to production
        console.log("📍 Loading production app...");
        await page.goto(
            "https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io"
        );
        await page.waitForSelector(
            '[data-testid="app-loaded"], .analytics-dashboard, .gzc-intel-app',
            { timeout: 10000 }
        );
        console.log("✅ App loaded");

        // Unlock editing via Tools menu
        console.log("🛠️ Unlocking editing via Tools...");
        await page.click('button:has-text("Tools")');
        // Click Unlock/Lock toggle; handle both states
        const unlockSelector = "text=Unlock Editing, text=🔓 Unlock Editing";
        const lockSelector = "text=Lock Editing, text=🔒 Lock Editing";
        const toolsMenu = await page.$(
            'div[role="menu"], div[style*="position: absolute"]'
        );
        // Try clicking toggle regardless of current state
        const toggle =
            (await page.$(unlockSelector)) || (await page.$(lockSelector));
        if (toggle) {
            await toggle.click();
            console.log("✅ Toggled editing state");
        } else {
            console.log(
                "⚠️ Could not find editing toggle; continuing (may already be unlocked)."
            );
        }

        // Wait for Analytics tab to be available
        await page.waitForSelector('button:has-text("Analytics")', {
            timeout: 5000,
        });

        // Right-click on Analytics tab to open context menu
        console.log("🖱️ Right-clicking Analytics tab...");
        const analyticsTab = await page
            .locator('button:has-text("Analytics")')
            .first();
        await analyticsTab.click({ button: "right" });

        // Click "Add Component" from tab context menu (now driven by unlock)
        await page.waitForSelector("text=Add Component", { timeout: 3000 });
        await page.click("text=Add Component");
        console.log("✅ Add Component triggered");

        // Wait a moment for component portal to open
        await page.waitForSelector("text=Component Library", { timeout: 3000 });

        // Function to add a component (assumes portal is open)
        const addComponent = async (componentName, attempt) => {
            console.log(`\n🔄 Attempt ${attempt}: Adding ${componentName}...`);

            // Click the specific component
            await page.waitForSelector(`button:has-text("${componentName}")`, {
                timeout: 3000,
            });
            await page.click(`button:has-text("${componentName}")`);
            console.log(`✅ Selected ${componentName}`);

            // Wait for portal to close and component to appear
            await page.waitForTimeout(2000);

            // Count components on canvas
            const components = await page.$$(".react-grid-item");
            console.log(`📊 Components on canvas: ${components.length}`);

            return components.length;
        };

        // Test adding first component
        const firstCount = await addComponent("Portfolio Manager", 1);

        if (!firstCount || firstCount === 0) {
            console.log("❌ First component failed to add");
            return;
        }

        // Open Tools → Add Component again or use context menu
        console.log("🧩 Opening Add Component again...");
        await page.click('button:has-text("Tools")');
        const toolsAdd = await page.$("text=Add Component");
        if (toolsAdd) {
            await toolsAdd.click();
            await page.waitForSelector("text=Component Library", {
                timeout: 3000,
            });
        } else {
            await analyticsTab.click({ button: "right" });
            await page.click("text=Add Component");
            await page.waitForSelector("text=Component Library", {
                timeout: 3000,
            });
        }

        // Test adding second component
        const secondCount = await addComponent("GZC Vol Surface", 2);

        console.log(`\n📊 Final Results:`);
        console.log(`   First component add: ${firstCount} total components`);
        console.log(`   Second component add: ${secondCount} total components`);

        if (secondCount > firstCount) {
            console.log("✅ Multiple components working correctly!");
        } else {
            console.log(
                "❌ Multiple components NOT working - investigating..."
            );

            // Check for any error messages
            const errors = await page.$$(
                '.error, [class*="error"], [data-error]'
            );
            if (errors.length > 0) {
                console.log(`Found ${errors.length} error elements`);
            }

            // Check console logs
            const logs = await page.evaluate(() => {
                return window.console._logs || "No console logs captured";
            });
            console.log("Console logs:", logs);
        }
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    } finally {
        console.log(
            "\n⏳ Keeping browser open for 30 seconds for manual inspection..."
        );
        await page.waitForTimeout(30000);
        await browser.close();
    }
})();
