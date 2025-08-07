#!/usr/bin/env node

/**
 * Navigate to Portfolio page in Chrome
 */

import puppeteer from 'puppeteer';

async function navigateToPortfolio() {
  try {
    console.log('🔍 Connecting to Chrome...');
    
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages[0];
    
    console.log(`📄 Current URL: ${page.url()}`);
    
    // Navigate to portfolio if not already there
    if (!page.url().includes('localhost:3500')) {
      console.log('🚀 Navigating to http://localhost:3500...');
      await page.goto('http://localhost:3500', { waitUntil: 'networkidle2' });
    }
    
    // Wait a bit for React to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click on Portfolio tab if needed
    const isPortfolioActive = await page.evaluate(() => {
      const portfolioTab = Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Portfolio'));
      if (portfolioTab) {
        const isActive = portfolioTab.classList.contains('bg-surface-hover') || 
                        portfolioTab.classList.contains('text-primary');
        if (!isActive) {
          portfolioTab.click();
          return false;
        }
        return true;
      }
      return false;
    });
    
    if (!isPortfolioActive) {
      console.log('📍 Clicked on Portfolio tab');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Check if we have widgets - they should be in the main content area
    const pageInfo = await page.evaluate(() => {
      const gridItems = document.querySelectorAll('.react-grid-item');
      const gridLayout = document.querySelector('.react-grid-layout');
      const mainContent = document.querySelector('main');
      const widgetHeaders = document.querySelectorAll('.widget-header');
      
      return {
        gridItems: gridItems.length,
        gridLayout: !!gridLayout,
        mainContent: !!mainContent,
        widgetHeaders: widgetHeaders.length,
        mainContentHTML: mainContent ? mainContent.innerHTML.substring(0, 200) : 'No main content'
      };
    });
    
    console.log(`✅ Portfolio page status:`);
    console.log(`   Grid items: ${pageInfo.gridItems}`);
    console.log(`   Grid layout: ${pageInfo.gridLayout}`);
    console.log(`   Widget headers: ${pageInfo.widgetHeaders}`);
    console.log(`   Main content: ${pageInfo.mainContent}`);
    
    // Take a screenshot
    await page.screenshot({ path: 'portfolio-loaded.png' });
    console.log('📸 Screenshot saved as portfolio-loaded.png');
    
    console.log('\n✨ Ready for debugging! You can now run:');
    console.log('   npm run debug:events');
    console.log('   npm run debug:performance');
    console.log('   npm run debug:live');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

navigateToPortfolio();