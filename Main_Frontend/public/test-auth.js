// Test authentication state
console.log('=== AUTHENTICATION STATE TEST ===');

// Check MSAL
if (window.msalInstance) {
    const accounts = window.msalInstance.getAllAccounts();
    console.log('✅ MSAL Accounts:', accounts.length);
    
    if (accounts.length > 0) {
        console.log('First account:', accounts[0].username);
        const active = window.msalInstance.getActiveAccount();
        console.log('Active account:', active ? active.username : 'NONE');
    }
} else {
    console.log('❌ No MSAL instance on window');
}

// Check localStorage
const user = localStorage.getItem('gzc-intel-user');
const layout = localStorage.getItem('gzc-intel-current-layout');
console.log('Stored user:', user ? 'YES' : 'NO');
console.log('Stored layout:', layout ? 'YES' : 'NO');

// Check if tabs would persist
setTimeout(() => {
    const authenticated = window.msalInstance?.getAllAccounts().length > 0;
    console.log('Would tabs persist?', authenticated ? '✅ YES' : '❌ NO - DEFAULT_LAYOUT');
}, 100);

// Test with proper delay
setTimeout(() => {
    console.log('=== After 500ms delay ===');
    const authenticated = window.msalInstance?.getAllAccounts().length > 0;
    console.log('Authentication restored?', authenticated ? '✅ YES' : '❌ NO');
}, 500);