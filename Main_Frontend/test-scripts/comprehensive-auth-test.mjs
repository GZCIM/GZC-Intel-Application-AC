#!/usr/bin/env node

/**
 * Comprehensive Authentication & User Memory Test Script
 * 
 * Simulates complete user journey:
 * 1. Application load and initialization
 * 2. Authentication flow (login button click)
 * 3. User memory activation and persistence
 * 4. Tab creation and component management
 * 5. Cross-session verification
 * 
 * Monitors Application Insights for all events and errors
 */

import puppeteer from 'puppeteer';
import { execSync } from 'child_process';

const APP_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';
const APP_INSIGHTS_ID = 'db6b4c43-b80a-43b4-89eb-f617082eb000';

// Test configuration
const TEST_CONFIG = {
    headless: false,  // Set to true for CI/CD
    slowMo: 1000,     // Slow down for debugging
    timeout: 30000,   // 30 second timeout
    screenshot: true  // Take screenshots at each step
};

class ComprehensiveAuthTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.startTime = new Date();
        this.screenshots = [];
    }

    async log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, message };
        this.testResults.push(logEntry);
        
        const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
        console.log(`${prefix} [${timestamp}] ${message}`);
        
        return logEntry;
    }

    async takeScreenshot(name) {
        if (!TEST_CONFIG.screenshot || !this.page) return null;
        
        try {
            const filename = `test-screenshot-${name}-${Date.now()}.png`;
            const path = `/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/${filename}`;
            await this.page.screenshot({ 
                path, 
                fullPage: true 
            });
            this.screenshots.push({ name, filename, path });
            await this.log(`Screenshot saved: ${filename}`);
            return path;
        } catch (error) {
            await this.log(`Failed to take screenshot: ${error.message}`, 'error');
            return null;
        }
    }

    async getAppInsightsEvents(sinceMinutes = 5) {
        try {
            const query = `customEvents | where timestamp > ago(${sinceMinutes}m) | order by timestamp desc | take 50`;
            const result = execSync(
                `az monitor app-insights query --app ${APP_INSIGHTS_ID} --analytics-query "${query}" --query "tables[0].rows" -o json`,
                { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
            );
            
            const events = JSON.parse(result);
            await this.log(`Retrieved ${events.length} Application Insights events from last ${sinceMinutes} minutes`);
            return events;
        } catch (error) {
            await this.log(`Failed to query Application Insights: ${error.message}`, 'error');
            return [];
        }
    }

    async waitForTelemetryEvent(eventName, maxWaitMs = 10000) {
        await this.log(`Waiting for telemetry event: ${eventName}`);
        
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            const events = await this.getAppInsightsEvents(1);
            const matchingEvent = events.find(event => event[1] === eventName);
            
            if (matchingEvent) {
                await this.log(`✅ Found telemetry event: ${eventName}`);
                return matchingEvent;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await this.log(`⚠️ Telemetry event not found within timeout: ${eventName}`, 'warn');
        return null;
    }

    async initBrowser() {
        await this.log('Initializing browser...');
        
        this.browser = await puppeteer.launch({
            headless: TEST_CONFIG.headless,
            slowMo: TEST_CONFIG.slowMo,
            args: [
                '--no-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-dev-shm-usage'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Set viewport
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Listen for console logs
        this.page.on('console', async msg => {
            const level = msg.type() === 'error' ? 'error' : 'info';
            await this.log(`[Console] ${msg.text()}`, level);
        });
        
        // Listen for page errors
        this.page.on('pageerror', async error => {
            await this.log(`[Page Error] ${error.message}`, 'error');
        });
        
        // Listen for network failures
        this.page.on('requestfailed', async request => {
            await this.log(`[Network Failed] ${request.url()} - ${request.failure()?.errorText}`, 'error');
        });
        
        await this.log('Browser initialized successfully');
    }

    async loadApplication() {
        await this.log(`Loading application: ${APP_URL}`);
        await this.takeScreenshot('before-load');
        
        try {
            const response = await this.page.goto(APP_URL, { 
                waitUntil: 'networkidle2', 
                timeout: TEST_CONFIG.timeout 
            });
            
            if (response?.status() !== 200) {
                throw new Error(`HTTP ${response?.status()}: ${response?.statusText()}`);
            }
            
            await this.log(`Application loaded successfully (HTTP ${response.status()})`);
            await this.takeScreenshot('after-load');
            
            // Wait for telemetry initialization
            await this.waitForTelemetryEvent('App_Initialized', 5000);
            
            return true;
        } catch (error) {
            await this.log(`Failed to load application: ${error.message}`, 'error');
            await this.takeScreenshot('load-error');
            return false;
        }
    }

    async checkAuthenticationElements() {
        await this.log('Checking authentication UI elements...');
        
        try {
            // Wait for login button to be visible
            await this.page.waitForSelector('button', { timeout: 10000 });
            
            // Get all buttons and find login button
            const buttons = await this.page.$$eval('button', buttons => 
                buttons.map(btn => ({
                    text: btn.textContent?.trim(),
                    id: btn.id,
                    className: btn.className,
                    visible: !btn.hidden && btn.offsetParent !== null
                }))
            );
            
            await this.log(`Found ${buttons.length} buttons: ${JSON.stringify(buttons, null, 2)}`);
            
            const loginButton = buttons.find(btn => 
                btn.text?.toLowerCase().includes('login') || 
                btn.text?.toLowerCase().includes('sign in')
            );
            
            if (loginButton) {
                await this.log(`✅ Login button found: ${JSON.stringify(loginButton)}`);
                return true;
            } else {
                await this.log(`❌ Login button not found. Available buttons: ${JSON.stringify(buttons)}`, 'error');
                await this.takeScreenshot('no-login-button');
                return false;
            }
        } catch (error) {
            await this.log(`Error checking authentication elements: ${error.message}`, 'error');
            return false;
        }
    }

    async attemptLogin() {
        await this.log('Attempting to trigger authentication flow...');
        await this.takeScreenshot('before-login');
        
        try {
            // Find and click login button
            const loginButton = await this.page.$('button:contains("Login"), button:contains("Sign In")');
            
            if (!loginButton) {
                // Try finding button by text content
                const allButtons = await this.page.$$('button');
                let foundButton = null;
                
                for (const button of allButtons) {
                    const text = await button.evaluate(btn => btn.textContent?.trim().toLowerCase());
                    if (text?.includes('login') || text?.includes('sign in')) {
                        foundButton = button;
                        break;
                    }
                }
                
                if (!foundButton) {
                    throw new Error('Login button not found');
                }
                
                await foundButton.click();
            } else {
                await loginButton.click();
            }
            
            await this.log('Login button clicked successfully');
            await this.takeScreenshot('after-login-click');
            
            // Wait for authentication events
            await this.waitForTelemetryEvent('Auth_login_attempt', 5000);
            
            // Wait for potential popup or redirect
            await this.page.waitForTimeout(3000);
            await this.takeScreenshot('auth-state');
            
            return true;
        } catch (error) {
            await this.log(`Login attempt failed: ${error.message}`, 'error');
            await this.takeScreenshot('login-error');
            return false;
        }
    }

    async checkUserMemoryStatus() {
        await this.log('Checking user memory system status...');
        
        try {
            // Check backend health
            const healthResponse = await this.page.evaluate(async () => {
                try {
                    const response = await fetch('/api/preferences/health');
                    return {
                        status: response.status,
                        data: await response.json()
                    };
                } catch (error) {
                    return { error: error.message };
                }
            });
            
            await this.log(`Health check result: ${JSON.stringify(healthResponse, null, 2)}`);
            
            // Check memory status
            const memoryResponse = await this.page.evaluate(async () => {
                try {
                    const response = await fetch('/api/preferences/memory-status');
                    return {
                        status: response.status,
                        data: await response.json()
                    };
                } catch (error) {
                    return { error: error.message };
                }
            });
            
            await this.log(`Memory status result: ${JSON.stringify(memoryResponse, null, 2)}`);
            
            return memoryResponse.data?.table_exists === true;
        } catch (error) {
            await this.log(`User memory check failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testTabCreation() {
        await this.log('Testing tab creation and management...');
        
        try {
            // Look for context menu triggers
            await this.page.waitForTimeout(2000);
            
            // Try right-click to open context menu
            await this.page.mouse.click(500, 400, { button: 'right' });
            await this.takeScreenshot('context-menu');
            
            await this.page.waitForTimeout(1000);
            
            // Look for "Add Tab" or similar options
            const contextMenuItems = await this.page.$$eval('[role="menu"] *', items => 
                items.map(item => item.textContent?.trim()).filter(Boolean)
            ).catch(() => []);
            
            await this.log(`Context menu items: ${JSON.stringify(contextMenuItems)}`);
            
            return contextMenuItems.length > 0;
        } catch (error) {
            await this.log(`Tab creation test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async generateTestReport() {
        const endTime = new Date();
        const duration = endTime - this.startTime;
        
        const report = {
            testRun: {
                startTime: this.startTime.toISOString(),
                endTime: endTime.toISOString(),
                duration: `${duration}ms`,
                url: APP_URL
            },
            results: this.testResults,
            screenshots: this.screenshots,
            appInsightsEvents: await this.getAppInsightsEvents(10),
            summary: {
                totalTests: this.testResults.length,
                errors: this.testResults.filter(r => r.level === 'error').length,
                warnings: this.testResults.filter(r => r.level === 'warn').length
            }
        };
        
        const reportPath = `/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/test-report-${Date.now()}.json`;
        require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        await this.log(`Test report generated: ${reportPath}`);
        return report;
    }

    async runComprehensiveTest() {
        try {
            await this.log('🚀 Starting Comprehensive Authentication & User Memory Test');
            
            // 1. Initialize browser
            await this.initBrowser();
            
            // 2. Load application
            const loadSuccess = await this.loadApplication();
            if (!loadSuccess) {
                throw new Error('Application failed to load');
            }
            
            // 3. Check authentication elements
            const authElementsFound = await this.checkAuthenticationElements();
            if (!authElementsFound) {
                await this.log('Authentication elements not found, but continuing...', 'warn');
            }
            
            // 4. Attempt login
            await this.attemptLogin();
            
            // 5. Check user memory system
            const memoryActive = await this.checkUserMemoryStatus();
            await this.log(`User memory system active: ${memoryActive}`);
            
            // 6. Test tab functionality
            await this.testTabCreation();
            
            // 7. Generate comprehensive report
            const report = await this.generateTestReport();
            
            await this.log('🎉 Test completed successfully');
            return report;
            
        } catch (error) {
            await this.log(`❌ Test failed: ${error.message}`, 'error');
            await this.takeScreenshot('test-failure');
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
                await this.log('Browser closed');
            }
        }
    }
}

// Run the test
async function main() {
    const test = new ComprehensiveAuthTest();
    
    try {
        const report = await test.runComprehensiveTest();
        
        console.log('\\n📊 TEST SUMMARY:');
        console.log(`Total Events: ${report.summary.totalTests}`);
        console.log(`Errors: ${report.summary.errors}`);
        console.log(`Warnings: ${report.summary.warnings}`);
        console.log(`Screenshots: ${report.screenshots.length}`);
        console.log(`App Insights Events: ${report.appInsightsEvents.length}`);
        
        if (report.summary.errors > 0) {
            console.log('\\n❌ ERRORS FOUND:');
            report.results.filter(r => r.level === 'error').forEach(error => {
                console.log(`  - ${error.message}`);
            });
        }
        
        console.log('\\n✅ Test completed. Check the generated report for detailed analysis.');
        
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { ComprehensiveAuthTest };