import WebSocket from 'ws';

async function getErrorDetails() {
    const response = await fetch('http://localhost:9222/json');
    const targets = await response.json();
    
    const page = targets.find(t => t.type === 'page' && t.url.includes('localhost:3501'));
    if (!page) {
        console.log('❌ No page found at localhost:3501');
        return;
    }
    
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    
    ws.on('open', () => {
        // Enable Console
        ws.send(JSON.stringify({
            id: 1,
            method: 'Console.enable'
        }));
        
        // Get console messages
        ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: {
                expression: `
                    (() => {
                        // Get error boundary text
                        const root = document.getElementById('root');
                        if (root) {
                            const errorText = root.innerText || root.textContent;
                            if (errorText.includes('Error')) {
                                return { errorBoundary: errorText.substring(0, 500) };
                            }
                        }
                        return { errorBoundary: 'No error boundary text found' };
                    })()
                `,
                returnByValue: true
            }
        }));
    });
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.method === 'Console.messageAdded') {
            const msg = message.params.message;
            if (msg.level === 'error') {
                console.log('Console Error:', msg.text);
            }
        }
        
        if (message.id === 2 && message.result) {
            console.log('Error Boundary Content:');
            console.log(message.result.result.value);
            ws.close();
        }
    });
}

getErrorDetails().catch(console.error);