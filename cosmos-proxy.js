/**
 * Simple Cosmos DB proxy server
 * Handles CORS and authentication for frontend access
 */

const express = require('express');
const cors = require('cors');
const { CosmosClient } = require('@azure/cosmos');

const app = express();
const PORT = process.env.PORT || 5400;

// Cosmos DB configuration
const endpoint = 'https://cosmos-research-analytics-prod.documents.azure.com:443/';
const key = process.env.COSMOS_KEY; // We'll get this from Key Vault
const databaseId = 'gzc-intel-app-config';
const containerId = 'user-configurations';

// Enable CORS for frontend
app.use(cors({
  origin: [
    'http://localhost:3500',
    'http://localhost:3501',
    'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io'
  ],
  credentials: true
}));

app.use(express.json());

// Initialize Cosmos client
let cosmosClient;
let container;

async function initCosmos() {
  if (!key) {
    console.error('COSMOS_KEY environment variable not set');
    return;
  }
  
  cosmosClient = new CosmosClient({ endpoint, key });
  const database = cosmosClient.database(databaseId);
  container = database.container(containerId);
  console.log('Cosmos DB client initialized');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', cosmos: !!container });
});

// Get user configuration
app.get('/api/config/:userId', async (req, res) => {
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
app.post('/api/config/:userId', async (req, res) => {
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

// Delete user configuration
app.delete('/api/config/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await container.item(userId, userId).delete();
    res.json({ success: true });
  } catch (error) {
    if (error.code === 404) {
      res.json({ success: true });
    } else {
      console.error('Error deleting config:', error);
      res.status(500).json({ error: 'Failed to delete configuration' });
    }
  }
});

// Initialize and start server
initCosmos().then(() => {
  app.listen(PORT, () => {
    console.log(`Cosmos DB proxy server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize Cosmos DB:', error);
});