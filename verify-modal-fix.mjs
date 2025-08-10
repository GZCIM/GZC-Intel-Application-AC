import puppeteer from 'puppeteer';

async function verifyModalFix() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('🔄 Navigating to deployed application...');
        await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for app to fully load - check for any visible element
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if page loaded by looking for any content
        const bodyContent = await page.evaluate(() => document.body.textContent || document.body.innerText);
        console.log('✅ Application loaded, content length:', bodyContent.length);
        
        // Take screenshot to see what's loaded
        await page.screenshot({ path: 'app-loaded-state.png', fullPage: false });
        console.log('📸 Screenshot of loaded state saved as app-loaded-state.png');
        
        // Check for version in title or text
        const title = await page.title();
        console.log(`📦 Page title: ${title}`);
        
        // Look for version in body content
        const versionMatch = bodyContent.match(/v\d{8}-\d{6}/);
        if (versionMatch) {
            console.log(`📦 Found version: ${versionMatch[0]}`);
        }
        
        // Click Tools menu
        console.log('🖱️  Clicking Tools menu...');
        await page.click('[data-testid="tools-menu"]');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Click Add Component
        console.log('🖱️  Clicking Add Component button...');
        await page.click('[data-testid="add-component-btn"]');
        
        // Wait a moment for modal to appear
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if modal is visible and not hidden
        const modal = await page.$('[data-testid="component-portal-modal"]');
        if (modal) {
            const isVisible = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return {
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    left: rect.left
                };
            }, modal);
            
            console.log('🔍 Modal visibility check:', isVisible);
            
            if (isVisible.display !== 'none' && isVisible.visibility !== 'hidden' && parseFloat(isVisible.opacity) > 0) {
                console.log('✅ SUCCESS: Modal is properly visible!');
                
                // Try to click Bloomberg Volatility component
                console.log('🖱️  Looking for Bloomberg Volatility component...');
                const volComponent = await page.$('[data-testid="component-bloomberg-volatility"]');
                if (volComponent) {
                    console.log('✅ Bloomberg Volatility component found!');
                    
                    // Click it
                    await page.click('[data-testid="component-bloomberg-volatility"]');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Check if component was added to the grid
                    const gridItems = await page.$$('.react-grid-item');
                    console.log(`📊 Grid now has ${gridItems.length} components`);
                    
                    if (gridItems.length > 0) {
                        console.log('🎉 SUCCESS: Component was successfully added to the grid!');
                        
                        // Take screenshot of success
                        await page.screenshot({
                            path: 'modal-fix-success.png',
                            fullPage: false,
                            clip: { x: 0, y: 0, width: 1200, height: 800 }
                        });
                        console.log('📸 Screenshot saved as modal-fix-success.png');
                    }
                } else {
                    console.log('❌ Bloomberg Volatility component not found in modal');
                }
                
            } else {
                console.log('❌ FAILED: Modal exists but is not visible');
                console.log('   Display:', isVisible.display);
                console.log('   Visibility:', isVisible.visibility);
                console.log('   Opacity:', isVisible.opacity);
                console.log('   Z-Index:', isVisible.zIndex);
            }
        } else {
            console.log('❌ FAILED: Modal element not found');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
    
    await browser.close();
}

verifyModalFix();