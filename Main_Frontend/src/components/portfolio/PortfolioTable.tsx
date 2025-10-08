import React, { useState, useEffect, useMemo } from "react";
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
}

const PortfolioTable: React.FC<PortfolioTableProps> = ({
    selectedDate,
    fundId,
    isLive,
}) => {
    const { getToken } = useAuthContext();
    const { theme } = useTheme();
    const [positions, setPositions] = useState<PortfolioPosition[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tableConfig, setTableConfig] = useState<TableConfig | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [localConfig, setLocalConfig] = useState<TableConfig | null>(null);

    // Component-scoped config identifiers
    const deviceType = "laptop";
    const componentId = "portfolio-default";

    // Sync with global Tools menu Unlock/Lock editing
    useEffect(() => {
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
    }, [isEditing, localConfig, fundId]);

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
            setError(
                err.response?.data?.detail?.error ||
                    err.message ||
                    "Failed to load positions"
            );
        } finally {
            setLoading(false);
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

    if (error) {
        return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
        <div className="w-full">
            {/* Table Controls */}
            <div className="flex justify-between items-center mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">
                        Portfolio Positions ({positions.length})
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        {isEditing
                            ? "Editing unlocked via Tools menu"
                            : "Use Tools → Unlock Editing to configure columns"}
                    </div>
                </div>

                {/* Column Visibility Controls */}
                {isEditing && localConfig && (
                    <div className="flex flex-wrap gap-2">
                        {localConfig.columns.map((col) => (
                            <label
                                key={col.key}
                                className="flex items-center gap-1 text-sm"
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
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr
                                key={hg.id}
                                className="bg-gray-100 dark:bg-gray-800"
                            >
                                {hg.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                        style={{ width: header.getSize() }}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-1">
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
                                className={
                                    idx % 2 === 0
                                        ? "bg-white dark:bg-gray-900"
                                        : "bg-gray-50 dark:bg-gray-800"
                                }
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        className="border border-gray-300 dark:border-gray-600 px-3 py-2"
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
                        <tr className="bg-blue-100 dark:bg-blue-900 font-semibold">
                            <td
                                colSpan={table.getVisibleLeafColumns().length}
                                className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center"
                            >
                                P&L Summary
                            </td>
                        </tr>
                        <tr className="bg-blue-50 dark:bg-blue-800">
                            {table.getVisibleLeafColumns().map((col) => {
                                const id = col.id;
                                if (
                                    id.endsWith("_pnl") ||
                                    id.startsWith("pnl")
                                ) {
                                    return (
                                        <td
                                            key={id}
                                            className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold"
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
                                        className="border border-gray-300 dark:border-gray-600 px-3 py-2"
                                    ></td>
                                );
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default PortfolioTable;
