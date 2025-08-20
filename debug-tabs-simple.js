// Simple debugging script to check tab state
// Copy and paste this into Chrome DevTools console

console.log('🔍 Starting tab debugging...');

// Function to analyze tabs
function analyzeTabElements() {
  console.log('=== TAB ELEMENT ANALYSIS ===');
  
  // Look for tab elements by multiple selectors
  const selectors = [
    '[role="tab"]',
    '.tab',
    '[class*="tab"]',
    'div[style*="display: flex"][style*="gap: 4px"]',
    'span[style*="fontSize: 12px"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`Selector "${selector}": ${elements.length} elements found`);
    
    elements.forEach((el, index) => {
      const computedStyle = getComputedStyle(el);
      console.log(`  Element ${index}:`, {
        tagName: el.tagName,
        textContent: el.textContent?.trim() || 'NO TEXT',
        innerHTML: el.innerHTML.substring(0, 100) + '...',
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        className: el.className,
        id: el.id
      });
    });
  });
}

// Function to check React component state
function checkReactState() {
  console.log('=== REACT STATE ANALYSIS ===');
  
  // Check if React DevTools is available
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools hook found');
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    
    if (hook.getFiberRoots) {
      const roots = Array.from(hook.getFiberRoots(1));
      console.log(`Found ${roots.length} React root(s)`);
    }
  } else {
    console.log('❌ React DevTools hook not found');
  }
  
  // Check for React on window
  if (window.React) {
    console.log('✅ React found on window');
  } else {
    console.log('❌ React not found on window');
  }
}

// Function to check localStorage and state
function checkStorageAndState() {
  console.log('=== STORAGE ANALYSIS ===');
  
  // Check localStorage for tab data
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.includes('tab') || key.includes('layout') || key.includes('gzc')
  );
  
  console.log('LocalStorage keys:', localStorageKeys);
  
  localStorageKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      console.log(`  ${key}:`, JSON.parse(value));
    } catch (e) {
      console.log(`  ${key}:`, value);
    }
  });
  
  // Check sessionStorage
  const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('tab') || key.includes('layout') || key.includes('gzc')
  );
  
  console.log('SessionStorage keys:', sessionStorageKeys);
  
  sessionStorageKeys.forEach(key => {
    try {
      const value = sessionStorage.getItem(key);
      console.log(`  ${key}:`, JSON.parse(value));
    } catch (e) {
      console.log(`  ${key}:`, value);
    }
  });
}

// Function to check console errors
function checkConsoleErrors() {
  console.log('=== CONSOLE ERROR ANALYSIS ===');
  
  // Override console methods to catch errors
  const originalError = console.error;
  const originalWarn = console.warn;
  const errors = [];
  const warnings = [];
  
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    warnings.push(args.join(' '));
    originalWarn.apply(console, args);
  };
  
  // Return collected errors and warnings after a delay
  setTimeout(() => {
    console.log('Collected errors:', errors);
    console.log('Collected warnings:', warnings);
  }, 1000);
}

// Function to check network requests
function checkNetworkRequests() {
  console.log('=== NETWORK REQUEST ANALYSIS ===');
  
  // Check if there are any fetch calls to API
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    const url = args[0];
    console.log('🌐 Fetch request:', url);
    
    return originalFetch.apply(this, args).then(response => {
      console.log('📡 Fetch response:', url, response.status);
      return response;
    });
  };
}

// Function to try to trigger tab state
function triggerTabRefresh() {
  console.log('=== TRIGGERING TAB REFRESH ===');
  
  // Try to find and click elements that might trigger tab updates
  const refreshButtons = document.querySelectorAll('button, [role="button"]');
  console.log(`Found ${refreshButtons.length} clickable elements`);
  
  // Look for specific refresh or layout buttons
  const layoutButtons = Array.from(refreshButtons).filter(btn => 
    btn.textContent?.includes('Layout') || 
    btn.textContent?.includes('Refresh') ||
    btn.getAttribute('title')?.includes('Layout')
  );
  
  console.log(`Found ${layoutButtons.length} potential layout buttons`);
  layoutButtons.forEach(btn => {
    console.log('Layout button:', btn.textContent || btn.getAttribute('title'), btn);
  });
}

// Run all analysis functions
function runCompleteAnalysis() {
  console.log('🚀 Running complete tab analysis...');
  
  analyzeTabElements();
  checkReactState();
  checkStorageAndState();
  checkConsoleErrors();
  checkNetworkRequests();
  triggerTabRefresh();
  
  console.log('✅ Analysis complete. Check the logs above for details.');
}

// Auto-run analysis
runCompleteAnalysis();

// Export functions for manual use
window.tabDebug = {
  analyzeTabElements,
  checkReactState,
  checkStorageAndState,
  checkConsoleErrors,
  checkNetworkRequests,
  triggerTabRefresh,
  runCompleteAnalysis
};

console.log('🔧 Tab debugging tools available at window.tabDebug');