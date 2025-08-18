#!/usr/bin/env node
import puppeteer from 'puppeteer';

async function testApplication() {
    console.log('🚀 Starting automated Chrome DevTools test...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,  // Show browser for visual verification
        devtools: true    // Open DevTools
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    console.log('📍 Navigating to http://localhost:3501...');
    await page.goto('http://localhost:3501', { waitUntil: 'networkidle2' });
    
    // Test 1: Check if app loaded
    const title = await page.title();
    console.log(`✅ Page loaded: ${title}`);
    
    // Test 2: Check for sign in button
    const signInButton = await page.$('button');
    if (signInButton) {
        const buttonText = await page.evaluate(el => el.textContent, signInButton);
        console.log(`✅ Found button: "${buttonText}"`);
        
        // Click sign in
        console.log('🔐 Clicking Sign In...');
        await signInButton.click();
        
        // Wait for authentication popup/redirect
        await page.waitForTimeout(2000);
    }
    
    // Test 3: Check if grid layout exists after auth
    await page.waitForTimeout(3000);  // Wait for potential auth
    
    const hasGridLayout = await page.evaluate(() => {
        return !!document.querySelector('.react-grid-layout');
    });
    
    if (hasGridLayout) {
        console.log('✅ React Grid Layout detected');
        
        // Test 4: Check draggable items
        const dragTestResult = await page.evaluate(() => {
            const items = document.querySelectorAll('.react-grid-item');
            const results = [];
            
            items.forEach((item, index) => {
                const isDraggable = !item.classList.contains('static');
                const rect = item.getBoundingClientRect();
                results.push({
                    index: index + 1,
                    draggable: isDraggable,
                    position: { x: rect.left, y: rect.top }
                });
            });
            
            return results;
        });
        
        console.log(`\n📦 Found ${dragTestResult.length} components:`);
        dragTestResult.forEach(item => {
            console.log(`   Component ${item.index}: ${item.draggable ? '✅ draggable' : '❌ static'} at (${Math.round(item.position.x)}, ${Math.round(item.position.y)})`);
        });
        
        // Test 5: Simulate drag on first item
        if (dragTestResult.length > 0) {
            console.log('\n🎯 Testing drag operation...');
            const firstItem = await page.$('.react-grid-item');
            
            const box = await firstItem.boundingBox();
            const startX = box.x + box.width / 2;
            const startY = box.y + box.height / 2;
            
            // Perform drag
            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.mouse.move(startX + 100, startY + 50, { steps: 10 });
            await page.mouse.up();
            
            console.log('   Drag simulation completed');
            
            // Check new position
            await page.waitForTimeout(500);
            const newPosition = await page.evaluate(() => {
                const item = document.querySelector('.react-grid-item');
                const rect = item.getBoundingClientRect();
                return { x: rect.left, y: rect.top };
            });
            
            console.log(`   New position: (${Math.round(newPosition.x)}, ${Math.round(newPosition.y)})`);
            
            if (newPosition.x !== dragTestResult[0].position.x || newPosition.y !== dragTestResult[0].position.y) {
                console.log('   ✅ Component moved successfully!');
            } else {
                console.log('   ⚠️ Component position unchanged - drag may be restricted');
            }
        }
    } else {
        console.log('⏳ Grid Layout not found - authentication may be required');
    }
    
    // Test 6: Check localStorage
    const localStorageData = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const relevant = keys.filter(k => 
            k.includes('tab') || k.includes('layout') || k.includes('component')
        );
        
        return relevant.map(key => ({
            key,
            value: localStorage.getItem(key)?.substring(0, 100)
        }));
    });
    
    console.log('\n💾 LocalStorage data:');
    if (localStorageData.length > 0) {
        localStorageData.forEach(item => {
            console.log(`   ${item.key}: ${item.value}...`);
        });
    } else {
        console.log('   No layout data found');
    }
    
    console.log('\n✅ Test complete - browser will stay open for manual testing');
    console.log('   Try dragging components manually to verify the fixes work');
    
    // Keep browser open for manual testing
    // await browser.close();
}

testApplication().catch(console.error);