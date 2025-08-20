// Comprehensive debugging for GZC Intel Application tab issue
// Run this in the browser console

console.log('🔍 Starting comprehensive tab debugging...');

// Function to wait for elements to appear
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const existingElement = document.querySelector(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    const observer = new MutationObserver((mutations) => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// 1. Check if the application is loading correctly
async function checkApplicationLoading() {
  console.log('=== CHECKING APPLICATION LOADING ===');
  
  // Check if React root is mounted
  const reactRootElement = document.getElementById('root');
  if (!reactRootElement) {
    console.error('❌ No React root element found (#root)');
    return false;
  }
  
  console.log('✅ React root element found');
  console.log('Root element children count:', reactRootElement.children.length);
  console.log('Root element content preview:', reactRootElement.innerHTML.substring(0, 200));
  
  // Wait for navigation to appear
  console.log('🔄 Waiting for navigation element...');
  const nav = await waitForElement('nav');
  
  if (!nav) {
    console.error('❌ Navigation element not found after waiting');
    return false;
  }
  
  console.log('✅ Navigation element found');
  return true;
}

// 2. Check authentication state
function checkAuthenticationState() {
  console.log('=== CHECKING AUTHENTICATION STATE ===');
  
  // Check for MSAL instance
  if (window.msalInstance) {
    console.log('✅ MSAL instance found');
    try {
      const accounts = window.msalInstance.getAllAccounts();
      console.log('MSAL accounts:', accounts.length);
      
      if (accounts.length > 0) {
        console.log('✅ User is authenticated');
        console.log('Primary account:', accounts[0]);
      } else {
        console.log('⚠️ No authenticated accounts found');
      }
    } catch (e) {
      console.error('❌ Error accessing MSAL accounts:', e);
    }
  } else {
    console.log('⚠️ MSAL instance not found');
  }
  
  // Check for authentication-related elements
  const loginModal = document.querySelector('[class*="modal"], [id*="login"]');
  if (loginModal) {
    const isVisible = getComputedStyle(loginModal).display !== 'none';
    console.log(`${isVisible ? '⚠️' : 'ℹ️'} Login modal found, visible: ${isVisible}`);
  }
}

// 3. Deep dive into React component state
function checkReactComponentState() {
  console.log('=== CHECKING REACT COMPONENT STATE ===');
  
  // Check for React DevTools
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools hook available');
    
    try {
      const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      // Check for React Fiber roots
      if (hook.getFiberRoots) {
        const roots = Array.from(hook.getFiberRoots(1));
        console.log(`Found ${roots.length} React fiber roots`);
        
        // Try to inspect the first root
        if (roots.length > 0) {
          const root = roots[0];
          console.log('First React root:', root);
          
          // Try to find components
          if (root.current) {
            console.log('Root current:', root.current);
          }
        }
      }
    } catch (e) {
      console.error('Error inspecting React DevTools:', e);
    }
  }
  
  // Check for common React patterns in the DOM
  const reactElements = document.querySelectorAll('[data-reactroot], [data-react-checksum]');
  console.log(`Found ${reactElements.length} elements with React attributes`);
  
  // Look for elements that might contain React fiber references
  const allElements = document.querySelectorAll('*');
  let elementsWithReactProps = 0;
  
  for (let i = 0; i < Math.min(allElements.length, 100); i++) {
    const el = allElements[i];
    const keys = Object.getOwnPropertyNames(el);
    const hasReactFiber = keys.some(key => 
      key.includes('__reactFiber') || key.includes('_reactInternalFiber') || key.includes('__reactInternalInstance')
    );
    
    if (hasReactFiber) {
      elementsWithReactProps++;
      if (elementsWithReactProps <= 3) {
        console.log(`Element with React fiber:`, el.tagName, keys.filter(k => k.includes('react')));
      }
    }
  }
  
  console.log(`Found ${elementsWithReactProps} elements with React fiber properties`);
}

// 4. Check for JavaScript errors
function checkJavaScriptErrors() {
  console.log('=== CHECKING FOR JAVASCRIPT ERRORS ===');
  
  const errorStore = [];
  
  // Override error handlers to catch errors
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    errorStore.push({ type: 'error', message, timestamp: new Date() });
    originalError.apply(console, args);
  };
  
  const originalWarn = console.warn;
  console.warn = function(...args) {
    const message = args.join(' ');
    errorStore.push({ type: 'warn', message, timestamp: new Date() });
    originalWarn.apply(console, args);
  };
  
  // Check for uncaught errors
  window.addEventListener('error', (event) => {
    errorStore.push({
      type: 'uncaught',
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      timestamp: new Date()
    });
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    errorStore.push({
      type: 'promise_rejection',
      message: event.reason?.toString() || 'Unhandled promise rejection',
      timestamp: new Date()
    });
  });
  
  // Return error check function
  return function() {
    console.log('JavaScript errors collected:', errorStore);
    return errorStore;
  };
}

// 5. Check network requests for tab data
function checkNetworkRequests() {
  console.log('=== CHECKING NETWORK REQUESTS ===');
  
  const networkLog = [];
  
  // Override fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const startTime = Date.now();
    
    console.log('🌐 Fetch request:', url);
    networkLog.push({ type: 'fetch', url, startTime });
    
    return originalFetch.apply(this, args)
      .then(response => {
        const endTime = Date.now();
        console.log(`📡 Fetch response: ${url} - ${response.status} (${endTime - startTime}ms)`);
        networkLog.push({ 
          type: 'fetch_response', 
          url, 
          status: response.status, 
          duration: endTime - startTime,
          ok: response.ok
        });
        return response;
      })
      .catch(error => {
        const endTime = Date.now();
        console.error(`❌ Fetch error: ${url} - ${error.message} (${endTime - startTime}ms)`);
        networkLog.push({ 
          type: 'fetch_error', 
          url, 
          error: error.message, 
          duration: endTime - startTime
        });
        throw error;
      });
  };
  
  // Check for existing network requests
  const performanceEntries = performance.getEntriesByType('resource');
  const apiRequests = performanceEntries.filter(entry => 
    entry.name.includes('/api/') || 
    entry.name.includes('preferences') || 
    entry.name.includes('tabs')
  );
  
  console.log(`Found ${apiRequests.length} API-related requests in performance entries`);
  apiRequests.forEach(req => {
    console.log('API request:', {
      name: req.name,
      duration: req.duration,
      transferSize: req.transferSize,
      responseEnd: req.responseEnd
    });
  });
  
  return function() {
    console.log('Network requests log:', networkLog);
    return networkLog;
  };
}

// 6. Check specific tab elements and styling
function checkTabElements() {
  console.log('=== CHECKING TAB ELEMENTS ===');
  
  const nav = document.querySelector('nav');
  if (!nav) {
    console.error('❌ No nav element found');
    return;
  }
  
  console.log('✅ Nav element found');
  console.log('Nav innerHTML (first 500 chars):', nav.innerHTML.substring(0, 500));
  
  const buttons = nav.querySelectorAll('button');
  console.log(`Found ${buttons.length} buttons in nav`);
  
  buttons.forEach((btn, index) => {
    const computedStyle = window.getComputedStyle(btn);
    const text = btn.textContent?.trim();
    
    console.log(`Button ${index}:`, {
      text: text || 'NO TEXT',
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      color: computedStyle.color,
      fontSize: computedStyle.fontSize,
      fontFamily: computedStyle.fontFamily,
      textIndent: computedStyle.textIndent,
      overflow: computedStyle.overflow,
      whiteSpace: computedStyle.whiteSpace,
      innerHTML: btn.innerHTML.substring(0, 100),
      children: Array.from(btn.children).map(child => ({
        tagName: child.tagName,
        textContent: child.textContent?.trim(),
        className: child.className
      }))
    });
    
    // Check if button has click handler
    const hasClickHandler = btn.onclick !== null || btn.getAttribute('onclick') !== null;
    console.log(`  Has click handler: ${hasClickHandler}`);
    
    // Check for React props
    const keys = Object.getOwnPropertyNames(btn);
    const reactKeys = keys.filter(k => k.includes('react') || k.includes('__'));
    if (reactKeys.length > 0) {
      console.log(`  React keys: ${reactKeys.slice(0, 3).join(', ')}`);
    }
  });
}

// Main debugging function
async function runComprehensiveDebug() {
  console.log('🚀 Starting comprehensive debug sequence...');
  
  // Store error checker
  const getErrors = checkJavaScriptErrors();
  const getNetworkLog = checkNetworkRequests();
  
  try {
    // Step 1: Check basic application loading
    const appLoaded = await checkApplicationLoading();
    if (!appLoaded) {
      console.error('❌ Application failed to load properly');
      return;
    }
    
    // Step 2: Check authentication
    checkAuthenticationState();
    
    // Step 3: Check React state
    checkReactComponentState();
    
    // Step 4: Check tab elements
    checkTabElements();
    
    // Wait a bit for any async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 5: Check for errors that occurred during debugging
    const errors = getErrors();
    const networkLog = getNetworkLog();
    
    console.log('=== DEBUG SUMMARY ===');
    console.log(`JavaScript errors: ${errors.length}`);
    console.log(`Network requests logged: ${networkLog.length}`);
    
    if (errors.length > 0) {
      console.log('Recent errors:');
      errors.slice(-5).forEach(error => {
        console.log(`  ${error.type}: ${error.message}`);
      });
    }
    
    if (networkLog.length > 0) {
      console.log('Recent network activity:');
      networkLog.slice(-5).forEach(req => {
        console.log(`  ${req.type}: ${req.url}`);
      });
    }
    
    console.log('✅ Comprehensive debugging complete');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Auto-run comprehensive debug
runComprehensiveDebug();

// Make tools available globally
window.comprehensiveTabDebug = {
  checkApplicationLoading,
  checkAuthenticationState,
  checkReactComponentState,
  checkJavaScriptErrors,
  checkNetworkRequests,
  checkTabElements,
  runComprehensiveDebug
};

console.log('🔧 Comprehensive tab debugging tools available at window.comprehensiveTabDebug');