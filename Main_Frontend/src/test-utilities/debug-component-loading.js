// Debug script to check component loading
console.log('=== COMPONENT LOADING DEBUG ===');

// Check if modules are being loaded
if (window.__vite_ssr_dynamic_import_support__) {
  console.log('✓ Vite dynamic import support detected');
} else {
  console.log('✗ No Vite dynamic import support');
}

// Try to manually import the components
console.log('\n--- Testing imports ---');

// Test 1: UserTabContainer
import('/src/components/UserTabContainer.tsx')
  .then(module => {
    console.log('✓ UserTabContainer loaded:', module);
  })
  .catch(err => {
    console.error('✗ UserTabContainer failed:', err.message);
    console.error('Full error:', err);
  });

// Test 2: DynamicCanvas
import('/src/components/canvas/DynamicCanvas.tsx')
  .then(module => {
    console.log('✓ DynamicCanvas loaded:', module);
  })
  .catch(err => {
    console.error('✗ DynamicCanvas failed:', err.message);
  });

// Test 3: Portfolio
import('/src/components/portfolio/Portfolio.tsx')
  .then(module => {
    console.log('✓ Portfolio loaded:', module);
  })
  .catch(err => {
    console.error('✗ Portfolio failed:', err.message);
  });

// Check component registry
setTimeout(() => {
  console.log('\n--- Component Registry Check ---');
  // Look for the registry in the global scope
  const registryKeys = Object.keys(window).filter(k => k.includes('registry') || k.includes('Registry'));
  console.log('Registry-related keys in window:', registryKeys);
}, 1000);