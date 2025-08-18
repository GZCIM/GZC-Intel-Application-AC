// Paste this in Chrome Console to check for errors

console.clear();
console.log('=== CHECKING APPLICATION STATUS ===\n');

// Check for errors
const errors = [];

// Check 404s
if (document.querySelector('script[src*="AppOptimized"]')) {
    errors.push('❌ Still trying to load AppOptimized.tsx');
}

// Check MSAL
if (window.msalInstance) {
    console.log('✅ MSAL instance found');
    const accounts = window.msalInstance.getAllAccounts();
    console.log(`   Accounts: ${accounts.length}`);
} else {
    errors.push('❌ MSAL not initialized');
}

// Check for React
if (window.React || document.querySelector('#root')._reactRootContainer) {
    console.log('✅ React app mounted');
} else {
    errors.push('❌ React not mounted');
}

// Check for grid layout after auth
const gridLayout = document.querySelector('.react-grid-layout');
if (gridLayout) {
    console.log('✅ Grid layout found');
} else {
    console.log('⏳ Grid layout not visible (need to sign in first)');
}

// Check localStorage
const hasLayoutData = Object.keys(localStorage).some(k => k.includes('layout') || k.includes('tab'));
console.log(hasLayoutData ? '✅ Layout data in localStorage' : '⏳ No layout data yet');

// Report errors
if (errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    errors.forEach(e => console.log('  ', e));
} else {
    console.log('\n✅ NO ERRORS - App ready for testing');
    console.log('   Click "Sign In" to test drag/resize functionality');
}

// Check console for any uncaught errors
const consoleErrors = performance.getEntriesByType('resource')
    .filter(e => e.responseStatus === 404);
    
if (consoleErrors.length > 0) {
    console.log('\n⚠️ 404 Errors:');
    consoleErrors.forEach(e => console.log('  ', e.name));
}