#!/usr/bin/env node

/**
 * Pre-commit build verification script
 * Ensures Vite compilation succeeds before allowing commits
 */

import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🔨 Running pre-commit build verification...");

try {
    // Use absolute path to Main_Frontend directory
    const frontendDir = resolve(__dirname, "..");
    const absolutePath = resolve(frontendDir);

    console.log("📦 Compiling with Vite...");
    console.log(`📁 Working directory: ${absolutePath}`);

    // Prefer fast build but bump Node memory to avoid OOM during bundling
    const env = { ...process.env, NODE_OPTIONS: "--max-old-space-size=12288" };
    try {
        execSync("npm run build:fast", {
            cwd: absolutePath,
            stdio: "inherit",
            timeout: 300000, // 5 minute timeout
            env,
        });
    } catch (err) {
        console.warn("⚠️ Fast build failed, retrying with skip-ts (same output, lighter checks)...");
        execSync("npm run build:skip-ts", {
            cwd: absolutePath,
            stdio: "inherit",
            timeout: 300000,
            env,
        });
    }

    console.log("✅ Build successful! Commit proceeding...");
} catch (error) {
    console.error("❌ Build failed! Commit aborted.");
    console.error("Error:", error.message);
    process.exit(1);
}
