const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Intercept and modify JavaScript files to use local WebSocket
app.use('/assets', (req, res, next) => {
  if (req.path.endsWith('.js')) {
    const fs = require('fs');
    const filePath = path.join(__dirname, 'frontend/assets', req.path);
    
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        next();
        return;
      }
      
      // Replace WebSocket URL dynamically
      data = data.replace(
        /wss:\/\/fxspotstream\.agreeablepond[^"'`]*/g,
        'ws://localhost:8080'
      );
      
      // Also replace any hardcoded stream URLs
      data = data.replace(
        /VITE_STREAM_URL:"wss:\/\/[^"]+"/g,
        'VITE_STREAM_URL:"ws://localhost:8080"'
      );
      
      res.type('application/javascript');
      res.send(data);
    });
  } else {
    next();
  }
});

// Serve other static files
app.use(express.static('frontend'));

// Proxy WebSocket and API to backend
const wsProxy = createProxyMiddleware({
  target: 'http://localhost:5100',
  ws: true,
  changeOrigin: true,
  logLevel: 'debug'
});

app.use('/ws_esp', wsProxy);
app.use('/ws_rfs', wsProxy);
app.use('/ws_execution', wsProxy);
app.use('/api', wsProxy);

const server = app.listen(8081, () => {
  console.log('Enhanced proxy running on http://localhost:8081');
  console.log('WebSocket URL replacement active');
  console.log('Backend WebSocket: ws://localhost:8081/ws_esp');
});

// Handle WebSocket upgrades
server.on('upgrade', wsProxy.upgrade);
