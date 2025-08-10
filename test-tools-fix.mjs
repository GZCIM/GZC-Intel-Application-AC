#!/usr/bin/env node

/**
 * Test script to verify the Tools button now has "Add Component" option
 */

import puppeteer from 'puppeteer';

const LOCAL_URL = 'http://localhost:9000';

async function testToolsFix() {
  console.log('🧪 Testing Tools button fix...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1000,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  page.on('console', (msg) => {
    if (msg.text().includes('Component') || msg.text().includes('Tools')) {
      console.log(`[BROWSER] ${msg.text()}`);
    }
  });

  try {
    console.log('📱 Navigating to local dev server...');
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    
    console.log('⏳ Waiting for app to load...');
    await page.waitForSelector('#root', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot before
    await page.screenshot({ path: 'debug-logs/tools-test-before.png', fullPage: true });
    
    // Find and click Tools button
    console.log('🔍 Looking for Tools button...');
    const toolsButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toolsBtn = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('tools')
      );
      return toolsBtn ? {
        found: true,
        text: toolsBtn.textContent
      } : { found: false };
    });
    
    if (!toolsButton.found) {
      console.log('❌ Tools button not found');
      return;
    }
    
    console.log('✅ Found Tools button:', toolsButton.text);
    
    // Click Tools button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toolsBtn = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('tools')
      );
      if (toolsBtn) toolsBtn.click();
    });
    
    console.log('🎯 Clicked Tools button');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take screenshot after click
    await page.screenshot({ path: 'debug-logs/tools-test-dropdown.png', fullPage: true });
    
    // Check if dropdown appeared and has "Add Component"
    const dropdownItems = await page.evaluate(() => {
      // Look for dropdown menu items
      const menuItems = Array.from(document.querySelectorAll('button'));
      const toolsMenuItems = menuItems.filter(item => 
        item.textContent?.includes('Add Component') ||
        item.textContent?.includes('Authorization Debug') ||
        item.textContent?.includes('Bloomberg')
      );
      
      return toolsMenuItems.map(item => ({
        text: item.textContent?.trim(),
        visible: item.offsetParent !== null
      }));
    });
    
    console.log('📋 Dropdown items found:', dropdownItems);
    
    const hasAddComponent = dropdownItems.some(item => 
      item.text?.includes('Add Component') && item.visible
    );
    
    if (hasAddComponent) {
      console.log('✅ SUCCESS: "Add Component" option found in Tools dropdown!');
      
      // Try clicking Add Component
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addComponentBtn = buttons.find(btn => 
          btn.textContent?.includes('Add Component')
        );
        if (addComponentBtn) addComponentBtn.click();
      });
      
      console.log('🎯 Clicked "Add Component"');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if component modal opened
      const modalOpened = await page.evaluate(() => {
        const modals = document.querySelectorAll('.modal, [role="dialog"], .component-portal');
        return modals.length > 0;
      });
      
      await page.screenshot({ path: 'debug-logs/tools-test-modal.png', fullPage: true });
      
      if (modalOpened) {
        console.log('🎉 COMPLETE SUCCESS: Component modal opened from Tools button!');
      } else {
        console.log('⚠️  Partial success: Button exists but modal did not open');
      }
      
    } else {
      console.log('❌ FAILED: "Add Component" option not found in dropdown');
      console.log('Available items:', dropdownItems.map(i => i.text));
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    await page.screenshot({ path: 'debug-logs/tools-test-error.png', fullPage: true });
  } finally {
    console.log('🏁 Test completed');
    await browser.close();
  }
}

testToolsFix().catch(console.error);