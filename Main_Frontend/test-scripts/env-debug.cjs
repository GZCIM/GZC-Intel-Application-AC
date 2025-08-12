// Environment variable debugging script
const https = require('https');

console.log('🔍 Environment Variable Debug Analysis');
console.log('=====================================');

// Check deployed app for placeholders
function checkDeployedApp() {
    return new Promise((resolve) => {
        https.get('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io/assets/index-5qhFeOSL.js', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('📱 DEPLOYED APP ANALYSIS:');
                
                // Check for placeholders
                const clientIdMatches = data.match(/VITE_CLIENT_ID[^"',}]*/g) || [];
                const tenantIdMatches = data.match(/VITE_TENANT_ID[^"',}]*/g) || [];
                const placeholderMatches = data.match(/[A-Z_]*PLACEHOLDER[A-Z_]*/g) || [];
                
                console.log(`   CLIENT_ID references: ${clientIdMatches.length}`);
                clientIdMatches.forEach(match => console.log(`   - "${match}"`));
                
                console.log(`   TENANT_ID references: ${tenantIdMatches.length}`);
                tenantIdMatches.forEach(match => console.log(`   - "${match}"`));
                
                console.log(`   PLACEHOLDER references: ${placeholderMatches.length}`);
                placeholderMatches.slice(0, 5).forEach(match => console.log(`   - "${match}"`));
                
                // Check if actual GUIDs are present
                const guidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
                const guids = data.match(guidPattern) || [];
                console.log(`   GUIDs found: ${guids.length}`);
                guids.slice(0, 3).forEach(guid => console.log(`   - ${guid}`));
                
                resolve();
            });
        }).on('error', (e) => {
            console.error('❌ Error fetching deployed app:', e.message);
            resolve();
        });
    });
}

async function main() {
    await checkDeployedApp();
    
    console.log('\n🧪 EXPECTED VALUES:');
    console.log('   VITE_CLIENT_ID should be: a GUID from Azure AD app registration');
    console.log('   VITE_TENANT_ID should be: a GUID for your Azure tenant');
    console.log('   VITE_APPLICATIONINSIGHTS_CONNECTION_STRING should contain InstrumentationKey');
    
    console.log('\n🔧 DIAGNOSIS:');
    console.log('   If placeholders are still present, env injection script failed');
    console.log('   If no GUIDs found, environment variables are not set in Azure Container App');
    console.log('   This would prevent MSAL from initializing correctly');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Check Azure Container App environment variables');
    console.log('   2. Test injection script locally');  
    console.log('   3. Fix placeholder replacement in build process');
}

main().catch(console.error);