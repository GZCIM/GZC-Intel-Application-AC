// Test script to diagnose tab saving issues in production
// Run this in browser console at https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

console.log('=== TESTING TAB FUNCTIONALITY ===');

// 1. Check if MSAL is loaded
console.log('1. MSAL Instance:', window.msalInstance ? 'LOADED' : 'NOT LOADED');
if (window.msalInstance) {
    const accounts = window.msalInstance.getAllAccounts();
    console.log('   Accounts:', accounts.length);
    if (accounts.length > 0) {
        console.log('   User:', accounts[0].username);
    }
}

// 2. Check localStorage for tabs
console.log('\n2. LocalStorage tabs:');
const tabLayouts = localStorage.getItem('tabLayouts');
console.log('   tabLayouts:', tabLayouts ? JSON.parse(tabLayouts) : 'NONE');

// 3. Try to call the API directly
console.log('\n3. Testing API directly:');
fetch('/api/preferences/health')
    .then(r => {
        console.log('   Health check status:', r.status);
        return r.json();
    })
    .then(data => console.log('   Health response:', data))
    .catch(err => console.error('   Health check failed:', err));

// 4. Try to get tabs from API
console.log('\n4. Fetching tabs from API:');
if (window.msalInstance) {
    const accounts = window.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
        window.msalInstance.acquireTokenSilent({
            scopes: ['User.Read'],
            account: accounts[0]
        }).then(response => {
            console.log('   Got token, fetching tabs...');
            return fetch('/api/preferences/tabs', {
                headers: {
                    'Authorization': `Bearer ${response.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
        }).then(r => {
            console.log('   Tabs API status:', r.status);
            return r.json();
        }).then(data => {
            console.log('   Tabs from API:', data);
        }).catch(err => {
            console.error('   Tab fetch error:', err);
        });
    } else {
        console.log('   No accounts - user not logged in');
    }
} else {
    console.log('   MSAL not available - cannot authenticate');
}

// 5. Check React components
console.log('\n5. React component check:');
const rootElement = document.getElementById('root');
if (rootElement && rootElement._reactRootContainer) {
    console.log('   React app: MOUNTED');
    // Try to find tab manager in React DevTools
    console.log('   Check React DevTools for TabLayoutManager state');
} else {
    console.log('   React app: NOT FOUND or NOT MOUNTED');
}

// 6. Check for console errors
console.log('\n6. Check browser console for any red errors above');

console.log('\n=== END OF TEST ===');
console.log('Copy all output and share for debugging');