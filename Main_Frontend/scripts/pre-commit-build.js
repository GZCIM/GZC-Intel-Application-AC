#!/usr/bin/env node

/**
 * Pre-commit build verification script
 * Ensures Vite compilation succeeds before allowing commits
 */

const { execSync } = require("child_process");
const path = require("path");

console.log("🔨 Running pre-commit build verification...");

try {
    // Change to Main_Frontend directory
    const frontendDir = path.join(__dirname, "..");
    process.chdir(frontendDir);

    console.log("📦 Compiling with Vite...");

    // Run the fast build (without TypeScript check for speed)
    execSync("npm run build:fast", {
        stdio: "inherit",
        timeout: 300000, // 5 minute timeout
    });

    console.log("✅ Build successful! Proceeding with commit...");
} catch (error) {
    console.error("❌ Build failed! Commit aborted.");
    console.error("Error:", error.message);
    process.exit(1);
}
