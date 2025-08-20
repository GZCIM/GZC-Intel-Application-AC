/**
 * Debug script to test the tab loading behavior during login
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const APP_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';
const DEBUG_LOG_FILE = '/Users/mikaeleage/GZC Intel Application AC/debug-logs/tab-login-debug.json';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function debugTabLoginFlow() {
    console.log('🚀 Starting GZC Intel Application tab login flow debug...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: [
            '--window-size=1600,1000',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });
    
    const page = await browser.newPage();
    
    // Debug data collector
    const debugData = {
        startTime: new Date().toISOString(),
        steps: []
    };
    
    // Step 1: Initial load - check tabs before login
    console.log('📋 Step 1: Loading application before login...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await sleep(3000);
    
    const beforeLoginTabs = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('nav button, [role="tab"]'));
        return tabs.map(tab => ({
            text: tab.textContent?.trim(),
            visible: tab.offsetParent !== null,
            className: tab.className,
            id: tab.id || 'no-id'
        }));
    });
    
    debugData.steps.push({
        step: '1-before-login',
        timestamp: new Date().toISOString(),
        tabs: beforeLoginTabs,
        tabCount: beforeLoginTabs.length
    });
    
    console.log('📋 Tabs before login:', beforeLoginTabs);
    
    // Step 2: Check authentication state
    const authState = await page.evaluate(() => {
        return {
            hasLoginModal: !!document.querySelector('[data-testid="login-modal"], .login-modal, [class*="login"]'),
            hasMsalInstance: !!(window as any).msalInstance,
            localStorageKeys: Object.keys(localStorage).filter(k => k.includes('msal') || k.includes('gzc') || k.includes('tab')),
            sessionStorageKeys: Object.keys(sessionStorage).filter(k => k.includes('msal') || k.includes('gzc') || k.includes('tab'))
        };
    });
    
    debugData.steps.push({
        step: '2-auth-state',
        timestamp: new Date().toISOString(),
        authState
    });
    
    console.log('🔐 Authentication state:', authState);
    
    // Step 3: Click login/sign-in button
    console.log('🔐 Step 3: Looking for login button...');
    
    const loginButtonFound = await page.evaluate(() => {
        // Look for various login button patterns
        const selectors = [
            'button:contains("Sign In")',
            'button:contains("Login")',
            'button[aria-label*="login"]',
            '.login-button',
            '[data-testid="login-button"]',
            'button:contains("Microsoft")'
        ];
        
        // Since :contains() is not standard, manually search
        const buttons = Array.from(document.querySelectorAll('button'));
        const loginButton = buttons.find(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('sign in') || 
                   text.includes('login') || 
                   text.includes('microsoft') ||
                   text.includes('authenticate') ||
                   btn.getAttribute('aria-label')?.includes('login');
        });
        
        if (loginButton) {
            loginButton.click();
            return { found: true, text: loginButton.textContent, className: loginButton.className };
        }
        return { found: false };
    });
    
    debugData.steps.push({
        step: '3-login-button',
        timestamp: new Date().toISOString(),
        loginButtonFound
    });
    
    console.log('🔐 Login button result:', loginButtonFound);
    
    if (loginButtonFound.found) {
        // Wait for potential redirect or popup
        console.log('⏳ Waiting for authentication process...');
        await sleep(5000);
        
        // Step 4: Check if we're in Microsoft auth flow
        const currentUrl = page.url();
        const isMicrosoftAuth = currentUrl.includes('login.microsoftonline.com') || 
                              currentUrl.includes('microsoftonline') ||
                              currentUrl.includes('oauth');
        
        debugData.steps.push({
            step: '4-auth-redirect',
            timestamp: new Date().toISOString(),
            currentUrl,
            isMicrosoftAuth
        });
        
        console.log('🌐 Current URL:', currentUrl);
        console.log('🔄 Microsoft auth detected:', isMicrosoftAuth);
        
        if (isMicrosoftAuth) {
            console.log('⚠️  Microsoft authentication required - manual intervention needed');
            console.log('📝 Please complete the authentication in the browser');
            console.log('⏳ Waiting 30 seconds for manual authentication...');
            
            // Wait for user to complete authentication
            let authCompleted = false;
            let attempts = 0;
            const maxAttempts = 30;
            
            while (!authCompleted && attempts < maxAttempts) {
                await sleep(1000);
                attempts++;
                
                try {
                    const url = page.url();
                    if (url.includes(APP_URL.replace('https://', '').replace('http://', ''))) {
                        authCompleted = true;
                        console.log('✅ Authentication completed, back to app');
                    }
                } catch (e) {
                    // Continue waiting
                }
            }
            
            if (!authCompleted) {
                console.log('⏰ Authentication timeout - proceeding with current state');
            }
        }
    }
    
    // Step 5: Check tabs after authentication
    console.log('📋 Step 5: Checking tabs after authentication...');
    await sleep(3000);
    
    const afterLoginTabs = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('nav button, [role="tab"]'));
        return tabs.map(tab => ({
            text: tab.textContent?.trim(),
            visible: tab.offsetParent !== null,
            className: tab.className,
            id: tab.id || 'no-id'
        }));
    });
    
    debugData.steps.push({
        step: '5-after-login',
        timestamp: new Date().toISOString(),
        tabs: afterLoginTabs,
        tabCount: afterLoginTabs.length
    });
    
    console.log('📋 Tabs after login:', afterLoginTabs);
    
    // Step 6: Check console logs and errors
    const consoleLogs = await page.evaluate(() => {
        // Try to get any console logs if available
        return (window as any).debugLogs || [];
    });
    
    const pageErrors = await page.evaluate(() => {
        const errors = Array.from(document.querySelectorAll('.error, [class*="error"]'));
        return errors.map(err => err.textContent?.substring(0, 200));
    });
    
    debugData.steps.push({
        step: '6-logs-errors',
        timestamp: new Date().toISOString(),
        consoleLogs: consoleLogs.slice(-10), // Last 10 logs
        pageErrors
    });
    
    // Step 7: Analyze the difference
    const tabComparison = {
        beforeLogin: beforeLoginTabs,
        afterLogin: afterLoginTabs,
        tabsChanged: beforeLoginTabs.length !== afterLoginTabs.length || 
                    JSON.stringify(beforeLoginTabs) !== JSON.stringify(afterLoginTabs),
        beforeText: beforeLoginTabs.map(t => t.text),
        afterText: afterLoginTabs.map(t => t.text)
    };
    
    debugData.steps.push({
        step: '7-comparison',
        timestamp: new Date().toISOString(),
        tabComparison
    });
    
    console.log('\n🔍 TAB ANALYSIS:');
    console.log('Before login tabs:', tabComparison.beforeText);
    console.log('After login tabs:', tabComparison.afterText);
    console.log('Tabs changed:', tabComparison.tabsChanged);
    
    // Step 8: Check memory/storage changes
    const storageAfter = await page.evaluate(() => {
        return {
            localStorageKeys: Object.keys(localStorage).filter(k => k.includes('msal') || k.includes('gzc') || k.includes('tab')),
            sessionStorageKeys: Object.keys(sessionStorage).filter(k => k.includes('msal') || k.includes('gzc') || k.includes('tab')),
            msalAccounts: (window as any).msalInstance ? (window as any).msalInstance.getAllAccounts().length : 0
        };
    });
    
    debugData.steps.push({
        step: '8-storage-after',
        timestamp: new Date().toISOString(),
        storageAfter
    });
    
    // Final summary
    debugData.endTime = new Date().toISOString();
    debugData.summary = {
        issue: tabComparison.tabsChanged ? 'TABS_CHANGED_AFTER_LOGIN' : 'NO_TAB_CHANGE_DETECTED',
        beforeLoginTabCount: beforeLoginTabs.length,
        afterLoginTabCount: afterLoginTabs.length,
        beforeLoginTabNames: tabComparison.beforeText,
        afterLoginTabNames: tabComparison.afterText,
        potentialCause: tabComparison.tabsChanged ? 
            'Authentication state change triggers different tab loading logic' : 
            'Authentication may not be completing properly'
    };
    
    // Save debug data
    fs.writeFileSync(DEBUG_LOG_FILE, JSON.stringify(debugData, null, 2));
    
    console.log('\n📊 FINAL RESULTS:');
    console.log('Issue detected:', debugData.summary.issue);
    console.log('Debug log saved to:', DEBUG_LOG_FILE);
    
    console.log('\n⏳ Keeping browser open for 30 seconds for manual inspection...');
    await sleep(30000);
    
    await browser.close();
    
    return debugData;
}

// Run the debug
debugTabLoginFlow().catch(console.error);