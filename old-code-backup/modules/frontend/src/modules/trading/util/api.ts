import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const API = {
    ESP_WEBSOCKET:
        import.meta.env.VITE_WEBSOCKET_ESP || "ws://localhost:5000/ws_esp",
    RFS_WEBSOCKET:
        import.meta.env.VITE_WEBSOCKET_RFS || "ws://localhost:5000/ws_rfs",
    EXECUTION_WEBSOCKET:
        import.meta.env.VITE_WEBSOCKET_EXECUTION ||
        "ws://localhost:5000/ws_execution",
    REQUEST_RFS_QUOTE:
        import.meta.env.VITE_RFS_QUOTE_REQUEST_URL ||
        `${API_BASE_URL}/request_quote`,
    SUBSCRIBE_ESP_QUOTE:
        import.meta.env.VITE_ESP_QUOTE_SUBSCRIPTION_URL ||
        `${API_BASE_URL}/subscribe_quote`,
    ESP_TRADE:
        import.meta.env.VITE_ESP_TRADE_URL ||
        `${API_BASE_URL}/request_trade_esp`,
    RFS_TRADE:
        import.meta.env.VITE_RFS_TRADE_URL ||
        `${API_BASE_URL}/request_trade_rfs`,
    RFS_SWAP_TRADE:
        import.meta.env.VITE_RFS_SWAP_TRADE_URL ||
        `${API_BASE_URL}/request_swap_trade_rfs`,
};

// Axios POST function for sending trade requests
export const postRequest = async (url: string, data: any) => {
    try {
        const response = await axios.post(url, data);
        return response.data;
    } catch (error) {
        console.error("API POST Error:", error);
        throw error;
    }
};

export default API;
