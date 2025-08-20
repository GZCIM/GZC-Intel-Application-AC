/**
 * Sync Diagnosis Script
 * 
 * This script diagnoses why React app isn't reading Azure configuration
 * and browsers aren't synchronizing properly
 */

console.log('🔍 Starting Sync Diagnosis...');

// Function to get current user information from MSAL
async function getCurrentUserInfo() {
    try {
        // Check if MSAL is available
        if (typeof window.msal === 'undefined') {
            console.warn('⚠️ MSAL not found in window.msal');
            return null;
        }

        const accounts = window.msal.getAllAccounts();
        console.log('📋 MSAL Accounts:', accounts);

        if (accounts.length === 0) {
            console.warn('⚠️ No MSAL accounts found');
            return null;
        }

        const account = accounts[0];
        console.log('👤 Current User Account:', {
            id: account.homeAccountId,
            username: account.username,
            name: account.name,
            localAccountId: account.localAccountId,
            tenantId: account.tenantId,
            environment: account.environment
        });

        // Try to get fresh token
        try {
            const tokenResponse = await window.msal.acquireTokenSilent({
                scopes: ["User.Read", "api://a873f2d7-2ab9-4d59-a54c-90859226bf2e/access_as_user"],
                account: account
            });

            console.log('🔑 Token Response:', {
                accessToken: tokenResponse.accessToken ? 'Present' : 'Missing',
                idToken: tokenResponse.idToken ? 'Present' : 'Missing',
                account: tokenResponse.account
            });

            // Decode ID token to see claims
            if (tokenResponse.idToken) {
                const payload = JSON.parse(atob(tokenResponse.idToken.split('.')[1]));
                console.log('🏷️ ID Token Claims:', {
                    sub: payload.sub,
                    oid: payload.oid,
                    preferred_username: payload.preferred_username,
                    email: payload.email,
                    name: payload.name
                });

                return {
                    account: account,
                    claims: payload,
                    accessToken: tokenResponse.accessToken
                };
            }
        } catch (tokenError) {
            console.error('❌ Token acquisition failed:', tokenError);
        }

        return { account: account, claims: null, accessToken: null };

    } catch (error) {
        console.error('💥 Error getting user info:', error);
        return null;
    }
}

// Function to test backend configuration API
async function testBackendAPI(userInfo) {
    if (!userInfo || !userInfo.accessToken) {
        console.warn('⚠️ No user info or access token available');
        return null;
    }

    try {
        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        
        console.log('🌐 Testing backend APIs...');
        
        // Test 1: Regular config endpoint
        console.log('📡 Testing /api/cosmos/config...');
        const configResponse = await fetch(`${backendUrl}/api/cosmos/config`, {
            headers: {
                'Authorization': `Bearer ${userInfo.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Config API Response: ${configResponse.status} ${configResponse.statusText}`);
        
        if (configResponse.ok) {
            const config = await configResponse.json();
            console.log('✅ Config loaded successfully:', {
                id: config.id,
                userId: config.userId,
                name: config.name,
                deviceType: config.deviceType,
                tabCount: config.tabs?.length || 0,
                hasVersionHistory: config.previousVersions?.length || 0
            });
            
            // Check for problematic tabs
            if (config.tabs && config.tabs.length > 0) {
                const duplicateTabs = config.tabs.filter(tab => 
                    tab.title === 'New Tab 1' || tab.name === 'New Tab 1'
                );
                if (duplicateTabs.length > 0) {
                    console.warn(`⚠️ Found ${duplicateTabs.length} duplicate "New Tab 1" tabs`);
                }
            }
            
            return config;
        } else {
            const errorText = await configResponse.text();
            console.error('❌ Config API failed:', errorText);
            return null;
        }

    } catch (error) {
        console.error('💥 Backend API test failed:', error);
        return null;
    }
}

// Function to test device-specific configuration
async function testDeviceConfigAPI(userInfo) {
    if (!userInfo || !userInfo.accessToken) {
        return null;
    }

    try {
        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const deviceInfo = {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        console.log('📱 Testing device-specific config API...');
        console.log('🖥️ Device Info:', deviceInfo);

        const response = await fetch(`${backendUrl}/api/cosmos/config/device`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userInfo.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deviceInfo)
        });

        console.log(`📊 Device Config API Response: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const config = await response.json();
            console.log('✅ Device config loaded successfully:', {
                deviceType: config.deviceType,
                name: config.name,
                tabCount: config.tabs?.length || 0
            });
            return config;
        } else {
            const errorText = await response.text();
            console.error('❌ Device Config API failed:', errorText);
            return null;
        }

    } catch (error) {
        console.error('💥 Device Config API test failed:', error);
        return null;
    }
}

// Function to generate expected user ID
function generateExpectedUserID(claims) {
    if (!claims) return null;

    const email = claims.preferred_username || claims.email || '';
    const oid = claims.oid || '';
    const sub = claims.sub || '';

    // Use same logic as backend
    if (email) {
        return email.toLowerCase();
    } else if (oid) {
        return `oid_${oid}`;
    } else {
        return `sub_${sub}` || 'unknown_user';
    }
}

// Main diagnosis function
async function runDiagnosis() {
    console.log('🚀 Running comprehensive sync diagnosis...');
    
    // Step 1: Get user information
    console.log('\n📍 Step 1: Getting user information...');
    const userInfo = await getCurrentUserInfo();
    
    if (!userInfo) {
        console.error('❌ Cannot proceed without user information');
        return;
    }

    // Step 2: Calculate expected user ID
    console.log('\n📍 Step 2: Calculating expected user ID...');
    const expectedUserID = generateExpectedUserID(userInfo.claims);
    console.log('🆔 Expected User ID:', expectedUserID);
    console.log('🆔 Azure Config User ID: oid_0ce3c7d3-e9ff-4317-bb03-39b668b81039');
    
    if (expectedUserID !== 'oid_0ce3c7d3-e9ff-4317-bb03-39b668b81039') {
        console.warn('⚠️ USER ID MISMATCH DETECTED!');
        console.warn(`Expected: ${expectedUserID}`);
        console.warn(`Azure has: oid_0ce3c7d3-e9ff-4317-bb03-39b668b81039`);
        console.warn('This is why sync is failing!');
    } else {
        console.log('✅ User IDs match');
    }

    // Step 3: Test backend APIs
    console.log('\n📍 Step 3: Testing backend APIs...');
    const config = await testBackendAPI(userInfo);
    
    // Step 4: Test device-specific API
    console.log('\n📍 Step 4: Testing device-specific API...');
    const deviceConfig = await testDeviceConfigAPI(userInfo);

    // Step 5: Check localStorage
    console.log('\n📍 Step 5: Checking localStorage...');
    const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.includes('gzc') || key.includes('msal') || key.includes('user') || key.includes('config')
    );
    console.log('🗄️ Relevant localStorage keys:', localStorageKeys);

    // Summary
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(50));
    console.log(`👤 User authenticated: ${userInfo ? '✅' : '❌'}`);
    console.log(`🆔 User ID match: ${expectedUserID === 'oid_0ce3c7d3-e9ff-4317-bb03-39b668b81039' ? '✅' : '❌'}`);
    console.log(`🌐 Backend accessible: ${config ? '✅' : '❌'}`);
    console.log(`📱 Device config working: ${deviceConfig ? '✅' : '❌'}`);
    console.log(`🗄️ localStorage clean: ${localStorageKeys.length < 5 ? '✅' : '⚠️'}`);
    
    if (config) {
        console.log(`📊 Config has ${config.tabs?.length || 0} tabs`);
        console.log(`🔄 Version history: ${config.previousVersions?.length || 0} entries`);
    }

    return {
        userInfo,
        expectedUserID,
        config,
        deviceConfig,
        localStorageKeys
    };
}

// Export for browser console
window.syncDiagnosis = {
    run: runDiagnosis,
    getUserInfo: getCurrentUserInfo,
    testBackend: testBackendAPI,
    testDevice: testDeviceConfigAPI
};

console.log('🔧 Sync Diagnosis loaded. Run: window.syncDiagnosis.run()');

