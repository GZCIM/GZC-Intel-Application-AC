import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { portfolioAPI, setGZCPortfolioAuthProvider } from "./api";
import {
    FXForwardTrade,
    FXPosition,
    PositionsSummary,
    TradesSummary,
    ViewMode,
    FundType,
    ActiveStatus,
} from "./types";

interface GZCPortfolioComponentProps {
    width?: number | string;
    height?: number | string;
    defaultView?: ViewMode;
    defaultFund?: FundType;
}

// Fallback theme for when ThemeContext is not available
const fallbackTheme = {
    surface: "#1a1a1a",
    border: "#333333",
    text: "#ffffff",
    textSecondary: "#cccccc",
    background: "#0d1117",
    primary: "#7A9E65",
    success: "#28a745",
    danger: "#dc3545",
    warning: "#ffc107",
    info: "#17a2b8",
};

// Error boundary component for theme context
class ThemeErrorBoundary extends React.Component<
    { children: React.ReactNode; fallbackTheme: any; componentProps: any },
    { hasError: boolean }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.warn(
            "ThemeContext error caught by boundary:",
            error,
            errorInfo
        );
    }

    render() {
        if (this.state.hasError) {
            return (
                <GZCPortfolioComponentInternal
                    {...this.props.componentProps}
                    theme={this.props.fallbackTheme}
                />
            );
        }

        return this.props.children;
    }
}

// Safe wrapper component that uses error boundary
const GZCPortfolioWrapper: React.FC<GZCPortfolioComponentProps> = (props) => {
    return (
        <ThemeErrorBoundary
            fallbackTheme={fallbackTheme}
            componentProps={props}
        >
            <GZCPortfolioWithTheme {...props} />
        </ThemeErrorBoundary>
    );
};

// Component that uses theme context
const GZCPortfolioWithTheme: React.FC<GZCPortfolioComponentProps> = (props) => {
    const { currentTheme: theme } = useTheme();
    return <GZCPortfolioComponentInternal {...props} theme={theme} />;
};

// Main component implementation
const GZCPortfolioComponentInternal: React.FC<
    GZCPortfolioComponentProps & { theme: any }
> = ({
    width = "100%",
    height = "100%",
    defaultView = "trades",
    defaultFund = "6", // GCF default
    theme,
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
    const [trades, setTrades] = useState<FXForwardTrade[]>([]);
    const [tradesSummary, setTradesSummary] = useState<TradesSummary | null>(
        null
    );
    const [positions, setPositions] = useState<FXPosition[]>([]);
    const [positionsSummary, setPositionsSummary] =
        useState<PositionsSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFund, setSelectedFund] = useState<FundType>(defaultFund);
    const [isActive, setIsActive] = useState(true);

    // Use real MSAL authentication
    const { isAuthenticated, getAccessToken } = useAuth();

    // Set up authentication provider for the API
    useEffect(() => {
        console.log("🔒 GZC Portfolio Auth Setup:", { isAuthenticated });
        if (isAuthenticated) {
            console.log("✅ Setting up GZC Portfolio auth provider");
            setGZCPortfolioAuthProvider(getAccessToken);
        }
    }, [isAuthenticated]);

    // Fetch trades
    const fetchTrades = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Authentication is now handled automatically by the API service
            console.log(
                "Making authenticated portfolio API call for trades..."
            );

            const activeStatus: ActiveStatus = isActive ? "active" : "inactive";
            const { trades: fetchedTrades, summary } =
                await portfolioAPI.fetchTrades(
                    selectedFund === "all" ? undefined : selectedFund,
                    activeStatus
                );

            setTrades(fetchedTrades);
            setTradesSummary(summary);
        } catch (err) {
            console.error("Error fetching trades:", err);
            setError("Failed to fetch trades");
        } finally {
            setLoading(false);
        }
    }, [selectedFund, isActive]);

    // Fetch positions
    const fetchPositions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Authentication is now handled automatically by the API service
            console.log(
                "Making authenticated portfolio API call for positions..."
            );

            const activeStatus: ActiveStatus = isActive ? "active" : "inactive";
            const { positions: fetchedPositions, summary } =
                await portfolioAPI.fetchPositions(
                    selectedFund === "all" ? undefined : selectedFund,
                    activeStatus
                );

            setPositions(fetchedPositions);
            setPositionsSummary(summary);
        } catch (err) {
            console.error("Error fetching positions:", err);
            setError("Failed to fetch positions");
        } finally {
            setLoading(false);
        }
    }, [selectedFund, isActive]);

    // Fetch data based on view mode
    useEffect(() => {
        console.log("🔄 GZC Portfolio useEffect triggered:", {
            viewMode,
            selectedFund,
            isActive,
            isAuthenticated,
        });

        if (!isAuthenticated) {
            console.log("❌ Skipping data fetch - user not authenticated");
            return;
        }

        if (viewMode === "trades") {
            console.log("📊 Fetching trades...");
            fetchTrades();
        } else {
            console.log("📊 Fetching positions...");
            fetchPositions();
        }
    }, [
        viewMode,
        selectedFund,
        isActive,
        isAuthenticated,
        fetchTrades,
        fetchPositions,
    ]);

    // Subscribe to real-time updates - TEMPORARILY DISABLED
    // useEffect(() => {
    //     const unsubscribe = portfolioAPI.subscribeToUpdates((trade) => {
    //         // Update trades if in trades view
    //         if (viewMode === "trades") {
    //             setTrades((prev) => {
    //                 const index = prev.findIndex((t) => t.id === trade.id);
    //                 if (index >= 0) {
    //                     const updated = [...prev];
    //                     updated[index] = trade;
    //                     return updated;
    //                 }
    //                 return [trade, ...prev];
    //             });
    //         }
    //     });

    //     return () => {
    //         unsubscribe();
    //     };
    // }, [viewMode]);

    // Format helpers
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatRate = (rate: number, pair: string) => {
        if (!rate) return "-";
        const decimals = pair?.includes("JPY") ? 2 : 4;
        return rate.toFixed(decimals);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat("en-US").format(Math.round(num));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "ACTIVE":
                return theme.success;
            case "LONG":
                return theme.success;
            case "SHORT":
                return theme.danger;
            case "FLAT":
                return theme.textSecondary;
            default:
                return theme.textSecondary;
        }
    };

    return (
        <div
            style={{
                width,
                height,
                background: theme.surface,
                borderRadius: "8px",
                border: `1px solid ${theme.border}`,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: "16px 20px",
                    borderBottom: `1px solid ${theme.border}`,
                    backgroundColor: theme.surface,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <h2
                            style={{
                                color: theme.text,
                                fontSize: "16px",
                                fontWeight: "600",
                                margin: 0,
                            }}
                        >
                            GZC Portfolio -{" "}
                            {viewMode === "trades"
                                ? "FX Forward Trades"
                                : "FX Positions"}
                        </h2>
                        <div
                            style={{
                                color: theme.textSecondary,
                                fontSize: "11px",
                                marginTop: "4px",
                            }}
                        >
                            {viewMode === "trades"
                                ? `${trades.length} trades • ${
                                      isActive ? "Active" : "Closed"
                                  } • ${
                                      selectedFund === "all"
                                          ? "All Funds"
                                          : selectedFund === "6"
                                          ? "GCF"
                                          : "GMF"
                                  }`
                                : `${positions.length} positions • ${
                                      isActive ? "Active" : "Closed"
                                  } • ${
                                      selectedFund === "all"
                                          ? "All Funds"
                                          : selectedFund === "6"
                                          ? "GCF"
                                          : "GMF"
                                  }`}
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        {/* View Toggle */}
                        <div
                            style={{
                                display: "flex",
                                background: theme.background,
                                borderRadius: "4px",
                                padding: "2px",
                                border: `1px solid ${theme.border}`,
                            }}
                        >
                            <button
                                onClick={() => setViewMode("trades")}
                                disabled={loading}
                                style={{
                                    background:
                                        viewMode === "trades"
                                            ? theme.primary
                                            : "transparent",
                                    color:
                                        viewMode === "trades"
                                            ? "white"
                                            : theme.text,
                                    border: "none",
                                    borderRadius: "3px",
                                    padding: "4px 10px",
                                    fontSize: "11px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    transition: "all 0.2s",
                                    opacity: loading ? 0.7 : 1,
                                }}
                            >
                                Trades
                            </button>
                            <button
                                onClick={() => setViewMode("positions")}
                                disabled={loading}
                                style={{
                                    background:
                                        viewMode === "positions"
                                            ? theme.primary
                                            : "transparent",
                                    color:
                                        viewMode === "positions"
                                            ? "white"
                                            : theme.text,
                                    border: "none",
                                    borderRadius: "3px",
                                    padding: "4px 10px",
                                    fontSize: "11px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    transition: "all 0.2s",
                                    opacity: loading ? 0.7 : 1,
                                }}
                            >
                                Positions
                            </button>
                        </div>

                        {/* Fund Filter */}
                        <select
                            value={selectedFund}
                            onChange={(e) =>
                                setSelectedFund(e.target.value as FundType)
                            }
                            disabled={loading}
                            style={{
                                background: theme.background,
                                color: theme.text,
                                border: `1px solid ${theme.border}`,
                                borderRadius: "4px",
                                padding: "5px 10px",
                                fontSize: "11px",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                outline: "none",
                            }}
                        >
                            <option value="6">GCF</option>
                            <option value="1">GMF</option>
                            <option value="all">All Funds</option>
                        </select>

                        {/* Active/Closed Toggle */}
                        <button
                            onClick={() => setIsActive(!isActive)}
                            disabled={loading}
                            style={{
                                background: theme.primary,
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                padding: "5px 12px",
                                fontSize: "11px",
                                cursor: loading ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                                opacity: loading ? 0.7 : 1,
                                minWidth: "80px",
                            }}
                        >
                            {isActive ? "📂 Active" : "📁 Closed"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {!loading &&
                !error &&
                (viewMode === "trades" ? tradesSummary : positionsSummary) && (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(150px, 1fr))",
                            gap: "12px",
                            padding: "16px",
                            borderBottom: `1px solid ${theme.border}`,
                            backgroundColor: theme.background,
                        }}
                    >
                        {viewMode === "trades" && tradesSummary && (
                            <>
                                <div
                                    style={{
                                        backgroundColor: theme.surface,
                                        padding: "12px",
                                        borderRadius: "6px",
                                        border: `1px solid ${theme.border}`,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Total Notional
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "16px",
                                            fontWeight: "600",
                                            color: theme.text,
                                        }}
                                    >
                                        {formatCurrency(
                                            tradesSummary.total_notional
                                        )}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        backgroundColor: theme.surface,
                                        padding: "12px",
                                        borderRadius: "6px",
                                        border: `1px solid ${theme.border}`,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Total P&L
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "16px",
                                            fontWeight: "600",
                                            color:
                                                tradesSummary.total_pnl >= 0
                                                    ? theme.success
                                                    : theme.danger,
                                        }}
                                    >
                                        {formatCurrency(
                                            tradesSummary.total_pnl
                                        )}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        backgroundColor: theme.surface,
                                        padding: "12px",
                                        borderRadius: "6px",
                                        border: `1px solid ${theme.border}`,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Win Rate
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "16px",
                                            fontWeight: "600",
                                            color: theme.text,
                                        }}
                                    >
                                        {tradesSummary.total_trades > 0
                                            ? (
                                                  (tradesSummary.profitable_trades /
                                                      tradesSummary.total_trades) *
                                                  100
                                              ).toFixed(1)
                                            : "0"}
                                        %
                                    </div>
                                </div>
                            </>
                        )}
                        {viewMode === "positions" && positionsSummary && (
                            <>
                                <div
                                    style={{
                                        backgroundColor: theme.surface,
                                        padding: "12px",
                                        borderRadius: "6px",
                                        border: `1px solid ${theme.border}`,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Long Positions
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "16px",
                                            fontWeight: "600",
                                            color: theme.success,
                                        }}
                                    >
                                        {positionsSummary.long_positions}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        backgroundColor: theme.surface,
                                        padding: "12px",
                                        borderRadius: "6px",
                                        border: `1px solid ${theme.border}`,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Short Positions
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "16px",
                                            fontWeight: "600",
                                            color: theme.danger,
                                        }}
                                    >
                                        {positionsSummary.short_positions}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        backgroundColor: theme.surface,
                                        padding: "12px",
                                        borderRadius: "6px",
                                        border: `1px solid ${theme.border}`,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Total Volume
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "16px",
                                            fontWeight: "600",
                                            color: theme.text,
                                        }}
                                    >
                                        {formatCurrency(
                                            positionsSummary.total_volume
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

            {/* Main Content Area */}
            <div
                style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "16px",
                }}
            >
                {/* Loading State */}
                {loading && (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                border: `3px solid ${theme.border}`,
                                borderTop: `3px solid ${theme.primary}`,
                                margin: "0 auto 16px",
                            }}
                        />
                        <div
                            style={{
                                color: theme.textSecondary,
                                fontSize: "13px",
                            }}
                        >
                            Loading {viewMode}...
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div
                        style={{
                            background: theme.background,
                            border: `1px solid ${theme.danger}`,
                            borderRadius: "4px",
                            padding: "12px",
                            color: theme.danger,
                            marginBottom: "20px",
                            fontSize: "13px",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Trades Table */}
                {!loading && !error && viewMode === "trades" && (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "12px",
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        borderBottom: `2px solid ${theme.border}`,
                                        backgroundColor: theme.background,
                                    }}
                                >
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "left",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Trade ID
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "left",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Pair
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "right",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Notional
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "right",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Rate
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "right",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Market
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "right",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        P&L
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "left",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Counterparty
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "left",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.map((trade, index) => (
                                    <motion.tr
                                        key={trade.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        style={{
                                            borderBottom: `1px solid ${theme.border}`,
                                            "&:hover": {
                                                backgroundColor:
                                                    theme.background,
                                            },
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "8px",
                                                color: theme.text,
                                            }}
                                        >
                                            {trade.id}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                color: theme.text,
                                                fontWeight: "500",
                                            }}
                                        >
                                            {trade.currency_pair}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                textAlign: "right",
                                                color: theme.text,
                                            }}
                                        >
                                            {formatCurrency(trade.notional)}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                textAlign: "right",
                                                color: theme.text,
                                            }}
                                        >
                                            {formatRate(
                                                trade.rate,
                                                trade.currency_pair
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                textAlign: "right",
                                                color: theme.text,
                                            }}
                                        >
                                            {formatRate(
                                                trade.market_rate,
                                                trade.currency_pair
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                textAlign: "right",
                                                color:
                                                    trade.pnl >= 0
                                                        ? theme.success
                                                        : theme.danger,
                                                fontWeight: "500",
                                            }}
                                        >
                                            {formatCurrency(trade.pnl)}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                color: theme.text,
                                            }}
                                        >
                                            {trade.counterparty}
                                        </td>
                                        <td style={{ padding: "8px" }}>
                                            <span
                                                style={{
                                                    color: getStatusColor(
                                                        trade.status
                                                    ),
                                                    fontSize: "10px",
                                                    padding: "2px 6px",
                                                    backgroundColor: `${getStatusColor(
                                                        trade.status
                                                    )}20`,
                                                    borderRadius: "3px",
                                                }}
                                            >
                                                {trade.status}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Positions Table */}
                {!loading && !error && viewMode === "positions" && (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "12px",
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        borderBottom: `2px solid ${theme.border}`,
                                        backgroundColor: theme.background,
                                    }}
                                >
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "left",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Currency Pair
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "right",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Net Position
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "center",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Status
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "right",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Trades
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "right",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Avg Rate
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "right",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Volume
                                    </th>
                                    <th
                                        style={{
                                            padding: "8px",
                                            textAlign: "left",
                                            color: theme.textSecondary,
                                        }}
                                    >
                                        Last Trade
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {positions.map((position, index) => (
                                    <motion.tr
                                        key={position.currency_pair}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        style={{
                                            borderBottom: `1px solid ${theme.border}`,
                                            "&:hover": {
                                                backgroundColor:
                                                    theme.background,
                                            },
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "8px",
                                                color: theme.text,
                                                fontWeight: "500",
                                            }}
                                        >
                                            {position.currency_pair}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                textAlign: "right",
                                                color:
                                                    position.net_position >= 0
                                                        ? theme.success
                                                        : theme.danger,
                                                fontWeight: "500",
                                            }}
                                        >
                                            {formatCurrency(
                                                Math.abs(position.net_position)
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                textAlign: "center",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: getStatusColor(
                                                        position.position_status
                                                    ),
                                                    fontSize: "10px",
                                                    padding: "2px 8px",
                                                    backgroundColor: `${getStatusColor(
                                                        position.position_status
                                                    )}20`,
                                                    borderRadius: "3px",
                                                }}
                                            >
                                                {position.position_status}
                                            </span>
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                textAlign: "right",
                                                color: theme.text,
                                            }}
                                        >
                                            {position.trade_count}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                textAlign: "right",
                                                color: theme.text,
                                            }}
                                        >
                                            {formatRate(
                                                position.weighted_avg_rate,
                                                position.currency_pair
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                textAlign: "right",
                                                color: theme.text,
                                            }}
                                        >
                                            {formatCurrency(
                                                position.total_volume
                                            )}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px",
                                                color: theme.textSecondary,
                                                fontSize: "11px",
                                            }}
                                        >
                                            {new Date(
                                                position.last_trade_date
                                            ).toLocaleDateString()}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Empty State */}
                {!loading &&
                    !error &&
                    ((viewMode === "trades" && trades.length === 0) ||
                        (viewMode === "positions" &&
                            positions.length === 0)) && (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "60px 20px",
                                color: theme.textSecondary,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "48px",
                                    opacity: 0.3,
                                    marginBottom: "16px",
                                }}
                            >
                                {viewMode === "trades" ? "📊" : "💹"}
                            </div>
                            <div style={{ fontSize: "14px" }}>
                                No {viewMode} found for the selected filters
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
};

export const GZCPortfolioComponent: React.FC<GZCPortfolioComponentProps> = (
    props
) => {
    return <GZCPortfolioWrapper {...props} />;
};
