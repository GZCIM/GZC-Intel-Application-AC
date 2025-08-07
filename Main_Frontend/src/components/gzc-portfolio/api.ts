// Real API Service for GZC Portfolio - calls backend portfolio_controller.py
import {
    FXForwardTrade,
    FXPosition,
    PositionsSummary,
    TradesSummary,
} from "./types";

// Get the backend URL from environment or default to localhost:5000
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Authentication token provider - will be set by the component
let authTokenProvider: (() => Promise<string>) | null = null;

// Function to set the authentication token provider (called by components)
export const setGZCPortfolioAuthProvider = (
    provider: () => Promise<string>
) => {
    authTokenProvider = provider;
};

// Helper function to get access token from MSAL
async function getAccessToken(): Promise<string | null> {
    if (authTokenProvider) {
        try {
            const token = await authTokenProvider();
            console.log(
                "GZC Portfolio: Got MSAL token:",
                token ? `${token.substring(0, 20)}...` : "null"
            );
            return token;
        } catch (error) {
            console.error("Failed to get access token:", error);
            return null;
        }
    }

    console.error(
        "No authentication token provider configured for GZC Portfolio"
    );
    return null;
}

// Helper function to make authenticated API calls
async function apiCall(
    endpoint: string,
    options: RequestInit = {}
): Promise<any> {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    const accessToken = await getAccessToken();

    const url = `${BACKEND_URL}${endpoint}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    // Add Authorization header if token is available
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
        console.log(`Making authenticated API call to: ${url}`);
        console.log(`🔑 Portfolio Token: ${accessToken.substring(0, 30)}...`);
        console.log(`🔑 Portfolio Token Length: ${accessToken.length}`);
        console.log(
            `🔑 Portfolio Authorization Header: Bearer ${accessToken.substring(
                0,
                30
            )}...`
        );
    } else {
        console.warn("No access token found for API call");
        console.log(`Making unauthenticated API call to: ${url}`);
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    console.log(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error Response: ${errorText}`);
        throw new Error(
            `API call failed: ${response.status} ${response.statusText} - ${errorText}`
        );
    }

    const data = await response.json();
    console.log("API Response Data:", data);
    return data;
}

// Transform backend portfolio data to frontend FX Trade format
function transformPortfolioToTrades(portfolioData: any[]): FXForwardTrade[] {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    return portfolioData.map((item, index) => ({
        id: item.id || `TRD${index.toString().padStart(6, "0")}`,
        trade_date:
            item.trade_date ||
            item.tradeDate ||
            new Date().toISOString().split("T")[0],
        value_date:
            item.value_date ||
            item.valueDate ||
            new Date().toISOString().split("T")[0],
        currency_pair: item.currency_pair || item.currencyPair || "EUR/USD",
        notional: parseFloat(item.notional || item.amount || 0),
        rate: parseFloat(item.rate || item.execution_rate || 1.0),
        market_rate: parseFloat(
            item.market_rate || item.current_rate || item.rate || 1.0
        ),
        pnl: parseFloat(item.pnl || item.unrealized_pnl || 0),
        counterparty: item.counterparty || item.broker || "Unknown",
        status: item.status || "ACTIVE",
        trader: item.trader || item.user || "Unknown",
        fund_id: item.fund_id || item.fundId || "6",
    }));
}

// Generate positions from trades data
function generatePositions(trades: FXForwardTrade[]): FXPosition[] {
    const positionsMap = new Map<string, FXPosition>();

    // Group trades by currency pair
    trades.forEach((trade) => {
        const existing = positionsMap.get(trade.currency_pair);

        if (existing) {
            // Update existing position
            existing.net_position += trade.notional;
            existing.trade_count += 1;
            existing.total_volume += Math.abs(trade.notional);

            // Update weighted average rate
            existing.weighted_avg_rate =
                (existing.weighted_avg_rate * (existing.trade_count - 1) +
                    trade.rate) /
                existing.trade_count;

            // Update last trade date if this is more recent
            if (trade.trade_date > existing.last_trade_date) {
                existing.last_trade_date = trade.trade_date;
            }
        } else {
            // Create new position
            positionsMap.set(trade.currency_pair, {
                currency_pair: trade.currency_pair,
                net_position: trade.notional,
                trade_count: 1,
                weighted_avg_rate: trade.rate,
                total_volume: Math.abs(trade.notional),
                last_trade_date: trade.trade_date,
                position_status:
                    trade.notional > 0
                        ? "LONG"
                        : trade.notional < 0
                        ? "SHORT"
                        : "FLAT",
            });
        }
    });

    // Update position status based on final net position
    Array.from(positionsMap.values()).forEach((position) => {
        position.position_status =
            position.net_position > 0
                ? "LONG"
                : position.net_position < 0
                ? "SHORT"
                : "FLAT";
    });

    return Array.from(positionsMap.values());
}

export class PortfolioAPIService {
    private lastFetchedData: FXForwardTrade[] = [];
    private updateSubscribers: ((trade: FXForwardTrade) => void)[] = [];

    async fetchTrades(
        fundId?: string,
        activeStatus?: string
    ): Promise<{
        trades: FXForwardTrade[];
        summary: TradesSummary;
    }> {
        try {
            console.log("Fetching portfolio data from backend...");

            // Call the backend portfolio endpoint
            const response = await apiCall("/portfolio/");

            if (response.status !== "success") {
                throw new Error("Backend returned error status");
            }

            // Transform backend data to frontend format
            let trades = transformPortfolioToTrades(response.data || []);

            // Store for potential real-time updates
            this.lastFetchedData = trades;

            // Apply frontend filters
            if (fundId && fundId !== "all") {
                trades = trades.filter((t) => t.fund_id === fundId);
            }

            if (activeStatus) {
                const isActive = activeStatus === "active";
                trades = trades.filter((t) =>
                    isActive ? t.status === "ACTIVE" : t.status === "CLOSED"
                );
            }

            // Calculate summary
            const summary: TradesSummary = {
                total_trades: trades.length,
                total_notional: trades.reduce((sum, t) => sum + t.notional, 0),
                total_pnl: trades.reduce((sum, t) => sum + t.pnl, 0),
                profitable_trades: trades.filter((t) => t.pnl > 0).length,
                losing_trades: trades.filter((t) => t.pnl < 0).length,
            };

            console.log(`Fetched ${trades.length} trades from backend`);
            return { trades, summary };
        } catch (error) {
            console.error("Error fetching trades from backend:", error);

            // Return empty data instead of crashing
            return {
                trades: [],
                summary: {
                    total_trades: 0,
                    total_notional: 0,
                    total_pnl: 0,
                    profitable_trades: 0,
                    losing_trades: 0,
                },
            };
        }
    }

    async fetchPositions(
        fundId?: string,
        activeStatus?: string
    ): Promise<{
        positions: FXPosition[];
        summary: PositionsSummary;
    }> {
        try {
            // Get trades first, then generate positions
            const { trades } = await this.fetchTrades(fundId, activeStatus);

            // Generate positions from trades
            const positions = generatePositions(trades);

            // Calculate summary
            const summary: PositionsSummary = {
                total_positions: positions.length,
                long_positions: positions.filter(
                    (p) => p.position_status === "LONG"
                ).length,
                short_positions: positions.filter(
                    (p) => p.position_status === "SHORT"
                ).length,
                total_volume: positions.reduce(
                    (sum, p) => sum + p.total_volume,
                    0
                ),
                unique_pairs: positions.length,
            };

            console.log(`Generated ${positions.length} positions from trades`);
            return { positions, summary };
        } catch (error) {
            console.error("Error fetching positions:", error);

            // Return empty data instead of crashing
            return {
                positions: [],
                summary: {
                    total_positions: 0,
                    long_positions: 0,
                    short_positions: 0,
                    total_volume: 0,
                    unique_pairs: 0,
                },
            };
        }
    }

    // Simulate real-time updates (can be enhanced with WebSocket later)
    async subscribeToUpdates(
        callback: (trade: FXForwardTrade) => void
    ): Promise<() => void> {
        this.updateSubscribers.push(callback);

        // Periodically fetch fresh data and notify subscribers of changes
        const interval = setInterval(async () => {
            try {
                const response = await apiCall("/portfolio/");
                if (response.status === "success") {
                    const freshTrades = transformPortfolioToTrades(
                        response.data || []
                    );

                    // Compare with last known data and notify of changes
                    freshTrades.forEach((trade) => {
                        const existing = this.lastFetchedData.find(
                            (t) => t.id === trade.id
                        );
                        if (
                            !existing ||
                            existing.market_rate !== trade.market_rate ||
                            existing.pnl !== trade.pnl
                        ) {
                            callback(trade);
                        }
                    });

                    this.lastFetchedData = freshTrades;
                }
            } catch (error) {
                console.warn("Error in real-time update:", error);
            }
        }, 10000); // Every 10 seconds

        // Return unsubscribe function
        return () => {
            clearInterval(interval);
            const index = this.updateSubscribers.indexOf(callback);
            if (index > -1) {
                this.updateSubscribers.splice(index, 1);
            }
        };
    }
}

// Export singleton instance
export const portfolioAPI = new PortfolioAPIService();
