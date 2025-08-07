import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    useMemo,
} from "react";
import { Quote, QuoteMessage } from "../types/portfolio";
import { useAuth } from "../hooks/useAuth";

interface QuoteContextType {
    quotes: Map<string, Quote>;
    subscribeToSymbol: (symbol: string) => void;
    unsubscribeFromSymbol: (symbol: string) => void;
    updateQuote: (quote: Quote) => void;
    getQuote: (symbol: string) => Quote | undefined;
    isConnected: boolean;
    connectionStatus: "connecting" | "connected" | "disconnected" | "error";
    reconnect: () => void;
    streamType: "esp" | "rfs" | "exec";
    setStreamType: (type: "esp" | "rfs" | "exec") => void;
}

const QuoteContext = createContext<QuoteContextType | null>(null);

export const useQuoteContext = () => {
    const context = useContext(QuoteContext);
    if (!context) {
        throw new Error("useQuoteContext must be used within a QuoteProvider");
    }
    return context;
};

interface QuoteProviderProps {
    children: React.ReactNode;
    autoConnect?: boolean;
    reconnectInterval?: number;
    mockMode?: boolean;
    defaultStreamType?: "esp" | "rfs" | "exec";
}

export const QuoteProvider: React.FC<QuoteProviderProps> = ({
    children,
    autoConnect = true,
    reconnectInterval = 5000,
    mockMode = false,
    defaultStreamType = "esp",
}) => {
    const { getAccessToken, isAuthenticated } = useAuth();
    const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<
        "connecting" | "connected" | "disconnected" | "error"
    >("disconnected");
    const [streamType, setStreamType] = useState<"esp" | "rfs" | "exec">(
        defaultStreamType
    );

    const wsRef = useRef<WebSocket | null>(null);
    const subscribedSymbols = useRef<Set<string>>(new Set());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const mockIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Get WebSocket URL from environment
    const getWebSocketUrl = useCallback(
        (streamType: "esp" | "rfs" | "exec") => {
            // Check if we have a specific WebSocket URL for this stream type
            const envKey = `VITE_WEBSOCKET_${streamType.toUpperCase()}` as keyof ImportMetaEnv;
            const specificUrl = import.meta.env[envKey];
            
            if (specificUrl) {
                // If it's a relative URL (starts with /), construct full WebSocket URL
                if (specificUrl.startsWith('/')) {
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    return `${protocol}//${window.location.host}${specificUrl}`;
                }
                return specificUrl;
            }
            
            // Fallback to VITE_STREAM_URL
            const baseUrl =
                import.meta.env.VITE_STREAM_URL || "ws://localhost:5000";
            return `${baseUrl}/ws_${streamType}`;
        },
        []
    );

    // Update quote function - defined early to avoid circular dependencies
    const updateQuote = useCallback((quote: Quote) => {
        setQuotes((prev) => {
            const newQuotes = new Map(prev);
            newQuotes.set(quote.symbol, quote);
            return newQuotes;
        });
    }, []);

    // Mock data generator for development
    const generateMockQuote = useCallback((symbol: string): Quote => {
        const basePrice = Math.random() * 1000 + 100;
        const spread = basePrice * 0.001;
        const change = (Math.random() - 0.5) * 10;

        return {
            symbol,
            bid: basePrice - spread / 2,
            ask: basePrice + spread / 2,
            last: basePrice,
            volume: Math.floor(Math.random() * 1000000),
            timestamp: Date.now(),
            change,
            changePercent: (change / basePrice) * 100,
            open: basePrice - change,
            high: basePrice + Math.abs(change) * 1.5,
            low: basePrice - Math.abs(change) * 1.5,
            close: basePrice,
        };
    }, []);

    // Start mock data updates
    const startMockUpdates = useCallback(() => {
        if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);

        mockIntervalRef.current = setInterval(() => {
            subscribedSymbols.current.forEach((symbol) => {
                const quote = generateMockQuote(symbol);
                updateQuote(quote);
            });
        }, 1000);
    }, [generateMockQuote, updateQuote]);

    // WebSocket connection management with MSAL authentication
    const connect = useCallback(async () => {
        if (mockMode) {
            setIsConnected(true);
            setConnectionStatus("connected");
            startMockUpdates();
            return;
        }

        // Check if user is authenticated
        if (!isAuthenticated) {
            console.log(
                "User not authenticated, cannot connect to quote stream"
            );
            setConnectionStatus("error");
            return;
        }

        // Prevent multiple simultaneous connections
        if (
            wsRef.current?.readyState === WebSocket.OPEN ||
            wsRef.current?.readyState === WebSocket.CONNECTING
        ) {
            console.log(
                `[QuoteContext:${streamType}] Already connected or connecting, skipping...`
            );
            return;
        }

        setConnectionStatus("connecting");

        try {
            // Get access token for authentication
            const token = await getAccessToken();
            const wsUrl = getWebSocketUrl(streamType);

            console.log(`Connecting to quote stream: ${wsUrl}`);

            // Create WebSocket connection with authentication
            // Note: WebSocket doesn't support custom headers, so we'll use query parameter
            const authenticatedUrl = `${wsUrl}?access_token=${encodeURIComponent(
                token
            )}`;
            const ws = new WebSocket(authenticatedUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log(
                    `[QuoteContext:${streamType}] ✅ WebSocket connected to ${wsUrl}`
                );
                setIsConnected(true);
                setConnectionStatus("connected");

                // Send ping to keep connection alive
                const pingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        console.log(
                            `[QuoteContext:${streamType}] Sending ping`
                        );
                        ws.send(JSON.stringify({ type: "ping" }));
                    } else {
                        clearInterval(pingInterval);
                    }
                }, 30000); // Ping every 30 seconds

                // Store interval reference for cleanup
                (ws as any)._pingInterval = pingInterval;
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log(
                        `[QuoteContext:${streamType}] Received message:`,
                        message
                    );

                    // Handle pong responses
                    if (message.type === "pong") {
                        console.log(
                            `[QuoteContext:${streamType}] Received pong`
                        );
                        return;
                    }

                    // Handle ESP/RFS/EXEC specific messages
                    if (streamType === "esp" && message.symbol) {
                        console.log(
                            `[QuoteContext:esp] ESP quote for ${message.symbol}:`,
                            message
                        );

                        // Transform ESP data to Quote format
                        const price = parseFloat(message.price || "0");
                        const symbol = message.symbol;
                        const volume = parseInt(message.quantity || "0", 10);
                        const timestamp = message.time_stamp
                            ? parseInt(message.time_stamp, 10) / 1000
                            : Date.now(); // Convert microseconds to milliseconds

                        // Get existing quote or create new one
                        const existingQuote = quotes.get(symbol) || {
                            symbol,
                            bid: price,
                            ask: price,
                            last: price,
                            volume: 0,
                            timestamp: timestamp,
                            change: 0,
                            changePercent: 0,
                            open: price,
                            high: price,
                            low: price,
                            close: price,
                        };

                        // Update bid/ask based on entry_type (0 = bid, 1 = ask)
                        const updatedQuote = {
                            ...existingQuote,
                            [message.entry_type === "0" ? "bid" : "ask"]: price,
                            last: price,
                            volume: volume,
                            timestamp: timestamp,
                            high: Math.max(existingQuote.high, price),
                            low: Math.min(existingQuote.low, price),
                        };

                        // Calculate change from previous last price
                        const change = price - existingQuote.last;
                        updatedQuote.change = change;
                        updatedQuote.changePercent =
                            existingQuote.last !== 0
                                ? (change / existingQuote.last) * 100
                                : 0;

                        console.log(
                            `[QuoteContext:esp] Transformed quote for ${symbol}:`,
                            updatedQuote
                        );
                        updateQuote(updatedQuote);
                    } else if (streamType === "rfs" && message.quote_data) {
                        console.log(
                            `[QuoteContext:rfs] RFS quote:`,
                            message.quote_data
                        );
                        updateQuote(message.quote_data);
                    } else if (
                        streamType === "exec" &&
                        message.execution_data
                    ) {
                        // Handle execution data if needed
                        console.log(
                            "[QuoteContext:exec] Execution data received:",
                            message.execution_data
                        );
                    }
                } catch (error) {
                    console.error(
                        `[QuoteContext:${streamType}] Failed to parse quote message:`,
                        error
                    );
                    console.error(
                        `[QuoteContext:${streamType}] Raw message:`,
                        event.data
                    );
                }
            };

            ws.onerror = (error) => {
                console.error(`Quote WebSocket error (${streamType}):`, error);
                setConnectionStatus("error");
            };

            ws.onclose = (event) => {
                console.log(
                    `Quote WebSocket disconnected (${streamType}), code: ${event.code}`
                );

                // Clean up ping interval
                if ((ws as any)._pingInterval) {
                    clearInterval((ws as any)._pingInterval);
                }

                setIsConnected(false);
                setConnectionStatus("disconnected");
                wsRef.current = null;

                // Auto-reconnect only if authenticated and not intentionally closed
                if (autoConnect && isAuthenticated && event.code !== 1000) {
                    console.log(
                        `[QuoteContext:${streamType}] Scheduling reconnection in ${reconnectInterval}ms`
                    );
                    reconnectTimeoutRef.current = setTimeout(
                        connect,
                        reconnectInterval
                    );
                }
            };
        } catch (error) {
            console.error(
                "Failed to connect to authenticated quote service:",
                error
            );
            setConnectionStatus("error");

            // Retry connection if token acquisition failed
            if (autoConnect && isAuthenticated) {
                reconnectTimeoutRef.current = setTimeout(
                    connect,
                    reconnectInterval
                );
            }
        }
    }, [streamType, isAuthenticated, autoConnect, reconnectInterval, mockMode]);

    const disconnect = useCallback(() => {
        console.log(`[QuoteContext:${streamType}] Disconnecting...`);

        // Clear reconnection timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = undefined;
        }

        // Clear mock interval
        if (mockIntervalRef.current) {
            clearInterval(mockIntervalRef.current);
            mockIntervalRef.current = undefined;
        }

        // Close WebSocket connection
        if (wsRef.current) {
            // Clear ping interval if exists
            if ((wsRef.current as any)._pingInterval) {
                clearInterval((wsRef.current as any)._pingInterval);
            }

            // Close with normal closure code
            wsRef.current.close(1000, "Normal closure");
            wsRef.current = null;
        }

        setIsConnected(false);
        setConnectionStatus("disconnected");
    }, [streamType]);

    const subscribeToSymbol = useCallback(
        (symbol: string) => {
            if (subscribedSymbols.current.has(symbol)) return;

            subscribedSymbols.current.add(symbol);

            if (mockMode) {
                // Generate initial mock quote
                const quote = generateMockQuote(symbol);
                updateQuote(quote);
            } else if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                    JSON.stringify({ type: "subscribe", symbol })
                );
            }
        },
        [mockMode, generateMockQuote, updateQuote]
    );

    const unsubscribeFromSymbol = useCallback(
        (symbol: string) => {
            subscribedSymbols.current.delete(symbol);

            if (!mockMode && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                    JSON.stringify({ type: "unsubscribe", symbol })
                );
            }
        },
        [mockMode]
    );

    const getQuote = useCallback(
        (symbol: string) => {
            return quotes.get(symbol);
        },
        [quotes]
    );

    const reconnect = useCallback(() => {
        disconnect();
        connect();
    }, [disconnect, connect]);

    // Handle stream type changes
    useEffect(() => {
        if (isConnected) {
            console.log(
                `[QuoteContext] Stream type changed to ${streamType}, reconnecting...`
            );
            disconnect();
            // Small delay before reconnecting to new stream
            const timer = setTimeout(() => {
                connect();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [streamType]); // Only depend on streamType

    // Auto-connect when authenticated
    useEffect(() => {
        if (autoConnect && isAuthenticated) {
            console.log(
                `[QuoteContext] Auto-connecting (authenticated=${isAuthenticated}, autoConnect=${autoConnect})`
            );
            connect();
        } else if (!isAuthenticated) {
            console.log(`[QuoteContext] User not authenticated, disconnecting`);
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, isAuthenticated]); // Remove connect/disconnect from dependencies

    const value: QuoteContextType = {
        quotes,
        subscribeToSymbol,
        unsubscribeFromSymbol,
        updateQuote,
        getQuote,
        isConnected,
        connectionStatus,
        reconnect,
        streamType,
        setStreamType,
    };

    return (
        <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>
    );
};

// Hook for subscribing to specific symbols
export const useQuote = (symbol: string | string[]) => {
    const { quotes, subscribeToSymbol, unsubscribeFromSymbol, getQuote } =
        useQuoteContext();
    const symbols = Array.isArray(symbol) ? symbol : [symbol];

    useEffect(() => {
        console.log(`[useQuote] Subscribing to symbols:`, symbols);
        symbols.forEach((s) => subscribeToSymbol(s));

        return () => {
            console.log(`[useQuote] Unsubscribing from symbols:`, symbols);
            symbols.forEach((s) => unsubscribeFromSymbol(s));
        };
    }, [symbols.join(","), subscribeToSymbol, unsubscribeFromSymbol]);

    // Make the hook reactive to quotes Map changes
    const currentQuotes = useMemo(() => {
        if (Array.isArray(symbol)) {
            const result = symbols
                .map((s) => getQuote(s))
                .filter(Boolean) as Quote[];
            console.log(
                `[useQuote] Retrieved quotes for ${symbols.join(",")}:`,
                result
            );
            return result;
        }
        const result = getQuote(symbol);
        console.log(`[useQuote] Retrieved quote for ${symbol}:`, result);
        return result;
    }, [symbol, symbols, getQuote, quotes]);

    return currentQuotes;
};

// Hook for managing stream types
export const useQuoteStream = () => {
    const { streamType, setStreamType, isConnected, connectionStatus } =
        useQuoteContext();

    return {
        streamType,
        setStreamType,
        isConnected,
        connectionStatus,
    };
};
