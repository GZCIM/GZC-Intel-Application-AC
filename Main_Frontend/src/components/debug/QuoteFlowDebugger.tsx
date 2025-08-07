import React, { useState, useEffect } from "react";
import { useQuoteContext, useQuote } from "../../contexts/QuoteContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../hooks/useAuth";

export const QuoteFlowDebugger: React.FC = () => {
    const { currentTheme: theme } = useTheme();
    const { isAuthenticated } = useAuth();
    const { isConnected, connectionStatus, streamType, setStreamType } =
        useQuoteContext();

    const [isVisible, setIsVisible] = useState(true);
    const testSymbols = ["EUR/USD", "GBP/USD", "USD/JPY"];

    // Use the useQuote hook to automatically subscribe and get reactive updates
    const quotes = useQuote(testSymbols);

    // Debug logging
    useEffect(() => {
        console.log("[QuoteFlowDebugger] Current quotes:", quotes);
        console.log("[QuoteFlowDebugger] Quotes length:", quotes?.length);
        console.log("[QuoteFlowDebugger] Is connected:", isConnected);
    }, [quotes, isConnected]);

    const getStatusColor = () => {
        switch (connectionStatus) {
            case "connected":
                return theme.success;
            case "connecting":
                return theme.warning;
            case "error":
                return theme.danger;
            case "disconnected":
                return theme.textSecondary;
            default:
                return theme.textSecondary;
        }
    };

    const getStatusIcon = () => {
        switch (connectionStatus) {
            case "connected":
                return "🟢";
            case "connecting":
                return "🟡";
            case "error":
                return "🔴";
            case "disconnected":
                return "⚪";
            default:
                return "❓";
        }
    };

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    padding: "12px 16px",
                    backgroundColor: "#ff6b35",
                    color: "white",
                    border: "2px solid #fff",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                    zIndex: 99999,
                    boxShadow: "0 4px 20px rgba(255, 107, 53, 0.5)",
                    animation: "pulse 2s infinite",
                }}
            >
                🔌 WS AUTH DEBUG
            </button>
        );
    }

    return (
        <div
            style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                width: "380px",
                backgroundColor: theme.surface || "#1a1a1a",
                border: `3px solid #ff6b35`,
                borderRadius: "12px",
                padding: "20px",
                fontSize: "13px",
                color: theme.text || "#ffffff",
                zIndex: 99999,
                boxShadow:
                    "0 8px 32px rgba(255, 107, 53, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                maxHeight: "80vh",
                overflowY: "auto",
                backdropFilter: "blur(10px)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#ff6b35",
                        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                    }}
                >
                    🔌 AUTHORIZATION DEBUG
                </h3>
                <button
                    onClick={() => setIsVisible(false)}
                    style={{
                        background: "none",
                        border: "none",
                        color: theme.text,
                        cursor: "pointer",
                        fontSize: "16px",
                        padding: "4px",
                    }}
                >
                    ×
                </button>
            </div>

            {/* Authentication Status */}
            <div
                style={{
                    marginBottom: "12px",
                    padding: "8px",
                    backgroundColor: theme.background,
                    borderRadius: "4px",
                }}
            >
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                    Authentication:
                </div>
                <div
                    style={{
                        color: isAuthenticated ? theme.success : theme.danger,
                    }}
                >
                    {isAuthenticated
                        ? "✅ Authenticated"
                        : "❌ Not Authenticated"}
                </div>
            </div>

            {/* Connection Status */}
            <div
                style={{
                    marginBottom: "12px",
                    padding: "8px",
                    backgroundColor: theme.background,
                    borderRadius: "4px",
                }}
            >
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                    Connection:
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                    }}
                >
                    <span>{getStatusIcon()}</span>
                    <span style={{ color: getStatusColor() }}>
                        {connectionStatus.toUpperCase()}
                    </span>
                </div>
                <div style={{ color: theme.textSecondary }}>
                    Stream: {streamType.toUpperCase()}
                </div>
            </div>

            {/* Stream Type Selector */}
            <div
                style={{
                    marginBottom: "12px",
                    padding: "8px",
                    backgroundColor: theme.background,
                    borderRadius: "4px",
                }}
            >
                <div style={{ fontWeight: "600", marginBottom: "8px" }}>
                    Stream Type:
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                    {(["esp", "rfs", "exec"] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setStreamType(type)}
                            style={{
                                padding: "4px 8px",
                                fontSize: "10px",
                                border: `1px solid ${theme.border}`,
                                borderRadius: "3px",
                                backgroundColor:
                                    streamType === type
                                        ? theme.primary
                                        : theme.surface,
                                color:
                                    streamType === type ? "white" : theme.text,
                                cursor: "pointer",
                            }}
                        >
                            {type.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Subscribed Symbols & Quotes */}
            <div
                style={{
                    marginBottom: "12px",
                    padding: "8px",
                    backgroundColor: theme.background,
                    borderRadius: "4px",
                }}
            >
                <div style={{ fontWeight: "600", marginBottom: "8px" }}>
                    Subscribed Symbols ({quotes.length}):
                </div>
                {testSymbols.map((symbol) => {
                    const quote = quotes.find((q) => q.symbol === symbol);
                    return (
                        <div
                            key={symbol}
                            style={{
                                marginBottom: "6px",
                                padding: "6px",
                                backgroundColor: theme.surface,
                                borderRadius: "3px",
                                border: `1px solid ${theme.borderLight}`,
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: "600",
                                    marginBottom: "2px",
                                }}
                            >
                                {symbol}
                            </div>
                            {quote && quote.bid && quote.ask ? (
                                <div
                                    style={{
                                        fontSize: "10px",
                                        color: theme.textSecondary,
                                    }}
                                >
                                    <div>Bid: {quote.bid.toFixed(5)}</div>
                                    <div>Ask: {quote.ask.toFixed(5)}</div>
                                    <div>Last: {quote.last.toFixed(5)}</div>
                                    <div>
                                        Volume: {quote.volume.toLocaleString()}
                                    </div>
                                    <div>
                                        Updated:{" "}
                                        {new Date(
                                            quote.timestamp
                                        ).toLocaleTimeString()}
                                    </div>
                                    <div>
                                        Change: {quote.change > 0 ? "+" : ""}
                                        {quote.change.toFixed(6)}(
                                        {quote.changePercent > 0 ? "+" : ""}
                                        {quote.changePercent.toFixed(4)}%)
                                    </div>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        fontSize: "10px",
                                        color: theme.textSecondary,
                                    }}
                                >
                                    No quote data received
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Manual Symbol Subscription */}
            <div
                style={{
                    padding: "8px",
                    backgroundColor: theme.background,
                    borderRadius: "4px",
                }}
            >
                <div style={{ fontWeight: "600", marginBottom: "8px" }}>
                    Test Symbols:
                </div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {testSymbols.map((symbol) => (
                        <button
                            key={symbol}
                            onClick={() => {
                                // The useQuote hook will handle subscription and quote updates
                            }}
                            disabled={quotes.some((q) => q.symbol === symbol)}
                            style={{
                                padding: "4px 8px",
                                fontSize: "10px",
                                border: `1px solid ${theme.border}`,
                                borderRadius: "3px",
                                backgroundColor: quotes.some(
                                    (q) => q.symbol === symbol
                                )
                                    ? theme.success + "20"
                                    : theme.surface,
                                color: theme.text,
                                cursor: quotes.some((q) => q.symbol === symbol)
                                    ? "default"
                                    : "pointer",
                                opacity: quotes.some((q) => q.symbol === symbol)
                                    ? 0.6
                                    : 1,
                            }}
                        >
                            {symbol}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
