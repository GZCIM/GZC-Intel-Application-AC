import React, { useState, useEffect, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import {
    ColDef,
    GridReadyEvent,
    GridApi,
    ColumnApi,
    ModuleRegistry,
    AllCommunityModule,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./PortfolioTableAGGrid.css";
import { useAuthContext } from "../../modules/ui-library";
import { useTheme } from "../../contexts/ThemeContext";
import axios from "axios";

// Register AG Grid modules - THIS FIXES THE ERROR!
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

interface PortfolioTableAGGridProps {
    selectedDate: string;
    fundId: number;
    isLive: boolean;
    externalEditing?: boolean;
    componentId?: string;
    deviceType?: "laptop" | "mobile" | "bigscreen";
}

const PortfolioTableAGGrid: React.FC<PortfolioTableAGGridProps> = ({
    selectedDate,
    fundId,
    isLive,
    externalEditing,
    componentId,
    deviceType,
}) => {
    const { getToken } = useAuthContext();
    const { currentTheme: theme } = useTheme();
    const safeTheme = (theme as any) || {
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
    const [tableConfig, setTableConfig] = useState<TableConfig | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [localConfig, setLocalConfig] = useState<TableConfig | null>(null);
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [columnApi, setColumnApi] = useState<ColumnApi | null>(null);

    // Component-scoped config identifiers
    const resolvedDeviceType = (deviceType ||
        (window as any)?.deviceConfig?.getInfo?.()?.deviceType ||
        "bigscreen") as "laptop" | "mobile" | "bigscreen";
    const resolvedComponentId =
        componentId || (window as any)?.componentId || "portfolio-default";

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
                (pos: any) => ({
                    ...pos,
                    trade_type: "FX Forward" as const,
                })
            );

            const fxOptionPositions: PortfolioPosition[] =
                fxOptionsResponse.data.data.map((pos: any) => ({
                    ...pos,
                    trade_type: "FX Option" as const,
                }));

            setPositions([...fxPositions, ...fxOptionPositions]);
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 502) {
                setError(
                    "Backend temporarily unavailable (502). Please retry."
                );
            } else {
                setError(
                    err.response?.data?.detail?.error ||
                        err.message ||
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

    // Convert config to AG Grid column definitions
    const columnDefs = useMemo<ColDef[]>(() => {
        const cfgCols = localConfig?.columns || [];

        // If no config loaded yet, use fallback columns
        if (cfgCols.length === 0) {
            console.log("[AG Grid] No config loaded, using fallback columns");
            return [
                { field: "trade_id", headerName: "Trade ID", width: 120 },
                { field: "trade_type", headerName: "Type", width: 120 },
                { field: "quantity", headerName: "Quantity", width: 120 },
                { field: "trade_price", headerName: "Trade Price", width: 120 },
                { field: "price", headerName: "Price", width: 120 },
                {
                    field: "trade_currency",
                    headerName: "Trade Currency",
                    width: 120,
                },
                {
                    field: "settlement_currency",
                    headerName: "Settlement Currency",
                    width: 120,
                },
                { field: "itd_pnl", headerName: "ITD PnL", width: 120 },
                { field: "ytd_pnl", headerName: "YTD PnL", width: 120 },
                { field: "mtd_pnl", headerName: "MTD PnL", width: 120 },
                { field: "dtd_pnl", headerName: "DTD PnL", width: 120 },
            ];
        }

        console.log("[AG Grid] Using config columns:", cfgCols.length);
        return cfgCols.map((c) => ({
            field: c.key,
            headerName: c.label,
            width: Math.max(c.size || c.width || 120, 120), // Increased minimum width
            minWidth: 100, // Increased minimum width
            maxWidth: 200, // Increased maximum width
            hide: !c.visible,
            resizable: true,
            sortable: true,
            filter: true,
            cellRenderer: (params: any) => formatValue(params.value, c.key),
        }));
    }, [localConfig]);

    const formatValue = (value: any, columnKey: string): string => {
        if (value === null || value === undefined) return "-";

        switch (columnKey) {
            case "trade_date":
            case "maturity_date":
                return new Date(value).toLocaleDateString();
            case "quantity":
                return new Intl.NumberFormat().format(value);
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
        setColumnApi(params.columnApi);

        // Automatically size columns to fit the grid width
        params.api.sizeColumnsToFit();
    };

    const handleColumnToggle = (columnKey: string) => {
        if (!gridApi) return;
        const column = gridApi.getColumn(columnKey);
        if (column) {
            gridApi.setColumnVisible(columnKey, !column.isVisible());
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

            {/* AG Grid Table */}
            <div
                className="ag-theme-alpine"
                style={{
                    flex: 1,
                    width: "100%",
                    height: "100%",
                    marginTop: isEditing ? "8vh" : 0,
                    minHeight: 0, // Important for flex children
                    overflow: "hidden", // Prevent container overflow
                }}
            >
                <AgGridReact
                    rowData={positions}
                    columnDefs={columnDefs}
                    onGridReady={onGridReady}
                    suppressHorizontalScroll={false}
                    suppressVerticalScroll={false}
                    alwaysShowVerticalScroll={true}
                    enableRangeSelection={true}
                    enableCharts={true}
                    animateRows={true}
                    rowSelection="multiple"
                    defaultColDef={{
                        resizable: true,
                        sortable: true,
                        filter: true,
                        width: 120, // Increased default width
                        minWidth: 100,
                        maxWidth: 200,
                    }}
                    gridOptions={{
                        suppressRowClickSelection: true,
                        rowHeight: 30,
                        headerHeight: 40,
                        // Force scrollbars to be visible
                        suppressScrollOnNewData: false,
                        alwaysShowHorizontalScroll: true,
                        alwaysShowVerticalScroll: true,
                        suppressRowTransform: true,
                        domLayout: "normal", // Use normal layout to fill available space
                        // Force the grid to fill the full height
                        suppressAutoSize: false,
                        suppressColumnVirtualisation: false,
                        suppressRowVirtualisation: false,
                        // Ensure table fills full height even with few records
                        suppressSizeToFit: false,
                        // Force minimum height to fill container
                        getRowHeight: () => 30,
                    }}
                />
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
