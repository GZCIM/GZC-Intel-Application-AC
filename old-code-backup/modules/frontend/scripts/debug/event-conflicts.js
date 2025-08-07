#!/usr/bin/env node

/**
 * Chrome DevTools Event Conflict Debugger
 * Analyzes event listeners on widget elements to identify conflicts
 */

import puppeteer from 'puppeteer';

async function debugEventConflicts() {
  try {
    console.log('🔍 Connecting to Chrome DevTools...');
    
    // Connect to existing Chrome instance
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('localhost:3500')) || pages[0];
    
    console.log(`📄 Connected to: ${page.url()}`);
    
    // Wait for widgets to load
    await page.waitForSelector('.widget-header', { timeout: 5000 }).catch(() => {
      console.log('⚠️  No widgets found yet. Make sure the app is loaded.');
    });

    // Get CDP session for Chrome DevTools Protocol access
    const client = await page.createCDPSession();
    await client.send('Runtime.enable');
    await client.send('DOM.enable');
    
    // First get the widget elements
    const widgetData = await page.evaluate(() => {
      const headers = document.querySelectorAll('.widget-header');
      return Array.from(headers).map((header, index) => ({
        index,
        id: header.id || `widget-${index}`,
        className: header.className
      }));
    });
    
    console.log(`Found ${widgetData.length} widget headers`);
    
    // Analyze event listeners for each widget
    const eventData = {
      widgets: [],
      conflicts: [],
      summary: {}
    };
    
    for (const widget of widgetData) {
      // Get the element's object ID for CDP
      const { objectId } = await client.send('Runtime.evaluate', {
        expression: `document.querySelector('.widget-header:nth-of-type(${widget.index + 1})')`,
        returnByValue: false
      });
      
      if (objectId) {
        // Get event listeners using CDP
        const { listeners } = await client.send('DOMDebugger.getEventListeners', {
          objectId,
          depth: 0,
          pierce: false
        });
        
        // Count listeners by type
        const listenerCounts = {};
        listeners.forEach(listener => {
          const type = listener.type;
          listenerCounts[type] = (listenerCounts[type] || 0) + 1;
        });
        
        // Get parent listeners
        const { objectId: parentId } = await client.send('Runtime.evaluate', {
          expression: `document.querySelector('.widget-header:nth-of-type(${widget.index + 1})').parentElement`,
          returnByValue: false
        });
        
        let parentListenerCounts = {};
        if (parentId) {
          const { listeners: parentListeners } = await client.send('DOMDebugger.getEventListeners', {
            objectId: parentId,
            depth: 0,
            pierce: false
          });
          
          parentListeners.forEach(listener => {
            const type = listener.type;
            parentListenerCounts[type] = (parentListenerCounts[type] || 0) + 1;
          });
        }
        
        const widgetInfo = {
          ...widget,
          listeners: listenerCounts,
          parentListeners: parentListenerCounts
        };
        
        // Check for conflicts
        if (listenerCounts.click && listenerCounts.mousedown) {
          eventData.conflicts.push({
            widget: widget.id,
            type: 'click-mousedown',
            message: 'Both click and mousedown listeners detected'
          });
        }
        
        if ((listenerCounts.dragstart || listenerCounts.drag) && listenerCounts.click) {
          eventData.conflicts.push({
            widget: widget.id,
            type: 'drag-click',
            message: 'Both drag and click listeners detected - potential conflict'
          });
        }
        
        eventData.widgets.push(widgetInfo);
      }
    }
    
    eventData.summary = {
      totalWidgets: widgetData.length,
      totalConflicts: eventData.conflicts.length,
      timestamp: new Date().toISOString()
    };

    // Display results
    console.log('\n📊 Event Analysis Results:');
    console.log('========================\n');
    
    console.log(`Total Widgets Found: ${eventData.summary.totalWidgets}`);
    console.log(`Conflicts Detected: ${eventData.summary.totalConflicts}\n`);

    // Show widget details
    eventData.widgets.forEach(widget => {
      console.log(`📦 Widget: ${widget.id}`);
      console.log(`   Class: ${widget.className}`);
      
      if (Object.keys(widget.listeners).length > 0) {
        console.log('   Event Listeners:');
        Object.entries(widget.listeners).forEach(([event, count]) => {
          console.log(`     - ${event}: ${count} listener(s)`);
        });
      }
      
      if (Object.keys(widget.parentListeners).length > 0) {
        console.log('   Parent Listeners:');
        Object.entries(widget.parentListeners).forEach(([event, count]) => {
          console.log(`     - ${event}: ${count} listener(s)`);
        });
      }
      console.log('');
    });

    // Show conflicts
    if (eventData.conflicts.length > 0) {
      console.log('⚠️  Conflicts Found:');
      console.log('==================');
      eventData.conflicts.forEach(conflict => {
        console.log(`❌ ${conflict.widget}: ${conflict.message}`);
      });
    } else {
      console.log('✅ No event conflicts detected!');
    }

    // Don't close the browser connection
    console.log('\n✨ Debug session complete. Browser connection maintained.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Tips:');
    console.log('1. Make sure Chrome is running with: npm run dev:debug');
    console.log('2. Ensure the app is loaded at http://localhost:3500');
    console.log('3. Check that port 9222 is available');
  }
}

// Run the debugger
debugEventConflicts();