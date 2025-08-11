#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testMemoryPersistence() {
    console.log('🧪 Testing Memory Persistence with Authentication...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Monitor console for database service logs
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Database service:') || text.includes('MSAL') || text.includes('🔐') || text.includes('✅') || text.includes('❌')) {
            console.log(`[APP]`, text);
        }
    });
    
    page.on('pageerror', error => console.error(`[ERROR]`, error.message));
    
    console.log('📱 Loading application...');
    await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔐 Step 1: Test manual authentication...');
    const authResult = await page.evaluate(async () => {
        if (!window.msalInstance) {
            return { error: 'MSAL instance not found' };
        }
        
        const accounts = window.msalInstance.getAllAccounts();
        console.log('🔍 Current accounts:', accounts.length);
        
        if (accounts.length === 0) {
            try {
                // Try to sign in
                const response = await window.msalInstance.loginPopup({
                    scopes: [`api://${import.meta.env.VITE_CLIENT_ID}/.default`]
                });
                return { 
                    success: true, 
                    user: response.account.username,
                    accountId: response.account.localAccountId 
                };
            } catch (error) {
                return { error: error.message };
            }
        } else {
            // Already signed in
            return { 
                alreadyAuthenticated: true, 
                user: accounts[0].username,
                accountId: accounts[0].localAccountId 
            };
        }
    });
    
    console.log('🔐 Auth result:', authResult);
    
    if (authResult.success || authResult.alreadyAuthenticated) {
        console.log('✅ Authentication successful!');
        
        // Wait a moment for React to update
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('📊 Step 2: Check if user memory loads...');
        const memoryState = await page.evaluate(() => {
            return {
                authenticated: typeof window.msalInstance !== 'undefined' && window.msalInstance.getAllAccounts().length > 0,
                currentLayout: localStorage.getItem('gzc-intel-current-layout-415b084c-592c-401b-a349-fcc97c64522d'),
                hasUserInStorage: !!localStorage.getItem('gzc-intel-user'),
                userFromStorage: JSON.parse(localStorage.getItem('gzc-intel-user') || 'null')
            };
        });
        
        console.log('💾 Memory state:', memoryState);
        
        console.log('🔄 Step 3: Test page refresh persistence...');
        await page.reload({ waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('📊 Step 4: Check state after refresh...');
        const afterRefreshState = await page.evaluate(() => {
            return {
                authenticated: typeof window.msalInstance !== 'undefined' && window.msalInstance.getAllAccounts().length > 0,
                activeAccount: window.msalInstance?.getActiveAccount()?.username,
                currentLayout: localStorage.getItem('gzc-intel-current-layout-415b084c-592c-401b-a349-fcc97c64522d'),
                hasUserInStorage: !!localStorage.getItem('gzc-intel-user')
            };
        });
        
        console.log('🔄 After refresh:', afterRefreshState);
        
        if (afterRefreshState.authenticated && afterRefreshState.activeAccount) {
            console.log('🎉 SUCCESS: Authentication persisted after refresh!');
        } else {
            console.log('❌ FAILED: Authentication lost after refresh');
        }
        
    } else {
        console.log('❌ Authentication failed:', authResult);
    }
    
    console.log('✨ Test completed');
    await browser.close();
}

testMemoryPersistence().catch(console.error);