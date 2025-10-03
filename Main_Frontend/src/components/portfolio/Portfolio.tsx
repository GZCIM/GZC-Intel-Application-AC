import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
    apiClient as portfolioApi,
    setPortfolioAuthTokenProvider,
} from "../../utils/axios";
import { useAuthContext } from "../../modules/ui-library/context/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

interface PortfolioProps {
    apiEndpoint?: string;
    title?: string;
}

export const Portfolio: React.FC<
    PortfolioProps & {
        isEditMode?: boolean;
        onTitleChange?: (t: string) => void;
        onStateChange?: (s: "minimized" | "normal" | "maximized") => void;
        onRemove?: () => void;
        componentState?: "minimized" | "normal" | "maximized";
    }
> = ({
    apiEndpoint = process.env.NODE_ENV === "development"
        ? "http://localhost:8080"
        : "/api/bloomberg",
    title = "Portfolio",
    isEditMode = false,
    onTitleChange,
    onStateChange,
    onRemove,
    componentState = "normal",
}) => {
    const { currentTheme } = useTheme();
    const auth = useAuthContext();
    const lastNonMaximizedStateRef = useRef<"minimized" | "normal">("normal");
    const handleTitleDoubleClick = () => {
        if (componentState === "maximized") {
            onStateChange?.(lastNonMaximizedStateRef.current);
        } else {
            // Remember current non-maximized state and maximize
            if (componentState === "minimized" || componentState === "normal") {
                lastNonMaximizedStateRef.current = componentState;
            }
            onStateChange?.("maximized");
        }
    };
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [portfolios, setPortfolios] = useState<
        Array<{ id: string; name: string }>
    >([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
    const [dataMode, setDataMode] = useState<"live" | "eod" | "date">("live");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [portfolioMode, setPortfolioMode] = useState<"active" | "virtual">(
        "active"
    );
    const [selectedFundId, setSelectedFundId] = useState<string>("1"); // 0=ALL, 1=GMF, 6=GCF
    // Temporary debug views for FX trades APIs
    const [fxTrades, setFxTrades] = useState<any[] | null>(null);
    const [fxOptions, setFxOptions] = useState<any[] | null>(null);
    const [fxError, setFxError] = useState<string | null>(null);
    const [fxLoading, setFxLoading] = useState<"none" | "trades" | "options">(
        "none"
    );

    const loadFxTrades = async () => {
        try {
            setFxLoading("trades");
            // use authorized client so bearer token is attached
            const resp = await portfolioApi.get(`/api/db/fx/trades`, {
                params: { limit: 100, fundId: selectedFundId },
            });
            setFxTrades(resp.data?.data || []);
            setFxError(null);
        } catch (_) {
            setFxTrades([]);
            setFxError("Failed to load FX trades. Are you signed in?");
        } finally {
            setFxLoading("none");
        }
    };

    const loadFxOptions = async () => {
        try {
            setFxLoading("options");
            const resp = await portfolioApi.get(`/api/db/fx/options`, {
                params: { limit: 100, fundId: selectedFundId },
            });
            setFxOptions(resp.data?.data || []);
            setFxError(null);
        } catch (_) {
            setFxOptions([]);
            setFxError("Failed to load FX option trades. Are you signed in?");
        } finally {
            setFxLoading("none");
        }
    };

    // Auto-load on first render
    useEffect(() => {
        // configure token provider so apiClient adds Authorization header
        setPortfolioAuthTokenProvider(auth.getToken);
        loadFxTrades();
        loadFxOptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFundId]);

    // Load persisted mode/date from localStorage (force default Active on first render)
    useEffect(() => {
        try {
            const savedMode = localStorage.getItem("portfolio.dataMode");
            if (
                savedMode === "live" ||
                savedMode === "eod" ||
                savedMode === "date"
            ) {
                setDataMode(savedMode);
            }
            const savedDate = localStorage.getItem("portfolio.selectedDate");
            if (savedDate) {
                setSelectedDate(savedDate);
            }
            // Always default to Active when component loads
            setPortfolioMode("active");
            localStorage.setItem("portfolio.mode", "active");

            const savedFund = localStorage.getItem("portfolio.fundId");
            if (savedFund === "0" || savedFund === "1" || savedFund === "6") {
                setSelectedFundId(savedFund);
            } else {
                setSelectedFundId("1");
                localStorage.setItem("portfolio.fundId", "1");
            }
        } catch (_) {}
    }, []);

    // Persist mode/date on change
    useEffect(() => {
        try {
            localStorage.setItem("portfolio.dataMode", dataMode);
        } catch (_) {}
    }, [dataMode]);

    useEffect(() => {
        try {
            if (selectedDate) {
                localStorage.setItem("portfolio.selectedDate", selectedDate);
            }
        } catch (_) {}
    }, [selectedDate]);

    useEffect(() => {
        try {
            localStorage.setItem("portfolio.mode", portfolioMode);
        } catch (_) {}
    }, [portfolioMode]);

    useEffect(() => {
        try {
            localStorage.setItem("portfolio.fundId", selectedFundId);
        } catch (_) {}
    }, [selectedFundId]);

    const formatDateBadge = (value?: string) => {
        try {
            const d = value ? new Date(value) : new Date();
            return d.toLocaleDateString("en-GB"); // dd/MM/yyyy
        } catch (_) {
            return new Date().toLocaleDateString("en-GB");
        }
    };

    useEffect(() => {
        const fetchPortfolios = async () => {
            setLoading(true);
            setError(null);
            try {
                const resp = await axios.get(
                    `${apiEndpoint}/api/portfolio/list`
                );
                const list = (resp.data?.data || resp.data || []).map(
                    (p: any, idx: number) => ({
                        id: String(p.id ?? idx),
                        name: String(
                            p.name ?? p.title ?? `Portfolio ${idx + 1}`
                        ),
                    })
                );
                setPortfolios(list);
                if (list.length > 0) setSelectedPortfolioId(list[0].id);
            } catch (_) {
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
            <div
                style={{
                    padding: "8px",
                    borderBottom: `1px solid ${currentTheme.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    overflow: "visible",
                }}
            >
                {componentState === "minimized" && isEditMode ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        {isEditMode ? (
                            <input
                                aria-label="Component title"
                                placeholder="Title"
                                value={title}
                                onChange={(e) =>
                                    onTitleChange?.(e.target.value)
                                }
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: currentTheme.text,
                                    padding: "2px 6px",
                                    background: "transparent",
                                    border: `1px solid ${currentTheme.border}`,
                                    borderRadius: 4,
                                }}
                            />
                        ) : (
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: currentTheme.text,
                                }}
                            >
                                {title}
                            </span>
                        )}
                        <div
                            style={{
                                marginLeft: "auto",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            <button
                                title="Normal"
                                onClick={() => onStateChange?.("normal")}
                                style={{
                                    width: 30,
                                    height: 30,
                                    border: `1px solid ${currentTheme.border}`,
                                    background: "transparent",
                                    color: currentTheme.textSecondary,
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    fontSize: 14,
                                }}
                            >
                                □
                            </button>
                            <button
                                title="Maximize"
                                onClick={() => onStateChange?.("maximized")}
                                style={{
                                    width: 30,
                                    height: 30,
                                    border: `1px solid ${currentTheme.border}`,
                                    background: "transparent",
                                    color: currentTheme.textSecondary,
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    fontSize: 14,
                                }}
                            >
                                ▣
                            </button>
                            <button
                                title="Remove"
                                onClick={() => onRemove?.()}
                                style={{
                                    width: 30,
                                    height: 30,
                                    border: `1px solid ${currentTheme.border}`,
                                    background: "transparent",
                                    color: "#D69A82",
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    fontSize: 14,
                                }}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ) : componentState === "minimized" && !isEditMode ? (
                    <div
                        style={{ display: "flex", alignItems: "center" }}
                        onDoubleClick={handleTitleDoubleClick}
                        title="Double-click to maximize"
                    >
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: currentTheme.text,
                                whiteSpace: "nowrap",
                                paddingTop: 2,
                            }}
                        >
                            {title}
                        </span>
                    </div>
                ) : (
                    // Row 1: Inline title + controls
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        {isEditMode ? (
                            <input
                                aria-label="Component title"
                                placeholder="Title"
                                value={title}
                                onChange={(e) =>
                                    onTitleChange?.(e.target.value)
                                }
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: currentTheme.text,
                                    marginRight: 8,
                                    padding: "2px 6px",
                                    background: "transparent",
                                    border: `1px solid ${currentTheme.border}`,
                                    borderRadius: 4,
                                }}
                            />
                        ) : (
                            <span
                                onDoubleClick={handleTitleDoubleClick}
                                title="Double-click to maximize"
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: currentTheme.text,
                                    marginRight: 8,
                                    whiteSpace: "nowrap",
                                    paddingTop: 4,
                                }}
                            >
                                {title}
                            </span>
                        )}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    justifyContent: isEditMode
                                        ? "flex-start"
                                        : undefined,
                                }}
                            >
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPortfolioMode("active")
                                        }
                                        style={{
                                            padding: "4px 8px",
                                            backgroundColor: "#1e1e1e",
                                            color:
                                                portfolioMode === "active"
                                                    ? "#ffffff"
                                                    : currentTheme.textSecondary,
                                            border:
                                                portfolioMode === "active"
                                                    ? `1px solid ${
                                                          currentTheme.success ||
                                                          "#6aa84f"
                                                      }`
                                                    : `1px solid ${currentTheme.border}66`,
                                            borderRadius: 4,
                                            fontSize: 11,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Active
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPortfolioMode("virtual")
                                        }
                                        style={{
                                            padding: "4px 8px",
                                            backgroundColor: "#1e1e1e",
                                            color:
                                                portfolioMode === "virtual"
                                                    ? "#ffffff"
                                                    : currentTheme.textSecondary,
                                            border:
                                                portfolioMode === "virtual"
                                                    ? `1px solid ${
                                                          currentTheme.success ||
                                                          "#6aa84f"
                                                      }`
                                                    : `1px solid ${currentTheme.border}66`,
                                            borderRadius: 4,
                                            fontSize: 11,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Virtual
                                    </button>
                                </div>
                                {portfolioMode === "active" && (
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 6,
                                            alignItems: "center",
                                        }}
                                    >
                                        <label
                                            htmlFor="portfolio-fund-select"
                                            style={{
                                                color: currentTheme.textSecondary,
                                                fontSize: 12,
                                                paddingTop: 0,
                                                lineHeight: "22px",
                                            }}
                                        >
                                            Fund
                                        </label>
                                        <select
                                            id="portfolio-fund-select"
                                            value={selectedFundId}
                                            onChange={(e) =>
                                                setSelectedFundId(
                                                    e.target.value
                                                )
                                            }
                                            aria-label="Select fund"
                                            style={{
                                                backgroundColor:
                                                    currentTheme.background,
                                                color: currentTheme.text,
                                                border: `1px solid ${currentTheme.border}`,
                                                borderRadius: 4,
                                                padding: "4px 8px",
                                                fontSize: 12,
                                            }}
                                        >
                                            <option value="0">ALL</option>
                                            <option value="1">GMF</option>
                                            <option value="6">GCF</option>
                                        </select>
                                    </div>
                                )}
                                {/* Portfolio selector visible only in Virtual mode */}
                                {portfolioMode === "virtual" && (
                                    <div
                                        style={{
                                            position: "relative",
                                            display: "inline-block",
                                        }}
                                    >
                                        <select
                                            value={selectedPortfolioId}
                                            onChange={(e) =>
                                                setSelectedPortfolioId(
                                                    e.target.value
                                                )
                                            }
                                            aria-label="Select portfolio"
                                            style={{
                                                backgroundColor:
                                                    currentTheme.background,
                                                color: currentTheme.text,
                                                border: `1px solid ${currentTheme.border}`,
                                                borderRadius: 4,
                                                padding: "4px 8px",
                                                fontSize: 12,
                                            }}
                                        >
                                            {portfolios.length === 0 ? (
                                                <option value="">
                                                    Select Portfolio
                                                </option>
                                            ) : (
                                                portfolios.map((p) => (
                                                    <option
                                                        key={p.id}
                                                        value={p.id}
                                                    >
                                                        {p.name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                console.log(
                                                    "Create new virtual portfolio"
                                                )
                                            }
                                            title="Create New Portfolio"
                                            style={{
                                                position: "absolute",
                                                top: "calc(100% + 6px)",
                                                left: 0,
                                                display: "inline-flex",
                                                gap: 6,
                                                padding: "6px 12px",
                                                backgroundColor:
                                                    currentTheme.surface,
                                                color:
                                                    currentTheme.success ||
                                                    "#6aa84f",
                                                border: `1px solid ${currentTheme.border}`,
                                                borderRadius: 4,
                                                fontSize: 12,
                                                cursor: "pointer",
                                                width: "max-content",
                                                boxShadow:
                                                    "0 1px 3px rgba(0,0,0,0.3)",
                                            }}
                                        >
                                            + Create New Portfolio
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Right controls on same line */}
                        <div
                            style={{
                                marginLeft: isEditMode ? undefined : "auto",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <button
                                onClick={() =>
                                    console.log("Portfolio: Sync DB")
                                }
                                title="Sync DB"
                                style={{
                                    padding: "4px 12px",
                                    backgroundColor: "#5da0ea",
                                    color: "#ffffff",
                                    border: `1px solid #3b82f6`,
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.2)",
                                }}
                            >
                                Sync DB
                            </button>
                            {/* Temporary data buttons */}
                            <div style={{ display: "flex", gap: 6 }}>
                                <button
                                    onClick={loadFxTrades}
                                    title="Load FX Trades"
                                    style={{
                                        padding: "4px 8px",
                                        backgroundColor: "#1e1e1e",
                                        color: "#eaeaea",
                                        border: `1px solid ${currentTheme.border}66`,
                                        borderRadius: 4,
                                        fontSize: 11,
                                        cursor: "pointer",
                                        opacity:
                                            fxLoading === "trades" ? 0.6 : 1,
                                    }}
                                >
                                    {fxLoading === "trades"
                                        ? "Trades…"
                                        : "FX Trades"}
                                </button>
                                <button
                                    onClick={loadFxOptions}
                                    title="Load FX Option Trades"
                                    style={{
                                        padding: "4px 8px",
                                        backgroundColor: "#1e1e1e",
                                        color: "#eaeaea",
                                        border: `1px solid ${currentTheme.border}66`,
                                        borderRadius: 4,
                                        fontSize: 11,
                                        cursor: "pointer",
                                        opacity:
                                            fxLoading === "options" ? 0.6 : 1,
                                    }}
                                >
                                    {fxLoading === "options"
                                        ? "Options…"
                                        : "FX Options"}
                                </button>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button
                                    onClick={() => setDataMode("live")}
                                    style={{
                                        padding: "4px 8px",
                                        backgroundColor: "#1e1e1e",
                                        color:
                                            dataMode === "live"
                                                ? "#ffffff"
                                                : currentTheme.textSecondary,
                                        border:
                                            dataMode === "live"
                                                ? `1px solid ${
                                                      currentTheme.success ||
                                                      "#6aa84f"
                                                  }`
                                                : `1px solid ${currentTheme.border}66`,
                                        borderRadius: 4,
                                        fontSize: 11,
                                        cursor: "pointer",
                                    }}
                                >
                                    Live
                                </button>
                                <button
                                    onClick={() => setDataMode("eod")}
                                    style={{
                                        padding: "4px 8px",
                                        backgroundColor: "#1e1e1e",
                                        color:
                                            dataMode === "eod"
                                                ? "#ffffff"
                                                : currentTheme.textSecondary,
                                        border:
                                            dataMode === "eod"
                                                ? `1px solid ${
                                                      currentTheme.success ||
                                                      "#6aa84f"
                                                  }`
                                                : `1px solid ${currentTheme.border}66`,
                                        borderRadius: 4,
                                        fontSize: 11,
                                        cursor: "pointer",
                                    }}
                                >
                                    EOD
                                </button>
                                <button
                                    onClick={() => setDataMode("date")}
                                    style={{
                                        padding: "4px 8px",
                                        backgroundColor: "#1e1e1e",
                                        color:
                                            dataMode === "date"
                                                ? "#ffffff"
                                                : currentTheme.textSecondary,
                                        border:
                                            dataMode === "date"
                                                ? `1px solid ${
                                                      currentTheme.success ||
                                                      "#6aa84f"
                                                  }`
                                                : `1px solid ${currentTheme.border}66`,
                                        borderRadius: 4,
                                        fontSize: 11,
                                        cursor: "pointer",
                                    }}
                                >
                                    Date
                                </button>
                            </div>
                            {dataMode === "date" ? (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                    }}
                                >
                                    <input
                                        aria-label="Select date"
                                        title="Select date"
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) =>
                                            setSelectedDate(e.target.value)
                                        }
                                        style={{
                                            padding: "4px 8px",
                                            backgroundColor: "#0f0f0f",
                                            color: "#eaeaea",
                                            border: `1px solid ${currentTheme.border}66`,
                                            borderRadius: 4,
                                            fontSize: 11,
                                        }}
                                    />
                                </div>
                            ) : (
                                <div
                                    title="Date"
                                    style={{
                                        padding: "4px 8px",
                                        backgroundColor: "#1e1e1e",
                                        color: currentTheme.textSecondary,
                                        border: `1px solid ${currentTheme.border}66`,
                                        borderRadius: 4,
                                        fontSize: 11,
                                    }}
                                >
                                    {formatDateBadge(selectedDate)}
                                </div>
                            )}
                        </div>
                        {isEditMode && (
                            <div
                                style={{
                                    marginLeft: "auto",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                            >
                                <button
                                    title="Minimize"
                                    onClick={() => onStateChange?.("minimized")}
                                    style={{
                                        width: 30,
                                        height: 30,
                                        border: `1px solid ${currentTheme.border}`,
                                        background: "transparent",
                                        color: currentTheme.textSecondary,
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        fontSize: 14,
                                    }}
                                >
                                    ▁
                                </button>
                                <button
                                    title="Normal"
                                    onClick={() => onStateChange?.("normal")}
                                    style={{
                                        width: 30,
                                        height: 30,
                                        border: `1px solid ${currentTheme.border}`,
                                        background: "transparent",
                                        color: currentTheme.textSecondary,
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        fontSize: 14,
                                    }}
                                >
                                    □
                                </button>
                                <button
                                    title="Maximize"
                                    onClick={() => onStateChange?.("maximized")}
                                    style={{
                                        width: 30,
                                        height: 30,
                                        border: `1px solid ${currentTheme.border}`,
                                        background: "transparent",
                                        color: currentTheme.textSecondary,
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        fontSize: 14,
                                    }}
                                >
                                    ▣
                                </button>
                                <button
                                    title="Remove"
                                    onClick={() => onRemove?.()}
                                    style={{
                                        width: 30,
                                        height: 30,
                                        border: `1px solid ${currentTheme.border}`,
                                        background: "transparent",
                                        color: "#D69A82",
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        fontSize: 14,
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Row 2: Create action when in Virtual portfolio mode, placed below (single instance) */}
                {/* removed duplicate rendering; creation button now only appears under selector on the left column */}
            </div>

            {componentState === "minimized" ? null : (
                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        backgroundColor: currentTheme.background,
                        padding: 12,
                        display: "flex",
                        alignItems: "stretch",
                        justifyContent: "stretch",
                        color: currentTheme.textSecondary,
                        fontSize: 12,
                        borderTop: `1px solid ${currentTheme.border}20`,
                    }}
                >
                    <div style={{ flex: 1, display: "flex", gap: 12 }}>
                        <div
                            style={{
                                flex: 1,
                                border: `1px dashed ${currentTheme.border}`,
                                borderRadius: 4,
                                padding: 8,
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 600,
                                    color: currentTheme.text,
                                    marginBottom: 6,
                                }}
                            >
                                FX Trades (first 10)
                            </div>
                            {fxError ? (
                                <div style={{ color: "#D69A82" }}>
                                    {fxError}
                                </div>
                            ) : fxTrades && fxTrades.length > 0 ? (
                                <div
                                    style={{
                                        maxHeight: 220,
                                        overflow: "auto",
                                        fontSize: 11,
                                    }}
                                >
                                    <pre
                                        style={{
                                            margin: 0,
                                            whiteSpace: "pre-wrap",
                                        }}
                                    >
                                        {JSON.stringify(
                                            fxTrades.slice(0, 10),
                                            null,
                                            2
                                        )}
                                    </pre>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        color: currentTheme.textSecondary,
                                    }}
                                >
                                    No data loaded
                                </div>
                            )}
                        </div>
                        <div
                            style={{
                                flex: 1,
                                border: `1px dashed ${currentTheme.border}`,
                                borderRadius: 4,
                                padding: 8,
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 600,
                                    color: currentTheme.text,
                                    marginBottom: 6,
                                }}
                            >
                                FX Option Trades (first 10)
                            </div>
                            {fxOptions && fxOptions.length > 0 ? (
                                <div
                                    style={{
                                        maxHeight: 220,
                                        overflow: "auto",
                                        fontSize: 11,
                                    }}
                                >
                                    <pre
                                        style={{
                                            margin: 0,
                                            whiteSpace: "pre-wrap",
                                        }}
                                    >
                                        {JSON.stringify(
                                            fxOptions.slice(0, 10),
                                            null,
                                            2
                                        )}
                                    </pre>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        color: currentTheme.textSecondary,
                                    }}
                                >
                                    No data loaded
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;
