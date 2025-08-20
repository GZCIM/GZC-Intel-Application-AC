import { chromium } from 'playwright';
import fs from 'fs';

async function debugTabs() {
  console.log('🔍 Starting tab debugging...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true,
    args: ['--disable-web-security', '--allow-running-insecure-content']
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Listen to console logs
    page.on('console', msg => {
      console.log(`🖥️  Console [${msg.type()}]:`, msg.text());
    });
    
    // Listen to errors
    page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });
    
    // Navigate to the application
    console.log('📡 Navigating to application...');
    await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    console.log('🔎 Checking for tab elements...');
    
    // Check if there are any tab elements
    const tabElements = await page.locator('[role="tab"], .tab, [class*="tab"]').all();
    console.log(`Found ${tabElements.length} potential tab elements`);
    
    // Look for the specific tab structure from TabBar.tsx
    const tabContainers = await page.locator('div[style*="display: flex"][style*="gap: 4px"]').all();
    console.log(`Found ${tabContainers.length} tab container elements`);
    
    // Get all text content in tab-like elements
    for (let i = 0; i < tabContainers.length; i++) {
      const container = tabContainers[i];
      const text = await container.textContent();
      const html = await container.innerHTML();
      console.log(`Tab container ${i}:`, {
        text: text?.trim() || 'NO TEXT',
        hasSpan: html.includes('<span'),
        innerHTML: html.substring(0, 200) + '...'
      });
    }
    
    // Look for spans that should contain tab names
    const spanElements = await page.locator('span[style*="fontSize: 12px"]').all();
    console.log(`Found ${spanElements.length} span elements with tab styling`);
    
    for (let i = 0; i < spanElements.length; i++) {
      const span = spanElements[i];
      const text = await span.textContent();
      const computed = await span.evaluate(el => ({
        display: getComputedStyle(el).display,
        visibility: getComputedStyle(el).visibility,
        opacity: getComputedStyle(el).opacity,
        color: getComputedStyle(el).color,
        fontSize: getComputedStyle(el).fontSize
      }));
      console.log(`Span ${i}:`, { 
        text: text?.trim() || 'EMPTY',
        computed 
      });
    }
    
    // Check for React errors in the console
    const logs = await page.evaluate(() => {
      const logs = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      console.log = (...args) => {
        logs.push({ type: 'log', message: args.join(' ') });
        originalLog(...args);
      };
      
      console.error = (...args) => {
        logs.push({ type: 'error', message: args.join(' ') });
        originalError(...args);
      };
      
      console.warn = (...args) => {
        logs.push({ type: 'warn', message: args.join(' ') });
        originalWarn(...args);
      };
      
      return logs;
    });
    
    // Check for React DevTools
    const hasReact = await page.evaluate(() => {
      return typeof window.React !== 'undefined' || 
             typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';
    });
    
    console.log('React available:', hasReact);
    
    // Check TabLayout context state
    const tabState = await page.evaluate(() => {
      try {
        // Try to access React DevTools
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (hook) {
          const reactInstances = hook.getFiberRoots ? Array.from(hook.getFiberRoots(1)) : [];
          console.log('React instances found:', reactInstances.length);
        }
        
        // Check for any global state
        return {
          windowKeys: Object.keys(window).filter(k => k.includes('react') || k.includes('tab')),
          localStorageKeys: Object.keys(localStorage).filter(k => k.includes('tab') || k.includes('layout')),
          hasReactDevTools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('Tab State:', tabState);
    
    // Check localStorage for saved tabs
    const localStorage = await page.evaluate(() => {
      const keys = Object.keys(window.localStorage);
      const tabKeys = keys.filter(k => k.includes('tab') || k.includes('layout'));
      const result = {};
      tabKeys.forEach(key => {
        try {
          const value = window.localStorage.getItem(key);
          result[key] = JSON.parse(value);
        } catch (e) {
          result[key] = value;
        }
      });
      return result;
    });
    
    console.log('LocalStorage tab data:', localStorage);
    
    // Network requests check
    console.log('🌐 Checking network requests...');
    
    // Check for API calls to preferences/tabs
    page.route('**/api/preferences/tabs', route => {
      console.log('📡 Intercepted tabs API call:', route.request().url());
      route.continue();
    });
    
    // Take a screenshot
    await page.screenshot({ path: '/Users/mikaeleage/GZC Intel Application AC/debug-tabs-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-tabs-screenshot.png');
    
    // Wait for user interaction
    console.log('🔍 Browser opened for manual inspection. Check the DevTools...');
    console.log('Press any key to close...');
    
    // Keep the browser open for manual inspection
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugTabs().catch(console.error);