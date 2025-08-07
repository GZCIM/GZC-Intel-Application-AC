import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// API Gateway configuration
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_GATEWAY_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle authentication errors
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Market Service API
export const marketService = {
  getMarketData: () => apiClient.get('/api/market/data'),
  getQuotes: (symbols: string[]) => apiClient.post('/api/market/quotes', { symbols }),
  getHistorical: (symbol: string, range: string) => 
    apiClient.get(`/api/market/historical/${symbol}?range=${range}`),
  subscribeToRealtime: (symbols: string[]) => 
    apiClient.post('/api/market/subscribe', { symbols })
};

// Order Service API
export const orderService = {
  getOrders: () => apiClient.get('/api/orders'),
  getOrderHistory: (limit = 50) => apiClient.get(`/api/orders/history?limit=${limit}`),
  placeOrder: (order: any) => apiClient.post('/api/orders', order),
  cancelOrder: (orderId: string) => apiClient.delete(`/api/orders/${orderId}`),
  getOrderBook: (symbol: string) => apiClient.get(`/api/orders/book/${symbol}`)
};

// Portfolio Service API
export const portfolioService = {
  getPositions: () => apiClient.get('/api/portfolio/positions'),
  getBalance: () => apiClient.get('/api/portfolio/balance'),
  getPnL: () => apiClient.get('/api/portfolio/pnl'),
  getRiskMetrics: () => apiClient.get('/api/portfolio/risk'),
  getPerformance: (period: string) => 
    apiClient.get(`/api/portfolio/performance?period=${period}`)
};

// Analytics Service API
export const analyticsService = {
  getMarketAnalytics: () => apiClient.get('/api/analytics/market'),
  getPortfolioAnalytics: () => apiClient.get('/api/analytics/portfolio'),
  getTradingMetrics: () => apiClient.get('/api/analytics/trading'),
  generateReport: (type: string) => apiClient.post('/api/analytics/report', { type })
};

// WebSocket connection for real-time updates
let socket: Socket | null = null;

export const websocketService = {
  connect: () => {
    if (!socket) {
      socket = io(API_GATEWAY_URL, {
        auth: {
          token: localStorage.getItem('authToken')
        }
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    }
    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  on: (event: string, callback: Function) => {
    if (socket) {
      socket.on(event, callback);
    }
  },

  off: (event: string, callback?: Function) => {
    if (socket) {
      socket.off(event, callback);
    }
  },

  emit: (event: string, data: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  }
};

// Health check for all services
export const healthCheck = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    return null;
  }
};

export default apiClient;