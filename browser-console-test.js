// ============================================
// GZC Intel - Authentication Persistence Test
// ============================================
// Copy and paste this entire script into the browser console
// while on https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

console.log('%c=== GZC INTEL AUTH PERSISTENCE TEST ===', 'color: #00ff00; font-size: 16px; font-weight: bold');
console.log('Version: v20250811-092443');
console.log('Testing fixes for authentication persistence...\n');

// Test 1: Check MSAL Instance
console.group('%c📌 Test 1: MSAL Instance Check', 'color: #00ccff; font-weight: bold');
if (window.msalInstance) {
    console.log('✅ MSAL instance found on window');
    
    const accounts = window.msalInstance.getAllAccounts();
    console.log(`📊 Accounts found: ${accounts.length}`);
    
    if (accounts.length > 0) {
        console.log('✅ User is authenticated!');
        accounts.forEach((acc, i) => {
            console.log(`   Account ${i}: ${acc.username} (${acc.name})`);
        });
        
        const activeAccount = window.msalInstance.getActiveAccount();
        if (activeAccount) {
            console.log(`✅ Active account set: ${activeAccount.username}`);
        } else {
            console.warn('⚠️ No active account set (but accounts exist)');
        }
    } else {
        console.warn('❌ No accounts found - user not logged in');
    }
    
    // Check cache configuration
    const cacheLocation = window.msalInstance.config?.cache?.cacheLocation;
    const cookieStorage = window.msalInstance.config?.cache?.storeAuthStateInCookie;
    console.log(`📁 Cache location: ${cacheLocation}`);
    console.log(`🍪 Cookie storage enabled: ${cookieStorage ? '✅ YES' : '❌ NO'}`);
} else {
    console.error('❌ MSAL instance NOT found on window!');
}
console.groupEnd();

// Test 2: Check LocalStorage
console.group('%c📌 Test 2: LocalStorage Analysis', 'color: #00ccff; font-weight: bold');
const msalKeys = Object.keys(localStorage).filter(k => k.includes('msal'));
const gzcKeys = Object.keys(localStorage).filter(k => k.includes('gzc'));

console.log(`🔑 MSAL keys in localStorage: ${msalKeys.length}`);
console.log(`🔑 GZC keys in localStorage: ${gzcKeys.length}`);

// Check for user data
const storedUser = localStorage.getItem('gzc-intel-user');
if (storedUser) {
    try {
        const user = JSON.parse(storedUser);
        console.log(`✅ Stored user found: ${user.email || user.name}`);
    } catch (e) {
        console.error('❌ Failed to parse stored user');
    }
} else {
    console.warn('⚠️ No stored user in localStorage');
}

// Check for layout data
const storedLayout = localStorage.getItem('gzc-intel-current-layout');
if (storedLayout) {
    try {
        const layout = JSON.parse(storedLayout);
        const tabCount = layout.tabs?.length || 0;
        console.log(`✅ Stored layout found with ${tabCount} tabs`);
        if (layout.tabs && layout.tabs.length > 0) {
            console.log('   Tab IDs:', layout.tabs.map(t => t.id).join(', '));
        }
    } catch (e) {
        console.error('❌ Failed to parse stored layout');
    }
} else {
    console.warn('⚠️ No stored layout in localStorage');
}
console.groupEnd();

// Test 3: Check Cookies
console.group('%c📌 Test 3: Cookie Storage', 'color: #00ccff; font-weight: bold');
const cookies = document.cookie.split(';').map(c => c.trim());
const msalCookies = cookies.filter(c => c.includes('msal'));
console.log(`🍪 MSAL cookies found: ${msalCookies.length}`);
if (msalCookies.length > 0) {
    console.log('✅ Auth state cookies present (good for persistence)');
} else {
    console.warn('⚠️ No MSAL cookies found');
}
console.groupEnd();

// Test 4: Tab Persistence Simulation
console.group('%c📌 Test 4: Tab Persistence Logic', 'color: #00ccff; font-weight: bold');
console.log('Simulating what happens on page refresh...\n');

// Check what TabLayoutManager would see
const msalAccounts = window.msalInstance?.getAllAccounts() || [];
const wouldAuthWork = msalAccounts.length > 0;

if (wouldAuthWork) {
    console.log('✅ TabLayoutManager would find authenticated user');
    console.log('✅ Tabs would be loaded from database/localStorage');
    console.log('✅ User memory would persist!');
} else {
    console.error('❌ TabLayoutManager would NOT find authenticated user');
    console.error('❌ Would fall back to DEFAULT_LAYOUT');
    console.error('❌ User tabs would be lost!');
}

// Check timing fix
console.log('\n⏱️ Timing Fixes Applied:');
console.log('• UserContext delay: 100ms → 500ms ✅');
console.log('• TabLayoutManager: Direct MSAL check ✅');
console.log('• Cookie storage: Enabled ✅');
console.groupEnd();

// Test 5: Summary
console.group('%c📌 Test Summary', 'color: #ffff00; font-weight: bold; font-size: 14px');
const authenticated = (window.msalInstance?.getAllAccounts().length || 0) > 0;
const hasUserData = !!localStorage.getItem('gzc-intel-user');
const hasLayout = !!localStorage.getItem('gzc-intel-current-layout');
const hasCookies = document.cookie.includes('msal');

let score = 0;
if (authenticated) score++;
if (hasUserData) score++;
if (hasLayout) score++;
if (hasCookies) score++;

console.log(`\n🎯 Persistence Score: ${score}/4`);
console.log(`   ${authenticated ? '✅' : '❌'} Authentication active`);
console.log(`   ${hasUserData ? '✅' : '❌'} User data stored`);
console.log(`   ${hasLayout ? '✅' : '❌'} Layout data stored`);
console.log(`   ${hasCookies ? '✅' : '❌'} Cookie storage active`);

if (score === 4) {
    console.log('\n🎉 EXCELLENT! All persistence mechanisms working!');
} else if (score >= 2) {
    console.log('\n⚠️ PARTIAL: Some persistence working, but not all');
} else {
    console.log('\n❌ ISSUE: Persistence not working properly');
}

console.log('\n📝 To fully test:');
console.log('1. Login if not already');
console.log('2. Add/modify tabs');
console.log('3. Hard refresh (Ctrl+Shift+R)');
console.log('4. Check if tabs persist');
console.groupEnd();

console.log('%c=== END OF TEST ===', 'color: #00ff00; font-size: 16px; font-weight: bold');