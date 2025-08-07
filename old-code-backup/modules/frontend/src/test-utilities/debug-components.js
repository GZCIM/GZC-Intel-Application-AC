// Debug script to check component loading
// Run this in the browser console

console.log('=== Component Loading Debug ===');

// Check if componentRegistry is available
if (typeof componentRegistry !== 'undefined') {
    console.log('Component Registry:', Object.keys(componentRegistry));
} else {
    console.log('Component Registry not found in global scope');
}

// Check localStorage for persisted tabs
const layouts = localStorage.getItem('gzc-intel-layouts');
if (layouts) {
    const parsed = JSON.parse(layouts);
    console.log('Persisted Layouts:', parsed);
    
    // Check each layout's tabs
    parsed.forEach(layout => {
        console.log(`\nLayout: ${layout.name}`);
        layout.tabs.forEach(tab => {
            console.log(`  Tab: ${tab.name} (${tab.id})`);
            console.log(`    Component: ${tab.component}`);
            console.log(`    Type: ${tab.type}`);
        });
    });
}

// Check for UserTabContainer errors
const errors = Array.from(document.querySelectorAll('.text-red-600')).map(el => el.textContent);
if (errors.length > 0) {
    console.log('\nErrors found on page:', errors);
}

// Check console for specific errors
console.log('\n=== Recent Console Errors ===');
console.log('Look for "Failed to load component: UserTabContainer" messages above');

// Try to access the component loader directly
try {
    if (window.__vite__) {
        console.log('\nVite detected, checking module graph...');
    }
} catch (e) {
    console.log('Could not access Vite internals');
}

console.log('\n=== End Debug ===');