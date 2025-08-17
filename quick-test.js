// Quick test - paste into browser console
// Test if authentication is working

async function quickTest() {
    console.log('🔍 Quick Authentication Test');
    
    // Check MSAL
    const msal = window.msalInstance;
    if (!msal) {
        console.error('❌ MSAL not found');
        return;
    }
    
    const accounts = msal.getAllAccounts();
    if (accounts.length === 0) {
        console.error('❌ Not logged in');
        return;
    }
    
    console.log('✅ Logged in as:', accounts[0].username);
    
    // Try to get a token and test the backend
    try {
        const response = await msal.acquireTokenSilent({
            scopes: ["User.Read"],
            account: accounts[0]
        });
        
        console.log('✅ Token acquired');
        
        // Test Cosmos save
        const testResponse = await fetch('/api/cosmos/config', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${response.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tabs: [{
                    id: "test-tab",
                    name: "Test Tab", 
                    components: []
                }]
            })
        });
        
        console.log('📤 Save test status:', testResponse.status);
        
        if (testResponse.ok) {
            console.log('✅ COSMOS DB SAVE IS WORKING!');
            
            // Test load
            const loadResponse = await fetch('/api/cosmos/config', {
                headers: {
                    'Authorization': `Bearer ${response.accessToken}`
                }
            });
            
            if (loadResponse.ok) {
                const data = await loadResponse.json();
                console.log('✅ COSMOS DB LOAD IS WORKING!');
                console.log('📥 Loaded tabs:', data.tabs?.length || 0);
                console.log('🎉 PERSISTENCE IS FULLY WORKING!');
            } else {
                console.error('❌ Load failed:', loadResponse.status);
            }
        } else {
            const errorText = await testResponse.text();
            console.error('❌ Save failed:', testResponse.status, errorText);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

quickTest();