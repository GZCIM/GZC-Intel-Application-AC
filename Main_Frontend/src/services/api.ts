import axios from "axios";
import { io, Socket } from "socket.io-client";

// API Gateway configuration
const API_GATEWAY_URL =
    import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:4000";

// Authentication token provider - will be set by the app
let authTokenProvider: (() => Promise<string>) | null = null;

// Function to set the authentication token provider
export const setAuthTokenProvider = (provider: () => Promise<string>) => {
    authTokenProvider = provider;
};

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_GATEWAY_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
    async (config) => {
        try {
            if (authTokenProvider) {
                // Use Microsoft authentication token from MSAL
                const token = await authTokenProvider();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } else {
                console.warn("No authentication token provider configured");
            }
        } catch (error) {
            console.error("Failed to get authentication token:", error);
            // Continue with request without token - let backend handle it
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
            console.warn("Authentication error - redirecting to login");
            // Instead of redirecting, let the app handle authentication state
            // The MSAL provider will handle re-authentication
            window.dispatchEvent(
                new CustomEvent("auth-error", { detail: error })
            );
        }
        return Promise.reject(error);
    }
);

// Market Service API
export const marketService = {
    getMarketData: () => apiClient.get("/api/market/data"),
    getQuotes: (symbols: string[]) =>
        apiClient.post("/api/market/quotes", { symbols }),
    getHistorical: (symbol: string, range: string) =>
        apiClient.get(`/api/market/historical/${symbol}?range=${range}`),
    subscribeToRealtime: (symbols: string[]) =>
        apiClient.post("/api/market/subscribe", { symbols }),
};

// Order Service API
export const orderService = {
    getOrders: () => apiClient.get("/api/orders"),
    getOrderHistory: (limit = 50) =>
        apiClient.get(`/api/orders/history?limit=${limit}`),
    placeOrder: (order: Record<string, unknown>) =>
        apiClient.post("/api/orders", order),
    cancelOrder: (orderId: string) =>
        apiClient.delete(`/api/orders/${orderId}`),
    getOrderBook: (symbol: string) =>
        apiClient.get(`/api/orders/book/${symbol}`),
};

// Portfolio Service API
export const portfolioService = {
    getPositions: () => apiClient.get("/api/portfolio/positions"),
    getBalance: () => apiClient.get("/api/portfolio/balance"),
    getPnL: () => apiClient.get("/api/portfolio/pnl"),
    getRiskMetrics: () => apiClient.get("/api/portfolio/risk"),
    getPerformance: (period: string) =>
        apiClient.get(`/api/portfolio/performance?period=${period}`),
};

// Analytics Service API
export const analyticsService = {
    getMarketAnalytics: () => apiClient.get("/api/analytics/market"),
    getPortfolioAnalytics: () => apiClient.get("/api/analytics/portfolio"),
    getTradingMetrics: () => apiClient.get("/api/analytics/trading"),
    generateReport: (type: string) =>
        apiClient.post("/api/analytics/report", { type }),
};

// WebSocket connection for real-time updates
let socket: Socket | null = null;

export const websocketService = {
    connect: async () => {
        if (!socket) {
            let token = null;
            try {
                if (authTokenProvider) {
                    token = await authTokenProvider();
                }
            } catch (error) {
                console.error("Failed to get token for WebSocket:", error);
            }

            socket = io(API_GATEWAY_URL, {
                query: {
                    access_token: token || "",
                },
            });

            socket.on("connect", () => {
                console.log("WebSocket connected");
            });

            socket.on("disconnect", () => {
                console.log("WebSocket disconnected");
            });

            socket.on("error", (error: unknown) => {
                console.error("WebSocket error:", error);
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

    on: (event: string, callback: (...args: unknown[]) => void) => {
        if (socket) {
            socket.on(event, callback);
        }
    },

    off: (event: string, callback?: (...args: unknown[]) => void) => {
        if (socket) {
            socket.off(event, callback);
        }
    },

    emit: (event: string, data: unknown) => {
        if (socket) {
            socket.emit(event, data);
        }
    },
};

// Health check for all services
export const healthCheck = async () => {
    try {
        const response = await apiClient.get("/health");
        return response.data;
    } catch (error) {
        console.error("Health check failed:", error);
        return null;
    }
};

export default apiClient;
