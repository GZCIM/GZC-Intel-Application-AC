import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
} from "react";
import { createPortal } from "react-dom";
import { AgGridReact } from "ag-grid-react";
import {
    ColDef,
    GridReadyEvent,
    GridApi,
    ModuleRegistry,
    AllCommunityModule,
} from "ag-grid-community";
import "./PortfolioTableAGGrid.css";
import { useAuthContext } from "../../modules/ui-library";
import { useTheme } from "../../contexts/ThemeContext";
import axios from "axios";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface PortfolioPosition {
    trade_id: number;
    trade_type: "FX Forward" | "FX Option";
    trade_date: string;
    maturity_date: string;
    quantity: number;
    trade_price: number | null;
    price: number | null;
    trade_currency: string;
    settlement_currency: string;
    position: string;
    counter_party_code: string;
    eoy_price: number | null;
    eom_price: number | null;
    eod_price: number | null;
    itd_pnl: number | null;
    ytd_pnl: number | null;
    mtd_pnl: number | null;
    dtd_pnl: number | null;
    trader?: string;
    note?: string;
    // FX Option specific fields
    strike?: number;
    option_type?: string;
    option_style?: string;
    premium?: number;
    underlying_trade_currency?: string;
    underlying_settlement_currency?: string;
}

interface ColumnConfig {
    key: string;
    label: string;
    visible: boolean;
    width: number;
    size?: number;
}

interface TableConfig {
    columns: ColumnConfig[];
    sorting: { column: string; direction: "asc" | "desc" };
    grouping: string[];
    filters: Record<string, any>;
}

interface ComponentBorderInfo {
    rightBorder: string;
    surfaceColor: string;
    successColor: string;
}

interface PortfolioTableAGGridProps {
    selectedDate: string;
    fundId: number;
    isLive: boolean;
    externalEditing?: boolean;
    componentId?: string;
    deviceType?: "laptop" | "mobile" | "bigscreen";
    componentBorderInfo?: ComponentBorderInfo;
}

const PortfolioTableAGGrid: React.FC<PortfolioTableAGGridProps> = ({
    selectedDate,
    fundId,
    isLive,
    externalEditing,
    componentId,
    deviceType,
    componentBorderInfo,
}) => {
    const { getToken } = useAuthContext();
    const { currentTheme: theme } = useTheme();
    const safeTheme = (theme as unknown as Record<string, string>) || {
        border: "#333333",
        text: "#eaeaea",
        background: "#111111",
        surface: "#1e1e1e",
        surfaceAlt: "#2a2a2a",
    };

    const [positions, setPositions] = useState<PortfolioPosition[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [, setTableConfig] = useState<TableConfig | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [localConfig, setLocalConfig] = useState<TableConfig | null>(null);
    const [gridApi, setGridApi] = useState<GridApi | null>(null);

    // Scrollbar state and refs
    const [scrollbarState, setScrollbarState] = useState({
        scrollTop: 0,
        scrollHeight: 0,
        clientHeight: 0,
        thumbHeight: 0,
        thumbTop: 0,
        isDragging: false,
        dragStartY: 0,
        dragStartScrollTop: 0,
        // Horizontal scrollbar state
        scrollLeft: 0,
        scrollWidth: 0,
        clientWidth: 0,
        thumbWidth: 0,
        thumbLeft: 0,
        isDraggingHorizontal: false,
        dragStartX: 0,
        dragStartScrollLeft: 0,
    });
    const scrollbarRef = useRef<HTMLDivElement>(null);
    const horizontalScrollbarRef = useRef<HTMLDivElement>(null);
    const tableBodyRef = useRef<HTMLElement | null>(null);

    // Component-scoped config identifiers
    const resolvedDeviceType = (deviceType ||
        (
            window as unknown as {
                deviceConfig?: { getInfo?: () => { deviceType?: string } };
            }
        )?.deviceConfig?.getInfo?.()?.deviceType ||
        "bigscreen") as "laptop" | "mobile" | "bigscreen";
    const resolvedComponentId =
        componentId ||
        (window as unknown as { componentId?: string })?.componentId ||
        "portfolio-default";

    // Sync with global Tools menu Unlock/Lock editing
    useEffect(() => {
        if (typeof externalEditing === "boolean") {
            setIsEditing(externalEditing);
        }
        const handler = async (e: Event) => {
            const detail = (e as CustomEvent).detail || {};
            const unlocked = !!detail.unlocked;
            if (unlocked) {
                setIsEditing(true);
            } else {
                if (isEditing) {
                    await saveTableConfig();
                }
                setIsEditing(false);
            }
        };
        window.addEventListener(
            "gzc:edit-mode-toggled",
            handler as EventListener
        );
        return () =>
            window.removeEventListener(
                "gzc:edit-mode-toggled",
                handler as EventListener
            );
    }, [externalEditing, isEditing, localConfig, fundId]);

    // Load table configuration on mount
    useEffect(() => {
        loadTableConfig();
    }, [fundId]);

    // Load positions when date/fund changes
    useEffect(() => {
        if (selectedDate && fundId !== undefined) {
            loadPositions();
        }
    }, [selectedDate, fundId, isLive]);

    const loadTableConfig = async () => {
        try {
            const token = await getToken();
            const response = await axios.get(
                "/api/cosmos/portfolio-component-config",
                {
                    params: {
                        deviceType: resolvedDeviceType,
                        componentId: resolvedComponentId,
                        fundId,
                    },
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.status === "success") {
                setTableConfig(response.data.data);
                setLocalConfig(response.data.data);
            }
        } catch (err) {
            console.error("Failed to load table config:", err);
        }
    };

    const saveTableConfig = async () => {
        if (!localConfig || !gridApi) return;

        try {
            const token = await getToken();

            // Get current column state from AG Grid
            const columnState = gridApi.getColumnState();
            const updatedColumns = localConfig.columns.map((col) => {
                const colState = columnState.find((cs) => cs.colId === col.key);
                return {
                    ...col,
                    visible: colState ? !colState.hide : col.visible,
                    width: colState ? colState.width || col.width : col.width,
                    size: colState ? colState.width || col.width : col.width,
                };
            });

            const updatedConfig = {
                ...localConfig,
                columns: updatedColumns,
            };

            await axios.post(
                "/api/cosmos/portfolio-component-config",
                {
                    deviceType: resolvedDeviceType,
                    componentId: resolvedComponentId,
                    fundId,
                    tableConfig: updatedConfig,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setTableConfig(updatedConfig);
            setLocalConfig(updatedConfig);
        } catch (err) {
            console.error("Failed to save table config:", err);
        }
    };

    const loadPositions = async () => {
        setLoading(true);
        setError(null);
        setPositions([]);

        try {
            const token = await getToken();

            const [fxResponse, fxOptionsResponse] = await Promise.all([
                axios.get("/api/portfolio/fx-positions", {
                    params: { date: selectedDate, fundId },
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get("/api/portfolio/fx-option-positions", {
                    params: { date: selectedDate, fundId },
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const fxPositions: PortfolioPosition[] = fxResponse.data.data.map(
                (pos: Record<string, unknown>) => ({
                    ...pos,
                    trade_type: "FX Forward" as const,
                })
            );

            const fxOptionPositions: PortfolioPosition[] =
                fxOptionsResponse.data.data.map(
                    (pos: Record<string, unknown>) => ({
                        ...pos,
                        trade_type: "FX Option" as const,
                    })
                );

            setPositions([...fxPositions, ...fxOptionPositions]);
        } catch (err: unknown) {
            const error = err as {
                response?: {
                    status?: number;
                    data?: { detail?: { error?: string } };
                };
                message?: string;
            };
            const status = error?.response?.status;
            if (status === 502) {
                setError(
                    "Backend temporarily unavailable (502). Please retry."
                );
            } else {
                setError(
                    error.response?.data?.detail?.error ||
                        error.message ||
                        "Failed to load positions"
                );
            }
            setPositions([]);
        } finally {
            setLoading(false);
        }
    };

    const retryWithBackoff = async (attempts = 2) => {
        setIsRetrying(true);
        try {
            for (let i = 0; i < attempts; i++) {
                await loadPositions();
                if (!error) break;
                await new Promise((res) =>
                    setTimeout(res, 500 * Math.pow(2, i))
                );
            }
        } finally {
            setIsRetrying(false);
        }
    };

    // Scrollbar functionality
    const updateScrollbarState = useCallback(() => {
        if (!tableBodyRef.current) return;

        const {
            scrollTop,
            scrollHeight,
            clientHeight,
            scrollLeft,
            scrollWidth,
            clientWidth,
        } = tableBodyRef.current;

        console.log("[Scrollbar Debug] Update state:", {
            scrollWidth,
            clientWidth,
            scrollHeight,
            clientHeight,
            needsHorizontalScroll: scrollWidth > clientWidth,
            needsVerticalScroll: scrollHeight > clientHeight,
        });

        // Vertical scrollbar calculations
        const thumbHeight = Math.max(
            20,
            (clientHeight / scrollHeight) * clientHeight
        );
        const thumbTop =
            scrollHeight > clientHeight
                ? (scrollTop / (scrollHeight - clientHeight)) *
                  (clientHeight - thumbHeight)
                : 0;

        // Horizontal scrollbar calculations
        const thumbWidth = Math.max(
            20,
            (clientWidth / scrollWidth) * clientWidth
        );
        const thumbLeft =
            scrollWidth > clientWidth
                ? (scrollLeft / (scrollWidth - clientWidth)) *
                  (clientWidth - thumbWidth)
                : 0;

        setScrollbarState((prev) => ({
            ...prev,
            scrollTop,
            scrollHeight,
            clientHeight,
            thumbHeight,
            thumbTop: Math.max(
                0,
                Math.min(thumbTop, clientHeight - thumbHeight)
            ),
            scrollLeft,
            scrollWidth,
            clientWidth,
            thumbWidth,
            thumbLeft: Math.max(
                0,
                Math.min(thumbLeft, clientWidth - thumbWidth)
            ),
        }));
    }, []);

    const handleScrollbarMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const rect = scrollbarRef.current?.getBoundingClientRect();
        if (!rect || !tableBodyRef.current) return;

        const y = e.clientY - rect.top;
        const { clientHeight, scrollHeight } = tableBodyRef.current;
        const scrollTop =
            scrollHeight > clientHeight
                ? (y / clientHeight) * (scrollHeight - clientHeight)
                : 0;

        tableBodyRef.current.scrollTop = scrollTop;
        setScrollbarState((prev) => ({
            ...prev,
            isDragging: true,
            dragStartY: e.clientY,
            dragStartScrollTop: scrollTop,
        }));
    }, []);

    const handleScrollbarDrag = useCallback(
        (e: MouseEvent) => {
            if (!scrollbarState.isDragging || !tableBodyRef.current) return;

            const deltaY = e.clientY - scrollbarState.dragStartY;
            const { clientHeight, scrollHeight } = tableBodyRef.current;
            const deltaScroll =
                scrollHeight > clientHeight
                    ? (deltaY / clientHeight) * (scrollHeight - clientHeight)
                    : 0;
            const newScrollTop = Math.max(
                0,
                Math.min(
                    scrollbarState.dragStartScrollTop + deltaScroll,
                    scrollHeight - clientHeight
                )
            );

            tableBodyRef.current.scrollTop = newScrollTop;
        },
        [
            scrollbarState.isDragging,
            scrollbarState.dragStartY,
            scrollbarState.dragStartScrollTop,
        ]
    );

    const handleScrollbarDragEnd = useCallback(() => {
        setScrollbarState((prev) => ({ ...prev, isDragging: false }));
    }, []);

    // Horizontal scrollbar handlers
    const handleHorizontalScrollbarMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            const rect =
                horizontalScrollbarRef.current?.getBoundingClientRect();
            if (!rect || !tableBodyRef.current) return;

            const x = e.clientX - rect.left;
            const { clientWidth, scrollWidth } = tableBodyRef.current;
            const scrollLeft =
                scrollWidth > clientWidth
                    ? (x / clientWidth) * (scrollWidth - clientWidth)
                    : 0;

            tableBodyRef.current.scrollLeft = scrollLeft;
            setScrollbarState((prev) => ({
                ...prev,
                isDraggingHorizontal: true,
                dragStartX: e.clientX,
                dragStartScrollLeft: scrollLeft,
            }));
        },
        []
    );

    const handleHorizontalScrollbarDrag = useCallback(
        (e: MouseEvent) => {
            if (!scrollbarState.isDraggingHorizontal || !tableBodyRef.current)
                return;

            const deltaX = e.clientX - scrollbarState.dragStartX;
            const { clientWidth, scrollWidth } = tableBodyRef.current;
            const deltaScroll =
                scrollWidth > clientWidth
                    ? (deltaX / clientWidth) * (scrollWidth - clientWidth)
                    : 0;
            const newScrollLeft = Math.max(
                0,
                Math.min(
                    scrollbarState.dragStartScrollLeft + deltaScroll,
                    scrollWidth - clientWidth
                )
            );

            tableBodyRef.current.scrollLeft = newScrollLeft;
        },
        [
            scrollbarState.isDraggingHorizontal,
            scrollbarState.dragStartX,
            scrollbarState.dragStartScrollLeft,
        ]
    );

    const handleHorizontalScrollbarDragEnd = useCallback(() => {
        setScrollbarState((prev) => ({ ...prev, isDraggingHorizontal: false }));
    }, []);

    // Set up scrollbar event listeners
    useEffect(() => {
        if (scrollbarState.isDragging) {
            document.addEventListener("mousemove", handleScrollbarDrag);
            document.addEventListener("mouseup", handleScrollbarDragEnd);
            return () => {
                document.removeEventListener("mousemove", handleScrollbarDrag);
                document.removeEventListener("mouseup", handleScrollbarDragEnd);
            };
        }
    }, [
        scrollbarState.isDragging,
        handleScrollbarDrag,
        handleScrollbarDragEnd,
    ]);

    // Set up horizontal scrollbar event listeners
    useEffect(() => {
        if (scrollbarState.isDraggingHorizontal) {
            document.addEventListener(
                "mousemove",
                handleHorizontalScrollbarDrag
            );
            document.addEventListener(
                "mouseup",
                handleHorizontalScrollbarDragEnd
            );
            return () => {
                document.removeEventListener(
                    "mousemove",
                    handleHorizontalScrollbarDrag
                );
                document.removeEventListener(
                    "mouseup",
                    handleHorizontalScrollbarDragEnd
                );
            };
        }
    }, [
        scrollbarState.isDraggingHorizontal,
        handleHorizontalScrollbarDrag,
        handleHorizontalScrollbarDragEnd,
    ]);

    // Cleanup scrollbar listeners on unmount
    useEffect(() => {
        return () => {
            if (
                tableBodyRef.current &&
                (
                    tableBodyRef.current as HTMLElement & {
                        _scrollbarCleanup?: () => void;
                    }
                )._scrollbarCleanup
            ) {
                (
                    tableBodyRef.current as HTMLElement & {
                        _scrollbarCleanup?: () => void;
                    }
                )._scrollbarCleanup!();
            }
        };
    }, []);

    // Convert config to AG Grid column definitions
    const columnDefs = useMemo<ColDef[]>(() => {
        const cfgCols = localConfig?.columns || [];

        // If no config loaded yet, use fallback columns
        if (cfgCols.length === 0) {
            console.log("[AG Grid] No config loaded, using fallback columns");
            return [
                { field: "trade_id", headerName: "Trade ID", minWidth: 80 },
                { field: "trade_type", headerName: "Type", minWidth: 80 },
                { field: "quantity", headerName: "Quantity", minWidth: 90 },
                {
                    field: "trade_price",
                    headerName: "Trade Price",
                    minWidth: 110,
                },
                { field: "price", headerName: "Price", minWidth: 90 },
                {
                    field: "trade_currency",
                    headerName: "Trade Currency",
                    minWidth: 90,
                },
                {
                    field: "settlement_currency",
                    headerName: "Settlement Currency",
                    minWidth: 120,
                },
                { field: "itd_pnl", headerName: "ITD PnL", minWidth: 110 },
                { field: "ytd_pnl", headerName: "YTD PnL", minWidth: 110 },
                { field: "mtd_pnl", headerName: "MTD PnL", minWidth: 110 },
                { field: "dtd_pnl", headerName: "DTD PnL", minWidth: 110 },
            ];
        }

        console.log("[AG Grid] Using config columns:", cfgCols.length);
        return cfgCols.map((c) => ({
            field: c.key,
            headerName: c.label,
            // allow AG Grid to auto-size based on content/header
            minWidth: 70,
            maxWidth: 180,
            width: c.size || c.width || undefined,
            hide: !c.visible,
            resizable: true,
            sortable: true,
            filter: true,
            cellRenderer: (params: { value: unknown }) =>
                formatValue(params.value, c.key),
        }));
    }, [localConfig]);

    const formatValue = (value: unknown, columnKey: string): string => {
        if (value === null || value === undefined) return "-";

        switch (columnKey) {
            case "trade_date":
            case "maturity_date":
                return new Date(value as string).toLocaleDateString();
            case "quantity":
                return new Intl.NumberFormat().format(value as number);
            case "trade_price":
            case "price":
            case "eoy_price":
            case "eom_price":
            case "eod_price":
                return typeof value === "number" ? value.toFixed(6) : "-";
            case "itd_pnl":
            case "ytd_pnl":
            case "mtd_pnl":
            case "dtd_pnl":
                return typeof value === "number"
                    ? `$${value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                      })}`
                    : "-";
            default:
                return String(value);
        }
    };

    const onGridReady = (params: GridReadyEvent) => {
        setGridApi(params.api);

        // Wait for grid to be fully ready before accessing API
        setTimeout(() => {
            try {
                // Use a more robust way to get displayed columns
                let displayedCols: any[] = [];
                try {
                    // Check if the API is fully ready and has the method
                    if (
                        params.api &&
                        typeof params.api.getAllDisplayedColumns === "function"
                    ) {
                        displayedCols = params.api.getAllDisplayedColumns();
                    } else if (
                        params.api &&
                        typeof params.api.getColumns === "function"
                    ) {
                        // Fallback: get all columns
                        displayedCols = params.api.getColumns() || [];
                    } else {
                        console.warn(
                            "[AG Grid] API not ready, skipping column operations"
                        );
                        return;
                    }
                } catch (e) {
                    console.warn(
                        "[AG Grid] getAllDisplayedColumns failed, trying alternative method",
                        e
                    );
                    // Fallback: get all columns
                    try {
                        displayedCols = params.api.getColumns() || [];
                    } catch (e2) {
                        console.warn(
                            "[AG Grid] getColumns also failed, skipping column operations",
                            e2
                        );
                        return;
                    }
                }

                const totalWidth = displayedCols.reduce((sum, col) => {
                    try {
                        return (
                            sum +
                            (col.getActualWidth?.() || col.getWidth?.() || 150)
                        );
                    } catch (e) {
                        return sum + 150; // fallback width
                    }
                }, 0);

                const gridBodyDom = document.querySelector(
                    ".ag-body-viewport"
                ) as HTMLElement;
                const viewportW = gridBodyDom?.clientWidth;
                const viewportH = gridBodyDom?.clientHeight;

                console.log("[AG Grid] grid ready", {
                    displayedCols: displayedCols.length,
                    totalWidth,
                    viewportW,
                    viewportH,
                    rowCount: params.api.getDisplayedRowCount(),
                });

                // Narrow columns to fit content on first render
                try {
                    if (
                        params.api &&
                        typeof params.api.autoSizeAllColumns === "function"
                    ) {
                        params.api.autoSizeAllColumns();
                    }
                } catch (error) {
                    console.warn("[AG Grid] autoSizeAllColumns failed", error);
                }

                // Check scroll positions and max scrollables
                requestAnimationFrame(() => {
                    const el = gridBodyDom as HTMLElement | undefined;
                    if (el) {
                        console.log("[AG Grid] viewport scroll metrics", {
                            scrollWidth: el.scrollWidth,
                            clientWidth: el.clientWidth,
                            scrollHeight: el.scrollHeight,
                            clientHeight: el.clientHeight,
                            canScrollX: el.scrollWidth > el.clientWidth,
                            canScrollY: el.scrollHeight > el.clientHeight,
                        });

                        // Set up custom scrollbar
                        tableBodyRef.current = el;

                        // Initial scrollbar state update
                        setTimeout(() => {
                            updateScrollbarState();
                        }, 100);

                        // Listen for scroll events to update scrollbar
                        el.addEventListener("scroll", updateScrollbarState);

                        // Listen for resize events to update scrollbar
                        const resizeObserver = new ResizeObserver(() => {
                            setTimeout(() => {
                                updateScrollbarState();
                                // Force re-render to update scrollbar dimensions
                                setScrollbarState(prev => ({ ...prev }));
                            }, 50);
                        });
                        resizeObserver.observe(el);
                        
                        // Also observe the portfolio component for size changes
                        const portfolioComponent = document.querySelector(
                            `[data-component-id="${componentId || "default"}"]`
                        ) || document.querySelector(".portfolio-card-body");
                        
                        if (portfolioComponent) {
                            resizeObserver.observe(portfolioComponent);
                        }

                        // Store cleanup function
                        (
                            el as HTMLElement & {
                                _scrollbarCleanup?: () => void;
                            }
                        )._scrollbarCleanup = () => {
                            el.removeEventListener(
                                "scroll",
                                updateScrollbarState
                            );
                            resizeObserver.disconnect();
                        };
                    }
                });
            } catch (error) {
                console.error("[AG Grid] Error in onGridReady:", error);
            }
        }, 1000); // Increased delay to ensure grid is fully ready
    };

    const handleColumnToggle = (columnKey: string) => {
        if (!gridApi) return;
        const column = gridApi.getColumn(columnKey);
        if (column) {
            gridApi.setColumnsVisible([columnKey], !column.isVisible());
        }
    };

    const tradeTypeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        positions.forEach((p) => {
            counts[p.trade_type] = (counts[p.trade_type] || 0) + 1;
        });
        return counts;
    }, [positions]);

    // Debug logging
    console.log("[AG Grid Debug] Component render:", {
        positionsCount: positions?.length || 0,
        columnDefsCount: columnDefs?.length || 0,
        localConfig: !!localConfig,
        loading,
        error,
        positions: positions?.slice(0, 2), // First 2 positions for debugging
    });

    if (loading) {
        return (
            <div className="flex justify-center p-8">Loading positions...</div>
        );
    }

    if (error && positions.length === 0) {
        return (
            <div className="p-4">
                <div className="mb-3 rounded border border-red-400 bg-red-50 text-red-700 px-3 py-2">
                    {error}
                </div>
                <button
                    onClick={() => retryWithBackoff(3)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-60"
                    disabled={isRetrying}
                >
                    {isRetrying ? "Retrying..." : "Retry"}
                </button>
            </div>
        );
    }

    return (
        <div
            className="w-full"
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
            {/* Quick data summary */}
            {positions.length > 0 && (
                <div
                    style={{
                        marginBottom: 8,
                        color: safeTheme.text,
                        fontSize: 12,
                        opacity: 0.8,
                    }}
                >
                    Records: {positions.length} • FX Forwards:{" "}
                    {tradeTypeCounts["FX Forward"] || 0} • FX Options:{" "}
                    {tradeTypeCounts["FX Option"] || 0}
                </div>
            )}

            {/* Column Controls - visible only while editing */}
            {isEditing && localConfig && (
                <div
                    className="flex justify-between items-center mb-4 p-4 rounded"
                    style={{
                        overflowX: "auto",
                        position: "sticky",
                        top: 0,
                        zIndex: 300,
                        paddingRight: 8,
                        background: safeTheme.surface,
                        border: `1px solid ${safeTheme.border}`,
                    }}
                >
                    <h3 className="text-lg font-semibold">
                        Portfolio Positions ({positions.length})
                    </h3>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(15vw, 1fr))",
                            gap: 12,
                        }}
                    >
                        {localConfig.columns.map((col) => (
                            <label
                                key={col.key}
                                className="flex items-center gap-3 text-sm"
                                style={{
                                    cursor: "pointer",
                                    userSelect: "none",
                                    padding: "6px 8px",
                                    borderRadius: 6,
                                    border: `1px solid ${safeTheme.border}`,
                                    background: safeTheme.surfaceAlt,
                                }}
                                onClick={() => handleColumnToggle(col.key)}
                            >
                                <input
                                    type="checkbox"
                                    checked={col.visible}
                                    onChange={() => handleColumnToggle(col.key)}
                                    style={{
                                        width: 18,
                                        height: 18,
                                        cursor: "pointer",
                                    }}
                                />
                                <span>{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* AG Grid Table with Fixed Scrollbar */}
            <div
                style={{
                    flex: 1,
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    overflow: "hidden", // CRITICAL: Hide native scrollbars
                }}
                className="portfolio-table-wrapper"
            >
                {/* AG Grid with hidden scrollbar */}
                <div
                    className="ag-theme-alpine"
                    style={{
                        flex: 1,
                        width: "100%",
                        height: "100%",
                        marginTop: isEditing ? "8vh" : 0,
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden", // CRITICAL: Hide native scrollbars
                    }}
                    ref={(el) => {
                        if (!el) return;
                        const body = el.querySelector(
                            ".ag-body-viewport"
                        ) as HTMLElement | null;
                        if (body) {
                            console.log("[AG Grid] container sizes", {
                                containerW: el.clientWidth,
                                containerH: el.clientHeight,
                                bodyW: body.clientWidth,
                                bodyH: body.clientHeight,
                            });
                        }
                    }}
                >
                    <AgGridReact
                        rowData={positions}
                        columnDefs={columnDefs}
                        onGridReady={onGridReady}
                        animateRows={true}
                        rowSelection="multiple"
                        defaultColDef={{
                            resizable: true,
                            sortable: true,
                            filter: true,
                            minWidth: 70,
                            maxWidth: 180,
                        }}
                        gridOptions={{
                            rowHeight: 30,
                            headerHeight: 40,
                            suppressScrollOnNewData: false,
                            suppressRowTransform: true,
                            domLayout: "normal",
                            suppressAutoSize: false,
                            suppressColumnVirtualisation: false,
                            suppressRowVirtualisation: false,
                            getRowHeight: () => 30,
                            // CRITICAL: Disable ALL AG Grid scrollbars
                            suppressHorizontalScroll: true,
                            alwaysShowHorizontalScroll: false,
                            alwaysShowVerticalScroll: false,
                        }}
                    />

                    {/* CRITICAL: Functional scrollbar positioned at portfolio component's right edge */}
                    {componentBorderInfo &&
                        (scrollbarState.scrollHeight >
                            scrollbarState.clientHeight ||
                            scrollbarState.scrollHeight > 0 ||
                            positions.length > 10) &&
                        (() => {
                            // Find the actual portfolio component container
                            const portfolioComponent =
                                document.querySelector(
                                    `[data-component-id="${
                                        componentId || "default"
                                    }"]`
                                ) ||
                                document.querySelector(
                                    ".portfolio-card-body"
                                ) ||
                                document.querySelector(
                                    '[class*="portfolio-card"]'
                                ) ||
                                document.querySelector('[class*="portfolio"]');

                            // If still not found, try to find the parent portfolio container by traversing up from the table
                            let actualPortfolioComponent = portfolioComponent;
                            if (!actualPortfolioComponent) {
                                const tableContainer = document.getElementById(
                                    `portfolio-container-${
                                        componentId || "default"
                                    }`
                                );
                                if (tableContainer) {
                                    // Find the portfolio card body by traversing up the DOM tree
                                    let current = tableContainer.parentElement;
                                    while (
                                        current &&
                                        !actualPortfolioComponent
                                    ) {
                                        if (
                                            current.classList.contains(
                                                "portfolio-card-body"
                                            ) ||
                                            current.classList.contains(
                                                "portfolio-card"
                                            ) ||
                                            current.getAttribute(
                                                "data-component-id"
                                            )
                                        ) {
                                            actualPortfolioComponent = current;
                                            break;
                                        }
                                        current = current.parentElement;
                                    }
                                }
                            }

                            // Scrollbar visibility already checked at component level

                            console.log(
                                "[PortfolioTableAGGrid] Vertical Scrollbar:",
                                {
                                    componentId,
                                    portfolioComponentFound:
                                        !!actualPortfolioComponent,
                                    scrollbarState: {
                                        scrollHeight:
                                            scrollbarState.scrollHeight,
                                        clientHeight:
                                            scrollbarState.clientHeight,
                                        scrollTop: scrollbarState.scrollTop,
                                        thumbHeight: scrollbarState.thumbHeight,
                                        thumbTop: scrollbarState.thumbTop,
                                    },
                                    shouldShow:
                                        scrollbarState.scrollHeight >
                                        scrollbarState.clientHeight,
                                    positionsCount: positions.length,
                                    forceShow: positions.length > 10,
                                }
                            );

                            // Calculate proper dimensions for this specific portfolio component
                            const verticalComponentRect = actualPortfolioComponent?.getBoundingClientRect();
                            const verticalScrollbarWidth = 16;
                            const verticalScrollbarLeft = verticalComponentRect ? verticalComponentRect.right - 16 : 0;
                            const verticalScrollbarTop = verticalComponentRect ? verticalComponentRect.top : 0;
                            const verticalScrollbarHeight = verticalComponentRect ? verticalComponentRect.height : 0;

                            console.log("[Vertical Scrollbar] Component dimensions:", {
                                componentRect: verticalComponentRect ? {
                                    width: verticalComponentRect.width,
                                    height: verticalComponentRect.height,
                                    left: verticalComponentRect.left,
                                    top: verticalComponentRect.top,
                                    right: verticalComponentRect.right,
                                    bottom: verticalComponentRect.bottom
                                } : null,
                                scrollbarDimensions: {
                                    width: verticalScrollbarWidth,
                                    left: verticalScrollbarLeft,
                                    top: verticalScrollbarTop,
                                    height: verticalScrollbarHeight
                                },
                                scrollbarState: {
                                    scrollHeight: scrollbarState.scrollHeight,
                                    clientHeight: scrollbarState.clientHeight,
                                    thumbHeight: scrollbarState.thumbHeight,
                                    thumbTop: scrollbarState.thumbTop
                                }
                            });

                            return createPortal(
                                <div
                                    ref={scrollbarRef}
                                    style={{
                                        position: "fixed",
                                        top: verticalScrollbarTop,
                                        left: verticalScrollbarLeft,
                                        width: `${verticalScrollbarWidth}px`,
                                        height: `${verticalScrollbarHeight}px`,
                                        backgroundColor:
                                            componentBorderInfo.surfaceColor,
                                        borderLeft: `1px solid ${componentBorderInfo.rightBorder}`,
                                        zIndex: 10,
                                        cursor: "pointer",
                                        borderRadius: "0 4px 4px 0",
                                    }}
                                    className="portfolio-functional-scrollbar-track"
                                    onMouseDown={handleScrollbarMouseDown}
                                >
                                    {/* Functional scrollbar thumb */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: "2px",
                                            width: "12px",
                                            height: `${Math.max(
                                                scrollbarState.thumbHeight,
                                                20
                                            )}px`,
                                            backgroundColor:
                                                componentBorderInfo.successColor,
                                            borderRadius: "6px",
                                            top: `${scrollbarState.thumbTop}px`,
                                            transition:
                                                scrollbarState.isDragging
                                                    ? "none"
                                                    : "background-color 0.2s ease",
                                            cursor: "pointer",
                                        }}
                                        className="portfolio-functional-scrollbar-thumb"
                                    />
                                </div>,
                                document.body
                            );
                        })()}

                    {/* CRITICAL: Functional horizontal scrollbar positioned at portfolio component's bottom edge */}
                    {componentBorderInfo &&
                        (scrollbarState.scrollWidth >
                            scrollbarState.clientWidth ||
                            scrollbarState.scrollWidth > 0 ||
                            (columnDefs && columnDefs.length > 6)) &&
                        (() => {
                            // Find the actual portfolio component container (same logic as vertical)
                            const portfolioComponent =
                                document.querySelector(
                                    `[data-component-id="${
                                        componentId || "default"
                                    }"]`
                                ) ||
                                document.querySelector(
                                    ".portfolio-card-body"
                                ) ||
                                document.querySelector(
                                    '[class*="portfolio-card"]'
                                ) ||
                                document.querySelector('[class*="portfolio"]');

                            let actualPortfolioComponent = portfolioComponent;
                            if (!actualPortfolioComponent) {
                                const tableContainer = document.getElementById(
                                    `portfolio-container-${
                                        componentId || "default"
                                    }`
                                );
                                if (tableContainer) {
                                    let current = tableContainer.parentElement;
                                    while (
                                        current &&
                                        !actualPortfolioComponent
                                    ) {
                                        if (
                                            current.classList.contains(
                                                "portfolio-card-body"
                                            ) ||
                                            current.classList.contains(
                                                "portfolio-card"
                                            ) ||
                                            current.getAttribute(
                                                "data-component-id"
                                            )
                                        ) {
                                            actualPortfolioComponent = current;
                                            break;
                                        }
                                        current = current.parentElement;
                                    }
                                }
                            }

                            // Scrollbar visibility already checked at component level

                            console.log(
                                "[PortfolioTableAGGrid] Horizontal Scrollbar:",
                                {
                                    componentId,
                                    portfolioComponentFound:
                                        !!actualPortfolioComponent,
                                    scrollbarState: {
                                        scrollWidth: scrollbarState.scrollWidth,
                                        clientWidth: scrollbarState.clientWidth,
                                        scrollLeft: scrollbarState.scrollLeft,
                                        thumbWidth: scrollbarState.thumbWidth,
                                        thumbLeft: scrollbarState.thumbLeft,
                                    },
                                    shouldShow:
                                        scrollbarState.scrollWidth >
                                        scrollbarState.clientWidth,
                                    columnsCount: columnDefs?.length || 0,
                                    forceShow:
                                        columnDefs && columnDefs.length > 6,
                                }
                            );

                            // Calculate proper dimensions for this specific portfolio component
                            const componentRect = actualPortfolioComponent?.getBoundingClientRect();
                            const scrollbarWidth = componentRect ? componentRect.width : 0;
                            const scrollbarLeft = componentRect ? componentRect.left : 0;
                            const scrollbarTop = componentRect ? componentRect.bottom - 16 : 0;

                            console.log("[Horizontal Scrollbar] Component dimensions:", {
                                componentRect: componentRect ? {
                                    width: componentRect.width,
                                    height: componentRect.height,
                                    left: componentRect.left,
                                    top: componentRect.top,
                                    bottom: componentRect.bottom
                                } : null,
                                scrollbarDimensions: {
                                    width: scrollbarWidth,
                                    left: scrollbarLeft,
                                    top: scrollbarTop
                                },
                                scrollbarState: {
                                    scrollWidth: scrollbarState.scrollWidth,
                                    clientWidth: scrollbarState.clientWidth,
                                    thumbWidth: scrollbarState.thumbWidth,
                                    thumbLeft: scrollbarState.thumbLeft
                                }
                            });

                            return createPortal(
                                <div
                                    ref={horizontalScrollbarRef}
                                    style={{
                                        position: "fixed",
                                        top: scrollbarTop,
                                        left: scrollbarLeft,
                                        width: `${scrollbarWidth}px`,
                                        height: "16px",
                                        backgroundColor:
                                            componentBorderInfo.surfaceColor,
                                        borderTop: `1px solid ${componentBorderInfo.rightBorder}`,
                                        zIndex: 10,
                                        cursor: "pointer",
                                        borderRadius: "4px 4px 0 0",
                                    }}
                                    className="portfolio-functional-horizontal-scrollbar-track"
                                    onMouseDown={
                                        handleHorizontalScrollbarMouseDown
                                    }
                                >
                                    {/* Functional horizontal scrollbar thumb */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "2px",
                                            height: "12px",
                                            width: `${Math.max(
                                                scrollbarState.thumbWidth,
                                                20
                                            )}px`,
                                            backgroundColor:
                                                componentBorderInfo.successColor,
                                            borderRadius: "6px",
                                            left: `${scrollbarState.thumbLeft}px`,
                                            transition:
                                                scrollbarState.isDraggingHorizontal
                                                    ? "none"
                                                    : "background-color 0.2s ease",
                                            cursor: "pointer",
                                        }}
                                        className="portfolio-functional-horizontal-scrollbar-thumb"
                                    />
                                </div>,
                                document.body
                            );
                        })()}
                </div>
            </div>

            {/* Error display for partial loads */}
            {error && positions.length > 0 && (
                <div className="mt-3 rounded border border-yellow-500 bg-yellow-50 text-yellow-700 px-3 py-2">
                    {error}
                    <button
                        onClick={() => retryWithBackoff(2)}
                        className="ml-3 px-2 py-0.5 bg-yellow-600 text-white rounded"
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
};

export default PortfolioTableAGGrid;
