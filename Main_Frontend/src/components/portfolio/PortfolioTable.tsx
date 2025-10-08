import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
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
    const { auth } = useAuth();
    const { theme } = useTheme();
    const [positions, setPositions] = useState<PortfolioPosition[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tableConfig, setTableConfig] = useState<TableConfig | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [localConfig, setLocalConfig] = useState<TableConfig | null>(null);

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
            const token = await auth.getToken();
            const response = await axios.get("/api/table-config/portfolio", {
                params: { fundId },
                headers: { Authorization: `Bearer ${token}` },
            });

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
            const token = await auth.getToken();
            await axios.post(
                "/api/table-config/portfolio",
                {
                    fundId,
                    config: localConfig,
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
            const token = await auth.getToken();

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

    const visibleColumns = useMemo(() => {
        return localConfig?.columns.filter((col) => col.visible) || [];
    }, [localConfig]);

    const sortedPositions = useMemo(() => {
        if (!localConfig?.sorting) return positions;

        const { column, direction } = localConfig.sorting;
        return [...positions].sort((a, b) => {
            const aVal = a[column as keyof PortfolioPosition];
            const bVal = b[column as keyof PortfolioPosition];

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (typeof aVal === "number" && typeof bVal === "number") {
                return direction === "asc" ? aVal - bVal : bVal - aVal;
            }

            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            return direction === "asc"
                ? aStr.localeCompare(bStr)
                : bStr.localeCompare(aStr);
        });
    }, [positions, localConfig?.sorting]);

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
        if (!localConfig) return;

        const currentSort = localConfig.sorting;
        const newDirection =
            currentSort.column === columnKey && currentSort.direction === "asc"
                ? "desc"
                : "asc";

        setLocalConfig({
            ...localConfig,
            sorting: { column: columnKey, direction: newDirection },
        });
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
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Unlock Edit
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={saveTableConfig}
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                                Lock Edit
                            </button>
                            <button
                                onClick={() => {
                                    setLocalConfig(tableConfig);
                                    setIsEditing(false);
                                }}
                                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
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
                        <tr className="bg-gray-100 dark:bg-gray-800">
                            {visibleColumns.map((col) => (
                                <th
                                    key={col.key}
                                    className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                    style={{ width: col.width }}
                                    onClick={() => handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {localConfig?.sorting.column ===
                                            col.key && (
                                            <span>
                                                {localConfig.sorting
                                                    .direction === "asc"
                                                    ? "↑"
                                                    : "↓"}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPositions.map((pos, index) => (
                            <tr
                                key={`${pos.trade_type}-${pos.trade_id}`}
                                className={
                                    index % 2 === 0
                                        ? "bg-white dark:bg-gray-900"
                                        : "bg-gray-50 dark:bg-gray-800"
                                }
                            >
                                {visibleColumns.map((col) => (
                                    <td
                                        key={col.key}
                                        className="border border-gray-300 dark:border-gray-600 px-3 py-2"
                                    >
                                        {formatValue(
                                            pos[
                                                col.key as keyof PortfolioPosition
                                            ],
                                            col.key
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
                                colSpan={visibleColumns.length}
                                className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center"
                            >
                                P&L Summary
                            </td>
                        </tr>
                        <tr className="bg-blue-50 dark:bg-blue-800">
                            {visibleColumns.map((col) => {
                                if (
                                    col.key.startsWith("pnl") ||
                                    col.key.includes("_pnl")
                                ) {
                                    const pnlKey =
                                        col.key as keyof typeof pnlSummary;
                                    return (
                                        <td
                                            key={col.key}
                                            className="border border-gray-300 dark:border-gray-600 px-3 py-2 font-semibold"
                                        >
                                            {formatValue(
                                                pnlSummary[pnlKey],
                                                col.key
                                            )}
                                        </td>
                                    );
                                }
                                return (
                                    <td
                                        key={col.key}
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
