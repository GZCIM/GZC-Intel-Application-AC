import axios from "axios";

// Create a configured axios instance for the backend API
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const apiTimeout = parseInt(import.meta.env.VITE_API_TIMEOUT || "30000");

// Authentication token provider - will be set by the app
let authTokenProvider: (() => Promise<string>) | null = null;

// Function to set the authentication token provider
export const setPortfolioAuthTokenProvider = (provider: () => Promise<string>) => {
    authTokenProvider = provider;
};

export const apiClient = axios.create({
    baseURL: backendUrl,
    timeout: apiTimeout,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor to add Authorization header to all requests
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
                console.warn("No authentication token provider configured for portfolio API");
            }
        } catch (error) {
            console.error("Failed to get authentication token for portfolio API:", error);
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
            console.warn("Authentication error in portfolio API");
            // Let the app handle authentication state through MSAL
            window.dispatchEvent(new CustomEvent('portfolio-auth-error', { detail: error }));
        }
        return Promise.reject(error);
    }
);

export default apiClient;
