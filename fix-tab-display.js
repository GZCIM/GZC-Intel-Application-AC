// Fix for tab display issue
// This script will diagnose and potentially fix empty tab names

console.log('🔧 Starting tab display fix...');

// 1. First, let's diagnose the exact issue
function diagnoseProblem() {
  console.log('=== DIAGNOSING TAB DISPLAY ISSUE ===');
  
  // Check if we can find the ProfessionalHeader component's DOM
  const nav = document.querySelector('nav');
  if (!nav) {
    console.error('❌ No navigation element found - header may not be rendering');
    return false;
  }
  
  const buttons = nav.querySelectorAll('button');
  console.log(`Found ${buttons.length} buttons in navigation`);
  
  let emptyButtons = 0;
  let buttonsWithText = 0;
  
  buttons.forEach((btn, index) => {
    const text = btn.textContent?.trim();
    if (!text || text.length === 0) {
      emptyButtons++;
      console.log(`Button ${index}: EMPTY TEXT`, {
        innerHTML: btn.innerHTML,
        style: btn.getAttribute('style'),
        children: Array.from(btn.children).map(child => child.tagName)
      });
    } else {
      buttonsWithText++;
      console.log(`Button ${index}: "${text}"`);
    }
  });
  
  console.log(`Summary: ${buttonsWithText} buttons with text, ${emptyButtons} empty buttons`);
  
  return emptyButtons > 0;
}

// 2. Check if the issue is React state related
function checkReactState() {
  console.log('=== CHECKING REACT STATE ===');
  
  // Try to access React DevTools hook
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools available');
    
    // Look for any React errors
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook.onErrorOrWarning) {
      console.log('React error handling available');
    }
  }
  
  // Check localStorage for tab data
  const layoutKeys = Object.keys(localStorage).filter(key => 
    key.includes('layout') || key.includes('tab')
  );
  
  console.log('Layout-related localStorage keys:', layoutKeys);
  
  layoutKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data && data.tabs) {
        console.log(`Layout data in ${key}:`, data.tabs.map(tab => ({
          id: tab.id,
          name: tab.name,
          hasName: !!tab.name
        })));
      }
    } catch (e) {
      console.log(`Non-JSON data in ${key}:`, localStorage.getItem(key));
    }
  });
}

// 3. Try to force a refresh of the tab data
function forceRefreshTabs() {
  console.log('=== FORCING TAB REFRESH ===');
  
  // Try to trigger any potential refresh mechanisms
  // Look for refresh buttons
  const allButtons = document.querySelectorAll('button');
  const refreshButtons = Array.from(allButtons).filter(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    const title = btn.getAttribute('title')?.toLowerCase() || '';
    return text.includes('refresh') || text.includes('reload') || 
           title.includes('refresh') || title.includes('reload');
  });
  
  console.log(`Found ${refreshButtons.length} potential refresh buttons`);
  
  // Look for layout buttons  
  const layoutButtons = Array.from(allButtons).filter(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    const title = btn.getAttribute('title')?.toLowerCase() || '';
    return text.includes('layout') || title.includes('layout');
  });
  
  console.log(`Found ${layoutButtons.length} potential layout buttons`);
  
  // Try to trigger a re-render by dispatching events
  try {
    // Dispatch a custom event that might trigger a refresh
    window.dispatchEvent(new CustomEvent('tab-refresh-requested'));
    window.dispatchEvent(new CustomEvent('layout-refresh'));
    
    // Try to trigger a resize event (sometimes triggers re-renders)
    window.dispatchEvent(new Event('resize'));
    
    console.log('✅ Dispatched refresh events');
  } catch (e) {
    console.error('Error dispatching events:', e);
  }
}

// 4. Try to directly fix empty buttons by adding fallback text
function applyEmergencyFix() {
  console.log('=== APPLYING EMERGENCY FIX ===');
  
  const nav = document.querySelector('nav');
  if (!nav) {
    console.error('❌ Cannot apply fix - no nav element');
    return false;
  }
  
  const buttons = nav.querySelectorAll('button');
  let fixesApplied = 0;
  
  buttons.forEach((btn, index) => {
    const text = btn.textContent?.trim();
    if (!text || text.length === 0) {
      // Check if this looks like a tab button (has specific styling or indicators)
      const hasTabIndicator = btn.querySelector('[style*="borderRadius: 50%"]');
      const hasTabStyling = btn.getAttribute('style')?.includes('padding: 6px 12px');
      
      if (hasTabIndicator || hasTabStyling) {
        // This looks like a tab button - add fallback text
        const fallbackName = `Tab ${index + 1}`;
        
        // Try to preserve existing styling while adding text
        const existingContent = btn.innerHTML;
        
        // Add text before the indicator
        if (hasTabIndicator) {
          const textSpan = document.createElement('span');
          textSpan.textContent = fallbackName;
          textSpan.style.marginRight = '8px';
          btn.insertBefore(textSpan, btn.firstChild);
        } else {
          btn.textContent = fallbackName;
        }
        
        fixesApplied++;
        console.log(`✅ Applied fix to button ${index}: "${fallbackName}"`);
      }
    }
  });
  
  console.log(`Applied ${fixesApplied} emergency fixes`);
  return fixesApplied > 0;
}

// 5. Check for specific component errors
function checkComponentErrors() {
  console.log('=== CHECKING COMPONENT ERRORS ===');
  
  // Look for React error boundaries
  const errorBoundaries = document.querySelectorAll('[data-react-error-boundary]');
  console.log(`Found ${errorBoundaries.length} React error boundaries`);
  
  // Check if there are any error messages in the DOM
  const errorMessages = document.querySelectorAll('[class*="error"], [class*="Error"]');
  console.log(`Found ${errorMessages.length} potential error elements`);
  
  errorMessages.forEach((el, index) => {
    console.log(`Error element ${index}:`, {
      text: el.textContent?.trim(),
      className: el.className,
      id: el.id
    });
  });
  
  // Check for failed network requests
  const performanceEntries = performance.getEntriesByType('navigation');
  console.log('Navigation timing:', performanceEntries);
  
  const resourceEntries = performance.getEntriesByType('resource');
  const failedRequests = resourceEntries.filter(entry => 
    entry.transferSize === 0 && entry.name.includes('api')
  );
  
  console.log(`Found ${failedRequests.length} potentially failed API requests`);
  failedRequests.forEach(req => {
    console.log('Failed request:', req.name);
  });
}

// Main fix function
function fixTabDisplay() {
  console.log('🚀 Starting comprehensive tab display fix...');
  
  // Step 1: Diagnose the problem
  const hasEmptyTabs = diagnoseProblem();
  
  if (!hasEmptyTabs) {
    console.log('✅ No empty tabs found - display issue may be elsewhere');
    return;
  }
  
  // Step 2: Check React state
  checkReactState();
  
  // Step 3: Check for component errors
  checkComponentErrors();
  
  // Step 4: Try to force refresh
  forceRefreshTabs();
  
  // Wait a bit for potential state updates
  setTimeout(() => {
    // Step 5: Check if the refresh worked
    const stillHasEmptyTabs = diagnoseProblem();
    
    if (stillHasEmptyTabs) {
      console.log('⚠️ Refresh did not fix the issue, applying emergency fix...');
      applyEmergencyFix();
    } else {
      console.log('✅ Refresh fixed the tab display issue!');
    }
  }, 2000);
}

// Auto-run the fix
fixTabDisplay();

// Make available globally for manual use
window.fixTabDisplay = {
  diagnoseProblem,
  checkReactState,
  forceRefreshTabs,
  applyEmergencyFix,
  checkComponentErrors,
  fixTabDisplay
};

console.log('🔧 Tab display fix tools available at window.fixTabDisplay');