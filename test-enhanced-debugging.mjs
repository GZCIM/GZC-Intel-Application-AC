#!/usr/bin/env node

/**
 * Enhanced debugging test for multiple component issue
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function testEnhancedDebugging() {
  console.log('🔍 Testing enhanced debugging for multiple components...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 2000,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console logs for debugging
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('UPDATE TAB CALLED') || 
        text.includes('UPDATED LAYOUT') ||
        text.includes('UPDATED TAB COMPONENTS') ||
        text.includes('TabLayoutManager') ||
        text.includes('DynamicCanvas') ||
        text.includes('ProfessionalHeader') ||
        text.includes('Component selected')) {
      console.log(`[DEBUG] ${text}`);
    }
  });

  try {
    console.log('📱 Loading production app...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    await page.waitForSelector('#root', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🎯 Adding FIRST component...');
    
    // Open Tools menu
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toolsBtn = buttons.find(btn => btn.textContent?.includes('Tools'));
      if (toolsBtn) {
        console.log('Clicking Tools button...');
        toolsBtn.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click Add Component  
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => btn.textContent?.includes('Add Component'));
      if (addBtn) {
        console.log('Clicking Add Component...');
        addBtn.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Select first component
    await page.evaluate(() => {
      const selectors = ['.component-item', '.component-card', '.modal button'];
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Clicking first component via ${selector}...`);
          elements[0].click();
          break;
        }
      }
    });
    
    console.log('⏳ Waiting 5 seconds for first component to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check status after first component
    const firstStatus = await page.evaluate(() => {
      const gridItems = document.querySelectorAll('.react-grid-item, .grid-item, [data-grid]');
      return {
        gridComponents: gridItems.length,
        timestamp: new Date().toISOString()
      };
    });
    
    console.log('📊 First component result:', firstStatus);
    
    if (firstStatus.gridComponents === 0) {
      console.log('❌ First component failed - stopping test');
      return;
    }
    
    console.log('✅ First component working, testing second...');
    
    // Add SECOND component
    console.log('🎯 Adding SECOND component...');
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toolsBtn = buttons.find(btn => btn.textContent?.includes('Tools'));
      if (toolsBtn) {
        console.log('Clicking Tools for second component...');
        toolsBtn.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => btn.textContent?.includes('Add Component'));
      if (addBtn) {
        console.log('Clicking Add Component for second...');
        addBtn.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Select second component  
    await page.evaluate(() => {
      const selectors = ['.component-item', '.component-card', '.modal button'];
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 1) {
          console.log(`Clicking SECOND component via ${selector}...`);
          elements[1].click(); // Second item
          break;
        }
      }
    });
    
    console.log('⏳ Waiting 5 seconds for second component to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const finalStatus = await page.evaluate(() => {
      const gridItems = document.querySelectorAll('.react-grid-item, .grid-item, [data-grid]');
      return {
        gridComponents: gridItems.length,
        timestamp: new Date().toISOString()
      };
    });
    
    console.log('📊 FINAL RESULT:', finalStatus);
    
    if (finalStatus.gridComponents >= 2) {
      console.log('🎉 SUCCESS: Multiple components working!');
    } else {
      console.log('❌ BUG PERSISTS: Only', finalStatus.gridComponents, 'component(s) showing');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  } finally {
    console.log('🏁 Enhanced debugging test completed');
    await browser.close();
  }
}

testEnhancedDebugging().catch(console.error);