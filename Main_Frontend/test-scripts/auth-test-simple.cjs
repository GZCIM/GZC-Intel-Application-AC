/**
 * Simple Authentication Flow Test
 * Tests the authentication flow and captures all errors
 */

const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');

const APP_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';
const APP_INSIGHTS_ID = 'db6b4c43-b80a-43b4-89eb-f617082eb000';

async function runAuthTest() {
    let browser = null;
    const testResults = [];
    
    function log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, message };
        testResults.push(logEntry);
        
        const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
        console.log(`${prefix} [${timestamp}] ${message}`);
        
        return logEntry;
    }
    
    async function getAppInsightsEvents() {
        try {
            log('Querying Application Insights for recent events...');
            const query = `customEvents | where timestamp > ago(5m) | order by timestamp desc | take 20`;
            const result = execSync(
                `az monitor app-insights query --app ${APP_INSIGHTS_ID} --analytics-query "${query}" --query "tables[0].rows" -o json`,
                { encoding: 'utf-8', timeout: 30000 }
            );
            
            const events = JSON.parse(result);
            log(`Found ${events.length} recent Application Insights events`);
            return events;
        } catch (error) {
            log(`Failed to query Application Insights: ${error.message}`, 'error');
            return [];
        }
    }
    
    try {
        log('🚀 Starting Authentication Flow Test');
        
        // Initialize browser
        log('Launching browser...');
        browser = await puppeteer.launch({
            headless: false,  // Keep visible to see what happens
            slowMo: 2000,     // Slow down for debugging
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Capture all console messages
        page.on('console', msg => {
            const level = msg.type() === 'error' ? 'error' : 'info';
            log(`[Browser Console] ${msg.text()}`, level);
        });
        
        // Capture page errors
        page.on('pageerror', error => {
            log(`[Page Error] ${error.message}`, 'error');
        });
        
        // Capture network failures
        page.on('requestfailed', request => {
            log(`[Network Failed] ${request.url()} - ${request.failure()?.errorText}`, 'error');
        });
        
        log(`Loading application: ${APP_URL}`);
        
        // Navigate to application
        const response = await page.goto(APP_URL, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });
        
        if (!response || response.status() !== 200) {
            throw new Error(`Failed to load app: HTTP ${response?.status()}`);
        }
        
        log(`✅ Application loaded successfully (HTTP ${response.status()})`);
        
        // Take screenshot of initial state
        await page.screenshot({ 
            path: '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/app-loaded.png',
            fullPage: true 
        });
        log('Screenshot saved: app-loaded.png');
        
        // Wait for page to stabilize
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Look for login button
        log('Searching for authentication elements...');
        
        const buttons = await page.$$eval('button', buttons => 
            buttons.map(btn => ({
                text: btn.textContent?.trim(),
                id: btn.id,
                className: btn.className,
                visible: !btn.hidden && btn.offsetParent !== null,
                disabled: btn.disabled
            }))
        );
        
        log(`Found ${buttons.length} buttons on page:`);
        buttons.forEach((btn, i) => {
            log(`  [${i}] "${btn.text}" (id: ${btn.id}, visible: ${btn.visible}, disabled: ${btn.disabled})`);
        });
        
        // Look for login button specifically
        const loginButton = buttons.find(btn => 
            btn.text?.toLowerCase().includes('login') || 
            btn.text?.toLowerCase().includes('sign in') ||
            btn.text?.toLowerCase().includes('log in')
        );
        
        if (loginButton) {
            log(`✅ Found login button: "${loginButton.text}"`);
            
            // Try to click the login button
            log('Attempting to click login button...');
            
            try {
                await page.click(`button:contains("${loginButton.text}")`);
                log('✅ Login button clicked successfully');
            } catch (clickError) {
                // Try alternative selector
                log(`Click by text failed: ${clickError.message}`, 'warn');
                log('Trying alternative click method...');
                
                const buttonElements = await page.$$('button');
                for (let i = 0; i < buttonElements.length; i++) {
                    const text = await buttonElements[i].evaluate(btn => btn.textContent?.trim());
                    if (text?.toLowerCase().includes('login')) {
                        await buttonElements[i].click();
                        log(`✅ Clicked login button via element index ${i}`);
                        break;
                    }
                }
            }
            
            // Wait and observe what happens after click
            log('Waiting for authentication response...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Take screenshot after login attempt
            await page.screenshot({ 
                path: '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/after-login-click.png',
                fullPage: true 
            });
            log('Screenshot saved: after-login-click.png');
            
        } else {
            log('❌ No login button found on page', 'error');
            
            // Take screenshot of current state
            await page.screenshot({ 
                path: '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/no-login-button.png',
                fullPage: true 
            });
        }
        
        // Check for MSAL configuration
        log('Checking MSAL configuration...');
        const msalCheck = await page.evaluate(() => {
            return {
                msalInstance: typeof window.msalInstance !== 'undefined',
                accounts: window.msalInstance ? window.msalInstance.getAllAccounts()?.length || 0 : 0,
                clientId: window.msalInstance?.getConfiguration?.()?.auth?.clientId || 'unknown'
            };
        });
        
        log(`MSAL Status: ${JSON.stringify(msalCheck, null, 2)}`);
        
        // Check backend connectivity
        log('Testing backend connectivity...');
        const backendCheck = await page.evaluate(async () => {
            try {
                const healthResponse = await fetch('/health');
                const healthData = await healthResponse.json();
                
                const memoryResponse = await fetch('/api/preferences/memory-status');
                const memoryData = await memoryResponse.json();
                
                return {
                    health: { status: healthResponse.status, data: healthData },
                    memory: { status: memoryResponse.status, data: memoryData }
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        log(`Backend Status: ${JSON.stringify(backendCheck, null, 2)}`);
        
        // Get Application Insights events
        log('Retrieving Application Insights events...');
        const appInsightsEvents = await getAppInsightsEvents();
        
        // Generate final report
        const report = {
            testRun: {
                timestamp: new Date().toISOString(),
                url: APP_URL,
                duration: '~60 seconds'
            },
            findings: {
                loginButtonFound: !!loginButton,
                loginButton: loginButton || null,
                allButtons: buttons,
                msalConfiguration: msalCheck,
                backendStatus: backendCheck
            },
            logs: testResults,
            appInsightsEvents: appInsightsEvents,
            screenshots: [
                'app-loaded.png',
                loginButton ? 'after-login-click.png' : 'no-login-button.png'
            ]
        };
        
        // Save report
        const reportPath = '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/auth-test-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log(`✅ Test report saved: ${reportPath}`);
        
        log('🎉 Test completed successfully');
        
        // Print summary
        console.log('\\n📊 TEST SUMMARY:');
        console.log(`Login Button Found: ${!!loginButton ? '✅' : '❌'}`);
        console.log(`MSAL Configured: ${msalCheck.msalInstance ? '✅' : '❌'}`);
        console.log(`Backend Healthy: ${backendCheck.health?.status === 200 ? '✅' : '❌'}`);
        console.log(`Memory System: ${backendCheck.memory?.data?.table_exists ? '✅' : '❌'}`);
        console.log(`App Insights Events: ${appInsightsEvents.length}`);
        console.log(`Total Log Entries: ${testResults.length}`);
        
        const errors = testResults.filter(r => r.level === 'error');
        if (errors.length > 0) {
            console.log('\\n❌ ERRORS DETECTED:');
            errors.forEach(error => console.log(`  - ${error.message}`));
        }
        
        return report;
        
    } catch (error) {
        log(`❌ Test execution failed: ${error.message}`, 'error');
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            log('Browser closed');
        }
    }
}

// Execute test
runAuthTest()
    .then(() => {
        console.log('\\n✅ Authentication test completed successfully');
    })
    .catch(error => {
        console.error('\\n💥 Test failed:', error.message);
        process.exit(1);
    });