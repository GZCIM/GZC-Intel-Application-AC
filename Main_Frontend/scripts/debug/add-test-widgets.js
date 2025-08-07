#!/usr/bin/env node

/**
 * Add test widgets to the Portfolio page
 */

import puppeteer from 'puppeteer';

async function addTestWidgets() {
  try {
    console.log('🔧 Adding test widgets...');
    
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages[0];
    
    // Add some test widgets by manipulating localStorage
    await page.evaluate(() => {
      // Sample layout data
      const testLayout = {
        lg: [
          { i: 'widget-1', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 2 },
          { i: 'widget-2', x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 2 },
          { i: 'widget-3', x: 0, y: 4, w: 4, h: 3, minW: 2, minH: 2 },
          { i: 'widget-4', x: 4, y: 4, w: 4, h: 3, minW: 2, minH: 2 },
          { i: 'widget-5', x: 8, y: 4, w: 4, h: 3, minW: 2, minH: 2 }
        ]
      };
      
      // Save to localStorage
      localStorage.setItem('dashboardLayout', JSON.stringify(testLayout));
      
      // Also set collapse states
      const collapseStates = {
        'widget-1': false,
        'widget-2': false,
        'widget-3': false,
        'widget-4': false,
        'widget-5': false
      };
      localStorage.setItem('widgetCollapseStates', JSON.stringify(collapseStates));
      
      console.log('Test layout saved to localStorage');
      
      // Reload to apply changes
      location.reload();
    });
    
    console.log('✅ Test widgets added! Page will reload...');
    
    // Wait for reload
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check results
    const widgetCount = await page.evaluate(() => {
      return {
        gridItems: document.querySelectorAll('.react-grid-item').length,
        widgetHeaders: document.querySelectorAll('.widget-header').length,
        localStorage: {
          layout: localStorage.getItem('dashboardLayout') ? 'exists' : 'missing',
          collapseStates: localStorage.getItem('widgetCollapseStates') ? 'exists' : 'missing'
        }
      };
    });
    
    console.log('Widget count after reload:', widgetCount);
    
    // Take screenshot
    await page.screenshot({ path: 'widgets-added.png' });
    console.log('📸 Screenshot saved as widgets-added.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addTestWidgets();