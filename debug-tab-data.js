// Debug script to check tab data loading
// Paste this into the browser console

console.log('🔍 Debugging tab data loading...');

// Check React state for tabs
function debugTabState() {
  console.log('=== REACT STATE DEBUGGING ===');
  
  // Try to access React DevTools
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools available');
    
    // Try to get React fiber instances
    try {
      const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      // Find all React fibers
      if (hook.getFiberRoots) {
        const roots = Array.from(hook.getFiberRoots(1));
        console.log(`Found ${roots.length} React roots`);
        
        roots.forEach((root, index) => {
          console.log(`Root ${index}:`, root);
        });
      }
      
    } catch (e) {
      console.error('Error accessing React DevTools:', e);
    }
  }
  
  // Check for React instances in window
  const reactKeys = Object.keys(window).filter(key => 
    key.includes('React') || key.includes('react') || key.includes('_react')
  );
  
  console.log('React-related window keys:', reactKeys);
  
  reactKeys.forEach(key => {
    console.log(`${key}:`, window[key]);
  });
}

// Check localStorage and sessionStorage for tab data
function debugStorageData() {
  console.log('=== STORAGE DATA DEBUGGING ===');
  
  // Check localStorage
  console.log('LocalStorage keys:');
  Object.keys(localStorage).forEach(key => {
    if (key.includes('tab') || key.includes('layout') || key.includes('gzc')) {
      console.log(`  ${key}:`, localStorage.getItem(key));
    }
  });
  
  // Check sessionStorage  
  console.log('SessionStorage keys:');
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('tab') || key.includes('layout') || key.includes('gzc')) {
      console.log(`  ${key}:`, sessionStorage.getItem(key));
    }
  });
}

// Check DOM elements for tab content
function debugDOMElements() {
  console.log('=== DOM ELEMENTS DEBUGGING ===');
  
  // Look for navigation elements
  const nav = document.querySelector('nav');
  if (nav) {
    console.log('Found nav element:', nav);
    console.log('Nav innerHTML:', nav.innerHTML);
    console.log('Nav children:', nav.children);
    
    // Look for buttons in nav
    const buttons = nav.querySelectorAll('button');
    console.log(`Found ${buttons.length} buttons in nav`);
    
    buttons.forEach((btn, index) => {
      console.log(`Button ${index}:`, {
        textContent: btn.textContent?.trim() || 'NO TEXT',
        innerHTML: btn.innerHTML,
        style: btn.getAttribute('style'),
        className: btn.className,
        id: btn.id
      });
    });
  } else {
    console.log('❌ No nav element found');
  }
  
  // Look for any elements with text content that might be tabs
  const allButtons = document.querySelectorAll('button');
  console.log(`Found ${allButtons.length} total buttons on page`);
  
  allButtons.forEach((btn, index) => {
    const text = btn.textContent?.trim();
    if (text && text.length > 0 && text.length < 50) {
      console.log(`Button ${index} has text:`, text);
    }
  });
  
  // Check for specific indicators
  const tabIndicators = document.querySelectorAll('[style*="borderRadius: 50%"]');
  console.log(`Found ${tabIndicators.length} potential tab indicators`);
  
  tabIndicators.forEach((indicator, index) => {
    console.log(`Indicator ${index}:`, {
      parentElement: indicator.parentElement,
      parentText: indicator.parentElement?.textContent?.trim(),
      style: indicator.getAttribute('style')
    });
  });
}

// Check for API calls and network activity
function debugNetworkActivity() {
  console.log('=== NETWORK ACTIVITY DEBUGGING ===');
  
  // Override fetch to monitor API calls
  const originalFetch = window.fetch;
  const fetchCalls = [];
  
  window.fetch = function(...args) {
    const url = args[0];
    console.log('🌐 Fetch intercepted:', url);
    fetchCalls.push({ url, timestamp: new Date() });
    
    return originalFetch.apply(this, args).then(response => {
      console.log('📡 Fetch response:', url, response.status);
      return response;
    }).catch(error => {
      console.error('❌ Fetch error:', url, error);
      return Promise.reject(error);
    });
  };
  
  // Check recent fetch calls
  setTimeout(() => {
    console.log('Recent fetch calls:', fetchCalls);
  }, 2000);
  
  // Look for any ongoing XHR requests
  const openRequests = [];
  const originalOpen = XMLHttpRequest.prototype.open;
  
  XMLHttpRequest.prototype.open = function(...args) {
    console.log('🌐 XHR intercepted:', args);
    openRequests.push({ method: args[0], url: args[1], timestamp: new Date() });
    return originalOpen.apply(this, args);
  };
  
  setTimeout(() => {
    console.log('Recent XHR calls:', openRequests);
  }, 2000);
}

// Check console for relevant errors
function debugConsoleMessages() {
  console.log('=== CONSOLE MESSAGES DEBUGGING ===');
  
  // Store original console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const messages = {
    logs: [],
    errors: [],
    warnings: []
  };
  
  // Override console methods
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('tab') || message.includes('Tab') || message.includes('layout')) {
      messages.logs.push({ message, timestamp: new Date() });
    }
    return originalLog.apply(console, args);
  };
  
  console.error = function(...args) {
    const message = args.join(' ');
    messages.errors.push({ message, timestamp: new Date() });
    return originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    messages.warnings.push({ message, timestamp: new Date() });
    return originalWarn.apply(console, args);
  };
  
  // Report collected messages after a delay
  setTimeout(() => {
    console.log('Collected tab-related logs:', messages.logs);
    console.log('Collected errors:', messages.errors);
    console.log('Collected warnings:', messages.warnings);
  }, 3000);
}

// Check if specific React hooks are working
function debugReactHooks() {
  console.log('=== REACT HOOKS DEBUGGING ===');
  
  // Try to find React component instances
  try {
    // Look for elements with React props
    const allElements = document.querySelectorAll('*');
    let reactElements = 0;
    
    for (let el of allElements) {
      const keys = Object.keys(el);
      const hasReactProps = keys.some(key => key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalInstance'));
      if (hasReactProps) {
        reactElements++;
        if (reactElements < 5) { // Only log first few
          console.log('Element with React props:', el, keys.filter(k => k.includes('react')));
        }
      }
    }
    
    console.log(`Found ${reactElements} elements with React properties`);
    
  } catch (e) {
    console.error('Error checking React elements:', e);
  }
}

// Main debug function
function runTabDataDebug() {
  console.log('🚀 Starting tab data debugging...');
  
  debugTabState();
  debugStorageData();
  debugDOMElements();
  debugNetworkActivity();
  debugConsoleMessages();
  debugReactHooks();
  
  console.log('✅ Tab data debugging setup complete. Watch the console for ongoing logs.');
  
  // Set up a periodic check
  const intervalId = setInterval(() => {
    console.log('🔄 Periodic check...');
    debugDOMElements();
  }, 5000);
  
  // Stop periodic check after 30 seconds
  setTimeout(() => {
    clearInterval(intervalId);
    console.log('🛑 Stopped periodic debugging');
  }, 30000);
}

// Auto-run
runTabDataDebug();

// Make available globally
window.tabDataDebug = {
  debugTabState,
  debugStorageData,
  debugDOMElements,
  debugNetworkActivity,
  debugConsoleMessages,
  debugReactHooks,
  runTabDataDebug
};

console.log('🔧 Tab data debugging tools available at window.tabDataDebug');