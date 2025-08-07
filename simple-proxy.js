const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Serve frontend
app.use(express.static('frontend'));

// Proxy WebSocket and API to backend
const wsProxy = createProxyMiddleware({
  target: 'http://localhost:5100',
  ws: true,
  changeOrigin: true
});

app.use('/ws_esp', wsProxy);
app.use('/ws_rfs', wsProxy);
app.use('/ws_execution', wsProxy);
app.use('/api', wsProxy);

const server = app.listen(8080, () => {
  console.log('Proxy running on http://localhost:8080');
  console.log('WebSocket: ws://localhost:8080/ws_esp');
  console.log('Quotes are streaming from Redis\!');
});

// Handle WebSocket upgrades
server.on('upgrade', wsProxy.upgrade);
