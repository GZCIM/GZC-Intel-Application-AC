#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testMSAL() {
    console.log('🔐 Testing MSAL authentication...');
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            const type = msg.type().toUpperCase();
            if (type === 'ERROR' || msg.text().includes('MSAL') || msg.text().includes('auth')) {
                console.log(`[BROWSER ${type}]`, msg.text());
            }
        });
        
        // Enable error logging  
        page.on('pageerror', error => {
            console.error(`[BROWSER ERROR]`, error.message);
        });
        
        console.log('📱 Navigating to application...');
        await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        
        // Wait for React to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🔍 Checking MSAL configuration...');
        const msalConfig = await page.evaluate(() => {
            // Check for MSAL instance on window
            const msalExists = typeof window.msalInstance !== 'undefined';
            
            // Get MSAL config if it exists
            let config = null;
            let accounts = 0;
            
            if (msalExists) {
                try {
                    config = window.msalInstance.getConfiguration();
                    accounts = window.msalInstance.getAllAccounts().length;
                } catch (e) {
                    config = { error: e.message };
                }
            }
            
            return {
                msalInstanceExists: msalExists,
                accountsCount: accounts,
                config: config,
                hasReact: typeof window.React !== 'undefined',
                hasMsalReact: typeof window.msalReact !== 'undefined'
            };
        });
        
        console.log('⚙️ MSAL Config:', msalConfig);
        
        // Check if MSAL instance has proper configuration
        if (msalConfig.msalInstanceExists) {
            console.log('✅ MSAL instance exists');
            console.log('🔧 MSAL Config:', JSON.stringify(msalConfig.config, null, 2));
            console.log('👥 Accounts:', msalConfig.accountsCount);
        } else {
            console.log('❌ MSAL instance missing');
            
            // Check if there are any script loading errors
            const scripts = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('script')).map(s => ({
                    src: s.src,
                    type: s.type,
                    loaded: !s.hasAttribute('onerror')
                }));
            });
            
            console.log('📜 Scripts loaded:', scripts.filter(s => s.src));
        }
        
        // Try manual authentication test
        console.log('🧪 Testing manual authentication...');
        try {
            const loginResult = await page.evaluate(async () => {
                if (typeof window.msalInstance === 'undefined') {
                    return { error: 'MSAL instance not available' };
                }
                
                try {
                    // Try to login
                    const response = await window.msalInstance.loginPopup({
                        scopes: ['User.Read']
                    });
                    return { success: true, account: response.account };
                } catch (error) {
                    return { error: error.message };
                }
            });
            
            console.log('🔓 Login test result:', loginResult);
            
        } catch (error) {
            console.log('❌ Login test failed:', error.message);
        }
        
        console.log('✅ MSAL test completed');
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testMSAL().catch(console.error);