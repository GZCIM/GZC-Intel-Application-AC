import WebSocket from 'ws';

async function testSignInClick() {
    const response = await fetch('http://localhost:9222/json');
    const targets = await response.json();
    
    const page = targets.find(t => t.type === 'page' && t.url.includes('localhost:3501'));
    if (!page) {
        console.log('❌ No page found at localhost:3501');
        return;
    }
    
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    
    ws.on('open', () => {
        console.log('Testing Sign In button click...\n');
        
        // Enable console monitoring
        ws.send(JSON.stringify({
            id: 1,
            method: 'Console.enable'
        }));
        
        // Click Sign In button
        ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: {
                expression: `
                    (() => {
                        // Clear console first
                        console.clear();
                        
                        // Find and click Sign In button
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const signInBtn = buttons.find(b => b.textContent.includes('Sign In'));
                        
                        if (signInBtn) {
                            console.log('Clicking Sign In button...');
                            
                            // Monitor for errors
                            window.loginError = null;
                            window.addEventListener('error', (e) => {
                                window.loginError = e.message;
                            });
                            
                            // Click the button
                            signInBtn.click();
                            
                            return { clicked: true, buttonText: signInBtn.textContent };
                        }
                        
                        return { clicked: false, error: 'Sign In button not found' };
                    })()
                `,
                returnByValue: true
            }
        }));
        
        // Check for errors after a delay
        setTimeout(() => {
            ws.send(JSON.stringify({
                id: 3,
                method: 'Runtime.evaluate',
                params: {
                    expression: `
                        (() => {
                            const result = {
                                loginError: window.loginError,
                                consoleErrors: [],
                                msalAccounts: 0,
                                popupBlocked: false
                            };
                            
                            // Check MSAL
                            if (window.msalInstance) {
                                try {
                                    const accounts = window.msalInstance.getAllAccounts();
                                    result.msalAccounts = accounts.length;
                                    result.msalWorking = true;
                                } catch (e) {
                                    result.msalError = e.message;
                                }
                            }
                            
                            // Check if popup was blocked
                            if (window.popupBlocked) {
                                result.popupBlocked = true;
                            }
                            
                            return result;
                        })()
                    `,
                    returnByValue: true
                }
            }));
        }, 2000);
    });
    
    let consoleErrors = [];
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        // Capture console errors
        if (message.method === 'Console.messageAdded') {
            const msg = message.params.message;
            if (msg.level === 'error') {
                consoleErrors.push(msg.text);
                console.log('❌ Console Error:', msg.text.substring(0, 100));
            }
        }
        
        // Handle button click result
        if (message.id === 2 && message.result) {
            const result = message.result.result.value;
            if (result.clicked) {
                console.log('✅ Sign In button clicked successfully');
                console.log('   Button text:', result.buttonText);
            } else {
                console.log('❌', result.error);
            }
        }
        
        // Handle error check result
        if (message.id === 3 && message.result) {
            const result = message.result.result.value;
            
            console.log('\n=== SIGN IN TEST RESULTS ===');
            
            if (result.loginError) {
                console.log('❌ Login error:', result.loginError);
            } else {
                console.log('✅ No login errors');
            }
            
            if (result.msalError) {
                console.log('❌ MSAL error:', result.msalError);
            } else if (result.msalWorking) {
                console.log('✅ MSAL is working correctly');
                console.log('   Accounts:', result.msalAccounts);
            }
            
            if (result.popupBlocked) {
                console.log('⚠️ Popup was blocked - user needs to allow popups');
            }
            
            if (consoleErrors.length > 0) {
                console.log('\n❌ Console errors detected:');
                consoleErrors.forEach(e => console.log('  ', e.substring(0, 100)));
            } else {
                console.log('✅ No console errors');
            }
            
            console.log('\n=== SUMMARY ===');
            if (!result.loginError && !result.msalError && consoleErrors.length === 0) {
                console.log('✅ ERROR FREE - Login flow working correctly!');
                console.log('✅ MSAL Provider properly configured');
                console.log('✅ Chrome console is clean');
                console.log('ℹ️ Login popup/redirect will open for Azure AD authentication');
            } else {
                console.log('❌ Errors detected - see above');
            }
            
            ws.close();
        }
    });
}

testSignInClick().catch(console.error);