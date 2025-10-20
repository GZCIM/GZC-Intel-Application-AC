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
    size?: number; // TanStack column sizing value
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
    componentId?: string;
    deviceType?: "laptop" | "mobile" | "bigscreen";
}

const PortfolioTable: React.FC<PortfolioTableProps> = ({
    selectedDate,
    fundId,
    isLive,
    externalEditing,
    componentId,
    deviceType,
}) => {
    // Portfolio table with sticky headers, column resizing, and horizontal scrollbar support
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
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const tableRef = useRef<HTMLTableElement | null>(null);
    const [headerWidth, setHeaderWidth] = useState<number>(0);
    // Edit-mode tabs: view/group/sum
    const [activeTab, setActiveTab] = useState<"view" | "group" | "sum">(
        "view"
    );
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
    const resolvedDeviceType = (deviceType ||
        (window as any)?.deviceConfig?.getInfo?.()?.deviceType ||
        "bigscreen") as "laptop" | "mobile" | "bigscreen";
    const resolvedComponentId =
        componentId || (window as any)?.componentId || "portfolio-default";
    try {
        console.log("[PortfolioTable] Identifiers:", {
            resolvedDeviceType,
            resolvedComponentId,
            propComponentId: componentId,
            windowComponentId: (window as any)?.componentId,
            fundId,
        });
    } catch (_) {}

    // Sync with global Tools menu Unlock/Lock editing (and external prop)
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
                // On lock, persist current config if present
                if (isEditing) {
                    try {
                        console.log(
                            "[PortfolioTable][SAVE] Lock -> saving current config"
                        );
                    } catch (_) {}
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

    // Observe container/table widths to validate horizontal scroll behavior
    useEffect(() => {
        const container = scrollContainerRef.current;
        const tableEl = tableRef.current;
        if (!container || !tableEl) return;

        const log = () => {
            try {
                const data = {
                    containerClientWidth: container.clientWidth,
                    containerScrollWidth: container.scrollWidth,
                    tableOffsetWidth: tableEl.offsetWidth,
                    tableScrollWidth: tableEl.scrollWidth,
                    tableMinWidth: tableEl.style.minWidth,
                    overflowX: getComputedStyle(container).overflowX,
                    overflowY: getComputedStyle(container).overflowY,
                };
                console.log("[PortfolioTable][SCROLL] widths", data);
                console.log(
                    "[PortfolioTable][SCROLL] needsHorizontalScroll?",
                    data.tableScrollWidth > data.containerClientWidth
                );
                console.log(
                    "[PortfolioTable][SCROLL] tableMinWidth calculated:",
                    tableMinWidth
                );
                console.log(
                    "[PortfolioTable][SCROLL] DIFFERENCE:",
                    data.tableScrollWidth - data.containerClientWidth,
                    "px"
                );

                // Force scrollbar visibility by adding a temporary element
                if (data.tableScrollWidth <= data.containerClientWidth) {
                    console.log(
                        "[PortfolioTable][SCROLL] ⚠️ NO HORIZONTAL SCROLLBAR - table fits in container"
                    );
                } else {
                    console.log(
                        "[PortfolioTable][SCROLL] ✅ HORIZONTAL SCROLLBAR SHOULD BE VISIBLE"
                    );
                }
            } catch (_) {}
        };

        const ro = new ResizeObserver(() => log());
        try {
            ro.observe(container);
            ro.observe(tableEl);
        } catch (_) {}
        log();
        return () => ro.disconnect();
    }, [localConfig?.columns, positions?.length]);

    // Load positions when date/fund changes
    useEffect(() => {
        if (selectedDate && fundId !== undefined) {
            loadPositions();
        }
    }, [selectedDate, fundId, isLive]);

    const loadTableConfig = async () => {
        try {
            const token = await getToken();
            try {
                console.log("[PortfolioTable][GET] Loading table config", {
                    url: "/api/cosmos/portfolio-component-config",
                    params: {
                        deviceType: resolvedDeviceType,
                        componentId: resolvedComponentId,
                        fundId,
                    },
                });
            } catch (_) {}
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

            try {
                console.log(
                    "[PortfolioTable][GET] Response status",
                    response.status,
                    response.data?.status
                );
            } catch (_) {}

            if (response.data.status === "success") {
                setTableConfig(response.data.data);
                setLocalConfig(response.data.data);
                try {
                    console.log(
                        "[PortfolioTable][GET] Table config loaded (raw)",
                        response.data.data
                    );
                    const cols = (response.data.data?.columns || []).map(
                        (c: any) => ({ key: c.key, visible: !!c.visible })
                    );
                    console.log(
                        "[PortfolioTable][GET] Loaded columns snapshot",
                        cols
                    );
                    console.log(
                        "[PortfolioTable][GET] summary/filters snapshot",
                        {
                            filters: response.data?.data?.filters,
                            summary: response.data?.data?.summary,
                        }
                    );
                } catch (_) {}
                // Optional: read-back entire device config to compare what is stored under tabs[].components[].props
                try {
                    const readback = await axios.get(
                        `/api/cosmos/device-config/${resolvedDeviceType}`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    const tabs = readback.data?.config?.tabs || [];
                    let embedded: any = null;
                    let legacy: any = null;
                    let portfolioIds: string[] = [];
                    for (const t of tabs) {
                        for (const c of t?.components || []) {
                            if (c?.id) portfolioIds.push(String(c.id));
                            if (c?.id === resolvedComponentId)
                                embedded = c?.props?.tableConfig || null;
                        }
                    }
                    const compStates =
                        readback.data?.config?.componentStates || [];
                    for (const st of compStates) {
                        if (
                            st?.type === "portfolio" &&
                            st?.componentId === resolvedComponentId
                        ) {
                            legacy = st?.tableConfig || null;
                        }
                    }
                    // If we found an embedded config for this component, prefer it to ensure manual edits reflect in UI
                    if (embedded && typeof embedded === "object") {
                        setTableConfig(embedded);
                        setLocalConfig(embedded);
                    }
                    console.log(
                        "[PortfolioTable][READBACK] Device config components",
                        portfolioIds
                    );
                    console.log(
                        "[PortfolioTable][READBACK] Embedded vs legacy",
                        {
                            embeddedCols: Array.isArray(embedded?.columns)
                                ? embedded.columns.map((x: any) => x.key)
                                : null,
                            legacyCols: Array.isArray(legacy?.columns)
                                ? legacy.columns.map((x: any) => x.key)
                                : null,
                            hasEmbedded: !!embedded,
                            hasLegacy: !!legacy,
                        }
                    );
                } catch (rbErr) {
                    console.warn(
                        "[PortfolioTable] Read-back device config failed",
                        rbErr
                    );
                }
            } else {
                try {
                    console.warn(
                        "[PortfolioTable] Unexpected table config payload",
                        response.data
                    );
                } catch (_) {}
            }
        } catch (err) {
            console.error("Failed to load table config:", err);
        }
    };

    const saveTableConfig = async () => {
        if (!localConfig) return;

        try {
            const token = await getToken();
            try {
                const visibleColumns = (localConfig.columns || [])
                    .filter((c) => c.visible)
                    .map((c) => c.key);
                console.log("[PortfolioTable][SAVE] Saving table config", {
                    deviceType: resolvedDeviceType,
                    componentId: resolvedComponentId,
                    fundId,
                    visibleColumns,
                });
            } catch (_) {}
            // Build summary aggregations preserving per-field op and enabled flags
            const existingAggs: any[] = Array.isArray(
                (localConfig as any)?.summary?.aggregations
            )
                ? ((localConfig as any).summary.aggregations as any[])
                : [];
            const selectedSet = new Set<string>(
                ((localConfig as any)?.filters?.sumColumns as string[]) ||
                    selectedSumKeys ||
                    []
            );
            // Respect explicit aggregation.enabled for any numeric field, not only PnL keys
            const enabledSet = new Set<string>();
            for (const a of existingAggs) {
                if (
                    a &&
                    a.key &&
                    (a.enabled === true || a.enabled === undefined)
                ) {
                    enabledSet.add(a.key);
                }
            }
            const nextAggregations = (numericKeys as string[]).map((key) => {
                const prev = existingAggs.find((a) => a?.key === key) || {};
                return {
                    key,
                    op: prev.op || "sum",
                    // Enabled if explicitly enabled in aggregations OR selected via Sum (for PnL keys)
                    enabled: enabledSet.has(key) || selectedSet.has(key),
                };
            });
            try {
                console.log("[PortfolioTable][SAVE] Computed aggregations", {
                    preview: nextAggregations,
                });
            } catch (_) {}
            const effectiveSumKeys = Array.from(selectedSet);
            const tableConfigWithSummary = {
                ...localConfig,
                filters: {
                    ...(localConfig.filters || {}),
                    sumColumns: effectiveSumKeys,
                },
                summary: {
                    enabled: true,
                    aggregations: nextAggregations,
                    position: "footer",
                },
            };

            try {
                console.log("[PortfolioTable][SAVE] Payload:", {
                    sumColumns: tableConfigWithSummary.filters?.sumColumns,
                    summaryKeys: (
                        tableConfigWithSummary.summary?.aggregations || []
                    ).map((a: any) => a.key),
                });
            } catch (_) {}

            const saveResp = await axios.post(
                "/api/cosmos/portfolio-component-config",
                {
                    deviceType: resolvedDeviceType,
                    componentId: resolvedComponentId,
                    fundId,
                    tableConfig: tableConfigWithSummary,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            try {
                console.log(
                    "[PortfolioTable][SAVE] Server reply",
                    saveResp.status,
                    saveResp.data
                );
                const savedVisible = Array.isArray(saveResp?.data?.columns)
                    ? saveResp.data.columns
                          .filter((c: any) => c && c.visible)
                          .map((c: any) => c.key)
                    : undefined;
                console.log("[PortfolioTable][SAVE] Saved (server-visible)", {
                    savedVisible,
                });
            } catch (_) {}

            // Force read-back of the saved portfolio tableConfig from Cosmos (authoritative)
            try {
                const rb = await axios.get(
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
                if (rb?.data?.status === "success" && rb?.data?.data) {
                    console.log(
                        "[PortfolioTable][READBACK][AFTER_SAVE] server tableConfig",
                        {
                            filters: rb.data.data.filters,
                            summary: rb.data.data.summary,
                            visibleColumns: (rb.data.data.columns || [])
                                .filter((c: any) => c && c.visible)
                                .map((c: any) => c.key),
                        }
                    );
                    setTableConfig(rb.data.data);
                    setLocalConfig(rb.data.data);
                    console.log("[PortfolioTable][READBACK] Applied to UI ✔");
                } else {
                    console.warn(
                        "[PortfolioTable][READBACK][AFTER_SAVE] unexpected payload",
                        rb?.data
                    );
                }
            } catch (e) {
                console.warn(
                    "[PortfolioTable][READBACK][AFTER_SAVE] failed",
                    e
                );
            }

            setTableConfig(tableConfigWithSummary as any);
            setIsEditing(false);
            try {
                console.log(
                    "[PortfolioTable][SAVE] Saved ✔ and locked edit mode"
                );
                // Read-back and compare embedding under tabs[].components[].props
                const readback = await axios.get(
                    `/api/cosmos/device-config/${resolvedDeviceType}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                const tabs = readback.data?.config?.tabs || [];
                let embedded: any = null;
                let portfolioIds: string[] = [];
                for (const t of tabs) {
                    for (const c of t?.components || []) {
                        if (c?.id) portfolioIds.push(String(c.id));
                        if (c?.id === resolvedComponentId)
                            embedded = c?.props?.tableConfig || null;
                    }
                }
                const compStates = readback.data?.config?.componentStates || [];
                const legacy =
                    compStates.find(
                        (st: any) =>
                            st?.type === "portfolio" &&
                            st?.componentId === resolvedComponentId
                    )?.tableConfig || null;
                console.log(
                    "[PortfolioTable][READBACK] Post-save components",
                    portfolioIds
                );
                console.log(
                    "[PortfolioTable][READBACK] Post-save embedded vs legacy",
                    {
                        hasEmbedded: !!embedded,
                        embeddedFilters: embedded?.filters,
                        embeddedSummary: embedded?.summary,
                        embeddedCols: Array.isArray(embedded?.columns)
                            ? embedded.columns.map((x: any) => x.key)
                            : null,
                        hasLegacy: !!legacy,
                        legacyCols: Array.isArray(legacy?.columns)
                            ? legacy.columns.map((x: any) => x.key)
                            : null,
                    }
                );
            } catch (_) {}
        } catch (err) {
            console.error("Failed to save table config:", err);
        }
    };

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const loadPositions = async () => {
        setLoading(true);
        setError(null);
        // Clear existing rows so stale data isn't shown when switching modes/dates
        setPositions([]);

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
            // Ensure stale rows are not displayed after an error
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
            // Ensure Trade Type column is wide enough to avoid wrapping (e.g., "FX Option")
            size: c.key === "trade_type" ? Math.max(c.width, 140) : c.width,
            enableHiding: true,
            enableSorting: true,
        }));
    }, [localConfig]);

    // Compute total min width to force horizontal scrollbar when needed
    const tableMinWidth = useMemo(() => {
        const visCols = (localConfig?.columns || []).filter((c) => c.visible);
        if (visCols.length === 0) return undefined as number | undefined;
        // include cell padding approximation (24px per col)
        const total = visCols.reduce(
            (sum, c) =>
                sum +
                (c.key === "trade_type" ? Math.max(c.width, 140) : c.width) +
                24,
            0
        );
        return Math.max(total, 800); // enforce a reasonable floor
    }, [localConfig?.columns]);

    // Sorting state mapped from config
    const [sorting, setSorting] = useState<SortingState>(() => {
        const s = localConfig?.sorting;
        return s ? [{ id: s.column, desc: s.direction === "desc" }] : [];
    });

    useEffect(() => {
        const s = localConfig?.sorting;
        setSorting(s ? [{ id: s.column, desc: s.direction === "desc" }] : []);
    }, [localConfig?.sorting]);

    // Enable column resizing state so drag interactions update widths live
    const [columnSizing, setColumnSizing] = useState<Record<string, number>>(
        {}
    );

    // Initialize column sizing from config when it loads
    useEffect(() => {
        if (localConfig?.columns) {
            const savedSizes: Record<string, number> = {};
            localConfig.columns.forEach((col) => {
                if (col.size !== undefined) {
                    savedSizes[col.key] = col.size;
                }
            });
            setColumnSizing(savedSizes);
        }
    }, [localConfig?.columns]);

    const table = useReactTable({
        data: positions,
        columns,
        state: { sorting, columnSizing },
        onSortingChange: setSorting,
        onColumnSizingChange: (updater) => {
            console.log("[PortfolioTable] Column sizing change", {
                updater,
                currentSizing: columnSizing,
            });
            setColumnSizing(updater);
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        columnResizeMode: "onChange",
    });

    // Sync column visibility and sizing with config
    useEffect(() => {
        const vis: Record<string, boolean> = {};
        const sizes: Record<string, number> = {};
        (localConfig?.columns || []).forEach((c) => {
            vis[c.key] = !!c.visible;
            if (c.size !== undefined) {
                sizes[c.key] = c.size;
            }
        });
        table.setColumnVisibility(vis);
        table.setColumnSizing(sizes);
    }, [localConfig?.columns, table]);

    // Reflect sorting and column sizing changes back into config while editing
    useEffect(() => {
        if (!localConfig) return;

        let updated: TableConfig = { ...localConfig };

        // Update sorting if changed
        if (sorting.length > 0) {
            const s = sorting[0];
            updated = {
                ...updated,
                sorting: {
                    column: s.id as string,
                    direction: s.desc ? "desc" : "asc",
                },
            };
        }

        // Update column sizes if changed
        const hasSizeChanges = Object.keys(columnSizing).length > 0;
        if (hasSizeChanges) {
            updated = {
                ...updated,
                columns: updated.columns.map((col) => ({
                    ...col,
                    size: columnSizing[col.key] || col.size || col.width,
                })),
            };
        }

        if (hasSizeChanges || sorting.length > 0) {
            setLocalConfig(updated);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sorting, columnSizing]);

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

    // Aggregation changes are applied locally and saved on lock to avoid race conditions
    // (Auto-save disabled to prevent flicker/reset while selecting)

    // Compute summary values for any enabled aggregations (e.g., EOD Price)
    const enabledAggregations = useMemo(() => {
        const list = ((localConfig as any)?.summary?.aggregations ||
            []) as Array<{
            key: string;
            op?: "sum" | "avg" | "min" | "max";
            enabled?: boolean;
        }>;
        const enabled = list.filter(
            (a) => a && (a.enabled === undefined || a.enabled)
        );
        const labelByKey: Record<string, string> = (
            localConfig?.columns || []
        ).reduce((acc, c) => {
            acc[c.key] = c.label;
            return acc;
        }, {} as Record<string, string>);
        const compute = (key: string, op: string) => {
            const values: number[] = positions
                .map((p: any) => p?.[key])
                .filter((v: any) => typeof v === "number") as number[];
            if (values.length === 0) return null;
            switch (op) {
                case "avg":
                    return values.reduce((a, b) => a + b, 0) / values.length;
                case "min":
                    return Math.min(...values);
                case "max":
                    return Math.max(...values);
                default:
                    return values.reduce((a, b) => a + b, 0);
            }
        };
        const formatAgg = (value: number | null, key: string): string => {
            if (value === null) return "-";
            // Reuse table formatting where sensible
            switch (key) {
                case "trade_price":
                case "price":
                case "eoy_price":
                case "eom_price":
                case "eod_price":
                    return value.toFixed(6);
                case "quantity":
                case "position":
                    return new Intl.NumberFormat().format(value);
                case "itd_pnl":
                case "ytd_pnl":
                case "mtd_pnl":
                case "dtd_pnl":
                    return `$${value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}`;
                default:
                    return String(value);
            }
        };
        const pnlKeys = ["itd_pnl", "ytd_pnl", "mtd_pnl", "dtd_pnl"];
        return enabled
            .filter(
                (a) => numericKeys.includes(a.key) && !pnlKeys.includes(a.key)
            )
            .map((a) => {
                const op = a.op || "sum";
                const raw = compute(a.key, op);
                const label = labelByKey[a.key] || a.key;
                const prettyOp =
                    op === "avg"
                        ? "Avg"
                        : op.charAt(0).toUpperCase() + op.slice(1);
                return {
                    key: a.key,
                    op,
                    label,
                    value: raw,
                    display: `${label} (${prettyOp}): ${formatAgg(raw, a.key)}`,
                };
            });
    }, [localConfig?.summary?.aggregations, localConfig?.columns, positions]);

    // Helper: compute enabled aggregations for an arbitrary subset of positions
    const computeAggregationsFor = (
        subset: PortfolioPosition[]
    ): { pnlParts: string[]; otherParts: string[] } => {
        const labelByKey: Record<string, string> = (
            localConfig?.columns || []
        ).reduce((acc, c) => {
            acc[c.key] = c.label;
            return acc;
        }, {} as Record<string, string>);

        const compute = (key: string, op: string) => {
            const values: number[] = subset
                .map((p: any) => p?.[key])
                .filter((v: any) => typeof v === "number") as number[];
            if (values.length === 0) return null;
            switch (op) {
                case "avg":
                    return values.reduce((a, b) => a + b, 0) / values.length;
                case "min":
                    return Math.min(...values);
                case "max":
                    return Math.max(...values);
                default:
                    return values.reduce((a, b) => a + b, 0);
            }
        };

        const formatAgg = (value: number | null, key: string): string => {
            if (value === null) return "-";
            switch (key) {
                case "trade_price":
                case "price":
                case "eoy_price":
                case "eom_price":
                case "eod_price":
                    return value.toFixed(6);
                case "quantity":
                case "position":
                    return new Intl.NumberFormat().format(value);
                case "itd_pnl":
                case "ytd_pnl":
                case "mtd_pnl":
                case "dtd_pnl":
                    return `$${value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}`;
                default:
                    return String(value);
            }
        };

        // PnL parts use selectedSumKeys
        const pnlParts = selectedSumKeys.map((key) => {
            const op = "sum";
            const val = compute(key, op as any) ?? 0;
            return `${sumLabelForKey(key)}: ${formatAgg(val as number, key)}`;
        });

        // Other enabled aggregations from config
        const list = ((localConfig as any)?.summary?.aggregations ||
            []) as Array<{
            key: string;
            op?: "sum" | "avg" | "min" | "max";
            enabled?: boolean;
        }>;
        const otherParts = list
            .filter((a) => a && (a.enabled === undefined || a.enabled))
            .filter(
                (a) =>
                    !["itd_pnl", "ytd_pnl", "mtd_pnl", "dtd_pnl"].includes(
                        a.key
                    )
            )
            .map((a) => {
                const op = a.op || "sum";
                const raw = compute(a.key, op);
                const label = labelByKey[a.key] || a.key;
                const prettyOp =
                    op === "avg"
                        ? "Avg"
                        : op.charAt(0).toUpperCase() + op.slice(1);
                return `${label} (${prettyOp}): ${formatAgg(raw, a.key)}`;
            });

        return { pnlParts, otherParts };
    };

    // Respect Aggregation selections; prefer filters.sumColumns, then enabled summary aggregations, else all
    const selectedSumKeys = useMemo(() => {
        const allowed: string[] = ["itd_pnl", "ytd_pnl", "mtd_pnl", "dtd_pnl"];
        const fromFilters: string[] = Array.isArray(
            (localConfig as any)?.filters?.sumColumns
        )
            ? ((localConfig as any).filters.sumColumns as any[]).filter(
                  (k: any) => typeof k === "string" && allowed.includes(k)
              )
            : [];
        if (fromFilters.length > 0) return fromFilters;
        const aggSource =
            (localConfig as any)?.summary?.aggregations ??
            (tableConfig as any)?.summary?.aggregations;
        const fromSummary: string[] = Array.isArray(aggSource)
            ? (aggSource as any[])
                  .filter((a) => a && (a.enabled === undefined || a.enabled))
                  .map((a) => a.key)
                  .filter(
                      (k: any) => typeof k === "string" && allowed.includes(k)
                  )
            : [];
        if (fromSummary.length > 0) return fromSummary;
        const chosen = (localConfig?.filters?.sumColumns as string[]) || [];
        const filtered = chosen.filter((k) => allowed.includes(k));
        const out = filtered.length > 0 ? filtered : allowed;
        try {
            console.log("[PortfolioTable][FOOTER] selectedSumKeys", {
                fromFilters,
                fromSummary,
                chosen,
                resolved: out,
            });
        } catch (_) {}
        return out;
    }, [tableConfig, localConfig?.filters]);

    const sumLabelForKey = (key: string): string => {
        switch (key) {
            case "itd_pnl":
                return "ITD";
            case "ytd_pnl":
                return "YTD";
            case "mtd_pnl":
                return "MTD";
            case "dtd_pnl":
                return "DTD";
            default:
                return key;
        }
    };

    const tradeTypeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        positions.forEach((p) => {
            counts[p.trade_type] = (counts[p.trade_type] || 0) + 1;
        });
        return counts;
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
        <div className="w-full" style={{ overflow: "visible" }}>
            {/* Quick data summary to verify loads */}
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
                        position: "sticky",
                        top: 0,
                        zIndex: 300,
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
                        {/* Tabs rendered in header (edit mode) */}
                        <div style={{ display: "flex", gap: 6 }}>
                            {(() => {
                                const highlight =
                                    (theme as any)?.success || "#6aa84f";
                                return null;
                            })()}
                            <button
                                onClick={() => setActiveTab("view")}
                                style={{
                                    padding: "6px 10px",
                                    background:
                                        activeTab === "view"
                                            ? safeTheme.surfaceAlt
                                            : "transparent",
                                    color: safeTheme.text,
                                    border:
                                        activeTab === "view"
                                            ? `2px solid ${
                                                  (theme as any)?.success ||
                                                  "#6aa84f"
                                              }`
                                            : `1px solid ${safeTheme.border}`,
                                    borderBottom:
                                        activeTab === "view"
                                            ? `1px solid ${safeTheme.surfaceAlt}`
                                            : `1px solid ${safeTheme.border}`,
                                    borderRadius: 6,
                                    fontWeight:
                                        activeTab === "view" ? 700 : 500,
                                    boxShadow:
                                        activeTab === "view"
                                            ? `0 0 0 1px rgba(106,168,79,0.25)`
                                            : undefined,
                                    fontSize: 12,
                                }}
                            >
                                Columns
                            </button>
                            <button
                                onClick={() => setActiveTab("group")}
                                style={{
                                    padding: "6px 10px",
                                    background:
                                        activeTab === "group"
                                            ? safeTheme.surfaceAlt
                                            : "transparent",
                                    color: safeTheme.text,
                                    border:
                                        activeTab === "group"
                                            ? `2px solid ${
                                                  (theme as any)?.success ||
                                                  "#6aa84f"
                                              }`
                                            : `1px solid ${safeTheme.border}`,
                                    borderBottom:
                                        activeTab === "group"
                                            ? `1px solid ${safeTheme.surfaceAlt}`
                                            : `1px solid ${safeTheme.border}`,
                                    borderRadius: 6,
                                    fontWeight:
                                        activeTab === "group" ? 700 : 500,
                                    boxShadow:
                                        activeTab === "group"
                                            ? `0 0 0 1px rgba(106,168,79,0.25)`
                                            : undefined,
                                    fontSize: 12,
                                }}
                            >
                                Group By
                            </button>
                            <button
                                onClick={() => setActiveTab("sum")}
                                style={{
                                    padding: "6px 10px",
                                    background:
                                        activeTab === "sum"
                                            ? safeTheme.surfaceAlt
                                            : "transparent",
                                    color: safeTheme.text,
                                    border:
                                        activeTab === "sum"
                                            ? `2px solid ${
                                                  (theme as any)?.success ||
                                                  "#6aa84f"
                                              }`
                                            : `1px solid ${safeTheme.border}`,
                                    borderBottom:
                                        activeTab === "sum"
                                            ? `1px solid ${safeTheme.surfaceAlt}`
                                            : `1px solid ${safeTheme.border}`,
                                    borderRadius: 6,
                                    fontWeight: activeTab === "sum" ? 700 : 500,
                                    boxShadow:
                                        activeTab === "sum"
                                            ? `0 0 0 1px rgba(106,168,79,0.25)`
                                            : undefined,
                                    fontSize: 12,
                                }}
                            >
                                Aggregation
                            </button>
                        </div>
                    </div>

                    {/* Inline column list disabled; panels are rendered below tabs */}
                    {/* Column panel now rendered below header to push table down */}
                </div>
            )}

            {/* Panels rendered below header tabs (ensure above table) */}
            {isEditing && localConfig && activeTab === "view" && (
                <div
                    style={{
                        marginTop: 8,
                        marginBottom: 16,
                        position: "sticky",
                        top: 56,
                        zIndex: 250,
                        pointerEvents: "auto",
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
                                "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: 12,
                        }}
                    >
                        {localConfig.columns.map((col) => {
                            const inputId = `col-toggle-${col.key}`;
                            return (
                                <label
                                    key={col.key}
                                    htmlFor={inputId}
                                    className="flex items-center gap-3 text-sm"
                                    style={{
                                        cursor: "pointer",
                                        userSelect: "none",
                                        padding: "6px 8px",
                                        borderRadius: 6,
                                        border: `1px solid ${safeTheme.border}`,
                                        background: safeTheme.surfaceAlt,
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const tag = (e.target as HTMLElement)
                                            .tagName;
                                        if (tag !== "INPUT") {
                                            // Toggle when clicking anywhere on the row
                                            handleColumnToggle(col.key);
                                        }
                                    }}
                                >
                                    <input
                                        id={inputId}
                                        type="checkbox"
                                        checked={col.visible}
                                        onChange={() =>
                                            handleColumnToggle(col.key)
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            width: 18,
                                            height: 18,
                                            cursor: "pointer",
                                        }}
                                    />
                                    <span>{col.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {isEditing && localConfig && activeTab === "group" && (
                <div
                    style={{
                        marginTop: 8,
                        marginBottom: 16,
                        position: "sticky",
                        top: 56,
                        zIndex: 250,
                        pointerEvents: "auto",
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
                            <label
                                key={c.key}
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    type="radio"
                                    name="groupBy"
                                    checked={
                                        localConfig.grouping?.[0] === c.key
                                    }
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
                            onClick={() =>
                                setLocalConfig({ ...localConfig, grouping: [] })
                            }
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

            {isEditing && localConfig && activeTab === "sum" && (
                <div
                    style={{
                        marginTop: 8,
                        marginBottom: 16,
                        position: "sticky",
                        top: 56,
                        zIndex: 250,
                        pointerEvents: "auto",
                        background: safeTheme.surface,
                        color: safeTheme.text,
                        border: `1px solid ${safeTheme.border}`,
                        borderRadius: 6,
                        padding: 10,
                        maxHeight: 280,
                        overflowY: "auto",
                        width: "100%",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(200px,1fr))",
                            gap: 10,
                        }}
                    >
                        {localConfig.columns
                            .filter((c) => numericKeys.includes(c.key))
                            .map((c) => {
                                // Selection rule: PnL keys use filters.sumColumns; others use summary.aggregations.enabled
                                const pnlKeys = [
                                    "itd_pnl",
                                    "ytd_pnl",
                                    "mtd_pnl",
                                    "dtd_pnl",
                                ];
                                const sumCols = (localConfig.filters
                                    ?.sumColumns || []) as string[];
                                // Find existing aggregation entry if present
                                const aggList =
                                    (localConfig as any)?.summary
                                        ?.aggregations || [];
                                const existing =
                                    aggList.find((a: any) => a.key === c.key) ||
                                    {};
                                const currentOp = existing.op || "sum";
                                const enabledFromAgg =
                                    existing.enabled === true;
                                const selected = pnlKeys.includes(c.key)
                                    ? sumCols.includes(c.key)
                                    : enabledFromAgg;

                                return (
                                    <label
                                        key={c.key}
                                        className="flex items-center gap-3 text-sm"
                                        style={{
                                            cursor: "pointer",
                                            userSelect: "none",
                                            padding: "6px 8px",
                                            borderRadius: 6,
                                            border: selected
                                                ? `2px solid ${
                                                      (theme as any)?.success ||
                                                      "#6aa84f"
                                                  }`
                                                : `1px solid ${safeTheme.border}`,
                                            background: selected
                                                ? "rgba(106,168,79,0.12)"
                                                : "transparent",
                                            transition:
                                                "background 120ms ease, border-color 120ms ease",
                                        }}
                                        onMouseDown={(e) => {
                                            const tag = (
                                                e.target as HTMLElement
                                            ).tagName;
                                            if (
                                                tag !== "SELECT" &&
                                                tag !== "INPUT"
                                            ) {
                                                e.preventDefault();
                                            }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const tag = (
                                                e.target as HTMLElement
                                            ).tagName;
                                            if (
                                                tag !== "INPUT" &&
                                                tag !== "SELECT"
                                            ) {
                                                // Toggle selection when clicking the row
                                                const pnlKeys = [
                                                    "itd_pnl",
                                                    "ytd_pnl",
                                                    "mtd_pnl",
                                                    "dtd_pnl",
                                                ];
                                                const isPnl = pnlKeys.includes(
                                                    c.key
                                                );
                                                const current = new Set(
                                                    (localConfig.filters
                                                        ?.sumColumns as string[]) ||
                                                        []
                                                );
                                                // For PnL keys, reflect selection in sumColumns
                                                if (isPnl) {
                                                    if (selected)
                                                        current.delete(c.key);
                                                    else current.add(c.key);
                                                }

                                                // Sync summary.aggregations enabled flag
                                                const list =
                                                    (localConfig as any)
                                                        ?.summary
                                                        ?.aggregations || [];
                                                const idx = list.findIndex(
                                                    (a: any) => a.key === c.key
                                                );
                                                const updated =
                                                    idx >= 0
                                                        ? (() => {
                                                              const cp = [
                                                                  ...list,
                                                              ];
                                                              cp[idx] = {
                                                                  ...cp[idx],
                                                                  enabled:
                                                                      !selected,
                                                              };
                                                              return cp;
                                                          })()
                                                        : [
                                                              ...list,
                                                              {
                                                                  key: c.key,
                                                                  op: currentOp,
                                                                  enabled:
                                                                      !selected,
                                                              },
                                                          ];

                                                setLocalConfig({
                                                    ...localConfig,
                                                    filters: {
                                                        ...(localConfig.filters ||
                                                            {}),
                                                        // Only PnL keys are reflected in sumColumns
                                                        sumColumns:
                                                            Array.from(current),
                                                    },
                                                    summary: {
                                                        enabled: true,
                                                        position:
                                                            (localConfig as any)
                                                                ?.summary
                                                                ?.position ||
                                                            "footer",
                                                        aggregations: updated,
                                                    },
                                                } as any);
                                            }
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={(e) => {
                                                try {
                                                    console.log(
                                                        "[PortfolioTable][UI] Checkbox toggle",
                                                        {
                                                            key: c.key,
                                                            checked:
                                                                e.target
                                                                    .checked,
                                                        }
                                                    );
                                                } catch (_) {}
                                                const pnlKeys = [
                                                    "itd_pnl",
                                                    "ytd_pnl",
                                                    "mtd_pnl",
                                                    "dtd_pnl",
                                                ];
                                                const isPnl = pnlKeys.includes(
                                                    c.key
                                                );
                                                const current = new Set(
                                                    (localConfig.filters
                                                        ?.sumColumns as string[]) ||
                                                        []
                                                );
                                                if (isPnl) {
                                                    if (e.target.checked)
                                                        current.add(c.key);
                                                    else current.delete(c.key);
                                                }

                                                // Ensure summary.aggregations contains entry with enabled flag
                                                const base = {
                                                    key: c.key,
                                                    op: currentOp,
                                                    label: undefined,
                                                    format: undefined,
                                                    enabled: e.target.checked,
                                                };
                                                const nextAggs = Array.isArray(
                                                    aggList
                                                )
                                                    ? (() => {
                                                          const idx =
                                                              aggList.findIndex(
                                                                  (a: any) =>
                                                                      a.key ===
                                                                      c.key
                                                              );
                                                          if (idx >= 0) {
                                                              const copy = [
                                                                  ...aggList,
                                                              ];
                                                              copy[idx] = {
                                                                  ...copy[idx],
                                                                  enabled:
                                                                      e.target
                                                                          .checked,
                                                              };
                                                              return copy;
                                                          }
                                                          return [
                                                              ...aggList,
                                                              base,
                                                          ];
                                                      })()
                                                    : [base];

                                                setLocalConfig({
                                                    ...localConfig,
                                                    filters: {
                                                        ...(localConfig.filters ||
                                                            {}),
                                                        // Only PnL keys are reflected in sumColumns
                                                        sumColumns:
                                                            Array.from(current),
                                                    },
                                                    summary: {
                                                        enabled: true,
                                                        position:
                                                            (localConfig as any)
                                                                ?.summary
                                                                ?.position ||
                                                            "footer",
                                                        aggregations: nextAggs,
                                                    },
                                                } as any);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                width: 18,
                                                height: 18,
                                                cursor: "pointer",
                                            }}
                                        />
                                        {/* Aggregation selector appears before label and only when selected */}
                                        {selected && (
                                            <select
                                                value={currentOp}
                                                onChange={(e) => {
                                                    const op = e.target.value;
                                                    const list =
                                                        (localConfig as any)
                                                            ?.summary
                                                            ?.aggregations ||
                                                        [];
                                                    const idx = list.findIndex(
                                                        (a: any) =>
                                                            a.key === c.key
                                                    );
                                                    const updated =
                                                        idx >= 0
                                                            ? (() => {
                                                                  const copy = [
                                                                      ...list,
                                                                  ];
                                                                  copy[idx] = {
                                                                      ...copy[
                                                                          idx
                                                                      ],
                                                                      op,
                                                                      enabled:
                                                                          true,
                                                                  };
                                                                  return copy;
                                                              })()
                                                            : [
                                                                  ...list,
                                                                  {
                                                                      key: c.key,
                                                                      op,
                                                                      enabled:
                                                                          true,
                                                                  },
                                                              ];
                                                    try {
                                                        console.log(
                                                            "[PortfolioTable][UI] Aggregation op change",
                                                            { key: c.key, op }
                                                        );
                                                    } catch (_) {}
                                                    setLocalConfig({
                                                        ...localConfig,
                                                        summary: {
                                                            enabled: true,
                                                            position:
                                                                (
                                                                    localConfig as any
                                                                )?.summary
                                                                    ?.position ||
                                                                "footer",
                                                            aggregations:
                                                                updated,
                                                        },
                                                    } as any);
                                                }}
                                                style={{
                                                    background:
                                                        safeTheme.surfaceAlt,
                                                    color: safeTheme.text,
                                                    border: `1px solid ${safeTheme.border}`,
                                                    borderRadius: 4,
                                                    padding: "2px 6px",
                                                    fontSize: 12,
                                                }}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <option value="sum">Sum</option>
                                                <option value="avg">
                                                    Average
                                                </option>
                                                <option value="min">Min</option>
                                                <option value="max">Max</option>
                                            </select>
                                        )}
                                        <span style={{ minWidth: 90 }}>
                                            {c.label}
                                        </span>
                                    </label>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Table */}
            <div
                ref={scrollContainerRef}
                className="portfolio-table-scroll"
                style={{
                    marginTop: isEditing ? 140 : 0,
                    width: "100%",
                    // Ensure the component never pushes header out of viewport
                    maxHeight: "calc(100vh - 220px)",
                    // Let CSS handle overflow settings
                    minWidth: 0,
                    minHeight: 0,
                    position: "relative",
                    zIndex: 0,
                    WebkitOverflowScrolling: "touch",
                }}
            >
                <table
                    ref={tableRef}
                    style={{
                        width: "max-content",
                        minWidth: tableMinWidth
                            ? `${Math.max(tableMinWidth + 200, 3000)}px` // smaller table to show horizontal scrollbar
                            : "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
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
                                            minWidth: header.getSize(),
                                            border: `1px solid ${safeTheme.border}`,
                                            padding: "8px 12px",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                            position: "sticky",
                                            top: 0,
                                            zIndex: 2,
                                            background: safeTheme.surfaceAlt,
                                            // Make room for the resize handle so label isn't covered
                                            paddingRight: 14,
                                            // Required for absolute positioning of resize handle
                                            position: "relative",
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
                                        {isEditing && (
                                            <div
                                                onMouseDown={(e) => {
                                                    console.log(
                                                        "[PortfolioTable] Resize handle mousedown",
                                                        {
                                                            columnId:
                                                                header.column
                                                                    .id,
                                                            isResizing:
                                                                header.column.getIsResizing(),
                                                            currentSize:
                                                                header.getSize(),
                                                        }
                                                    );
                                                    header.getResizeHandler()(
                                                        e
                                                    );
                                                }}
                                                onTouchStart={(e) => {
                                                    console.log(
                                                        "[PortfolioTable] Resize handle touchstart",
                                                        {
                                                            columnId:
                                                                header.column
                                                                    .id,
                                                        }
                                                    );
                                                    header.getResizeHandler()(
                                                        e
                                                    );
                                                }}
                                                style={{
                                                    position: "absolute",
                                                    right: 0,
                                                    top: 0,
                                                    height: "100%",
                                                    width: 6,
                                                    cursor: "col-resize",
                                                    userSelect: "none",
                                                    touchAction: "none",
                                                    backgroundColor:
                                                        header.column.getIsResizing()
                                                            ? "rgba(106,168,79,0.35)"
                                                            : "rgba(106,168,79,0.1)",
                                                    border: "1px solid rgba(106,168,79,0.3)",
                                                    zIndex: 10,
                                                }}
                                                aria-label="Resize column"
                                            />
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {(() => {
                            const rows = table.getRowModel().rows;
                            const groupKey =
                                (localConfig
                                    ?.grouping?.[0] as keyof PortfolioPosition) ||
                                null;
                            const rendered: React.ReactNode[] = [];
                            let currentGroupValue: any = undefined;
                            let groupBuffer: typeof rows = [] as any;

                            const flushGroup = () => {
                                if (!groupKey || groupBuffer.length === 0)
                                    return;
                                const subset = groupBuffer.map(
                                    (r: any) => r.original as PortfolioPosition
                                );
                                const { pnlParts, otherParts } =
                                    computeAggregationsFor(subset);
                                rendered.push(
                                    <tr
                                        key={`group-sum-${String(
                                            currentGroupValue
                                        )}-${rendered.length}`}
                                        style={{
                                            background: safeTheme.surfaceAlt,
                                        }}
                                    >
                                        <td
                                            colSpan={
                                                table.getVisibleLeafColumns()
                                                    .length
                                            }
                                            style={{
                                                border: `1px solid ${safeTheme.border}`,
                                                padding: "4px 8px",
                                                textAlign: "right",
                                                fontWeight: 600,
                                                fontSize: 12,
                                            }}
                                        >
                                            {[...pnlParts, ...otherParts].join(
                                                " • "
                                            )}
                                        </td>
                                    </tr>
                                );
                            };

                            rows.forEach((row, idx) => {
                                const original =
                                    row.original as PortfolioPosition;
                                const value = groupKey
                                    ? (original as any)[groupKey]
                                    : undefined;
                                const isNewGroup =
                                    groupKey && value !== currentGroupValue;

                                if (isNewGroup) {
                                    // flush previous group
                                    flushGroup();
                                    currentGroupValue = value;
                                    groupBuffer = [] as any;
                                }

                                groupBuffer.push(row);
                                rendered.push(
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
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                );

                                const next = rows[idx + 1];
                                const nextValue =
                                    next && groupKey
                                        ? (next.original as any)[groupKey]
                                        : undefined;
                                const isBoundary =
                                    groupKey &&
                                    (next === undefined ||
                                        nextValue !== currentGroupValue);
                                if (isBoundary) {
                                    flushGroup();
                                    groupBuffer = [] as any;
                                }
                            });

                            // If no grouping set, just render rows as before
                            if (!groupKey) {
                                return rows.map((row, idx) => (
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
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ));
                            }

                            return rendered;
                        })()}
                    </tbody>
                    {/* Combined footer: compact PnL + non-PnL aggregations in one line */}
                    <tfoot>
                        <tr style={{ background: safeTheme.surfaceAlt }}>
                            <td
                                colSpan={table.getVisibleLeafColumns().length}
                                style={{
                                    border: `1px solid ${safeTheme.border}`,
                                    padding: "4px 8px",
                                    textAlign: "right",
                                    fontWeight: 600,
                                    fontSize: 12,
                                }}
                            >
                                {[
                                    ...selectedSumKeys.map(
                                        (key) =>
                                            `${sumLabelForKey(
                                                key
                                            )}: ${formatValue(
                                                (pnlSummary as any)[key] ?? 0,
                                                key
                                            )}`
                                    ),
                                    ...(enabledAggregations || []).map(
                                        (a) => a.display
                                    ),
                                ].join(" • ")}
                            </td>
                        </tr>
                    </tfoot>
                </table>
                {/* Removed spacer; scrollbar is now always visible via CSS */}
            </div>

            {/* Footer controls removed as tabs are in header */}
        </div>
    );
};

export default PortfolioTable;
