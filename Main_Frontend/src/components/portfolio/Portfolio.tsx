import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useTheme } from "../../contexts/ThemeContext";

interface PortfolioProps {
    apiEndpoint?: string;
}

/**
 * Portfolio component
 * - Mirrors internal structure and styling approach used by bloomberg-volatility module
 * - Provides header, controls area, and a main content area that fills the tile
 * - Minimal data wiring for now; ready to integrate with backend portfolio APIs
 */
export const Portfolio: React.FC<PortfolioProps> = ({
    apiEndpoint = process.env.NODE_ENV === "development"
        ? "http://localhost:8080"
        : "/api/bloomberg",
}) => {
    const { currentTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [portfolios, setPortfolios] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");

    useEffect(() => {
        const fetchPortfolios = async () => {
            setLoading(true);
            setError(null);
            try {
                // Placeholder endpoint; adjust when backend is ready
                // Using try/catch and non-fatal failures to keep UI responsive
                const resp = await axios.get(`${apiEndpoint}/api/portfolio/list`);
                const list = (resp.data?.data || resp.data || []).map((p: any, idx: number) => ({
                    id: String(p.id ?? idx),
                    name: String(p.name ?? p.title ?? `Portfolio ${idx + 1}`),
                }));
                setPortfolios(list);
                if (list.length > 0) setSelectedPortfolioId(list[0].id);
            } catch (e) {
                // Non-blocking; show empty state when API not available yet
                setError(null);
            } finally {
                setLoading(false);
            }
        };
        fetchPortfolios();
    }, [apiEndpoint]);

    const selectedPortfolio = useMemo(
        () => portfolios.find((p) => p.id === selectedPortfolioId) || null,
        [portfolios, selectedPortfolioId]
    );

    return (
        <div
            style={{
                backgroundColor: currentTheme.surface,
                borderRadius: "8px",
                border: `1px solid ${currentTheme.border}`,
                overflow: "hidden",
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: "8px",
                    borderBottom: `1px solid ${currentTheme.border}`,
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label
                        style={{
                            fontSize: "12px",
                            color: currentTheme.textSecondary,
                            marginRight: 8,
                        }}
                    >
                        Portfolio:
                    </label>
                    <select
                        value={selectedPortfolioId}
                        onChange={(e) => setSelectedPortfolioId(e.target.value)}
                        aria-label="Select portfolio"
                        style={{
                            backgroundColor: currentTheme.background,
                            color: currentTheme.text,
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: 4,
                            padding: "4px 8px",
                            fontSize: 12,
                        }}
                    >
                        {portfolios.length === 0 ? (
                            <option value="">Select Portfolio</option>
                        ) : (
                            portfolios.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                <div style={{ marginLeft: "auto", fontSize: 11, color: currentTheme.textSecondary }}>
                    {loading ? "Loading..." : error ? "" : selectedPortfolio ? selectedPortfolio.name : "No selection"}
                </div>
            </div>

            {/* Content */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    backgroundColor: currentTheme.background,
                    padding: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: currentTheme.textSecondary,
                    fontSize: 12,
                    borderTop: `1px solid ${currentTheme.border}20`,
                }}
            >
                {selectedPortfolio ? (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `1px dashed ${currentTheme.border}`,
                            borderRadius: 4,
                            background: currentTheme.surface + "20",
                        }}
                    >
                        Portfolio view is coming soon
                    </div>
                ) : (
                    <div>Select a portfolio to view details</div>
                )}
            </div>
        </div>
    );
};

export default Portfolio;

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";
import { useQuoteContext } from "../../contexts/QuoteContext";
import { useUser } from "../../hooks/useUser";
import { useAuth } from "../../hooks/useAuth";
import { PortfolioTable } from "./PortfolioTable";
import { PortfolioMetrics } from "./PortfolioMetrics";
import { PortfolioChart } from "./PortfolioChart";
import {
    PortfolioPosition,
    PortfolioMetrics as MetricsType,
    PortfolioFilter,
    TimeRange,
} from "../../types/portfolio";
import { generateMockPortfolio } from "../../utils/mockPortfolioData";
import { usePortfolioData } from "../../modules/portfolio/hooks/usePortfolioData";
import { useTransactionsData } from "../../modules/portfolio/hooks/useTransactionsData";

interface PortfolioProps {
    width?: number | string;
    height?: number | string;
    mockMode?: boolean;
}

export const Portfolio: React.FC<PortfolioProps> = ({
    width = "100%",
    height = "100%",
    mockMode = false, // Default to real data
}) => {
    const { currentTheme: theme } = useTheme();
    const { user: currentUser } = useUser();
    const { isAuthenticated } = useAuth();
    const { subscribeToSymbol, unsubscribeFromSymbol, getQuote } =
        useQuoteContext();

    const [positions, setPositions] = useState<PortfolioPosition[]>([]);
    const [metrics, setMetrics] = useState<MetricsType | null>(null);
    const [filter, setFilter] = useState<PortfolioFilter>({
        search: "",
        side: "ALL",
        profitable: undefined,
    });
    const [timeRange, setTimeRange] = useState<TimeRange>("1D");
    const [viewMode, setViewMode] = useState<"table" | "grid" | "chart">(
        "table"
    );

    // Use real portfolio hooks when not in mock mode
    const portfolioFilters = useMemo(
        () => ({
            symbol: filter.search,
            fundId: undefined,
            trader: "",
            position: "",
        }),
        [filter.search]
    );

    const {
        portfolio: portfolioData,
        isLoading: portfolioLoading,
        error: portfolioError,
    } = usePortfolioData(
        isAuthenticated && !mockMode ? portfolioFilters : undefined
    );

    const {
        transactions,
        isLoading: transactionsLoading,
        error: transactionsError,
    } = useTransactionsData();

    const loading = mockMode ? false : portfolioLoading || transactionsLoading;

    // Initialize with mock data or transform real data
    useEffect(() => {
        const loadPortfolioData = async () => {
            if (mockMode) {
                // Use mock data
                const mockData = generateMockPortfolio(
                    currentUser?.id || "default"
                );
                setPositions(mockData.positions);
                setMetrics(mockData.metrics);

                // Subscribe to quotes for all positions
                mockData.positions.forEach((pos) => {
                    subscribeToSymbol(pos.symbol);
                });
            } else if (portfolioData && isAuthenticated) {
                // Transform real portfolio data to match our interface
                console.log(
                    "[Portfolio] Processing real portfolio data:",
                    portfolioData
                );

                const transformedPositions: PortfolioPosition[] =
                    portfolioData.map((item) => {
                        const position: PortfolioPosition = {
                            id: item.id || `${item.symbol}-${Date.now()}`,
                            symbol: item.symbol,
                            side: item.position > 0 ? "BUY" : "SELL",
                            quantity: Math.abs(item.position),
                            averagePrice: item.avgPrice || 0,
                            currentPrice:
                                item.currentPrice || item.avgPrice || 0,
                            marketValue:
                                Math.abs(item.position) *
                                (item.currentPrice || item.avgPrice || 0),
                            costBasis:
                                Math.abs(item.position) * (item.avgPrice || 0),
                            unrealizedPnL: item.unrealizedPnL || 0,
                            realizedPnL: item.realizedPnL || 0,
                            totalPnL:
                                (item.unrealizedPnL || 0) +
                                (item.realizedPnL || 0),
                            pnlPercent: item.avgPrice
                                ? ((item.unrealizedPnL || 0) /
                                      (Math.abs(item.position) *
                                          item.avgPrice)) *
                                  100
                                : 0,
                            assetClass: item.assetClass || "FX",
                            sector: item.sector || "Currency",
                            lastUpdate: new Date().toISOString(),
                            openDate:
                                item.createdAt || new Date().toISOString(),
                        };
                        return position;
                    });

                setPositions(transformedPositions);

                // Calculate metrics from positions
                const totalMarketValue = transformedPositions.reduce(
                    (sum, pos) => sum + Math.abs(pos.marketValue),
                    0
                );
                const totalUnrealizedPnL = transformedPositions.reduce(
                    (sum, pos) => sum + pos.unrealizedPnL,
                    0
                );
                const totalRealizedPnL = transformedPositions.reduce(
                    (sum, pos) => sum + pos.realizedPnL,
                    0
                );
                const totalPnL = totalUnrealizedPnL + totalRealizedPnL;

                const calculatedMetrics: MetricsType = {
                    totalValue: totalMarketValue,
                    marketValue: totalMarketValue,
                    cash: 0, // Would need to get from API
                    dayPnL: totalUnrealizedPnL, // Approximation
                    dayPnLPercent:
                        totalMarketValue > 0
                            ? (totalUnrealizedPnL / totalMarketValue) * 100
                            : 0,
                    totalPnL,
                    totalPnLPercent:
                        totalMarketValue > 0
                            ? (totalPnL / totalMarketValue) * 100
                            : 0,
                    unrealizedPnL: totalUnrealizedPnL,
                    realizedPnL: totalRealizedPnL,
                    leverage: 1.0, // Would need to calculate
                    marginUsed: 0,
                    marginAvailable: 0,
                };

                setMetrics(calculatedMetrics);

                // Subscribe to quotes for all positions
                transformedPositions.forEach((pos) => {
                    subscribeToSymbol(pos.symbol);
                });

                console.log(
                    "[Portfolio] Transformed positions:",
                    transformedPositions
                );
                console.log(
                    "[Portfolio] Calculated metrics:",
                    calculatedMetrics
                );
            }
        };

        loadPortfolioData();
    }, [
        currentUser,
        mockMode,
        portfolioData,
        isAuthenticated,
        subscribeToSymbol,
        unsubscribeFromSymbol,
    ]);

    // Log errors
    useEffect(() => {
        if (portfolioError) {
            console.error("[Portfolio] Portfolio data error:", portfolioError);
        }
        if (transactionsError) {
            console.error(
                "[Portfolio] Transactions data error:",
                transactionsError
            );
        }
    }, [portfolioError, transactionsError]);

    // Update positions with real-time quotes
    const updatedPositions = useMemo(() => {
        return positions.map((position) => {
            const quote = getQuote(position.symbol);
            if (!quote) return position;

            const currentPrice = quote.last;
            const marketValue = position.quantity * currentPrice;
            const costBasis = position.quantity * position.averagePrice;
            const unrealizedPnL = marketValue - costBasis;
            const pnlPercent = (unrealizedPnL / costBasis) * 100;

            return {
                ...position,
                currentPrice,
                marketValue,
                unrealizedPnL,
                totalPnL: position.realizedPnL + unrealizedPnL,
                pnlPercent,
            };
        });
    }, [positions, getQuote]);

    // Apply filters
    const filteredPositions = useMemo(() => {
        return updatedPositions.filter((position) => {
            // Search filter
            if (filter.search) {
                const searchLower = filter.search.toLowerCase();
                if (!position.symbol.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }

            // Side filter
            if (filter.side !== "ALL" && position.side !== filter.side) {
                return false;
            }

            // Profitable filter
            if (filter.profitable !== undefined) {
                const isProfitable = position.totalPnL > 0;
                if (filter.profitable !== isProfitable) {
                    return false;
                }
            }

            // Asset class filter
            if (filter.assetClass && filter.assetClass.length > 0) {
                if (!filter.assetClass.includes(position.assetClass)) {
                    return false;
                }
            }

            return true;
        });
    }, [updatedPositions, filter]);

    // Calculate updated metrics
    const updatedMetrics = useMemo(() => {
        if (!metrics) return null;

        const totalMarketValue = filteredPositions.reduce(
            (sum, pos) => sum + pos.marketValue,
            0
        );
        const totalUnrealizedPnL = filteredPositions.reduce(
            (sum, pos) => sum + pos.unrealizedPnL,
            0
        );
        const totalPnL = filteredPositions.reduce(
            (sum, pos) => sum + pos.totalPnL,
            0
        );

        return {
            ...metrics,
            marketValue: totalMarketValue,
            unrealizedPnL: totalUnrealizedPnL,
            totalPnL,
            totalPnLPercent: (totalPnL / (totalMarketValue - totalPnL)) * 100,
        };
    }, [metrics, filteredPositions]);

    return (
        <div
            style={{
                width,
                height,
                display: "flex",
                flexDirection: "column",
                backgroundColor: theme.background,
                borderRadius: "8px",
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
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                        }}
                    >
                        <h2
                            style={{
                                margin: 0,
                                fontSize: "18px",
                                fontWeight: "600",
                                color: theme.text,
                            }}
                        >
                            Portfolio
                        </h2>

                        {/* Data Source Indicator */}
                        <div
                            style={{
                                padding: "4px 8px",
                                backgroundColor: mockMode
                                    ? theme.warning + "20"
                                    : theme.success + "20",
                                color: mockMode ? theme.warning : theme.success,
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "500",
                                border: `1px solid ${
                                    mockMode ? theme.warning : theme.success
                                }40`,
                            }}
                        >
                            {mockMode ? "🔧 Mock Data" : "📡 Live Data"}
                        </div>

                        {/* Auth Status */}
                        {!mockMode && (
                            <div
                                style={{
                                    padding: "4px 8px",
                                    backgroundColor: isAuthenticated
                                        ? theme.success + "20"
                                        : theme.danger + "20",
                                    color: isAuthenticated
                                        ? theme.success
                                        : theme.danger,
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: "500",
                                    border: `1px solid ${
                                        isAuthenticated
                                            ? theme.success
                                            : theme.danger
                                    }40`,
                                }}
                            >
                                {isAuthenticated
                                    ? "✅ Authenticated"
                                    : "❌ Not Authenticated"}
                            </div>
                        )}

                        {/* Error Indicators */}
                        {(portfolioError || transactionsError) && (
                            <div
                                style={{
                                    padding: "4px 8px",
                                    backgroundColor: theme.danger + "20",
                                    color: theme.danger,
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: "500",
                                    border: `1px solid ${theme.danger}40`,
                                    cursor: "pointer",
                                }}
                                title={
                                    portfolioError ||
                                    transactionsError ||
                                    undefined
                                }
                            >
                                ⚠️ API Error
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                        {/* Mock/Real Data Toggle */}
                        <button
                            onClick={() => {
                                // You can pass this as a prop or make it a state
                                window.location.search = mockMode
                                    ? "?mode=real"
                                    : "?mode=mock";
                            }}
                            style={{
                                padding: "6px 12px",
                                backgroundColor: theme.primary,
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "12px",
                                cursor: "pointer",
                            }}
                        >
                            Switch to {mockMode ? "Real" : "Mock"} Data
                        </button>

                        {/* View Mode Selector */}
                        <div
                            style={{
                                display: "flex",
                                backgroundColor: theme.background,
                                borderRadius: "6px",
                                padding: "2px",
                                border: `1px solid ${theme.border}`,
                            }}
                        >
                            {(["table", "grid", "chart"] as const).map(
                                (mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        style={{
                                            padding: "6px 12px",
                                            backgroundColor:
                                                viewMode === mode
                                                    ? theme.primary
                                                    : "transparent",
                                            color:
                                                viewMode === mode
                                                    ? theme.background
                                                    : theme.text,
                                            border: "none",
                                            borderRadius: "4px",
                                            fontSize: "12px",
                                            cursor: "pointer",
                                            textTransform: "capitalize",
                                            transition: "all 0.2s ease",
                                        }}
                                    >
                                        {mode}
                                    </button>
                                )
                            )}
                        </div>

                        {/* Time Range Selector */}
                        <select
                            value={timeRange}
                            onChange={(e) =>
                                setTimeRange(e.target.value as TimeRange)
                            }
                            style={{
                                padding: "6px 12px",
                                backgroundColor: theme.background,
                                color: theme.text,
                                border: `1px solid ${theme.border}`,
                                borderRadius: "6px",
                                fontSize: "12px",
                                cursor: "pointer",
                            }}
                        >
                            {(
                                [
                                    "1D",
                                    "1W",
                                    "1M",
                                    "3M",
                                    "6M",
                                    "YTD",
                                    "1Y",
                                    "ALL",
                                ] as TimeRange[]
                            ).map((range) => (
                                <option key={range} value={range}>
                                    {range}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Metrics Bar */}
            {updatedMetrics && (
                <PortfolioMetrics
                    metrics={updatedMetrics}
                    timeRange={timeRange}
                />
            )}

            {/* Filters */}
            <div
                style={{
                    padding: "12px 20px",
                    borderBottom: `1px solid ${theme.border}`,
                    backgroundColor: theme.surface,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                    }}
                >
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search symbols..."
                        value={filter.search}
                        onChange={(e) =>
                            setFilter({ ...filter, search: e.target.value })
                        }
                        style={{
                            flex: 1,
                            maxWidth: "300px",
                            padding: "6px 12px",
                            backgroundColor: theme.background,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            borderRadius: "6px",
                            fontSize: "13px",
                            outline: "none",
                        }}
                    />

                    {/* Side Filter */}
                    <select
                        value={filter.side}
                        onChange={(e) =>
                            setFilter({
                                ...filter,
                                side: e.target.value as any,
                            })
                        }
                        style={{
                            padding: "6px 12px",
                            backgroundColor: theme.background,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            borderRadius: "6px",
                            fontSize: "13px",
                            cursor: "pointer",
                        }}
                    >
                        <option value="ALL">All Positions</option>
                        <option value="LONG">Long Only</option>
                        <option value="SHORT">Short Only</option>
                    </select>

                    {/* Profitable Filter */}
                    <button
                        onClick={() =>
                            setFilter({
                                ...filter,
                                profitable:
                                    filter.profitable === true
                                        ? false
                                        : filter.profitable === false
                                        ? undefined
                                        : true,
                            })
                        }
                        style={{
                            padding: "6px 12px",
                            backgroundColor:
                                filter.profitable === true
                                    ? theme.success
                                    : filter.profitable === false
                                    ? theme.danger
                                    : theme.background,
                            color:
                                filter.profitable !== undefined
                                    ? theme.background
                                    : theme.text,
                            border: `1px solid ${
                                filter.profitable !== undefined
                                    ? "transparent"
                                    : theme.border
                            }`,
                            borderRadius: "6px",
                            fontSize: "13px",
                            cursor: "pointer",
                        }}
                    >
                        {filter.profitable === true
                            ? "✓ Profitable"
                            : filter.profitable === false
                            ? "✗ Losing"
                            : "All P&L"}
                    </button>

                    <div style={{ flex: 1 }} />

                    {/* Position Count */}
                    <span
                        style={{
                            fontSize: "12px",
                            color: theme.textSecondary,
                        }}
                    >
                        {filteredPositions.length} positions
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <div
                style={{
                    flex: 1,
                    overflow: "hidden",
                    padding: viewMode === "chart" ? "0" : "0",
                }}
            >
                {loading ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: theme.textSecondary,
                        }}
                    >
                        Loading portfolio...
                    </div>
                ) : viewMode === "table" ? (
                    <PortfolioTable
                        positions={filteredPositions}
                        onPositionClick={(position) =>
                            console.log("Position clicked:", position)
                        }
                    />
                ) : viewMode === "chart" ? (
                    <PortfolioChart
                        positions={filteredPositions}
                        timeRange={timeRange}
                    />
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "16px",
                            padding: "16px",
                        }}
                    >
                        {filteredPositions.map((position) => (
                            <motion.div
                                key={position.symbol}
                                whileHover={{ scale: 1.02 }}
                                style={{
                                    padding: "16px",
                                    backgroundColor: theme.surface,
                                    borderRadius: "8px",
                                    border: `1px solid ${theme.border}`,
                                    cursor: "pointer",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "start",
                                        marginBottom: "12px",
                                    }}
                                >
                                    <div>
                                        <h4
                                            style={{
                                                margin: 0,
                                                color: theme.text,
                                            }}
                                        >
                                            {position.symbol}
                                        </h4>
                                        <span
                                            style={{
                                                fontSize: "12px",
                                                color: theme.textSecondary,
                                            }}
                                        >
                                            {position.side} •{" "}
                                            {position.assetClass}
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            color:
                                                position.totalPnL >= 0
                                                    ? theme.success
                                                    : theme.danger,
                                        }}
                                    >
                                        {position.totalPnL >= 0 ? "+" : ""}
                                        {position.pnlPercent.toFixed(2)}%
                                    </span>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "13px",
                                    }}
                                >
                                    <span
                                        style={{ color: theme.textSecondary }}
                                    >
                                        Value
                                    </span>
                                    <span style={{ color: theme.text }}>
                                        $
                                        {position.marketValue.toLocaleString(
                                            "en-US",
                                            { minimumFractionDigits: 2 }
                                        )}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Portfolio;
