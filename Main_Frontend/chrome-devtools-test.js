// Chrome DevTools test script - paste this in Chrome Console at http://localhost:3501

console.log('=== TESTING DRAG/RESIZE FUNCTIONALITY ===');

// Test 1: Check if MSAL is initialized
if (window.msalInstance) {
    console.log('✅ MSAL instance found');
    const accounts = window.msalInstance.getAllAccounts();
    console.log(`   Accounts: ${accounts.length} ${accounts.length > 0 ? '(authenticated)' : '(not authenticated)'}`);
} else {
    console.log('❌ MSAL not initialized');
}

// Test 2: Simulate sign in
async function testSignIn() {
    const signInButton = document.querySelector('button');
    if (signInButton && signInButton.textContent.includes('Sign In')) {
        console.log('✅ Sign In button found');
        console.log('   Click the button to authenticate...');
        
        // Auto-click for testing
        signInButton.click();
        console.log('   Sign in clicked - watch for popup/redirect');
    } else {
        console.log('❌ Sign In button not found');
    }
}

// Test 3: Check for React Grid Layout after sign in
function checkGridLayout() {
    const gridLayout = document.querySelector('.react-grid-layout');
    if (gridLayout) {
        console.log('✅ React Grid Layout found');
        
        // Check draggable items
        const draggableItems = document.querySelectorAll('.react-grid-item');
        console.log(`   Found ${draggableItems.length} draggable items`);
        
        // Check if items are actually draggable
        draggableItems.forEach((item, index) => {
            const isDraggable = !item.classList.contains('static');
            console.log(`   Item ${index + 1}: ${isDraggable ? '✅ draggable' : '❌ static'}`);
        });
        
        return true;
    } else {
        console.log('⏳ Grid Layout not loaded yet - sign in first');
        return false;
    }
}

// Test 4: Simulate drag operation
function testDragOperation() {
    const item = document.querySelector('.react-grid-item');
    if (item) {
        console.log('✅ Testing drag operation...');
        
        // Create and dispatch mouse events
        const rect = item.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        
        // Simulate mousedown
        const mouseDown = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            clientX: startX,
            clientY: startY
        });
        item.dispatchEvent(mouseDown);
        
        // Simulate mousemove
        const mouseMove = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            clientX: startX + 100,
            clientY: startY + 50
        });
        document.dispatchEvent(mouseMove);
        
        // Simulate mouseup
        const mouseUp = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            clientX: startX + 100,
            clientY: startY + 50
        });
        document.dispatchEvent(mouseUp);
        
        console.log('   Drag simulation completed');
        console.log('   Component should have moved if drag is working');
    } else {
        console.log('❌ No draggable item found');
    }
}

// Test 5: Check localStorage for persistence
function checkPersistence() {
    console.log('\n=== CHECKING PERSISTENCE ===');
    
    const keys = Object.keys(localStorage).filter(k => 
        k.includes('tab') || k.includes('layout') || k.includes('component')
    );
    
    if (keys.length > 0) {
        console.log('✅ Found localStorage data:');
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`   ${key}: ${value ? value.substring(0, 50) + '...' : 'empty'}`);
        });
    } else {
        console.log('❌ No layout data in localStorage');
    }
}

// Run tests
console.log('\n=== RUNNING TESTS ===');
testSignIn();

// Wait for authentication, then test grid
setTimeout(() => {
    if (checkGridLayout()) {
        testDragOperation();
    }
    checkPersistence();
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('If authenticated, try dragging a component manually to verify fixes work');
}, 3000);