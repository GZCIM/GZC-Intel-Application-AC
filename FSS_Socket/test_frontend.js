#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testFrontend() {
    console.log('🚀 Starting frontend debug test...');
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false,  // Show browser for debugging
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            const type = msg.type().toUpperCase();
            console.log(`[BROWSER ${type}]`, msg.text());
        });
        
        // Enable error logging  
        page.on('pageerror', error => {
            console.error(`[BROWSER ERROR]`, error.message);
        });
        
        // Enable request monitoring
        page.on('requestfailed', request => {
            console.error(`[REQUEST FAILED]`, request.url(), request.failure().errorText);
        });
        
        console.log('📱 Navigating to application...');
        await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔍 Checking authentication status...');
        const authStatus = await page.evaluate(() => {
            return {
                msalInstance: typeof window.msalInstance !== 'undefined',
                accounts: window.msalInstance ? window.msalInstance.getAllAccounts().length : 0,
                userId: window.localStorage.getItem('gzc-intel-user') ? JSON.parse(window.localStorage.getItem('gzc-intel-user')).id : null
            };
        });
        
        console.log('🔐 Auth Status:', authStatus);
        
        console.log('📋 Checking current tabs...');
        const tabStatus = await page.evaluate(() => {
            const savedLayout = localStorage.getItem('gzc-intel-current-layout');
            return {
                hasLayout: !!savedLayout,
                layout: savedLayout ? JSON.parse(savedLayout) : null,
                tabCount: savedLayout ? JSON.parse(savedLayout).tabs?.length : 0
            };
        });
        
        console.log('📋 Tab Status:', tabStatus);
        
        // Try to create a new tab
        console.log('➕ Testing tab creation...');
        
        // Look for the "+" button or right-click to create tab
        const hasTabArea = await page.$('.tab-container, .tabs, [data-testid="tab-area"]');
        if (hasTabArea) {
            console.log('📍 Found tab area, right-clicking to create tab...');
            await page.click('.tab-container, .tabs, [data-testid="tab-area"]', { button: 'right' });
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check for context menu
            const contextMenu = await page.$('.context-menu, .menu');
            if (contextMenu) {
                console.log('✅ Context menu appeared');
            } else {
                console.log('❌ No context menu found');
            }
        } else {
            console.log('❌ Could not find tab area');
        }
        
        // Check for any network requests to FSS API
        console.log('🌐 Monitoring network requests for 5 seconds...');
        const requests = [];
        page.on('request', request => {
            if (request.url().includes('fxspotstream')) {
                requests.push({
                    url: request.url(),
                    method: request.method(),
                    headers: request.headers()
                });
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        if (requests.length > 0) {
            console.log('📡 FSS API Requests found:', requests);
        } else {
            console.log('❌ No FSS API requests detected');
        }
        
        console.log('✅ Frontend debug test completed');
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testFrontend().catch(console.error);