import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    ColumnDef,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    flexRender,
} from "@tanstack/react-table";
import { useAuthContext } from "../../modules/ui-library";
import { useTheme } from "../../contexts/ThemeContext";
import axios from "axios";

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
}

interface TableConfig {
    columns: ColumnConfig[];
    sorting: { column: string; direction: "asc" | "desc" };
    grouping: string[];
    filters: Record<string, any>;
}

interface PortfolioTableProps {
    selectedDate: string;
    fundId: number;
    isLive: boolean;
    externalEditing?: boolean;
}

const PortfolioTable: React.FC<PortfolioTableProps> = ({
    selectedDate,
    fundId,
    isLive,
    externalEditing,
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
    const headerRef = useRef<HTMLDivElement | null>(null);
    const [headerWidth, setHeaderWidth] = useState<number>(0);
    const [showColumnsPanel, setShowColumnsPanel] = useState<boolean>(false);
    const [showGroupPanel, setShowGroupPanel] = useState<boolean>(false);
    const [showSumPanel, setShowSumPanel] = useState<boolean>(false);
    const numericKeys = [
        "quantity",
        "trade_price",
        "price",
        "eoy_price",
        "eom_price",
        "eod_price",
        "itd_pnl",
        "ytd_pnl",
        "mtd_pnl",
        "dtd_pnl",
    ];

    // Component-scoped config identifiers
    const deviceType = "laptop";
    const componentId = "portfolio-default";

    // Sync with global Tools menu Unlock/Lock editing (and external prop)
    useEffect(() => {
        if (typeof externalEditing === "boolean") {
            setIsEditing(externalEditing);
        }
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail || {};
            const unlocked = !!detail.unlocked;
            if (unlocked) {
                setIsEditing(true);
            } else {
                // On lock, persist current config if present
                if (isEditing) {
                    void saveTableConfig();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalEditing, isEditing, localConfig, fundId]);

    // Load table configuration on mount
    useEffect(() => {
        loadTableConfig();
    }, [fundId]);

    // Track header width for responsive controls
    useEffect(() => {
        if (!headerRef.current) return;
        const el = headerRef.current;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries)
                setHeaderWidth(entry.contentRect.width);
        });
        ro.observe(el);
        setHeaderWidth(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, [isEditing]);

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
                    params: { deviceType, componentId, fundId },
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
        if (!localConfig) return;

        try {
            const token = await getToken();
            await axios.post(
                "/api/cosmos/portfolio-component-config",
                {
                    deviceType,
                    componentId,
                    fundId,
                    tableConfig: localConfig,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setTableConfig(localConfig);
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to save table config:", err);
        }
    };

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const loadPositions = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = await getToken();

            // Load both FX and FX Options in parallel
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
                await sleep(500 * Math.pow(2, i));
            }
        } finally {
            setIsRetrying(false);
        }
    };

    // Build TanStack columns from config
    const columns = useMemo<ColumnDef<PortfolioPosition>[]>(() => {
        const cfgCols = localConfig?.columns || [];
        return cfgCols.map((c) => ({
            id: c.key,
            accessorKey: c.key as keyof PortfolioPosition,
            header: c.label,
            cell: (info) => formatValue(info.getValue() as any, c.key),
            size: c.width,
            enableHiding: true,
            enableSorting: true,
        }));
    }, [localConfig]);

    // Sorting state mapped from config
    const [sorting, setSorting] = useState<SortingState>(() => {
        const s = localConfig?.sorting;
        return s ? [{ id: s.column, desc: s.direction === "desc" }] : [];
    });

    useEffect(() => {
        const s = localConfig?.sorting;
        setSorting(s ? [{ id: s.column, desc: s.direction === "desc" }] : []);
    }, [localConfig?.sorting]);

    const table = useReactTable({
        data: positions,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        columnResizeMode: "onChange",
    });

    // Sync column visibility with config
    useEffect(() => {
        const vis: Record<string, boolean> = {};
        (localConfig?.columns || []).forEach((c) => (vis[c.key] = !!c.visible));
        table.setColumnVisibility(vis);
    }, [localConfig?.columns, table]);

    // Reflect sorting changes back into config while editing
    useEffect(() => {
        if (!localConfig) return;
        if (sorting.length === 0) return;
        const s = sorting[0];
        const updated: TableConfig = {
            ...localConfig,
            sorting: {
                column: s.id as string,
                direction: s.desc ? "desc" : "asc",
            },
        };
        setLocalConfig(updated);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sorting]);

    const pnlSummary = useMemo(() => {
        const summary = {
            itd_pnl: 0,
            ytd_pnl: 0,
            mtd_pnl: 0,
            dtd_pnl: 0,
        };

        positions.forEach((pos) => {
            if (pos.itd_pnl !== null) summary.itd_pnl += pos.itd_pnl;
            if (pos.ytd_pnl !== null) summary.ytd_pnl += pos.ytd_pnl;
            if (pos.mtd_pnl !== null) summary.mtd_pnl += pos.mtd_pnl;
            if (pos.dtd_pnl !== null) summary.dtd_pnl += pos.dtd_pnl;
        });

        return summary;
    }, [positions]);

    const handleColumnToggle = (columnKey: string) => {
        if (!localConfig) return;

        setLocalConfig({
            ...localConfig,
            columns: localConfig.columns.map((col) =>
                col.key === columnKey ? { ...col, visible: !col.visible } : col
            ),
        });
    };

    const handleSort = (columnKey: string) => {
        const col = table.getColumn(columnKey);
        if (col) col.toggleSorting();
    };

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
        <div className="w-full">
            {error && positions.length > 0 && (
                <div className="mb-3 rounded border border-yellow-500 bg-yellow-50 text-yellow-700 px-3 py-2">
                    {error}
                    <button
                        onClick={() => retryWithBackoff(2)}
                        className="ml-3 px-2 py-0.5 bg-yellow-600 text-white rounded"
                    >
                        Retry
                    </button>
                </div>
            )}
            {/* Table Controls - visible only while editing */}
            {isEditing && (
                <div
                    ref={headerRef}
                    className="flex justify-between items-center mb-4 p-4 rounded"
                    style={{
                        overflowX: "auto",
                        position: "relative",
                        paddingRight: 8,
                        background: safeTheme.surface,
                        border: `1px solid ${safeTheme.border}`,
                    }}
                >
                    <div
                        className="flex items-center gap-4"
                        style={{ flexShrink: 0 }}
                    >
                        <h3 className="text-lg font-semibold">
                            Portfolio Positions ({positions.length})
                        </h3>
                        {/* header buttons removed; moved to footer */}
                    </div>

                    {/* Column Visibility Controls */}
                    {localConfig && headerWidth > 980 && (
                        <div
                            className="flex flex-wrap gap-2"
                            style={{ minWidth: 420 }}
                        >
                            {localConfig.columns.map((col) => (
                                <label
                                    key={col.key}
                                    className="flex items-center gap-1 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={col.visible}
                                        onChange={() =>
                                            handleColumnToggle(col.key)
                                        }
                                    />
                                    {col.label}
                                </label>
                            ))}
                        </div>
                    )}
                    {/* Column panel now rendered below header to push table down */}
                </div>
            )}

            {/* panels moved to footer area below */}

            {/* Table */}
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "60vh" }}>
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        border: `1px solid ${safeTheme.border}`,
                        color: safeTheme.text,
                        background: safeTheme.background,
                    }}
                >
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr
                                key={hg.id}
                                style={{ background: safeTheme.surfaceAlt }}
                            >
                                {hg.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        style={{
                                            width: header.getSize(),
                                            border: `1px solid ${safeTheme.border}`,
                                            padding: "8px 12px",
                                            textAlign: "left",
                                            cursor: "pointer",
                                        }}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 4,
                                            }}
                                        >
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {header.column.getIsSorted() ===
                                                "asc" && "↑"}
                                            {header.column.getIsSorted() ===
                                                "desc" && "↓"}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map((row, idx) => (
                            <tr
                                key={row.id}
                                style={{
                                    background:
                                        idx % 2 === 0
                                            ? safeTheme.surface
                                            : safeTheme.background,
                                }}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        style={{
                                            border: `1px solid ${safeTheme.border}`,
                                            padding: "8px 12px",
                                        }}
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    {/* PnL Summary Footer */}
                    <tfoot>
                        <tr
                            style={{
                                background: safeTheme.surfaceAlt,
                                fontWeight: 600,
                            }}
                        >
                            <td
                                colSpan={table.getVisibleLeafColumns().length}
                                style={{
                                    border: `1px solid ${safeTheme.border}`,
                                    padding: "8px 12px",
                                    textAlign: "center",
                                }}
                            >
                                P&L Summary
                            </td>
                        </tr>
                        <tr style={{ background: safeTheme.surface }}>
                            {table.getVisibleLeafColumns().map((col) => {
                                const id = col.id;
                                if (
                                    id.endsWith("_pnl") ||
                                    id.startsWith("pnl")
                                ) {
                                    return (
                                        <td
                                            key={id}
                                            style={{
                                                border: `1px solid ${safeTheme.border}`,
                                                padding: "8px 12px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {formatValue(
                                                (pnlSummary as any)[id] ?? null,
                                                id
                                            )}
                                        </td>
                                    );
                                }
                                return (
                                    <td
                                        key={id}
                                        style={{
                                            border: `1px solid ${safeTheme.border}`,
                                            padding: "8px 12px",
                                        }}
                                    ></td>
                                );
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Footer controls (edit mode only) */}
            {isEditing && localConfig && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                        onClick={() => {
                            setShowColumnsPanel((v) => !v);
                            setShowGroupPanel(false);
                            setShowSumPanel(false);
                        }}
                        title="View options"
                        style={{
                            padding: "4px 10px",
                            backgroundColor: safeTheme.background,
                            color: safeTheme.text,
                            border: `1px solid ${safeTheme.border}`,
                            borderRadius: 4,
                            fontSize: 12,
                        }}
                    >
                        View
                    </button>
                    <button
                        onClick={() => {
                            setShowGroupPanel((v) => !v);
                            setShowColumnsPanel(false);
                            setShowSumPanel(false);
                        }}
                        title="Group By"
                        style={{
                            padding: "4px 10px",
                            backgroundColor: safeTheme.background,
                            color: safeTheme.text,
                            border: `1px solid ${safeTheme.border}`,
                            borderRadius: 4,
                            fontSize: 12,
                        }}
                    >
                        Group By
                    </button>
                    <button
                        onClick={() => {
                            setShowSumPanel((v) => !v);
                            setShowColumnsPanel(false);
                            setShowGroupPanel(false);
                        }}
                        title="Sum Options"
                        style={{
                            padding: "4px 10px",
                            backgroundColor: safeTheme.background,
                            color: safeTheme.text,
                            border: `1px solid ${safeTheme.border}`,
                            borderRadius: 4,
                            fontSize: 12,
                        }}
                    >
                        Sum
                    </button>
                </div>
            )}

            {isEditing && localConfig && showColumnsPanel && (
                <div
                    style={{
                        marginTop: 8,
                        zIndex: 1,
                        background: safeTheme.surface,
                        color: safeTheme.text,
                        border: `1px solid ${safeTheme.border}`,
                        borderRadius: 6,
                        padding: 10,
                        maxHeight: 260,
                        overflow: "auto",
                        boxShadow: "0 8px 18px rgba(0,0,0,0.15)",
                        width: "100%",
                    }}
                >
                    <div
                        aria-label="Columns selector"
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(160px, 1fr))",
                            gap: 10,
                        }}
                    >
                        {localConfig.columns.map((col) => (
                            <label
                                key={col.key}
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={col.visible}
                                    onChange={() => handleColumnToggle(col.key)}
                                />
                                {col.label}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {isEditing && localConfig && showGroupPanel && (
                <div
                    style={{
                        marginTop: 8,
                        zIndex: 1,
                        background: safeTheme.surface,
                        color: safeTheme.text,
                        border: `1px solid ${safeTheme.border}`,
                        borderRadius: 6,
                        padding: 10,
                        width: "100%",
                    }}
                >
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {localConfig.columns.map((c) => (
                            <label key={c.key} className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="groupBy"
                                    checked={localConfig.grouping?.[0] === c.key}
                                    onChange={() =>
                                        setLocalConfig({
                                            ...localConfig,
                                            grouping: c.key ? [c.key] : [],
                                        })
                                    }
                                />
                                {c.label}
                            </label>
                        ))}
                        <button
                            onClick={() => setLocalConfig({ ...localConfig, grouping: [] })}
                            style={{
                                padding: "4px 10px",
                                background: "transparent",
                                border: `1px solid ${safeTheme.border}`,
                                color: safeTheme.text,
                                borderRadius: 4,
                                fontSize: 12,
                                marginLeft: 8,
                            }}
                        >
                            Clear Grouping
                        </button>
                    </div>
                </div>
            )}

            {isEditing && localConfig && showSumPanel && (
                <div
                    style={{
                        marginTop: 8,
                        zIndex: 1,
                        background: safeTheme.surface,
                        color: safeTheme.text,
                        border: `1px solid ${safeTheme.border}`,
                        borderRadius: 6,
                        padding: 10,
                        width: "100%",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))",
                            gap: 10,
                        }}
                    >
                        {localConfig.columns
                            .filter((c) => numericKeys.includes(c.key))
                            .map((c) => (
                                <label key={c.key} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(
                                            (localConfig.filters?.sumColumns || []).includes(
                                                c.key
                                            )
                                        )}
                                        onChange={(e) => {
                                            const current = new Set(
                                                (localConfig.filters?.sumColumns as string[]) || []
                                            );
                                            if (e.target.checked) current.add(c.key);
                                            else current.delete(c.key);
                                            setLocalConfig({
                                                ...localConfig,
                                                filters: {
                                                    ...(localConfig.filters || {}),
                                                    sumColumns: Array.from(current),
                                                },
                                            });
                                        }}
                                    />
                                    {c.label}
                                </label>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioTable;
