// Debug token issues
// Run this in browser console at the app

async function debugToken() {
    console.log('=== Token Debug ===');
    
    // Check MSAL
    const msal = window.msalInstance;
    if (!msal) {
        console.error('❌ No MSAL instance found');
        return;
    }
    console.log('✅ MSAL instance found');
    
    // Check accounts
    const accounts = msal.getAllAccounts();
    console.log('📝 Accounts:', accounts.length);
    if (accounts.length > 0) {
        console.log('👤 User:', accounts[0].username);
        console.log('📧 Name:', accounts[0].name);
        console.log('🆔 Home Account ID:', accounts[0].homeAccountId);
        console.log('🏢 Tenant ID:', accounts[0].tenantId);
    }
    
    // Try to get token
    try {
        const response = await msal.acquireTokenSilent({
            scopes: ["User.Read"],
            account: accounts[0]
        });
        
        console.log('✅ Token acquired successfully');
        console.log('📝 Token length:', response.accessToken.length);
        
        // Decode token header and payload
        const parts = response.accessToken.split('.');
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        
        console.log('\n=== Token Header ===');
        console.log('Algorithm:', header.alg);
        console.log('Type:', header.typ);
        console.log('Key ID:', header.kid);
        
        console.log('\n=== Token Payload ===');
        console.log('Audience (aud):', payload.aud);
        console.log('Issuer (iss):', payload.iss);
        console.log('Tenant ID (tid):', payload.tid);
        console.log('App ID (appid):', payload.appid);
        console.log('Scopes (scp):', payload.scp);
        console.log('User:', payload.preferred_username || payload.email);
        console.log('Expires:', new Date(payload.exp * 1000).toLocaleString());
        
        // Test the token
        console.log('\n=== Testing Token with Backend ===');
        const testResponse = await fetch('/api/cosmos/health', {
            headers: {
                'Authorization': `Bearer ${response.accessToken}`
            }
        });
        
        console.log('Health check status:', testResponse.status);
        if (testResponse.status === 401) {
            const errorText = await testResponse.text();
            console.error('❌ Backend rejected token:', errorText);
            
            // Try to understand why
            console.log('\n=== Token Analysis ===');
            if (payload.aud === '00000003-0000-0000-c000-000000000000') {
                console.log('⚠️ Token audience is Microsoft Graph API');
                console.log('   Backend expects:', 'a873f2d7-2ab9-4d59-a54c-90859226bf2e');
            }
            if (payload.tid !== '8274c97d-de9d-4328-98cf-2d4ee94bf104') {
                console.log('⚠️ Wrong tenant ID');
            }
        } else {
            const data = await testResponse.json();
            console.log('✅ Backend accepted token!');
            console.log('Response:', data);
        }
        
        return response.accessToken;
    } catch (error) {
        console.error('❌ Token acquisition failed:', error);
        if (error.errorCode) {
            console.log('Error code:', error.errorCode);
            console.log('Error message:', error.errorMessage);
        }
    }
}

// Run it
debugToken();