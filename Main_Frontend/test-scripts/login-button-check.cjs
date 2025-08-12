const puppeteer = require('puppeteer');

async function checkLoginButton() {
    console.log('🔍 Checking for Sign In button...');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Navigate to app
        console.log('📍 Navigating to application...');
        await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait a moment for React to render
        console.log('⏳ Waiting for React to render...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Take a screenshot
        await page.screenshot({ 
            path: '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/login-check.png',
            fullPage: false
        });
        console.log('📸 Screenshot saved as login-check.png');
        
        // Look for Sign In button
        const signInButton = await page.$('button:has-text("Sign In")') || 
                           await page.$('[aria-label*="Sign In"]') ||
                           await page.$('button:has-text("🔐")') ||
                           await page.$('*:has-text("Sign In")');
        
        if (signInButton) {
            console.log('✅ Sign In button found!');
            
            // Get button text and position
            const buttonInfo = await page.evaluate((el) => {
                return {
                    text: el.textContent,
                    visible: el.offsetWidth > 0 && el.offsetHeight > 0,
                    position: el.getBoundingClientRect()
                };
            }, signInButton);
            
            console.log('📋 Button info:', buttonInfo);
            
            // Try clicking the button
            console.log('🖱️ Attempting to click Sign In button...');
            await signInButton.click();
            
            // Wait for popup or redirect
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check for Azure AD login popup or redirect
            const pages = await browser.pages();
            if (pages.length > 1) {
                console.log('✅ Login popup opened successfully!');
                const popup = pages[pages.length - 1];
                const popupUrl = popup.url();
                console.log('🔗 Popup URL:', popupUrl);
                
                if (popupUrl.includes('login.microsoftonline.com')) {
                    console.log('✅ Azure AD login popup confirmed!');
                } else {
                    console.log('⚠️ Unexpected popup URL');
                }
            } else {
                console.log('⚠️ No popup detected, checking current page URL...');
                const currentUrl = page.url();
                console.log('🔗 Current URL:', currentUrl);
            }
            
        } else {
            console.log('❌ Sign In button not found');
            
            // Debug: Check what's in the header area
            const headerContent = await page.$eval('header, .header, [role="banner"]', 
                el => el ? el.textContent : 'No header found'
            ).catch(() => 'No header element found');
            
            console.log('🔍 Header content:', headerContent);
            
            // Check for any buttons
            const buttons = await page.$$eval('button', buttons => 
                buttons.map(b => ({ text: b.textContent, visible: b.offsetWidth > 0 }))
            );
            console.log('🔍 All buttons found:', buttons);
        }
        
        // Keep browser open for manual inspection
        console.log('🔍 Browser kept open for manual inspection. Press Ctrl+C to close.');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

checkLoginButton().catch(console.error);