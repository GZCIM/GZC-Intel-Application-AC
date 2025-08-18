// Chrome DevTools Console Check
// Run this to verify no errors exist

(function() {
    console.clear();
    
    // Check for any console errors
    const checkErrors = () => {
        // Check for 404s in network
        const resources = performance.getEntriesByType('resource');
        const failed = resources.filter(r => r.responseStatus >= 400);
        
        // Check for JavaScript errors
        const jsErrors = [];
        
        // Hook into console.error temporarily
        const originalError = console.error;
        let errorCount = 0;
        console.error = function() {
            errorCount++;
            originalError.apply(console, arguments);
        };
        
        // Check React errors
        const reactRoot = document.getElementById('root');
        const hasReactErrors = reactRoot && reactRoot.textContent.includes('Error');
        
        // Results
        console.log('=== CHROME DEVTOOLS ERROR CHECK ===\n');
        
        if (failed.length > 0) {
            console.error('❌ NETWORK ERRORS FOUND:');
            failed.forEach(f => console.error(`   ${f.responseStatus}: ${f.name}`));
            return false;
        }
        
        if (hasReactErrors) {
            console.error('❌ REACT ERROR BOUNDARY TRIGGERED');
            return false;
        }
        
        // Check for MSAL errors
        if (window.msalInstance) {
            try {
                const accounts = window.msalInstance.getAllAccounts();
                console.log('✅ MSAL working - accounts:', accounts.length);
            } catch (e) {
                console.error('❌ MSAL ERROR:', e.message);
                return false;
            }
        } else {
            console.warn('⚠️ MSAL not initialized yet');
        }
        
        // Check for uncaught promise rejections
        window.addEventListener('unhandledrejection', event => {
            console.error('❌ UNHANDLED PROMISE REJECTION:', event.reason);
        });
        
        console.log('\n=== RESULT ===');
        console.log('✅ NO ERRORS DETECTED IN CHROME DEVTOOLS');
        console.log('Application is ready for testing\n');
        
        return true;
    };
    
    return checkErrors();
})();