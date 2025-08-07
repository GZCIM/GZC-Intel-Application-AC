#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testDebugging() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages[0];
  
  console.log('🔍 Chrome DevTools Debugging Test');
  console.log('==================================\n');
  
  // Get widget info
  const widgetInfo = await page.evaluate(() => {
    const widgets = document.querySelectorAll('.widget-header');
    return {
      widgetCount: widgets.length,
      widgetTitles: Array.from(widgets).map(w => w.textContent?.trim())
    };
  });
  
  console.log('Found widgets:', widgetInfo);
  
  // Simulate clicking on a widget header
  if (widgetInfo.widgetCount > 0) {
    console.log('\n📝 Testing event listeners on first widget...');
    
    // Click on the first widget header
    await page.evaluate(() => {
      const firstWidget = document.querySelector('.widget-header');
      if (firstWidget) {
        console.log('Clicking on widget:', firstWidget.textContent);
        firstWidget.click();
      }
    });
    
    console.log('✅ Clicked on first widget header');
    
    // Now let's check if we can drag
    console.log('\n🎯 Testing drag simulation...');
    
    const firstWidget = await page.$('.widget-header');
    if (firstWidget) {
      const box = await firstWidget.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.up();
        console.log('✅ Simulated drag action');
      }
    }
  }
  
  console.log('\n💡 Chrome DevTools Instructions:');
  console.log('==================================');
  console.log('1. Open Chrome and go to: chrome://inspect');
  console.log('2. Click "inspect" on the remote target');
  console.log('3. In the DevTools Console, try these commands:');
  console.log('\n// Check event listeners on a widget header:');
  console.log('getEventListeners(document.querySelector(".widget-header"))');
  console.log('\n// Monitor events in real-time:');
  console.log('monitorEvents(document.querySelector(".widget-header"), ["click", "mousedown", "dragstart"])');
  console.log('\n// Check all grid items:');
  console.log('$$(".react-grid-item").map(el => ({ id: el.getAttribute("data-grid"), listeners: getEventListeners(el) }))');
  console.log('\n// Find elements with conflicting listeners:');
  console.log('$$("*").filter(el => { const l = getEventListeners(el); return l.click && l.mousedown; })');
  
  await page.screenshot({ path: 'debugging-test.png' });
  console.log('\n📸 Screenshot saved as debugging-test.png');
  console.log('\n✨ Chrome DevTools is ready for debugging!');
}

testDebugging().catch(console.error);