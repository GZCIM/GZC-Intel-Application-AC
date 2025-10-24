#!/usr/bin/env node

/**
 * Build and Commit Script
 * Automatically builds the project and commits changes
 * Usage: node scripts/build-and-commit.js "commit message"
 */

const { execSync } = require("child_process");
const path = require("path");

const commitMessage = process.argv[2];

if (!commitMessage) {
    console.error("❌ Please provide a commit message");
    console.error(
        'Usage: node scripts/build-and-commit.js "your commit message"'
    );
    process.exit(1);
}

console.log("🚀 Starting build and commit process...");

try {
    // Change to Main_Frontend directory
    const frontendDir = path.join(__dirname, "..");
    process.chdir(frontendDir);

    console.log("📦 Step 1: Building with Vite...");
    execSync("npm run build:fast", {
        stdio: "inherit",
        timeout: 300000, // 5 minute timeout
    });

    console.log("✅ Build successful!");

    // Go back to project root
    process.chdir("..");

    console.log("📝 Step 2: Adding changes to git...");
    execSync("git add .", { stdio: "inherit" });

    console.log("💾 Step 3: Committing changes...");
    execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });

    console.log("🚀 Step 4: Pushing to remote...");
    execSync("git push origin main", { stdio: "inherit" });

    console.log("🎉 Build and deployment complete!");
    console.log("🌐 Your changes are now deploying to Azure...");
} catch (error) {
    console.error("❌ Process failed:", error.message);
    process.exit(1);
}
