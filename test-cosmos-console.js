// Test Cosmos DB Save/Load
// Run this in the browser console at https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

// Test 1: Check if authenticated
async function checkAuth() {
    const msal = window.msalInstance;
    if (!msal) {
        console.error('❌ MSAL not initialized');
        return false;
    }
    
    const accounts = msal.getAllAccounts();
    if (accounts.length === 0) {
        console.error('❌ Not authenticated - please login first');
        return false;
    }
    
    console.log('✅ Authenticated as:', accounts[0].username);
    return true;
}

// Test 2: Get a token
async function getToken() {
    const msal = window.msalInstance;
    const accounts = msal.getAllAccounts();
    
    try {
        const response = await msal.acquireTokenSilent({
            scopes: ["User.Read"],
            account: accounts[0]
        });
        console.log('✅ Got token (first 50 chars):', response.accessToken.substring(0, 50) + '...');
        return response.accessToken;
    } catch (error) {
        console.error('❌ Token acquisition failed:', error);
        throw error;
    }
}

// Test 3: Save to Cosmos DB directly
async function testCosmosDBSave() {
    const token = await getToken();
    
    const testConfig = {
        tabs: [{
            id: "test-" + Date.now(),
            name: "Test Tab",
            icon: "📊",
            type: "analytics",
            components: [{
                id: "comp-" + Date.now(),
                componentId: "portfolio",
                x: 0, y: 0, w: 6, h: 4
            }]
        }],
        preferences: {
            theme: "dark",
            language: "en"
        }
    };
    
    console.log('📤 Sending config:', testConfig);
    
    try {
        const response = await fetch('/api/cosmos/config', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testConfig)
        });
        
        const responseText = await response.text();
        console.log(`📥 Response status: ${response.status}`);
        console.log('📥 Response body:', responseText);
        
        if (response.ok) {
            console.log('✅ Save successful!');
            return JSON.parse(responseText);
        } else {
            console.error('❌ Save failed:', responseText);
            return null;
        }
    } catch (error) {
        console.error('❌ Request failed:', error);
        throw error;
    }
}

// Test 4: Load from Cosmos DB directly
async function testCosmosDBLoad() {
    const token = await getToken();
    
    try {
        const response = await fetch('/api/cosmos/config', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const responseText = await response.text();
        console.log(`📥 Response status: ${response.status}`);
        
        if (response.ok) {
            const data = JSON.parse(responseText);
            console.log('✅ Load successful!');
            console.log('📥 User ID:', data.userId);
            console.log('📥 Tabs:', data.tabs?.length || 0);
            console.log('📥 Full data:', data);
            return data;
        } else {
            console.error('❌ Load failed:', responseText);
            return null;
        }
    } catch (error) {
        console.error('❌ Request failed:', error);
        throw error;
    }
}

// Test 5: Run all tests
async function runAllTests() {
    console.log('🧪 Starting Cosmos DB Tests...\n');
    
    // Check auth
    if (!await checkAuth()) {
        console.log('⚠️ Please login first and run tests again');
        return;
    }
    
    console.log('\n📝 Testing Save...');
    const saveResult = await testCosmosDBSave();
    
    console.log('\n📖 Testing Load...');
    const loadResult = await testCosmosDBLoad();
    
    console.log('\n✅ Tests complete!');
    console.log('Saved document ID:', saveResult?.id);
    console.log('Loaded document ID:', loadResult?.id);
    
    if (saveResult && loadResult) {
        console.log('🎉 Cosmos DB is working correctly!');
    } else {
        console.log('⚠️ There are issues with Cosmos DB - check the errors above');
    }
}

// Instructions
console.log('%c🧪 Cosmos DB Test Script Loaded', 'color: #95BD78; font-size: 16px; font-weight: bold');
console.log('%cRun these commands:', 'color: #64b5f6; font-size: 14px');
console.log('1. checkAuth()     - Check if you\'re logged in');
console.log('2. getToken()      - Test token acquisition');
console.log('3. testCosmosDBSave() - Test saving to Cosmos DB');
console.log('4. testCosmosDBLoad() - Test loading from Cosmos DB');
console.log('5. runAllTests()   - Run all tests in sequence');
console.log('\n%cOr just run: runAllTests()', 'color: #ABD38F; font-size: 14px; font-weight: bold');