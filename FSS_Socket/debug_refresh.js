import puppeteer from 'puppeteer';

async function debugPageRefresh() {
    console.log('🔄 Testing page refresh persistence...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Monitor console and errors
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Tab') || text.includes('auth') || text.includes('database') || text.includes('save') || text.includes('load')) {
            console.log(`[BROWSER]`, text);
        }
    });
    
    page.on('pageerror', error => console.error('[ERROR]', error.message));
    
    // Monitor network requests to FSS API
    const fssRequests = [];
    page.on('request', request => {
        if (request.url().includes('fxspotstream') || request.url().includes('/api/')) {
            fssRequests.push({
                method: request.method(),
                url: request.url(),
                headers: request.headers()
            });
        }
    });
    
    console.log('📱 Loading application...');
    await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 Step 1: Check initial state');
    const initialState = await page.evaluate(() => {
        return {
            authenticated: typeof window.msalInstance !== 'undefined' && window.msalInstance.getAllAccounts().length > 0,
            currentLayout: localStorage.getItem('gzc-intel-current-layout'),
            tabCount: JSON.parse(localStorage.getItem('gzc-intel-current-layout') || '{"tabs":[]}').tabs?.length || 0,
            hasDefaultUser: !!localStorage.getItem('gzc-intel-user')
        };
    });
    console.log('Initial state:', initialState);
    
    if (!initialState.authenticated) {
        console.log('🔐 Need to authenticate first. Trying sign in...');
        
        // Look for sign-in button or try to trigger auth
        try {
            const signInResult = await page.evaluate(async () => {
                if (window.msalInstance) {
                    try {
                        const response = await window.msalInstance.loginPopup({
                            scopes: [`api://${import.meta.env.VITE_CLIENT_ID}/.default`]
                        });
                        return { success: true, account: response.account.username };
                    } catch (error) {
                        return { error: error.message };
                    }
                } else {
                    return { error: 'MSAL instance not available' };
                }
            });
            
            console.log('Sign in result:', signInResult);
            
            if (signInResult.success) {
                console.log('✅ Authentication successful');
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                console.log('❌ Authentication failed, continuing with test anyway');
            }
        } catch (error) {
            console.log('❌ Auth test failed:', error.message);
        }
    }
    
    console.log('➕ Step 2: Creating a test tab...');
    
    // Try to create a tab by right-clicking in the tab area
    try {
        await page.click('body', { button: 'right' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Look for context menu or create new tab option
        const hasContextMenu = await page.$('.context-menu, .menu');
        if (hasContextMenu) {
            console.log('📝 Found context menu, trying to create tab...');
        } else {
            console.log('❌ No context menu found');
        }
        
    } catch (error) {
        console.log('❌ Failed to create tab via context menu');
    }
    
    console.log('📊 Step 3: Check state after tab creation attempt');
    const afterCreateState = await page.evaluate(() => {
        return {
            authenticated: typeof window.msalInstance !== 'undefined' && window.msalInstance.getAllAccounts().length > 0,
            currentLayout: localStorage.getItem('gzc-intel-current-layout'),
            tabCount: JSON.parse(localStorage.getItem('gzc-intel-current-layout') || '{"tabs":[]}').tabs?.length || 0,
            localStorage_keys: Object.keys(localStorage).filter(k => k.includes('gzc')),
            sessionStorage_keys: Object.keys(sessionStorage).filter(k => k.includes('gzc'))
        };
    });
    console.log('After create state:', afterCreateState);
    
    console.log('🔄 Step 4: Refreshing page...');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 Step 5: Check state after refresh');
    const afterRefreshState = await page.evaluate(() => {
        return {
            authenticated: typeof window.msalInstance !== 'undefined' && window.msalInstance.getAllAccounts().length > 0,
            currentLayout: localStorage.getItem('gzc-intel-current-layout'),
            tabCount: JSON.parse(localStorage.getItem('gzc-intel-current-layout') || '{"tabs":[]}').tabs?.length || 0,
            localStorage_keys: Object.keys(localStorage).filter(k => k.includes('gzc')),
            sessionStorage_keys: Object.keys(sessionStorage).filter(k => k.includes('gzc')),
            userFromStorage: localStorage.getItem('gzc-intel-user')
        };
    });
    console.log('After refresh state:', afterRefreshState);
    
    console.log('🌐 API Requests made:', fssRequests.length);
    fssRequests.forEach((req, i) => {
        console.log(`  ${i+1}. ${req.method} ${req.url}`);
    });
    
    console.log('📝 ANALYSIS:');
    console.log('- Initial tabs:', initialState.tabCount);
    console.log('- After create:', afterCreateState.tabCount);
    console.log('- After refresh:', afterRefreshState.tabCount);
    console.log('- Auth maintained after refresh:', afterRefreshState.authenticated);
    console.log('- Layout persisted:', !!afterRefreshState.currentLayout);
    console.log('- API requests made:', fssRequests.length > 0);
    
    await browser.close();
}

debugPageRefresh().catch(console.error);