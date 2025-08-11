// ====================================================
// Production Verification for v20250811-093911
// Checks authentication and tab persistence
// ====================================================

console.clear();
console.log('%c🔍 Verifying Production Deployment', 'color: #00ff00; font-size: 18px; font-weight: bold');
console.log('Version: v20250811-093911');
console.log('URL:', window.location.href);
console.log('=' .repeat(50));

// Check 1: MSAL Authentication
console.group('%c🔐 Authentication Status', 'color: #00ccff; font-weight: bold');
const msalInstance = window.msalInstance;
if (msalInstance) {
    const accounts = msalInstance.getAllAccounts();
    console.log(`MSAL Accounts: ${accounts.length}`);
    
    if (accounts.length > 0) {
        console.log('✅ Authenticated as:', accounts[0].username);
        console.log('Account ID:', accounts[0].homeAccountId);
    } else {
        console.log('⚠️ Not authenticated');
    }
    
    // Check configuration
    const config = msalInstance.config?.cache;
    console.log('Cache Location:', config?.cacheLocation);
    console.log('Cookie Storage:', config?.storeAuthStateInCookie ? 'Enabled' : 'Disabled');
} else {
    console.log('❌ MSAL not initialized');
}
console.groupEnd();

// Check 2: Tab Layout Storage
console.group('%c💾 Tab Layout Storage', 'color: #00ccff; font-weight: bold');
const storageKeys = Object.keys(localStorage);
const gzcKeys = storageKeys.filter(k => k.startsWith('gzc-intel'));

console.log(`Storage Keys: ${gzcKeys.length} GZC Intel keys`);
gzcKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value && value.length < 200) {
        console.log(`  ${key}: ${value.substring(0, 100)}...`);
    } else if (value) {
        try {
            const parsed = JSON.parse(value);
            if (parsed.tabs) {
                console.log(`  ${key}: ${parsed.tabs.length} tabs stored`);
            } else {
                console.log(`  ${key}: [object stored]`);
            }
        } catch {
            console.log(`  ${key}: [${value.length} chars]`);
        }
    }
});
console.groupEnd();

// Check 3: Current Page State
console.group('%c📋 Page State', 'color: #00ccff; font-weight: bold');

// Check for error messages
const hasErrors = document.body.textContent.includes('Error') || 
                 document.body.textContent.includes('error');
console.log('Page has error text:', hasErrors);

// Check for tabs
const tabElements = document.querySelectorAll('[role="tab"], button[class*="tab"]');
console.log(`Tab elements found: ${tabElements.length}`);
if (tabElements.length > 0) {
    console.log('Tabs detected:');
    tabElements.forEach(tab => {
        if (tab.textContent) {
            console.log(`  - ${tab.textContent.trim()}`);
        }
    });
}

// Check for Tools menu
const buttons = Array.from(document.querySelectorAll('button'));
const toolsButton = buttons.find(b => b.textContent === 'Tools');
console.log('Tools menu:', toolsButton ? 'Present' : 'Not found');
console.groupEnd();

// Check 4: Console Errors
console.group('%c⚠️ Console Error Check', 'color: #00ccff; font-weight: bold');
// We can't directly access previous console errors, but we can advise
console.log('Check browser console for:');
console.log('  - "Cannot read properties of undefined (reading \'startsWith\')"');
console.log('    → This error should be FIXED in v20250811-093911');
console.log('  - "using default layout"');
console.log('    → This indicates auth persistence failure');
console.groupEnd();

// Summary
console.group('%c📊 Verification Summary', 'color: #ffff00; font-size: 14px; font-weight: bold');
const authenticated = (msalInstance?.getAllAccounts().length || 0) > 0;
const hasStorage = gzcKeys.length > 0;
const hasUI = tabElements.length > 0;

console.log('\nStatus:');
console.log(`  Authentication: ${authenticated ? '✅' : '❌'}`);
console.log(`  Storage Data: ${hasStorage ? '✅' : '⚠️'}`);
console.log(`  UI Elements: ${hasUI ? '✅' : '❌'}`);

if (authenticated && hasStorage && hasUI) {
    console.log('\n✅ Production deployment appears healthy');
} else {
    console.log('\n⚠️ Some components may need attention');
}
console.groupEnd();

console.log('\n%c=== Verification Complete ===', 'color: #00ff00; font-size: 16px; font-weight: bold');
console.log('\nTo verify tab persistence:');
console.log('1. Login with Azure AD credentials');
console.log('2. Click Tools → Manage Tabs → Add Tab');
console.log('3. Hard refresh browser (Ctrl+Shift+R)');
console.log('4. Verify tabs remain after refresh');