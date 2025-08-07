#!/usr/bin/env node

/**
 * Simple Chrome DevTools Debugger
 * 
 * Usage:
 * 1. Start Chrome with: npm run dev:debug
 * 2. Navigate to chrome://inspect in Chrome
 * 3. Click "inspect" on the remote target
 * 4. Use Chrome DevTools Console to run commands like:
 *    - getEventListeners($0)  // For selected element
 *    - getEventListeners(document.querySelector('.widget-header'))
 */

import puppeteer from 'puppeteer';

async function simpleDebug() {
  try {
    console.log('🔍 Simple Chrome DevTools Debugger');
    console.log('=================================\n');
    
    // Connect to Chrome
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages[0];
    
    console.log(`✅ Connected to: ${page.url()}`);
    console.log('\n📝 Instructions:');
    console.log('1. Open Chrome and go to: chrome://inspect');
    console.log('2. Under "Remote Target", click "inspect" on your page');
    console.log('3. In the DevTools Console, you can use:');
    console.log('   - getEventListeners($0) for selected element');
    console.log('   - getEventListeners(document.querySelector(".widget-header"))');
    console.log('   - monitorEvents(element, ["click", "mousedown"])');
    console.log('   - unmonitorEvents(element)');
    console.log('\n✨ Chrome DevTools is now available for debugging!');
    console.log('Press Ctrl+C to exit.\n');
    
    // Keep the script running
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure Chrome is running with:');
    console.log('   npm run dev:debug');
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n👋 Exiting debugger...');
  process.exit(0);
});

simpleDebug();