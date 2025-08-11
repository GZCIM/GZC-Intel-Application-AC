/**
 * Minimal Cosmos DB proxy for Docker container
 * Runs alongside nginx to handle Cosmos DB requests
 */

const express = require('express');
const { DefaultAzureCredential } = require('@azure/identity');
const { CosmosClient } = require('@azure/cosmos');

const app = express();
const PORT = 5401;

// Cosmos DB configuration
const endpoint = 'https://cosmos-research-analytics-prod.documents.azure.com:443/';
const databaseId = 'gzc-intel-app-config';
const containerId = 'user-configurations';

// Use managed identity in production
const credential = new DefaultAzureCredential();
const client = new CosmosClient({ 
  endpoint, 
  aadCredentials: credential 
});

const database = client.database(databaseId);
const container = database.container(containerId);

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cosmos-proxy' });
});

// Get user configuration
app.get('/api/cosmos/config/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { resource } = await container.item(userId, userId).read();
    res.json(resource || null);
  } catch (error) {
    if (error.code === 404) {
      res.json(null);
    } else {
      console.error('Error reading config:', error);
      res.status(500).json({ error: 'Failed to read configuration' });
    }
  }
});

// Save user configuration
app.post('/api/cosmos/config/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const config = {
      ...req.body,
      id: userId,
      userId,
      timestamp: new Date().toISOString()
    };
    
    const { resource } = await container.items.upsert(config);
    res.json(resource);
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cosmos DB proxy running on port ${PORT}`);
});