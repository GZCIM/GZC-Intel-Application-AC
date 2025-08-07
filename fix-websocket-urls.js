// Script to patch the frontend to use relative WebSocket URLs
const fs = require('fs');
const path = require('path');

// Find all JS files in frontend/assets
const assetsDir = path.join(__dirname, 'frontend', 'assets');
const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(assetsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace production WebSocket URL with relative URL
    const originalUrl = 'wss://fxspotstream.agreeablepond-1a74a92d.eastus.azurecontainerapps.io';
    const wsProtocol = 'window.location.protocol === "https:" ? "wss:" : "ws:"';
    const wsHost = 'window.location.host';
    
    if (content.includes(originalUrl)) {
        // Replace hardcoded URL with dynamic URL
        content = content.replace(
            /wss:\/\/fxspotstream\.agreeablepond-1a74a92d\.eastus\.azurecontainerapps\.io/g,
            '${' + wsProtocol + '}//${' + wsHost + '}'
        );
        
        // Also handle the VITE_STREAM_URL references
        content = content.replace(
            /VITE_STREAM_URL:"wss:\/\/fxspotstream\.agreeablepond-1a74a92d\.eastus\.azurecontainerapps\.io"/g,
            'VITE_STREAM_URL:`${' + wsProtocol + '}//${' + wsHost + '}`'
        );
        
        fs.writeFileSync(filePath, content);
        console.log(`Patched ${file}`);
    }
});

console.log('WebSocket URL patching complete\!');
