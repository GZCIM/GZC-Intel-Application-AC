import puppeteer from 'puppeteer';

async function simpleTest() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('[BROWSER]', msg.text()));
    page.on('pageerror', error => console.error('[ERROR]', error.message));
    
    await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const result = await page.evaluate(() => {
        return {
            msalInstance: typeof window.msalInstance !== 'undefined',
            hasSignInBtn: !!document.querySelector('button[type="submit"], .login-btn, .signin-btn, .auth-btn'),
            hasHeader: !!document.querySelector('header, .header'),
            title: document.title,
            location: window.location.href
        };
    });
    
    console.log('🔍 Page analysis:', result);
    
    await browser.close();
}

simpleTest().catch(console.error);