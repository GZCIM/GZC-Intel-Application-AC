const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const http = require('http');
const httpProxy = require('http-proxy');

const app = express();

// Create a proxy for WebSocket connections
const wsProxy = httpProxy.createProxyServer({
  target: 'http://localhost:5100',
  ws: true,
  changeOrigin: true
});

// Handle proxy errors
wsProxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
});

// Serve static files with modified JavaScript
app.use((req, res, next) => {
  if (req.path.endsWith('.js') && req.path.includes('/assets/')) {
    const filePath = path.join(__dirname, 'frontend', req.path);
    
    // Read the file and replace WebSocket URLs on the fly
    const fs = require('fs');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        next();
        return;
      }
      
      // Replace production WebSocket URL with local
      data = data.replace(
        /wss:\/\/fxspotstream\.agreeablepond-1a74a92d\.eastus\.azurecontainerapps\.io/g,
        'ws://localhost:3501'
      );
      
      res.type('application/javascript');
      res.send(data);
    });
  } else {
    next();
  }
});

// Serve other static files normally
app.use(express.static('frontend'));

// Create WebSocket proxies
const wsProxyOptions = {
  target: 'http://localhost:5100',
  ws: true,
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReqWs: (proxyReq, req, socket) => {
    console.log(`WebSocket connection: ${req.url}`);
  }
};

// Set up WebSocket routes
app.use('/ws_esp', createProxyMiddleware(wsProxyOptions));
app.use('/ws_rfs', createProxyMiddleware(wsProxyOptions));
app.use('/ws_execution', createProxyMiddleware(wsProxyOptions));

// Proxy API calls
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5100',
  changeOrigin: true,
  logLevel: 'debug'
}));

const server = http.createServer(app);

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
  console.log('WebSocket upgrade request:', req.url);
  wsProxy.ws(req, socket, head);
});

server.listen(3501, () => {
  console.log('Proxy server running on http://localhost:3501');
  console.log('Frontend with dynamic URL replacement');
  console.log('WebSocket proxy: ws://localhost:3501/ws_* -> ws://localhost:5100/ws_*');
  console.log('API proxy: http://localhost:3501/api -> http://localhost:5100/api');
});