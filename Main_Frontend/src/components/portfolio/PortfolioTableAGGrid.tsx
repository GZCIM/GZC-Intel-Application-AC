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
    ColumnResizedEvent,
    ColumnMovedEvent,
    ColumnVisibleEvent,
    ModuleRegistry,
    AllCommunityModule,
} from "ag-grid-community";
import "./PortfolioTableAGGrid.css";
import { useAuthContext } from "../../modules/ui-library";
import { useTheme } from "../../contexts/ThemeContext";
import { ContextMenu, ContextMenuItem } from "../ContextMenu";
import axios from "axios";

// Register AG Grid modules (community only)
ModuleRegistry.registerModules([AllCommunityModule]);

// Community build: we render grand totals via pinned bottom row
const ENTERPRISE_FEATURES = false;

// Unified, toggleable debug logger for this component
const SCROLLBAR_DEBUG = true; // set to false to silence new debug output
const COLUMN_ORDER_DEBUG = true;
const dlog = (label: string, data?: unknown) => {
    if (SCROLLBAR_DEBUG) {
        if (data !== undefined) console.info(label, data);
        else console.info(label);
    }
};
const clog = (label: string, data?: unknown) => {
    if (COLUMN_ORDER_DEBUG) {
        if (data !== undefined) console.info(label, data);
        else console.info(label);
    }
};

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
    // Derived identifier columns
    underlying?: string;
    ticker?: string;
    // Lineage fields
    original_trade_id?: number | string | null; // Can be number, comma-separated string (when fund is "all"), or null
    // Grouped trades info (when fund is "all" and multiple trades share same ticker)
    grouped_trades?: Array<{
        trade_id: number;
        quantity: number;
        fund_id: number;
    }>;
    trade_count?: number; // Number of trades in this position (when grouped)
}

interface TradeLineageItem {
    id: number;
    current_trade_id: number | null;
    parent_lineage_id: number | null;
    original_trade_id: number;
    operation: string;
    operation_timestamp: string;
    quantity_delta?: number | null;
    notes?: string | null;
    fund_short_name?: string | null;
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
    filters: Record<string, any>; // may include: sumColumns, aggregateByTicker
    aggregations?: Record<string, "sum" | "avg" | "min" | "max" | "count" | "none">;
    notional?: { enabled?: boolean; placement?: "off" | "above" | "below"; align?: "left" | "center" | "right"; showFX?: boolean; showFXOptions?: boolean; showTotal?: boolean; showFxTotals?: boolean; showFxOptionsTotals?: boolean };
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
    editToggleNonce?: number;
    componentId?: string;
    gridWidth?: number; // Grid width from cloud DB config
    gridHeight?: number; // Grid height from cloud DB config
    deviceType?: "laptop" | "mobile" | "bigscreen";
    componentBorderInfo?: ComponentBorderInfo;
}

const PortfolioTableAGGrid: React.FC<PortfolioTableAGGridProps> = ({
    selectedDate,
    fundId,
    isLive,
    externalEditing,
    editToggleNonce,
    componentId,
    gridWidth,
    gridHeight,
    deviceType,
    componentBorderInfo
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
    // Drag state for reordering column tags in edit mode (Columns tab)
    const dragColIndexRef = useRef<number | null>(null);
    const [isDraggingColumnTag, setIsDraggingColumnTag] = useState(false);
    // Dynamic height of Columns panel to push grid down in edit mode
    const columnsPanelRef = useRef<HTMLDivElement | null>(null);
    const [columnsPanelHeight, setColumnsPanelHeight] = useState<number>(0);
    // Edit UI: which settings tab is active
    const [activeEditTab, setActiveEditTab] = useState<"columns" | "group">("columns");
    const editTabs: Array<{ k: "columns" | "group"; t: string }> = [
        { k: "columns", t: "Columns" },
        { k: "group", t: "Group & Totals" },
    ];

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
    }>({
        isOpen: false,
        position: { x: 0, y: 0 },
    });
    const [contextMenuRow, setContextMenuRow] = useState<PortfolioPosition | null>(null);
    const [lineageData, setLineageData] = useState<TradeLineageItem[]>([]);
    const [isLoadingLineage, setIsLoadingLineage] = useState(false);
    const contextMenuRowRef = useRef<PortfolioPosition | null>(null);
    const lastContextPositionRef = useRef<{ x: number; y: number } | null>(null);

    // Fetch lineage data when context menu opens with a row that has original_trade_id
    useEffect(() => {
        if (
            contextMenuRow &&
            contextMenuRow.original_trade_id &&
            contextMenuRow.original_trade_id !== null &&
            String(contextMenuRow.original_trade_id) !== "-"
        ) {
            // original_trade_id can be a number or comma-separated string (when fund is "all")
            fetchTradeLineage(contextMenuRow.original_trade_id).then(
                (lineage) => {
                    setLineageData(lineage);
                }
            );
        } else {
            setLineageData([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextMenuRow]);


    // Close context menu on any left click anywhere
    useEffect(() => {
        if (!contextMenu.isOpen) return;
        const handleDocClick = (e: MouseEvent) => {
            setContextMenu((prev) => ({ ...prev, isOpen: false }));
            setContextMenuRow(null);
        };
        document.addEventListener("mousedown", handleDocClick, true);
        return () => document.removeEventListener("mousedown", handleDocClick, true);
    }, [contextMenu.isOpen]);

    // Document-level handler: handles row clicks AND suppresses browser menu on empty grid space
    useEffect(() => {
        const handleDocumentContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isInGrid = containerRef.current?.contains(target);

            if (!isInGrid || !gridApi) {
                return; // Not in grid or grid not ready
            }

            // Get the element at the mouse position (most accurate)
            let elementToCheck: HTMLElement | null = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
            if (!elementToCheck || elementToCheck === document.body) {
                elementToCheck = target;
            }

            if (!elementToCheck) {
                return;
            }

            // If we hit ag-full-width-container (overlay), try to find the actual row underneath
            if (elementToCheck.classList?.contains('ag-full-width-container')) {
                // Query all rows and find which one contains the mouse coordinates
                const allRows = containerRef.current?.querySelectorAll('.ag-row') || [];
                for (const row of Array.from(allRows)) {
                    const rect = row.getBoundingClientRect();
                    if (e.clientX >= rect.left && e.clientX <= rect.right &&
                        e.clientY >= rect.top && e.clientY <= rect.bottom) {
                        elementToCheck = row as HTMLElement;
                        // Only log in development to reduce console noise
                        break;
                    }
                }
            }

            let rowData: PortfolioPosition | null = null;
            let rowIndex: number | null = null;

            // PRIORITY 1: Look for row-index attribute (we set this ourselves, most reliable)
            let current: HTMLElement | null = elementToCheck;
            for (let i = 0; i < 30 && current; i++) {
                const rowIndexAttr = current.getAttribute('row-index');
                if (rowIndexAttr !== null) {
                    rowIndex = parseInt(rowIndexAttr, 10);
                    if (!isNaN(rowIndex) && rowIndex >= 0 && gridApi) {
                        try {
                            const rowNode = gridApi.getDisplayedRowAtIndex(rowIndex);
                            if (rowNode?.data) {
                                rowData = rowNode.data as PortfolioPosition;
                                break;
                            }
                        } catch (err) {
                            // Silently handle error
                        }
                    }
                    break;
                }
                current = current.parentElement;
            }

            // PRIORITY 2: Try AG Grid's getRowNodeForElement (if row-index didn't work)
            if (!rowData && gridApi) {
                try {
                    const rowNode = (gridApi as any).getRowNodeForElement?.(elementToCheck);
                    if (rowNode && rowNode.data) {
                        rowData = rowNode.data as PortfolioPosition;
                        rowIndex = rowNode.rowIndex ?? null;
                    }
                } catch (apiErr) {
                    // Method not available or failed
                }
            }

            // PRIORITY 3: Try closest('.ag-row') and check for row-index
            if (!rowData) {
                const rowElement = elementToCheck.closest('.ag-row') as HTMLElement | null;
                if (rowElement) {
                    const rowIndexAttr = rowElement.getAttribute('row-index');
                    if (rowIndexAttr !== null && gridApi) {
                        rowIndex = parseInt(rowIndexAttr, 10);
                        if (!isNaN(rowIndex) && rowIndex >= 0) {
                            try {
                                const rowNode = gridApi.getDisplayedRowAtIndex(rowIndex);
                                if (rowNode?.data) {
                                    rowData = rowNode.data as PortfolioPosition;
                                }
                            } catch (err) {
                                // Silently handle error
                            }
                        }
                    }
                }
            }


            if (rowData) {
                // Clicked on a row - handle it
                e.preventDefault();
                e.stopPropagation();

                setContextMenuRow(rowData);
                contextMenuRowRef.current = rowData;
                setContextMenu({
                    isOpen: true,
                    position: { x: e.clientX, y: e.clientY },
                });
            } else {
                // Clicked in grid but not on a row - suppress browser menu
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // Use capture phase to catch events early
        document.addEventListener("contextmenu", handleDocumentContextMenu, true);
        return () => {
            document.removeEventListener("contextmenu", handleDocumentContextMenu, true);
        };
    }, [gridApi]); // Re-attach when gridApi becomes available

    // Parent-set notional config listener removed; grid remains single source of persistence

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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isSyncingScrollRef = useRef(false);
    // When true, this component will NOT own scrolling; the parent Portfolio viewport does.
    const useExternalScrollViewport = true;

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

    // Persist immediately on lock transitions signaled by parent
    useEffect(() => {
        if (!externalEditing && typeof editToggleNonce === "number" && editToggleNonce > 0) {
            (async () => {
                try {
                    console.info("[PortfolioTableAGGrid] Auto-save on lock", {
                        componentId: resolvedComponentId,
                        deviceType: resolvedDeviceType,
                        fundId,
                        editToggleNonce,
                    });
                    await saveTableConfig();
                } catch (e) {
                    console.error("[PortfolioTableAGGrid] Auto-save failed", e);
                }
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editToggleNonce]);

    // Load table configuration on mount and when identifiers change
    useEffect(() => {
        loadTableConfig();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fundId, resolvedComponentId, resolvedDeviceType]);

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
                console.info("[PortfolioTableAGGrid] Loaded table config", {
                    deviceType: resolvedDeviceType,
                    componentId: resolvedComponentId,
                    fundId,
                    columns: (response.data.data?.columns || []).map((c: any) => ({ key: c.key, visible: c.visible })),
                });
                // Migration: ensure new identifier columns exist in saved configs
                const incoming = response.data.data as TableConfig;
                const existingKeys = new Set((incoming.columns || []).map((c) => c.key));
                const toEnsure: Array<ColumnConfig> = [];
                if (!existingKeys.has("underlying")) {
                    toEnsure.push({ key: "underlying", label: "Underlying", visible: true, width: 120 });
                }
                if (!existingKeys.has("ticker")) {
                    toEnsure.push({ key: "ticker", label: "Ticker", visible: true, width: 160 });
                }
                let migrated = incoming;
                if (toEnsure.length > 0) {
                    migrated = {
                        ...incoming,
                        columns: [...(incoming.columns || []), ...toEnsure],
                    } as TableConfig;
                    // Persist migration immediately so future loads include the new columns
                    try {
                        await saveTableConfig(migrated);
                    } catch (_) {}
                }
                setTableConfig(migrated);
                setLocalConfig(migrated);
            }
        } catch (err) {
            console.error("Failed to load table config:", err);
        }
    };

    const saveTableConfig = async (forceConfig?: TableConfig) => {
        if (!localConfig && !forceConfig) return;

        try {
            const token = await getToken();

            // Prefer live grid state when API is available and not destroyed
            const baseConfig = forceConfig || localConfig!;
            let updatedColumns = baseConfig.columns;
            let groupingFromGrid: string[] | undefined;
            let aggregationsFromGrid: Record<string, any> | undefined;

            if (gridApi && !gridApi.isDestroyed?.()) {
                try {
            const columnState = gridApi.getColumnState();
                    const rowGroupState = columnState.filter((s) => s.rowGroup);
                    groupingFromGrid = rowGroupState
                        .sort((a, b) => (a.rowGroupIndex || 0) - (b.rowGroupIndex || 0))
                        .map((s) => String(s.colId));
                    aggregationsFromGrid = columnState.reduce(
                        (acc: Record<string, any>, s) => {
                            if (s.aggFunc) acc[String(s.colId)] = s.aggFunc as any;
                            return acc;
                        },
                        {}
                    );

                    updatedColumns = baseConfig.columns.map((col) => {
                const colState = columnState.find((cs) => cs.colId === col.key);
                return {
                    ...col,
                    visible: colState ? !colState.hide : col.visible,
                    width: colState ? colState.width || col.width : col.width,
                    size: colState ? colState.width || col.width : col.width,
                };
            });
                } catch (e) {
                    console.warn("[PortfolioTableAGGrid] Falling back to localConfig for save (columnState unavailable)", e);
                }
            } else {
                console.warn("[PortfolioTableAGGrid] Grid API not available (or destroyed); saving using localConfig only");
            }

            const effectiveGrouping = (groupingFromGrid && groupingFromGrid.length > 0)
                ? groupingFromGrid
                : baseConfig.grouping;

            const updatedConfig = {
                ...baseConfig,
                columns: updatedColumns,
                // Persist latest grouping and aggregations from grid state
                grouping: effectiveGrouping,
                aggregations: {
                    ...(baseConfig.aggregations || {}),
                    ...(aggregationsFromGrid || {}),
                },
                // Ensure default sorting persists
                sorting: baseConfig.sorting,
            };

            console.info("[PortfolioTableAGGrid] Saving table config", {
                deviceType: resolvedDeviceType,
                componentId: resolvedComponentId,
                fundId,
                columns: updatedConfig.columns.map((c) => ({ key: c.key, visible: c.visible, width: c.width || c.size })),
                grouping: updatedConfig.grouping,
                aggregations: updatedConfig.aggregations,
                notional: (updatedConfig as any).notional,
            });

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

            // Verify by reloading immediately and logging the result
            try {
                const verifyResp = await axios.get(
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
                console.info("[PortfolioTableAGGrid] Saved config (verification load)", {
                    columns: (verifyResp.data?.data?.columns || []).map((c: any) => ({ key: c.key, visible: c.visible })),
                });
            } catch (verifyErr) {
                console.warn("[PortfolioTableAGGrid] Verification load failed", verifyErr);
            }
        } catch (err) {
            console.error("Failed to save table config:", err);
        }
    };

    // Debounced saver for frequent column operations
    const saveDebounceRef = useRef<number | null>(null);
    const queueSave = useCallback(() => {
        if (saveDebounceRef.current) {
            window.clearTimeout(saveDebounceRef.current);
        }
        saveDebounceRef.current = window.setTimeout(() => {
            saveTableConfig();
        }, 300);
    }, [saveTableConfig]);

    // Ensure all data-driven columns appear in the selector (visible=false by default)
    useEffect(() => {
        if (!localConfig || positions.length === 0) return;
        const currentKeys = new Set(localConfig.columns.map((c) => c.key));
        const exclude = new Set([
            "__aggregate__",
            "_priceWsum",
            "_priceW",
        ]);
        const discovered = new Set<string>();
        for (const row of positions as any[]) {
            Object.keys(row || {}).forEach((k) => {
                if (exclude.has(k)) return;
                discovered.add(k);
            });
        }
        const additions: ColumnConfig[] = [];
        for (const k of discovered) {
            if (!currentKeys.has(k)) {
                additions.push({
                    key: k,
                    label: String(k).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
                    visible: false,
                    width: 120,
                });
            }
        }
        if (additions.length > 0) {
            // Append new columns at the end, sorted by label for predictable placement
            const nextColumns = [...localConfig.columns, ...additions.sort((a,b) => a.label.localeCompare(b.label))];
            const next: TableConfig = { ...localConfig, columns: nextColumns } as TableConfig;
            setLocalConfig(next);
            setTimeout(() => saveTableConfig(next), 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [positions]);

    // Track Columns panel height and push grid down accordingly
    useEffect(() => {
        if (!isEditing) {
            setColumnsPanelHeight(0);
            return;
        }
        const el = columnsPanelRef.current;
        if (!el) return;
        const update = () => setColumnsPanelHeight(el.getBoundingClientRect().height + 8);
        update();
        const ro = new ResizeObserver(() => {
            update();
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [isEditing, localConfig?.columns.length]);

    // Apply current localConfig to AG Grid (used both in edit and locked modes)
    const applyConfigToGrid = useCallback(() => {
        if (!gridApi || !localConfig) return;
        try {
            // Column visibility/widths
            const state = localConfig.columns.map((c) => ({
                colId: c.key,
                hide: !c.visible,
                width: c.size || c.width,
            }));
            gridApi.applyColumnState({ state, defaultState: {} });

            // Sorting
            if (localConfig.sorting?.column) {
                gridApi.applyColumnState({
                    defaultState: { sort: null },
                    state: [ { colId: localConfig.sorting.column, sort: localConfig.sorting.direction } ],
                });
            }

            // Grouping (skip in community build)
            if (ENTERPRISE_FEATURES) {
                const groupState = (localConfig.grouping || []).map((k, idx) => ({ colId: k, rowGroup: true, rowGroupIndex: idx }));
                gridApi.applyColumnState({ defaultState: { rowGroup: false }, state: groupState });
                console.info("[AG Grid] Applied grouping", localConfig.grouping || []);
            }

            // Aggregations
            if (ENTERPRISE_FEATURES) {
                const aggs = localConfig.aggregations || {};
                const aggState = Object.keys(aggs).map((k) => ({ colId: k, aggFunc: aggs[k] === "none" ? undefined : aggs[k] }));
                if (aggState.length > 0) gridApi.applyColumnState({ state: aggState, defaultState: {} });
                console.info("[AG Grid] Applied aggregations", aggs);
            }
        } catch (e) {
            console.warn("[AG Grid] applyConfigToGrid failed", e);
        }
    }, [gridApi, localConfig]);

    // Re-apply config whenever grid is ready or config changes
    useEffect(() => {
        applyConfigToGrid();
    }, [applyConfigToGrid]);

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
                (pos: Record<string, unknown>) => {
                    return {
                        ...pos,
                        trade_type: "FX Forward" as const,
                    };
                }
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

    // Fetch trade lineage data for History submenu
    const fetchTradeLineage = async (originalTradeId: number | string): Promise<TradeLineageItem[]> => {
        try {
            setIsLoadingLineage(true);
            const token = await getToken();
            // originalTradeId can be a number or comma-separated string
            const params: Record<string, unknown> = { original_trade_id: String(originalTradeId) };
            // Include fundId if it's set and not 0 (0 means "all funds")
            if (fundId !== undefined && fundId !== 0) {
                params.fundId = fundId;
            }
            const response = await axios.get("/api/portfolio/trade-lineage", {
                params,
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data.status === "success" && response.data.data) {
                // Sort by trade_id DESC (newest on top; eldest at bottom)
                const sorted = (response.data.data as TradeLineageItem[]).sort(
                    (a, b) => {
                        const aid = (a.current_trade_id ?? 0);
                        const bid = (b.current_trade_id ?? 0);
                        return bid - aid;
                    }
                );
                return sorted;
            }
            return [];
        } catch (err) {
            console.error("[PortfolioTable] Error fetching trade lineage:", err);
            return [];
        } finally {
            setIsLoadingLineage(false);
        }
    };

    // Scrollbar functionality
    const updateScrollbarState = useCallback(() => {
        if (!tableBodyRef.current) {
            console.log("[Scrollbar Debug] No tableBodyRef.current");
            return;
        }

        const {
            scrollTop,
            scrollHeight,
            clientHeight,
            scrollLeft,
            scrollWidth,
            clientWidth,
        } = tableBodyRef.current;

        // CRITICAL: For accurate horizontal scroll detection, read scrollWidth from the content container
        // because the viewport has overflow: hidden which can affect scrollWidth calculation
        let actualScrollWidth = scrollWidth;
        let actualClientWidth = clientWidth;
        let actualScrollHeight = scrollHeight;
        let actualClientHeight = clientHeight;

        // Try to get the actual content container width for horizontal scrolling
        if (tableBodyRef.current) {
            const contentContainer = tableBodyRef.current.querySelector('.ag-center-cols-container') as HTMLElement;
            if (contentContainer) {
                const contentRect = contentContainer.getBoundingClientRect();
                actualScrollWidth = contentRect.width; // Use the actual content width
                dlog("[Scrollbar] content container width", {
                    viewportScrollWidth: scrollWidth,
                    viewportClientWidth: clientWidth,
                    contentContainerWidth: contentRect.width,
                    needsHorizontalScroll: contentRect.width > clientWidth
                });
            }
        }

        dlog("[Scrollbar] state", {
            scrollWidth: actualScrollWidth,
            clientWidth: actualClientWidth,
            scrollHeight: actualScrollHeight,
            clientHeight: actualClientHeight,
            needsHorizontalScroll: actualScrollWidth > actualClientWidth,
            needsVerticalScroll: actualScrollHeight > actualClientHeight,
            elementRect: tableBodyRef.current.getBoundingClientRect(),
        });

        // External viewport owns native scrollbars; no ghost sizing needed here
        if (!useExternalScrollViewport) {
            try {
                const host = containerRef.current;
                if (host) {
                    const ghostId = `portfolio-scroll-ghost-${componentId || "default"}`;
                    let ghost = host.querySelector(`#${ghostId}`) as HTMLDivElement | null;
                    if (!ghost) {
                        ghost = document.createElement("div");
                        ghost.id = ghostId;
                        ghost.style.position = "absolute";
                        ghost.style.left = "0";
                        ghost.style.top = "0";
                        ghost.style.pointerEvents = "none";
                        ghost.style.opacity = "0";
                        host.appendChild(ghost);
                    }
                    ghost.style.width = `${Math.max(actualScrollWidth, host.clientWidth)}px`;
                    ghost.style.height = `${Math.max(actualScrollHeight, host.clientHeight)}px`;
                }
            } catch {}
        }

        if (
            actualScrollWidth === 0 ||
            actualClientWidth === 0 ||
            actualScrollHeight === 0 ||
            actualClientHeight === 0
        ) {
            console.log(
                "[Scrollbar Debug] Zero dimensions detected, trying alternative methods"
            );

            // Try to get dimensions from the grid container
            const gridContainer = document.querySelector(".ag-theme-alpine");
            if (gridContainer) {
                const gridRect = gridContainer.getBoundingClientRect();
                actualClientWidth = gridRect.width;
                actualClientHeight = gridRect.height;

                // For scroll dimensions, we need to check if there's content overflow
                const gridBody =
                    gridContainer.querySelector(".ag-body-viewport");
                if (gridBody) {
                    const bodyRect = gridBody.getBoundingClientRect();
                    actualClientWidth = bodyRect.width;
                    actualClientHeight = bodyRect.height;

                    // Get actual content width from the content container
                    const contentContainer = gridBody.querySelector('.ag-center-cols-container') as HTMLElement;
                    if (contentContainer) {
                        const contentRect = contentContainer.getBoundingClientRect();
                        actualScrollWidth = contentRect.width;
                    }

                    // For vertical scroll, use scrollHeight from the element
                    if (gridBody instanceof HTMLElement) {
                        actualScrollHeight = gridBody.scrollHeight;
                    }
                }

                console.log("[Scrollbar Debug] Alternative dimensions:", {
                    gridRect: {
                        width: gridRect.width,
                        height: gridRect.height,
                    },
                    actualScrollWidth,
                    actualClientWidth,
                    actualScrollHeight,
                    actualClientHeight,
                });
            }
        }

        // Vertical scrollbar calculations
        const thumbHeight =
            actualScrollHeight > actualClientHeight
                ? Math.max(
            20,
                      (actualClientHeight / actualScrollHeight) *
                          actualClientHeight
                  )
                : 20;
        const thumbTop =
            actualScrollHeight > actualClientHeight
                ? (scrollTop / (actualScrollHeight - actualClientHeight)) *
                  (actualClientHeight - thumbHeight)
                : 0;

        // Horizontal scrollbar calculations
        const thumbWidth =
            actualScrollWidth > actualClientWidth
                ? Math.max(
            20,
                      (actualClientWidth / actualScrollWidth) *
                          actualClientWidth
                  )
                : 20;
        const thumbLeft =
            actualScrollWidth > actualClientWidth
                ? (scrollLeft / (actualScrollWidth - actualClientWidth)) *
                  (actualClientWidth - thumbWidth)
                : 0;

        setScrollbarState((prev) => ({
            ...prev,
            scrollTop,
            scrollHeight: actualScrollHeight,
            clientHeight: actualClientHeight,
            thumbHeight,
            thumbTop: Math.max(
                0,
                Math.min(thumbTop, actualClientHeight - thumbHeight)
            ),
            scrollLeft,
            scrollWidth: actualScrollWidth,
            clientWidth: actualClientWidth,
            thumbWidth,
            thumbLeft: Math.max(
                0,
                Math.min(thumbLeft, actualClientWidth - thumbWidth)
            ),
        }));
    }, []);

    // Sync native container scroll with AG Grid viewport (mouse wheel, drag on bars)
    useEffect(() => {
        if (useExternalScrollViewport) {
            // Parent Portfolio viewport handles scroll; skip syncing here
            return;
        }
        const host = containerRef.current;
        const body = tableBodyRef.current as HTMLElement | null;
        if (!host || !body) return;

        const onHostScroll = () => {
            if (!tableBodyRef.current) return;
            isSyncingScrollRef.current = true;
            tableBodyRef.current.scrollTop = host.scrollTop;
            tableBodyRef.current.scrollLeft = host.scrollLeft;
            isSyncingScrollRef.current = false;
            updateScrollbarState();
        };

        const onBodyScroll = () => {
            if (!containerRef.current || isSyncingScrollRef.current) return;
            isSyncingScrollRef.current = true;
            containerRef.current.scrollTop = body.scrollTop;
            containerRef.current.scrollLeft = body.scrollLeft;
            isSyncingScrollRef.current = false;
        };

        host.addEventListener("scroll", onHostScroll, { passive: true });
        body.addEventListener("scroll", onBodyScroll, { passive: true });
        return () => {
            host.removeEventListener("scroll", onHostScroll as EventListener);
            body.removeEventListener("scroll", onBodyScroll as EventListener);
        };
    }, [positions.length, componentId, updateScrollbarState]);

    // Update scrollbar when positions change
    useEffect(() => {
        if (positions.length > 0 && tableBodyRef.current) {
            console.log(
                "[PortfolioTableAGGrid] Positions loaded, updating scrollbar"
            );
            setTimeout(() => {
                updateScrollbarState();
            }, 200);
        }
    }, [positions.length, updateScrollbarState]);

    const handleScrollbarMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling up and triggering other handlers
        const rect = scrollbarRef.current?.getBoundingClientRect();
        if (!rect || !tableBodyRef.current) return;

        const y = e.clientY - rect.top;
        const { clientHeight, scrollHeight } = tableBodyRef.current;
        const scrollTop =
            scrollHeight > clientHeight
                ? (y / clientHeight) * (scrollHeight - clientHeight)
                : 0;

        tableBodyRef.current.scrollTop = scrollTop;
        // Update scrollbar state after setting scroll position
        updateScrollbarState();
        setScrollbarState((prev) => ({
            ...prev,
            isDragging: true,
            dragStartY: e.clientY,
            dragStartScrollTop: scrollTop,
        }));
    }, [updateScrollbarState]);

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
            e.stopPropagation(); // Prevent event from bubbling up and triggering other handlers
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
            // Update scrollbar state after setting scroll position
            updateScrollbarState();
        setScrollbarState((prev) => ({
            ...prev,
            isDraggingHorizontal: true,
            dragStartX: e.clientX,
            dragStartScrollLeft: scrollLeft,
        }));
        },
        [updateScrollbarState]
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
        const sumKeys = new Set<string>(((localConfig?.filters || {}).sumColumns || []) as string[]);

        // If no config loaded yet, use fallback columns
        if (cfgCols.length === 0) {
            console.log("[AG Grid] No config loaded, using fallback columns");
            return [
                { field: "trade_id", headerName: "Trade ID", headerTooltip: "Trade ID", minWidth: 80 },
                { field: "trade_type", headerName: "Type", headerTooltip: "Type", minWidth: 80 },
                { field: "quantity", headerName: "Quantity", headerTooltip: "Quantity", minWidth: 90 },
                {
                    field: "trade_price",
                    headerName: "Trade Price",
                    headerTooltip: "Trade Price",
                    minWidth: 110,
                },
                { field: "price", headerName: "Price", headerTooltip: "Price", minWidth: 90 },
                { field: "underlying", headerName: "Underlying", headerTooltip: "Underlying", minWidth: 120 },
                { field: "ticker", headerName: "Ticker", headerTooltip: "Ticker", minWidth: 160 },
                {
                    field: "trade_currency",
                    headerName: "Trade Currency",
                    headerTooltip: "Trade Currency",
                    minWidth: 90,
                },
                {
                    field: "settlement_currency",
                    headerName: "Settlement Currency",
                    headerTooltip: "Settlement Currency",
                    minWidth: 120,
                },
                { field: "itd_pnl", headerName: "ITD PnL", headerTooltip: "ITD PnL", minWidth: 110 },
                { field: "ytd_pnl", headerName: "YTD PnL", headerTooltip: "YTD PnL", minWidth: 110 },
                { field: "mtd_pnl", headerName: "MTD PnL", headerTooltip: "MTD PnL", minWidth: 110 },
                { field: "dtd_pnl", headerName: "DTD PnL", headerTooltip: "DTD PnL", minWidth: 110 },
            ];
        }

        console.log("[AG Grid] Using config columns:", cfgCols.length);
        return cfgCols.map((c) => {
            const groupIndex = (localConfig?.grouping || []).indexOf(c.key);
            const isGrouped = groupIndex >= 0;
            return {
            field: c.key,
            headerName: c.label,
            headerTooltip: c.label,
            // allow AG Grid to auto-size based on content/header
            minWidth: 70,
            width: c.size || c.width || undefined,
            hide: !c.visible,
            resizable: true,
            sortable: true,
            filter: true,
            // Disable enterprise-only features in community build
            aggFunc:
                ENTERPRISE_FEATURES
                    ? (sumKeys.has(c.key)
                        ? "sum"
                        : (c.key === "trade_id" ? "concatIds" : undefined))
                    : undefined,
            rowGroup: ENTERPRISE_FEATURES ? isGrouped : false,
            rowGroupIndex: ENTERPRISE_FEATURES && isGrouped ? groupIndex : undefined,
            cellRenderer: (params: { value: unknown }) =>
                formatValue(params.value, c.key),
            };
        });
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
                console.info("[AG Grid] onGridReady: edit state", {
                    isEditing,
                    externalEditing,
                });
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

                const totalWidth = (Array.isArray(displayedCols) ? displayedCols : []).reduce((sum, col) => {
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
                    displayedCols: Array.isArray(displayedCols) ? displayedCols.length : 0,
                    totalWidth,
                    viewportW,
                    viewportH,
                    rowCount: params.api.getDisplayedRowCount(),
                });

                // Add direct DOM event listener to detect contextmenu events on rows
                // This works with AG Grid Community Edition (free version)
                const gridElement = containerRef.current?.querySelector('.ag-theme-alpine') as HTMLElement;
                const gridBody = gridElement?.querySelector('.ag-body-viewport') as HTMLElement;

                if (gridBody) {
                    const handleDirectContextMenu = (e: MouseEvent) => {
                        const target = e.target as HTMLElement;
                        const rowElement = target?.closest('.ag-row') as HTMLElement | null;

                        if (rowElement) {
                            const rowIndex = parseInt(rowElement.getAttribute('row-index') || '-1');
                            if (rowIndex >= 0) {
                                try {
                                    const rowNode = params.api.getDisplayedRowAtIndex(rowIndex);
                                    const rowData = rowNode?.data as PortfolioPosition | null;
                                    if (rowData) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setContextMenuRow(rowData);
                                        contextMenuRowRef.current = rowData;
                                        setContextMenu({
                                            isOpen: true,
                                            position: { x: e.clientX, y: e.clientY },
                                        });
                                    }
                                } catch (err) {
                                    // Silently handle error
                                }
                            }
                        }
                        // If not on a row, let document handler suppress browser menu
                    };
                    // Use capture phase to catch events before they bubble
                    gridBody.addEventListener('contextmenu', handleDirectContextMenu, true);
                }

                // Auto-size only when NOT in edit mode (avoid fighting user resizes)
                try {
                    if (!isEditing) {
                    if (
                            params.api &&
                            typeof params.api.autoSizeAllColumns === "function"
                    ) {
                            params.api.autoSizeAllColumns();
                        }
                    } else {
                        console.info("[AG Grid] Skipping autoSizeAllColumns (edit mode)");
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
                        updateScrollbarState();

                        // Listen for scroll events to update scrollbar
                        el.addEventListener("scroll", updateScrollbarState);


                        // Listen for resize events to update scrollbar
                        const resizeObserver = new ResizeObserver(() => {
                            setTimeout(() => {
                                updateScrollbarState();
                                // Force re-render to update scrollbar dimensions
                                setScrollbarState((prev) => ({ ...prev }));
                            }, 50);
                        });
                        resizeObserver.observe(el);

                        // Also observe the portfolio component for size changes
                        const portfolioComponent =
                            document.querySelector(
                                `[data-component-id="${
                                    componentId || "default"
                                }"]`
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
                            el.removeEventListener("scroll", updateScrollbarState);
                            resizeObserver.disconnect();
                        };
                    }
                });
            } catch (error) {
                console.error("[AG Grid] Error in onGridReady:", error);
            }
        }, 100); // Short delay to ensure grid DOM is ready

        // No automatic size-to-fit; user controls widths and order while editing
    };

    const handleColumnToggle = (columnKey: string) => {
        if (!gridApi) return;
        try {
            const colState = gridApi.getColumnState().find((s) => s.colId === columnKey);
            const prevVisible = !(colState?.hide ?? false);
            const newVisible = !prevVisible;
            // Apply directly via column state (more robust across scenarios)
            gridApi.applyColumnState({
                state: [{ colId: columnKey, hide: !newVisible }],
                defaultState: {},
            });
            // Reflect in local config so the checkbox state updates immediately
            setLocalConfig((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    columns: prev.columns.map((c) =>
                        c.key === columnKey ? { ...c, visible: newVisible } : c
                    ),
                };
            });
            // Persist immediately so a refresh reflects the cloud value
            // Defer to next tick to allow local state to settle
            setTimeout(() => {
                saveTableConfig();
            }, 0);
        } catch (e) {
            console.warn("[AG Grid] handleColumnToggle failed", e);
        }
    };

    // Apply default sort selection to grid and local config
    const applyDefaultSort = useCallback((columnKey: string, direction: "asc" | "desc") => {
        if (!gridApi || !localConfig) return;
        setLocalConfig((prev) => prev ? { ...prev, sorting: { column: columnKey, direction } } : prev);
        try {
            gridApi.applyColumnState({
                defaultState: { sort: null },
                state: [
                    { colId: columnKey, sort: direction },
                ],
            });
        } catch (e) {
            console.warn("[AG Grid] applyColumnState(sort) failed", e);
        }
    }, [gridApi, localConfig]);

    // Toggle PnL total visibility (maps to filters.sumColumns; backend will normalize summary accordingly)
    const togglePnlTotal = (key: "itd_pnl" | "ytd_pnl" | "mtd_pnl" | "dtd_pnl") => {
        setLocalConfig((prev) => {
            if (!prev) return prev;
            const current = new Set<string>((prev.filters?.sumColumns || []) as string[]);
            if (current.has(key)) current.delete(key); else current.add(key);
            const next: TableConfig = {
                ...prev,
                filters: { ...(prev.filters || {}), sumColumns: Array.from(current) },
            } as TableConfig;
            // Persist using the computed next config to avoid race with async state
            setTimeout(() => {
                console.info("[PortfolioTableAGGrid] Totals toggled", {
                    key,
                    nextSumColumns: next.filters?.sumColumns,
                });
                saveTableConfig(next);
            }, 0);
            return next;
        });
    };

    // Toggle group-by for a column and update grid
    const toggleGroupBy = useCallback((columnKey: string) => {
        if (!gridApi) return;
        setLocalConfig((prev) => {
            if (!prev) return prev;
            const isGrouped = prev.grouping.includes(columnKey);
            const nextGrouping = isGrouped
                ? prev.grouping.filter((k) => k !== columnKey)
                : [...prev.grouping, columnKey];
            // Apply to grid
            try {
                const state = nextGrouping.map((k, idx) => ({ colId: k, rowGroup: true, rowGroupIndex: idx }));
                gridApi.applyColumnState({
                    defaultState: { rowGroup: false },
                    state,
                });
            } catch (e) {
                console.warn("[AG Grid] applyColumnState(rowGroup) failed", e);
            }
            const next = { ...prev, grouping: nextGrouping } as TableConfig;
            // Persist right after user toggles grouping
            setTimeout(() => {
                console.info("[PortfolioTableAGGrid] Grouping toggled", {
                    nextGrouping,
                    columnKey,
                });
                saveTableConfig(next);
            }, 0);
            return next;
        });
    }, [gridApi]);

    // Set aggregation function for a column
    const setAggregation = useCallback((columnKey: string, agg: "sum" | "avg" | "min" | "max" | "count" | "none") => {
        if (!gridApi) return;
        setLocalConfig((prev) => {
            if (!prev) return prev;
            const nextAggs = { ...(prev.aggregations || {}) } as Record<string, any>;
            if (agg === "none") delete nextAggs[columnKey];
            else nextAggs[columnKey] = agg;
            try {
                gridApi.applyColumnState({
                    state: [ { colId: columnKey, aggFunc: agg === "none" ? undefined : agg } ],
                    defaultState: {},
                });
            } catch (e) {
                console.warn("[AG Grid] applyColumnState(aggFunc) failed", e);
            }
            return { ...prev, aggregations: nextAggs };
        });
    }, [gridApi]);

    const tradeTypeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        positions.forEach((p) => {
            counts[p.trade_type] = (counts[p.trade_type] || 0) + 1;
        });
        return counts;
    }, [positions]);

    // Client-side aggregation by ticker (with comma-concatenated trade_ids)
    const aggregatedPositions = useMemo(() => {
        const aggregateByTicker = !!(localConfig?.filters && (localConfig.filters as any).aggregateByTicker);
        if (!aggregateByTicker) return positions;
        if (!positions || positions.length === 0) return positions;
        const byTicker = new Map<string, any>();
        const priceKeys = ["price", "trade_price", "eoy_price", "eom_price", "eod_price"] as const;
        for (const row of positions as any[]) {
            const t = row.ticker ? String(row.ticker).trim() : null;
            if (!t) {
                // Skip rows without ticker for aggregation; include as-is under a pass-through bucket
                const key = `__no_ticker__${row.trade_id ?? Math.random()}`;
                byTicker.set(key, { ...row });
                continue;
            }
            if (!byTicker.has(t)) {
                byTicker.set(t, {
                    ...row,
                    trade_id: row.trade_id != null && row.trade_id !== "" ? String(row.trade_id) : "",
                    quantity: Number(row.quantity || 0),
                    itd_pnl: Number(row.itd_pnl || 0),
                    ytd_pnl: Number(row.ytd_pnl || 0),
                    mtd_pnl: Number(row.mtd_pnl || 0),
                    dtd_pnl: Number(row.dtd_pnl || 0),
                    _priceWsum: Object.fromEntries(priceKeys.map(k => [k, 0])) as Record<string, number>,
                    _priceW: Object.fromEntries(priceKeys.map(k => [k, 0])) as Record<string, number>,
                });
                // Initialize sums for first row
                const acc = byTicker.get(t);
                const w0 = Number(row.quantity || 0);
                for (const k of priceKeys) {
                    const v = row[k];
                    if (typeof v === "number" && !Number.isNaN(v)) {
                        acc._priceWsum[k] += v * w0;
                        acc._priceW[k] += w0;
                        acc[k] = v; // seed with first numeric value
                    }
                }
                continue;
            }
            const acc = byTicker.get(t);
            // Concatenate trade ids
            const addId = row.trade_id != null && row.trade_id !== "" ? String(row.trade_id) : "";
            if (addId) {
                if (!acc.trade_id) acc.trade_id = addId;
                else if (!String(acc.trade_id).split(",").includes(addId)) acc.trade_id = `${acc.trade_id},${addId}`;
            }
            // Sum selected numeric fields
            acc.quantity = Number(acc.quantity || 0) + Number(row.quantity || 0);
            acc.itd_pnl = Number(acc.itd_pnl || 0) + Number(row.itd_pnl || 0);
            acc.ytd_pnl = Number(acc.ytd_pnl || 0) + Number(row.ytd_pnl || 0);
            acc.mtd_pnl = Number(acc.mtd_pnl || 0) + Number(row.mtd_pnl || 0);
            acc.dtd_pnl = Number(acc.dtd_pnl || 0) + Number(row.dtd_pnl || 0);
            // Weighted-average price-like fields by quantity
            const w = Number(row.quantity || 0);
            for (const k of priceKeys) {
                const v = row[k];
                if (typeof v === "number" && !Number.isNaN(v)) {
                    acc._priceWsum[k] += v * w;
                    acc._priceW[k] += w;
                }
            }
            // Preserve underlying/ticker from key
            acc.underlying = acc.underlying || row.underlying;
            acc.ticker = t;
            byTicker.set(t, acc);
        }
        // Finalize weighted averages into public fields
        const result = Array.from(byTicker.values()).map((acc) => {
            if (acc && acc._priceWsum && acc._priceW) {
                for (const k of Object.keys(acc._priceWsum)) {
                    const wsum = acc._priceWsum[k];
                    const wtot = acc._priceW[k];
                    if (wtot > 0) acc[k] = wsum / wtot;
                }
                delete acc._priceWsum;
                delete acc._priceW;
            }
            return acc;
        });
        return result;
    }, [positions, localConfig?.filters]);

    // Footer diagnostics
    const footerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const logPositions = () => {
            const footer = footerRef.current;
            const container = containerRef.current;
            if (!footer || !container) return;
            const fRect = footer.getBoundingClientRect();
            const cRect = container.getBoundingClientRect();
            // find nearest scrollable parent
            let node: HTMLElement | null = container;
            let scrollParent: HTMLElement | null = null;
            while (node && node.parentElement) {
                const style = window.getComputedStyle(node.parentElement);
                if (/(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflow)) {
                    scrollParent = node.parentElement as HTMLElement;
                    break;
                }
                node = node.parentElement as HTMLElement;
            }
            const spRect = scrollParent ? scrollParent.getBoundingClientRect() : null;
            console.info("[PortfolioTableAGGrid] Footer diagnostics", {
                componentId: componentId || "default",
                footerRect: { top: fRect.top, bottom: fRect.bottom, height: fRect.height },
                containerRect: { top: cRect.top, bottom: cRect.bottom, height: cRect.height },
                scrollParentTag: scrollParent?.tagName || null,
                scrollParentRect: spRect ? { top: spRect.top, bottom: spRect.bottom, height: spRect.height } : null,
                containerStyles: window.getComputedStyle(container).cssText?.slice(0, 200),
            });
        };
        logPositions();
        window.addEventListener("resize", logPositions);
        document.addEventListener("scroll", logPositions, true);
        return () => {
            window.removeEventListener("resize", logPositions);
            document.removeEventListener("scroll", logPositions, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Community totals: compute footer based on selected sum columns and first grouping key
    const pinnedTotals = useMemo(() => {
        const keys = (localConfig?.filters?.sumColumns || []) as string[];
        if (!positions || positions.length === 0) return { rows: [] as any[], keys };
        // If no aggregation columns selected, do not show footer
        if (!keys || keys.length === 0) return { rows: [] as any[], keys };

        const groupKey = (localConfig?.grouping && localConfig.grouping.length > 0)
            ? localConfig.grouping[0]
            : null;

        const init = () => {
            const o: Record<string, number> = {} as any;
            keys.forEach((k) => (o[k] = 0));
            return o;
        };

        const grand = init();
        const rows: any[] = [];

        if (groupKey) {
            // Aggregate by first grouping key
            const map = new Map<string, Record<string, number>>();
            positions.forEach((row) => {
                const groupVal = String((row as any)[groupKey] ?? "");
                if (!map.has(groupVal)) map.set(groupVal, init());
                const acc = map.get(groupVal)!;
                keys.forEach((k) => {
                    const v = (row as any)[k];
                    if (typeof v === "number" && !Number.isNaN(v)) acc[k] += v;
                });
                keys.forEach((k) => {
                    const v = (row as any)[k];
                    if (typeof v === "number" && !Number.isNaN(v)) grand[k] += v;
                });
            });
            // Emit rows per group
            for (const [val, acc] of map.entries()) {
                rows.push({ trade_type: `Σ ${val}`, ...acc });
            }
        } else {
            // No grouping - accumulate grand only
            positions.forEach((row) => {
                keys.forEach((k) => {
                    const v = (row as any)[k];
                    if (typeof v === "number" && !Number.isNaN(v)) grand[k] += v;
                });
            });
        }

        // Always push grand total
        rows.push({ trade_type: "Σ Total", ...grand });

        console.info("[PortfolioTableAGGrid] Computed footer totals", { groupKey, keys, rowsCount: rows.length });
        return { rows, keys };
    }, [positions, localConfig?.filters?.sumColumns, localConfig?.grouping]);

    // Broadcast totals to parent (Portfolio) so it can render a fixed footer
    useEffect(() => {
        try {
            const detail = {
                componentId: componentId || "default",
                rows: pinnedTotals.rows,
                keys: pinnedTotals.keys,
            };
            window.dispatchEvent(
                new CustomEvent("portfolio:totals", { detail })
            );
            console.info("[PortfolioTableAGGrid] Dispatched totals to parent", detail);
            // Also broadcast raw positions for notional component
            window.dispatchEvent(
                new CustomEvent("portfolio:positions", {
                    detail: {
                        componentId: componentId || "default",
                        positions: positions || [],
                    },
                })
            );
        } catch (e) {
            console.warn("[PortfolioTableAGGrid] Failed to dispatch totals", e);
        }
    }, [pinnedTotals, componentId]);

    // Buffer for early notional changes before config loads
    const pendingNotionalRef = useRef<Partial<TableConfig["notional"]> | null>(null);

    // Listen for parent Notional control updates and persist into tableConfig
    useEffect(() => {
        const onNotionalControl = (e: Event) => {
            try {
                const detail = (e as CustomEvent).detail || {};
                if ((componentId || "default") !== detail.componentId) return;
                const incoming = (detail.notional || {}) as Partial<TableConfig["notional"]>;
                console.info("[AG Grid Notional] control received", { incoming, componentId });
                if (!localConfig) {
                    // Config not ready yet; buffer and apply once loaded
                    pendingNotionalRef.current = {
                        ...(pendingNotionalRef.current || {}),
                        ...incoming,
                    };
                    console.info("[AG Grid Notional] buffered change (config not ready)", pendingNotionalRef.current);
                    return;
                }
                const next: TableConfig = {
                    ...localConfig,
                    notional: {
                        ...(localConfig.notional || {}),
                        ...incoming,
                    },
                } as any;
                setLocalConfig(next);
                console.info("[AG Grid Notional] saving merged notional", next.notional);
                saveTableConfig(next);
            } catch (_) {}
        };
        window.addEventListener("portfolio:notional-control", onNotionalControl as EventListener);
        return () => {
            window.removeEventListener("portfolio:notional-control", onNotionalControl as EventListener);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localConfig, componentId]);

    // When config becomes available, apply any buffered notional changes and persist
    useEffect(() => {
        if (!localConfig || !pendingNotionalRef.current) return;
        const buffered = pendingNotionalRef.current;
        pendingNotionalRef.current = null;
        console.info("[AG Grid Notional] applying buffered changes", buffered);
        const next: TableConfig = {
            ...localConfig,
            notional: {
                ...(localConfig.notional || {}),
                ...buffered,
            },
        } as any;
        setLocalConfig(next);
        console.info("[AG Grid Notional] saving after buffer apply", next.notional);
        saveTableConfig(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localConfig]);

    // Broadcast current notional settings whenever localConfig changes so parent can reflect UI state
    useEffect(() => {
        try {
            const enabled = !!(localConfig?.notional?.enabled ?? (localConfig?.notional?.placement !== "off"));
            window.dispatchEvent(
                new CustomEvent("portfolio:notional-updated", {
                    detail: {
                        componentId: componentId || "default",
                        enabled,
                        align: (localConfig?.notional?.align || "left"),
                        showFX: !!localConfig?.notional?.showFX,
                        showFXOptions: !!localConfig?.notional?.showFXOptions,
                        showTotal: !!localConfig?.notional?.showTotal,
                        showFxTotals: !!localConfig?.notional?.showFxTotals,
                        showFxOptionsTotals: !!localConfig?.notional?.showFxOptionsTotals,
                    },
                })
            );
        } catch (_) {}
    }, [localConfig?.notional?.enabled, localConfig?.notional?.placement, localConfig?.notional?.align, localConfig?.notional?.showFX, localConfig?.notional?.showFXOptions, localConfig?.notional?.showTotal, localConfig?.notional?.showFxTotals, localConfig?.notional?.showFxOptionsTotals, componentId]);

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
                {/* Footer is rendered by parent; child dispatches totals via window event */}
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

            {/* Edit Controls - visible only while editing */}
            {isEditing && localConfig && (
                <div
                    className="mb-4 rounded"
                    style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 300,
                        background: safeTheme.surface,
                        border: `1px solid ${safeTheme.border}`,
                    }}
                >
                    {/* Tabs header */}
                    <div
                        className="flex items-center"
                        style={{
                            borderBottom: `1px solid ${safeTheme.border}`,
                        }}
                    >
                        {editTabs.map(tab => (
                                <button
                                key={tab.k}
                                onClick={() => setActiveEditTab(tab.k)}
                                style={{
                                    padding: "8px 12px",
                                    background: activeEditTab===tab.k ? safeTheme.surfaceAlt : "transparent",
                                    color: safeTheme.text,
                                    borderRight: `1px solid ${safeTheme.border}`,
                                    cursor: "pointer",
                                }}
                            >{tab.t}</button>
                        ))}
                    </div>

                    {/* Tabs body */}
                    <div className="p-3" style={{ overflowX: "visible" }}>
                        {activeEditTab === "columns" && (
                    <div onMouseDown={(e) => { e.stopPropagation(); clog("[ColumnsDrag] panel mousedown swallowed"); }} ref={columnsPanelRef}>
                        {/* Columns tag list */}
                    <div
                        style={{
                            display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(120px, max-content))",
                                gap: 6,
                                cursor: isDraggingColumnTag ? "grabbing" : undefined,
                                alignItems: "stretch",
                                justifyItems: "stretch",
                                gridAutoRows: "minmax(28px, auto)",
                        }}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                            onDrop={(e) => {
                                // If dropped on the empty area of the container, clear drag state
                                clog("[ColumnsDrag] drop on container (no target)");
                                dragColIndexRef.current = null;
                                setIsDraggingColumnTag(false);
                                try { (document.body as any).style.cursor = ""; } catch (_) {}
                            }}
                        >
                        {localConfig.columns.map((col, idx) => (
                            <label
                                key={col.key}
                                className="flex items-center gap-2 text-sm"
                                style={{
                                    cursor: isDraggingColumnTag ? "grabbing" : "grab",
                                    userSelect: "none",
                                            padding: "4px 6px",
                        fontSize: 12,
                                    borderRadius: 6,
                                    border: `1px solid ${safeTheme.border}`,
                                    background: safeTheme.surfaceAlt,
                                    // subtle hint while dragging
                                    opacity: dragColIndexRef.current === idx ? 0.8 : 1,
                                }}
                                draggable
                                onMouseEnter={(e) => {
                                    try {
                                        const labelEl = e.currentTarget as HTMLLabelElement;
                                        const spanEl = labelEl.querySelector('span');
                                        const inputEl = labelEl.querySelector('input');
                                        const isTruncated = !!(spanEl && (spanEl as HTMLElement).scrollWidth > (spanEl as HTMLElement).clientWidth);
                                        const titleText = isTruncated ? col.label : "";
                                        if (spanEl) (spanEl as HTMLElement).title = titleText;
                                        if (inputEl) (inputEl as HTMLInputElement).title = titleText;
                                        labelEl.title = titleText;
                                    } catch (_) {}
                                }}
                                onMouseLeave={(e) => {
                                    try {
                                        const labelEl = e.currentTarget as HTMLLabelElement;
                                        const spanEl = labelEl.querySelector('span');
                                        const inputEl = labelEl.querySelector('input');
                                        if (spanEl) (spanEl as HTMLElement).title = "";
                                        if (inputEl) (inputEl as HTMLInputElement).title = "";
                                        labelEl.title = "";
                                    } catch (_) {}
                                }}
                                onDragStart={(e) => {
                                    e.stopPropagation();
                                    dragColIndexRef.current = idx;
                                    clog("[ColumnsDrag] dragStart", { fromIndex: idx, key: col.key });
                                    try { e.dataTransfer?.setData("text/plain", String(idx)); } catch (_) {}
                                    try { e.dataTransfer!.effectAllowed = "move"; } catch (_) {}
                                    setIsDraggingColumnTag(true);
                                    try { (document.body as any).style.cursor = "grabbing"; } catch (_) {}
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    try { e.dataTransfer!.dropEffect = "move"; } catch (_) {}
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const fromIndex = dragColIndexRef.current;
                                    dragColIndexRef.current = null;
                                    const toIndex = idx;
                                    clog("[ColumnsDrag] drop", { fromIndex, toIndex, key: col.key });
                                    if (fromIndex === null || fromIndex === toIndex) return;
                                    setLocalConfig((prev) => {
                                        if (!prev) return prev;
                                        const nextColumns = prev.columns.slice();
                                        const [moved] = nextColumns.splice(fromIndex, 1);
                                        nextColumns.splice(toIndex, 0, moved);
                                        const next: TableConfig = { ...prev, columns: nextColumns } as TableConfig;
                                        // Apply order to AG Grid immediately, if available
                                        try {
                                            if (gridApi && !(gridApi as any).isDestroyed?.()) {
                                                const state = nextColumns.map((c, order) => ({ colId: c.key, order } as any));
                                                (gridApi as any).applyColumnState({ state, applyOrder: true });
                                                clog("[ColumnsDrag] applied column order to grid", state);
                                            }
                                        } catch (_) {}
                                        // Persist new order
                                        setTimeout(() => { clog("[ColumnsDrag] saving new order"); saveTableConfig(next); }, 0);
                                        return next;
                                    });
                                    setIsDraggingColumnTag(false);
                                    try { (document.body as any).style.cursor = ""; } catch (_) {}
                                }}
                                onDragEnd={() => { clog("[ColumnsDrag] dragEnd"); dragColIndexRef.current = null; setIsDraggingColumnTag(false); try { (document.body as any).style.cursor = ""; } catch (_) {} }}
                            >
                                <input
                                    type="checkbox"
                                    checked={col.visible}
                                    onClick={(e) => { e.stopPropagation(); clog("[ColumnsDrag] checkbox click", { key: col.key }); }}
                                    onChange={(e) => { e.stopPropagation(); clog("[ColumnsDrag] checkbox change", { key: col.key, next: !col.visible }); handleColumnToggle(col.key); }}
                                            style={{ width: 14, height: 14, cursor: "pointer" }}
                                        />
                                <span
                                    style={{
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        width: "100%",
                                        boxSizing: "border-box",
                                        paddingRight: 6,
                                        cursor: isDraggingColumnTag ? "grabbing" : "grab",
                                    }}
                                    onMouseEnter={(e) => {
                                        try {
                                            const el = e.currentTarget as HTMLSpanElement;
                                            el.title = el.scrollWidth > el.clientWidth ? col.label : "";
                                        } catch (_) {}
                                    }}
                                >{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

                        {activeEditTab === "group" && (
                            <div
                                    style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                                    gap: 8,
                                }}
                            >
                                {/* Default Order By controls */}
                                <div
                                    className="flex items-center gap-2"
                                    style={{ gridColumn: "1 / -1", padding: "4px 6px", border: `1px solid ${safeTheme.border}`, borderRadius: 6, background: safeTheme.surfaceAlt, fontSize: 12 }}
                                >
                                    <span style={{ opacity: 0.9 }}>Default order by</span>
                                    <select
                                        value={localConfig.sorting?.column || ""}
                                        onChange={(e) => applyDefaultSort(e.target.value, localConfig.sorting?.direction || "asc")}
                                        style={{ background: safeTheme.surface, border: `1px solid ${safeTheme.border}`, padding: "4px 6px" }}
                                    >
                                        <option value="" disabled>Select column</option>
                                        {localConfig.columns.map(c => (
                                            <option key={c.key} value={c.key}>{c.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={localConfig.sorting?.direction || "asc"}
                                        onChange={(e) => applyDefaultSort(localConfig.sorting?.column || localConfig.columns[0]?.key, e.target.value as "asc" | "desc")}
                                        style={{ background: safeTheme.surface, border: `1px solid ${safeTheme.border}`, padding: "4px 6px" }}
                                    >
                                        <option value="asc">Ascending</option>
                                        <option value="desc">Descending</option>
                                    </select>
                                </div>
                                {/* Quick PnL totals toggles */}
                                <div
                                    className="flex items-center gap-2"
                                    style={{ gridColumn: "1 / -1", padding: "4px 6px", border: `1px solid ${safeTheme.border}`, borderRadius: 6, background: safeTheme.surfaceAlt, fontSize: 12 }}
                                >
                                    <span style={{ opacity: 0.9 }}>Totals:</span>
                                    {(["itd_pnl","ytd_pnl","mtd_pnl","dtd_pnl"] as const).map((k) => {
                                        const enabled = (localConfig.filters?.sumColumns || []).includes(k);
                                        return (
                                            <label key={k} className="flex items-center gap-1" style={{ cursor: "pointer", userSelect: "none" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={enabled}
                                                    onClick={(e) => { e.stopPropagation(); }}
                                                    onChange={(e) => { e.stopPropagation(); togglePnlTotal(k); }}
                                                    style={{ width: 14, height: 14, cursor: "pointer" }}
                                                />
                                                <span style={{ textTransform: "uppercase" }}>{k.replace("_pnl","")}</span>
                            </label>
                                        );
                                    })}
                                </div>
                                {/* Aggregate by Ticker (client-side) */}
                                <div
                                    className="flex items-center gap-2"
                                    style={{ gridColumn: "1 / -1", padding: "4px 6px", border: `1px solid ${safeTheme.border}`, borderRadius: 6, background: safeTheme.surfaceAlt, fontSize: 12 }}
                                >
                                    <label className="flex items-center gap-2" style={{ cursor: "pointer", userSelect: "none" }}>
                                        <input
                                            type="checkbox"
                                            checked={!!(localConfig.filters && (localConfig.filters as any).aggregateByTicker)}
                                            onClick={(e) => { e.stopPropagation(); }}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                setLocalConfig((prev) => {
                                                    if (!prev) return prev;
                                                    const nextFilters = { ...(prev.filters || {}) } as any;
                                                    nextFilters.aggregateByTicker = !nextFilters.aggregateByTicker;
                                                    const next = { ...prev, filters: nextFilters } as TableConfig;
                                                    setTimeout(() => saveTableConfig(next), 0);
                                                    return next;
                                                });
                                            }}
                                            style={{ width: 14, height: 14, cursor: "pointer" }}
                                        />
                                        <span>Aggregate by Ticker (sum position, weighted avg prices)</span>
                                    </label>
                                </div>
                                {localConfig.columns.map((col) => {
                                    const isGrouped = localConfig.grouping.includes(col.key);
                                    const currentAgg = (localConfig.aggregations && localConfig.aggregations[col.key]) || "none";
                                    return (
                                        <div
                                            key={col.key}
                                            className="flex items-center gap-2 text-sm"
                                            style={{
                                                padding: "4px 6px",
                            fontSize: 12,
                                                borderRadius: 6,
                                                border: `1px solid ${safeTheme.border}`,
                                                background: safeTheme.surfaceAlt,
                                                alignItems: "center",
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isGrouped}
                                                onClick={(e) => { e.stopPropagation(); }}
                                                onChange={(e) => { e.stopPropagation(); toggleGroupBy(col.key); }}
                                                style={{ width: 14, height: 14, cursor: "pointer" }}
                                            />
                                            <span style={{
                                                minWidth: 100,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}>{col.label}</span>
                                            {/* Aggregation selector intentionally hidden per request when grouping is used */}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AG Grid Table driven by portfolio container native scrollbars */}
            <div
                id={`portfolio-container-${componentId || "default"}`}
                style={{
                    flex: 1,
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    overflow: "hidden", // Scrollbars are owned by outer Portfolio viewport
                }}
                className="portfolio-table-wrapper"
                ref={containerRef}
            >
                {/* AG Grid with hidden scrollbar */}
            <div
                className="ag-theme-alpine"
                style={{
                    flex: 1,
                    width: "100%",
                    height: "100%",
                    marginTop: isEditing ? `${Math.ceil(columnsPanelHeight)}px` : 0,
                    // reserve removed; parent handles footer spacing
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
                // Removed onContextMenuCapture - let AG Grid handlers manage context menu
            >
                <AgGridReact
                    rowData={aggregatedPositions}
                    columnDefs={columnDefs}
                    onGridReady={onGridReady}
                    animateRows={true}
                    autoGroupColumnDef={
                        (localConfig?.grouping && localConfig.grouping.length > 0)
                            ? { headerName: "Group", minWidth: 180 }
                            : undefined
                    }
                    // hide grid-level totals; we render a custom footer below
                    defaultColDef={{
                        resizable: true,
                        sortable: true,
                        filter: true,
                        minWidth: 70,
                        // Remove maxWidth cap so user can freely resize
                    }}
                    gridOptions={{
                        rowHeight: 30,
                        headerHeight: 40,
                        suppressScrollOnNewData: false,
                        suppressRowTransform: true,
                        // Hide built-in group footers; use custom footer instead
                        // Let grid grow to fit all rows (no vertical scrollbar inside grid)
                        domLayout: "autoHeight",
                        suppressAutoSize: false,
                        suppressColumnVirtualisation: false,
                        suppressRowVirtualisation: false,
                        getRowHeight: () => 30,
                        // Custom aggregation for trade IDs: comma concatenation
                        aggFuncs: ENTERPRISE_FEATURES
                            ? {
                                  concatIds: (params: { values: any[] }) =>
                                      (params?.values || [])
                                          .filter((v) => v !== null && v !== undefined && v !== "")
                                          .map((v) => String(v))
                                          .join(","),
                              }
                            : undefined,
                        // Force AG Grid to not render its own scrollbars
                            suppressHorizontalScroll: true,
                            alwaysShowHorizontalScroll: false,
                            alwaysShowVerticalScroll: false,
                        // Suppress AG Grid's default context menu; we handle row context manually
                        suppressContextMenu: true,
                        // Add cursor styling to rows to show they're interactive
                        getRowStyle: (params) => {
                            return {
                                cursor: 'context-menu',
                            };
                        },
                        // Add row-index attribute to rows for context menu detection
                        onFirstDataRendered: (params) => {
                            // Add row-index to all rendered rows using DOM query (more reliable)
                            setTimeout(() => {
                                if (gridApi && containerRef.current) {
                                    const allRows = containerRef.current.querySelectorAll('.ag-row');

                                    // Use DOM query as primary method (more reliable)
                                    allRows.forEach((row, idx) => {
                                        (row as HTMLElement).setAttribute('row-index', idx.toString());
                                    });

                                    // Also try AG Grid API as fallback
                                    try {
                                        const rowCount = gridApi.getDisplayedRowCount();
                                        for (let i = 0; i < rowCount; i++) {
                                            try {
                                                const rowElement = gridApi.getRowElement(i);
                                                if (rowElement) {
                                                    rowElement.setAttribute('row-index', i.toString());
                                                }
                                            } catch (err) {
                                                // API method might not be available
                                            }
                                        }
                                    } catch (err) {
                                        // API might not be available
                                    }
                                }
                            }, 200);
                        },
                        onRowDataUpdated: (params) => {
                            // Update row-index attributes when data changes
                            setTimeout(() => {
                                if (gridApi && containerRef.current) {
                                    const allRows = containerRef.current.querySelectorAll('.ag-row');

                                    // Use DOM query as primary method
                                    allRows.forEach((row, idx) => {
                                        (row as HTMLElement).setAttribute('row-index', idx.toString());
                                    });

                                    // Also try AG Grid API as fallback
                                    try {
                                        const rowCount = gridApi.getDisplayedRowCount();
                                        for (let i = 0; i < rowCount; i++) {
                                            try {
                                                const rowElement = gridApi.getRowElement(i);
                                                if (rowElement) {
                                                    rowElement.setAttribute('row-index', i.toString());
                                                }
                                            } catch (err) {
                                                // API method might not be available
                                            }
                                        }
                                    } catch (err) {
                                        // API might not be available
                                    }
                                }
                            }, 200);
                        },
                        }}
                    onCellContextMenu={(event) => {
                        const nativeEvent = event.event;
                        if (!nativeEvent) {
                            return;
                        }

                        nativeEvent.preventDefault();
                        nativeEvent.stopPropagation();
                        const rowData = (event.data || null) as PortfolioPosition | null;
                        if (!rowData) {
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                            setContextMenuRow(null);
                            contextMenuRowRef.current = null;
                            lastContextPositionRef.current = null;
                            return;
                        }
                        // Use functional update to ensure we get latest state
                        setContextMenuRow(rowData);
                        contextMenuRowRef.current = rowData;
                        lastContextPositionRef.current = {
                            x: nativeEvent.clientX,
                            y: nativeEvent.clientY,
                        };
                        setContextMenu({
                            isOpen: true,
                            position: { x: nativeEvent.clientX, y: nativeEvent.clientY },
                        });
                    }}
                    onCellMouseEnter={(event) => {
                        // Change cursor to context-menu on hover to show we can detect mouse events
                        if (event.event?.target) {
                            (event.event.target as HTMLElement).style.cursor = 'context-menu';
                        }
                    }}
                    onColumnResized={(e: ColumnResizedEvent) => {
                        // Only persist when resize has finished and in edit mode
                        if (!e.finished) {
                            console.debug("[AG Grid] resize in-progress", {
                                colId: (e.column as any)?.getColId?.() || (e as any)?.column?.colId,
                                isEditing,
                            });
                            return;
                        }
                        if (!isEditing) {
                            console.info("[AG Grid] resize finished but edit mode is OFF; not persisting", {
                                colId: (e.column as any)?.getColId?.() || (e as any)?.column?.colId,
                            });
                            return;
                        }
                        try {
                            if (!gridApi || !localConfig) return;
                            const state = gridApi.getColumnState();
                            console.info("[AG Grid] resize finished; persisting widths", {
                                isEditing,
                                changedColId: (e.column as any)?.getColId?.() || (e as any)?.column?.colId,
                                sampleState: state.slice(0, 3),
                            });
                            const updated = localConfig.columns.map((c) => {
                                const s = state.find((cs) => cs.colId === c.key);
                                return {
                                    ...c,
                                    width: s?.width || c.width,
                                    size: s?.width || c.size || c.width,
                                };
                            });
                            setLocalConfig((prev) => (prev ? { ...prev, columns: updated } : prev));
                        } finally {
                            queueSave();
                        }
                    }}
                    onColumnMoved={(e: ColumnMovedEvent) => {
                        queueSave();
                    }}
                    onColumnVisible={(e: ColumnVisibleEvent) => {
                        queueSave();
                    }}
                    onRowContextMenu={(event: any) => {
                        const nativeEvent: MouseEvent | undefined = event?.event;
                        if (!nativeEvent) {
                            return;
                        }
                        nativeEvent.preventDefault();
                        nativeEvent.stopPropagation();
                        const rowData = (event?.data || null) as PortfolioPosition | null;
                        if (!rowData) {
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                            setContextMenuRow(null);
                            contextMenuRowRef.current = null;
                            lastContextPositionRef.current = null;
                            return;
                        }
                        setContextMenuRow(rowData);
                        contextMenuRowRef.current = rowData;
                        lastContextPositionRef.current = {
                            x: nativeEvent.clientX,
                            y: nativeEvent.clientY,
                        };
                        setContextMenu({
                            isOpen: true,
                            position: { x: nativeEvent.clientX, y: nativeEvent.clientY },
                        });
                    }}
                    onCellClicked={() => {
                        if (contextMenu.isOpen) {
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                            setContextMenuRow(null);
                            contextMenuRowRef.current = null;
                            lastContextPositionRef.current = null;
                        }
                    }}
                    />
                {/* Totals footer is rendered by parent component */}

                    {/* Invisible sizing ghost ensures the container has real scroll ranges */}
                    {(() => {
                        const ghostId = `portfolio-scroll-ghost-${componentId || "default"}`;
                        // Ensure ghost div exists after first mount
                        if (typeof window !== "undefined") {
                            const host = containerRef.current;
                            if (host && !host.querySelector(`#${ghostId}`)) {
                                const ghost = document.createElement("div");
                                ghost.id = ghostId;
                                ghost.style.position = "absolute";
                                ghost.style.left = "0";
                                ghost.style.top = "0";
                                ghost.style.width = "0px";
                                ghost.style.height = "0px";
                                ghost.style.pointerEvents = "none";
                                ghost.style.opacity = "0";
                                host.appendChild(ghost);
                            }
                        }
                        return null;
                    })()}

                    {/* Disable custom vertical scrollbar: use native container scrollbars */}
                    {false && (() => {
                            // Find the actual portfolio component container
                            console.log(
                                "🔍 [DEBUG] Component Finding Process:",
                                {
                                    componentId: componentId || "default",
                                    step1_dataComponentId:
                                        document.querySelector(
                                            `[data-component-id="${
                                                componentId || "default"
                                            }"]`
                                        ),
                                    step2_portfolioCardBody:
                                        document.querySelector(
                                            ".portfolio-card-body"
                                        ),
                                    step3_portfolioCard: document.querySelector(
                                        '[class*="portfolio-card"]'
                                    ),
                                    step4_portfolio: document.querySelector(
                                        '[class*="portfolio"]'
                                    ),
                                    step5_tableContainer:
                                        document.getElementById(
                                            `portfolio-container-${
                                                componentId || "default"
                                            }`
                                        ),
                                }
                            );

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
                                }
                            );

                            // Calculate proper dimensions for vertical scrollbar based on table body, not component
                            const verticalComponentRect =
                                actualPortfolioComponent?.getBoundingClientRect();

                            // Find table container using componentId for THIS specific instance
                            const tableContainer = document.getElementById(`portfolio-container-${componentId || "default"}`);

                            // Find table body within THIS component's container
                            let tableBodyElement: Element | null = null;
                            if (tableContainer) {
                                tableBodyElement = tableContainer.querySelector('.ag-body-viewport');
                            }

                            // Fallback to using tableBodyRef
                            if (!tableBodyElement) {
                                tableBodyElement = tableBodyRef.current;
                            }

                            const tableBodyRect = tableBodyElement?.getBoundingClientRect();

                            // Find the table header that matches THIS table body
                            let tableHeader: Element | null = null;

                            if (tableContainer) {
                                // Find header within the same table container
                                tableHeader = tableContainer.querySelector('.ag-header');
                            } else if (tableBodyElement) {
                                // Fallback: find header within the same grid container as this table body
                                const gridContainer = tableBodyElement.closest('.ag-theme-alpine');
                                if (gridContainer) {
                                    tableHeader = gridContainer.querySelector('.ag-header');
                                }
                            }

                            // Last fallback if not found
                            if (!tableHeader && actualPortfolioComponent) {
                                const gridContainer = actualPortfolioComponent.querySelector('.ag-theme-alpine');
                                if (gridContainer) {
                                    tableHeader = gridContainer.querySelector('.ag-header');
                                }
                            }

                            const tableHeaderRect = tableHeader?.getBoundingClientRect();

                            const verticalScrollbarWidth = 16;
                            // Find the actual container element (portfolio-table-wrapper) for accurate positioning
                            let containerElement: Element | null = null;
                            if (tableBodyElement) {
                                containerElement = tableBodyElement.closest('.portfolio-table-wrapper');
                            }
                            const containerRect = containerElement?.getBoundingClientRect();

                            // Use the AG Grid table container as the source of truth for visible viewport
                            const containerRectForVertical = tableContainer?.getBoundingClientRect();

                            // Position scrollbar inside the container's visible right edge
                            const verticalScrollbarLeft = containerRectForVertical
                                ? containerRectForVertical.right - verticalScrollbarWidth
                                : (verticalComponentRect ? verticalComponentRect.right : (tableBodyRect ? tableBodyRect.right : 0));

                            // Start below the table header's bottom edge (align to header border)
                            const verticalScrollbarTop = (tableHeaderRect && containerRectForVertical)
                                ? tableHeaderRect.bottom
                                : (containerRectForVertical ? containerRectForVertical.top : (verticalComponentRect ? verticalComponentRect.top : 0));

                            // Height from header bottom to container bottom to hit the table's low border exactly
                            const verticalScrollbarHeight = (containerRectForVertical && tableHeaderRect)
                                ? Math.max(0, containerRectForVertical.bottom - tableHeaderRect.bottom)
                                : (tableBodyRect ? tableBodyRect.height : (verticalComponentRect ? verticalComponentRect.height : 0));

                            // Debug parent hierarchy and CSS for vertical scrollbar
                            const getParentHierarchyForVertical = (element: Element | null) => {
                                const hierarchy: any[] = [];
                                let current: Element | null = element;
                                while (current && hierarchy.length < 10) {
                                    const computedStyle = window.getComputedStyle(current);
                                    hierarchy.push({
                                        tagName: current.tagName,
                                        className: current.className,
                                        id: current.id,
                                        rect: current.getBoundingClientRect(),
                                        css: {
                                            position: computedStyle.position,
                                            transform: computedStyle.transform,
                                            overflow: computedStyle.overflow,
                                            overflowX: computedStyle.overflowX,
                                            overflowY: computedStyle.overflowY,
                                            left: computedStyle.left,
                                            top: computedStyle.top,
                                            width: computedStyle.width,
                                            height: computedStyle.height,
                                            padding: computedStyle.padding,
                                            margin: computedStyle.margin,
                                        }
                                    });
                                    current = current.parentElement;
                                }
                                return hierarchy;
                            };

                            // Debug: Portfolio component visible viewport with parent hierarchy
                            dlog(`[VerticalScrollbar] componentId="${componentId || "default"}"`, {
                                parentHierarchy: {
                                    tableBodyElement: tableBodyElement ? getParentHierarchyForVertical(tableBodyElement) : null,
                                    portfolioComponent: actualPortfolioComponent ? getParentHierarchyForVertical(actualPortfolioComponent) : null,
                                    containerElement: containerElement ? getParentHierarchyForVertical(containerElement) : null,
                                },
                                cloudDBConfig: {
                                    gridWidth,
                                    gridHeight,
                                    configuredViewSize: `${gridWidth} grid units × ${gridHeight} grid units`,
                                },
                                portfolioComponentViewport: {
                                    left: verticalComponentRect?.left,
                                    right: verticalComponentRect?.right,
                                    width: verticalComponentRect?.width,
                                    top: verticalComponentRect?.top,
                                    bottom: verticalComponentRect?.bottom,
                                    height: verticalComponentRect?.height,
                                    note: "Portfolio component's actual visible boundaries (from cloud DB config)",
                                },
                                tableBodyRect: {
                                    left: tableBodyRect?.left,
                                    right: tableBodyRect?.right,
                                    width: tableBodyRect?.width,
                                    top: tableBodyRect?.top,
                                    bottom: tableBodyRect?.bottom,
                                    height: tableBodyRect?.height,
                                    note: "Table content may extend beyond component viewport",
                                },
                                calculation: {
                                    method: "verticalComponentRect.right (portfolio component's visible right edge)",
                                    tableBodyRight: tableBodyRect?.right,
                                    portfolioComponentRight: verticalComponentRect?.right,
                                    positionDifference: tableBodyRect?.right && verticalComponentRect?.right ? tableBodyRect.right - verticalComponentRect.right : null,
                                    note: "NOW: Using portfolio component's visible viewport boundary (from cloud DB config)",
                                },
                                finalPosition: {
                                    left: verticalScrollbarLeft,
                                    top: verticalScrollbarTop,
                                    height: verticalScrollbarHeight,
                                },
                                verification: {
                                    rightEdgeMatchesComponentRight: Math.abs(verticalScrollbarLeft - (verticalComponentRect?.right || 0)) < 1,
                                    rightEdgeGap: verticalScrollbarLeft - (verticalComponentRect?.right || 0),
                                    tableVsComponentDifference: verticalComponentRect?.right && tableBodyRect?.right ? verticalComponentRect.right - tableBodyRect.right : null,
                                },
                            });

                            dlog(
                                "[VerticalScrollbar] analysis",
                                {
                                    componentId: componentId || "default",
                                    actualPortfolioComponent: {
                                        found: !!actualPortfolioComponent,
                                        tagName:
                                            actualPortfolioComponent?.tagName,
                                        className:
                                            actualPortfolioComponent?.className,
                                        id: actualPortfolioComponent?.id,
                                        rect: verticalComponentRect
                                            ? {
                                                  width: verticalComponentRect.width,
                                                  height: verticalComponentRect.height,
                                                  left: verticalComponentRect.left,
                                                  top: verticalComponentRect.top,
                                                  right: verticalComponentRect.right,
                                                  bottom: verticalComponentRect.bottom,
                                              }
                                            : null,
                                    },
                                    scrollbarCalculations: {
                                        scrollbarWidth: verticalScrollbarWidth,
                                        scrollbarLeft: verticalScrollbarLeft,
                                        scrollbarTop: verticalScrollbarTop,
                                        scrollbarHeight:
                                            verticalScrollbarHeight,
                                        tableContainer: {
                                            found: !!tableContainer,
                                            id: `portfolio-container-${componentId || "default"}`,
                                        },
                                        tableHeaderRect: tableHeaderRect
                                            ? {
                                                  top: tableHeaderRect.top,
                                                  bottom: tableHeaderRect.bottom,
                                                  height: tableHeaderRect.height,
                                              }
                                            : null,
                                        tableBodyRect: tableBodyRect
                                            ? {
                                                  top: tableBodyRect.top,
                                                  bottom: tableBodyRect.bottom,
                                                  height: tableBodyRect.height,
                                              }
                                            : null,
                                    },
                                    scrollbarState: {
                                        scrollHeight:
                                            scrollbarState.scrollHeight,
                                        clientHeight:
                                            scrollbarState.clientHeight,
                                        thumbHeight: scrollbarState.thumbHeight,
                                        thumbTop: scrollbarState.thumbTop,
                                        needsVerticalScroll:
                                            scrollbarState.scrollHeight >
                                            scrollbarState.clientHeight,
                                    },
                                }
                            );

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
                                        zIndex: 9999,
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
                    {false && (() => {
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
                                }
                            );

                            // Calculate proper dimensions for this specific portfolio component
                            const componentRect =
                                actualPortfolioComponent?.getBoundingClientRect();

                            // Find the table header to align horizontal scrollbar with its bottom border
                            // Scope to THIS specific component instance
                            let tableHeader: Element | null = null;

                            if (actualPortfolioComponent) {
                                // Try to find the table header within the component hierarchy
                                const gridContainer = actualPortfolioComponent.querySelector('.ag-theme-alpine') ||
                                                      actualPortfolioComponent.querySelector('[class*="ag-theme"]');
                                if (gridContainer) {
                                    tableHeader = gridContainer.querySelector('.ag-header');
                                } else {
                                    // Fallback: find the nearest ag-header starting from the component
                                    tableHeader = actualPortfolioComponent.closest('.portfolio-table-wrapper')?.querySelector('.ag-header') ||
                                                  actualPortfolioComponent.querySelector('.ag-header');
                                }
                            }

                            // Fallback to global query if still not found
                            if (!tableHeader) {
                                tableHeader = document.querySelector('.ag-header');
                            }

                            const tableHeaderRect = tableHeader?.getBoundingClientRect();

                            // Find table container using componentId for THIS specific instance
                            const tableContainer = document.getElementById(`portfolio-container-${componentId || "default"}`);

                            // Find table body within THIS component's container
                            let tableBodyElement: Element | null = null;
                            if (tableContainer) {
                                tableBodyElement = tableContainer.querySelector('.ag-body-viewport');
                            }

                            // Fallback to using tableBodyRef
                            if (!tableBodyElement) {
                                tableBodyElement = tableBodyRef.current;
                            }

                            // Get table body dimensions for scrollbar positioning using scoped element
                            const tableBodyRect = tableBodyElement?.getBoundingClientRect();

                            // Use the AG Grid container (the actual visible viewport) for scrollbar positioning
                            // The table container is what contains the visible table content
                            const portfolioComponentRect = tableContainer?.getBoundingClientRect();

                            // Find AG Grid's native horizontal scrollbar element to get its exact dimensions
                            let nativeHorizontalScrollbar: Element | null = null;
                            if (tableContainer) {
                                nativeHorizontalScrollbar = tableContainer.querySelector('.ag-body-horizontal-scroll-viewport') ||
                                                              tableContainer.querySelector('.ag-body-horizontal-scroll');
                            }
                            const nativeHorizontalScrollbarRect = nativeHorizontalScrollbar?.getBoundingClientRect();

                            // Determine scrollbar dimensions based on whether native scrollbar exists
                            const verticalScrollbarWidth = 16;
                            let scrollbarWidth: number;
                            let scrollbarLeft: number;
                            let scrollbarTop: number;

                            if (nativeHorizontalScrollbarRect) {
                                // Case 1: Native scrollbar exists → use its dimensions (exact positioning)
                                scrollbarWidth = nativeHorizontalScrollbarRect.width - verticalScrollbarWidth;
                                scrollbarLeft = nativeHorizontalScrollbarRect.left;
                                scrollbarTop = nativeHorizontalScrollbarRect.top;
                            } else {
                                // Case 2: No native scrollbar exists → use table container's visible boundaries
                                // The scrollbar should align with the actual visible AG Grid viewport
                                scrollbarWidth = portfolioComponentRect
                                    ? portfolioComponentRect.width - verticalScrollbarWidth  // Table container's visible width minus vertical scrollbar
                                    : (tableBodyRect ? tableBodyRect.width - verticalScrollbarWidth : 0);

                                scrollbarLeft = portfolioComponentRect
                                    ? portfolioComponentRect.left  // Align with table container's visible left edge
                                    : (tableBodyRect ? tableBodyRect.left : 0);
                                scrollbarTop = portfolioComponentRect
                                    ? portfolioComponentRect.bottom - 16  // Just below the table container's visible bottom edge
                                    : (tableBodyRect
                                          ? tableBodyRect.bottom - 16
                                          : (tableHeaderRect
                                                ? tableHeaderRect.bottom
                                                : (componentRect
                                                      ? componentRect.bottom - 16
                                                      : 0)));
                            }

                            // Debug parent hierarchy and CSS
                            const getParentHierarchy = (element: Element | null) => {
                                const hierarchy: any[] = [];
                                let current: Element | null = element;
                                while (current && hierarchy.length < 10) {
                                    const computedStyle = window.getComputedStyle(current);
                                    hierarchy.push({
                                        tagName: current.tagName,
                                        className: current.className,
                                        id: current.id,
                                        rect: current.getBoundingClientRect(),
                                        css: {
                                            position: computedStyle.position,
                                            transform: computedStyle.transform,
                                            overflow: computedStyle.overflow,
                                            overflowX: computedStyle.overflowX,
                                            overflowY: computedStyle.overflowY,
                                            left: computedStyle.left,
                                            top: computedStyle.top,
                                            width: computedStyle.width,
                                            height: computedStyle.height,
                                            padding: computedStyle.padding,
                                            margin: computedStyle.margin,
                                        }
                                    });
                                    current = current.parentElement;
                                }
                                return hierarchy;
                            };

                            // Debug per-instance positioning with parent hierarchy
                            dlog(`[HorizontalScrollbar] componentId="${componentId || "default"}"`, {
                                parentHierarchy: {
                                    tableBodyElement: tableBodyElement ? getParentHierarchy(tableBodyElement) : null,
                                    portfolioComponent: actualPortfolioComponent ? getParentHierarchy(actualPortfolioComponent) : null,
                                },
                                nativeScrollbar: {
                                    found: !!nativeHorizontalScrollbar,
                                    left: nativeHorizontalScrollbarRect?.left,
                                    top: nativeHorizontalScrollbarRect?.top,
                                    width: nativeHorizontalScrollbarRect?.width,
                                    height: nativeHorizontalScrollbarRect?.height,
                                    note: "Native AG Grid horizontal scrollbar dimensions (hidden, but used for positioning)",
                                },
                                portfolioComponentViewport: {
                                    left: portfolioComponentRect?.left,
                                    right: portfolioComponentRect?.right,
                                    width: portfolioComponentRect?.width,
                                    height: portfolioComponentRect?.height,
                                    top: portfolioComponentRect?.top,
                                    bottom: portfolioComponentRect?.bottom,
                                    note: "Table container's visible boundaries (AG Grid viewport)",
                                },
                                tableBodyRect: {
                                    left: tableBodyRect?.left,
                                    right: tableBodyRect?.right,
                                    top: tableBodyRect?.top,
                                    bottom: tableBodyRect?.bottom,
                                    width: tableBodyRect?.width,
                                    height: tableBodyRect?.height,
                                    note: "Table content may extend beyond component viewport",
                                },
                                scrollbarCalculated: {
                                    left: scrollbarLeft,
                                    top: scrollbarTop,
                                    width: scrollbarWidth,
                                note: nativeHorizontalScrollbarRect
                                    ? "Using native AG Grid scrollbar dimensions (exact position/width)"
                                    : "Using table container's visible boundaries (tableContainer.width/left)",
                                },
                                widthCalculation: {
                                    nativeScrollbarExists: !!nativeHorizontalScrollbarRect,
                                    nativeScrollbarWidth: nativeHorizontalScrollbarRect?.width,
                                    portfolioComponentWidth: portfolioComponentRect?.width,
                                    tableBodyWidth: tableBodyRect?.width,
                                    verticalScrollbarWidth: 16,
                                    calculatedWidth: scrollbarWidth,
                                    formula: nativeHorizontalScrollbarRect
                                        ? "nativeScrollbarRect.width - 16px (uses AG Grid's native scrollbar width)"
                                        : "tableContainer.width - 16px (table container's visible width minus vertical scrollbar)",
                                    note: nativeHorizontalScrollbarRect
                                        ? "Using native scrollbar dimensions for exact positioning"
                                        : "Using table container's visible boundaries (aligns with AG Grid viewport)",
                                },
                            });

                            // Debug all possible component selectors
                            const allPortfolioElements =
                                document.querySelectorAll(
                                    '[class*="portfolio"]'
                                );
                            const allComponentElements =
                                document.querySelectorAll(
                                    "[data-component-id]"
                                );

                            dlog(
                                "[HorizontalScrollbar] analysis",
                                {
                                    componentId: componentId || "default",
                                    actualPortfolioComponent: {
                                        found: !!actualPortfolioComponent,
                                        tagName:
                                            actualPortfolioComponent?.tagName,
                                        className:
                                            actualPortfolioComponent?.className,
                                        id: actualPortfolioComponent?.id,
                                        rect: componentRect
                                            ? {
                                                  width: componentRect.width,
                                                  height: componentRect.height,
                                                  left: componentRect.left,
                                                  top: componentRect.top,
                                                  right: componentRect.right,
                                                  bottom: componentRect.bottom,
                                              }
                                            : null,
                                    },
                                    tableBodyRect: tableBodyRect
                                        ? {
                                              width: tableBodyRect.width,
                                              height: tableBodyRect.height,
                                              left: tableBodyRect.left,
                                              top: tableBodyRect.top,
                                              right: tableBodyRect.right,
                                              bottom: tableBodyRect.bottom,
                                          }
                                        : null,
                                    scrollbarCalculations: {
                                        scrollbarWidth: scrollbarWidth,
                                        scrollbarLeft: scrollbarLeft,
                                        scrollbarTop: scrollbarTop,
                                        scrollbarHeight: 16,
                                        tableHeaderRect: tableHeaderRect
                                            ? {
                                                  top: tableHeaderRect.top,
                                                  bottom: tableHeaderRect.bottom,
                                                  height: tableHeaderRect.height,
                                              }
                                            : null,
                                    tableBodyRect: tableBodyRect
                                            ? {
                                                  top: tableBodyRect.top,
                                                  bottom: tableBodyRect.bottom,
                                                  left: tableBodyRect.left,
                                                  right: tableBodyRect.right,
                                                  width: tableBodyRect.width,
                                                  height: tableBodyRect.height,
                                              }
                                            : null,
                                    },
                                    scrollbarState: {
                                        scrollWidth: scrollbarState.scrollWidth,
                                        clientWidth: scrollbarState.clientWidth,
                                        thumbWidth: scrollbarState.thumbWidth,
                                        thumbLeft: scrollbarState.thumbLeft,
                                        needsHorizontalScroll:
                                            scrollbarState.scrollWidth >
                                            scrollbarState.clientWidth,
                                    },
                                    allPortfolioElements: Array.from(
                                        allPortfolioElements
                                    ).map((el) => ({
                                        tagName: el.tagName,
                                        className: el.className,
                                        id: el.id,
                                        rect: el.getBoundingClientRect(),
                                    })),
                                    allComponentElements: Array.from(
                                        allComponentElements
                                    ).map((el) => ({
                                        tagName: el.tagName,
                                        className: el.className,
                                        id: el.id,
                                        dataComponentId:
                                            el.getAttribute(
                                                "data-component-id"
                                            ),
                                        rect: el.getBoundingClientRect(),
                                    })),
                                }
                            );

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
                                        zIndex: 9999,
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

            {/* Context Menu */}
            {contextMenu.isOpen && contextMenuRow && (
                <>
                    <ContextMenu
                        items={[
                            {
                                label: isLoadingLineage
                                    ? "History (Loading...)"
                                    : "History",
                                // Show submenu if original_trade_id exists and lineage data is available
                                submenu:
                                    contextMenuRow.original_trade_id &&
                                    contextMenuRow.original_trade_id !== null &&
                                    String(contextMenuRow.original_trade_id) !== "-"
                                        ? isLoadingLineage
                                            ? [
                                                  {
                                                      label: "Loading history...",
                                                      disabled: true,
                                                  },
                                              ]
                                            : lineageData.length === 0
                                            ? [
                                                  {
                                                      label: "No history found",
                                                      disabled: true,
                                                  },
                                              ]
                                            : lineageData.map((item) => {
                                                  // Show fund short name when fund is "all" (fundId === 0)
                                                  const fundLabel = fundId === 0 && item.fund_short_name
                                                      ? ` [${item.fund_short_name}]`
                                                      : "";
                                                  return {
                                                  label: `${item.operation} - Trade ${item.current_trade_id ?? "N/A"}${fundLabel}`,
                                                  action: () => {
                                                      // Show trade details - you can customize this
                                                      alert(
                                                          [
                                                              `Operation: ${item.operation}`,
                                                              `Trade: ${item.current_trade_id ?? "N/A"}`,
                                                              `Original: ${item.original_trade_id}`,
                                                              `Parent: ${item.parent_lineage_id ?? "N/A"}`,
                                                              `Time: ${new Date(item.operation_timestamp).toLocaleString()}`,
                                                              `QtyΔ: ${item.quantity_delta ?? "N/A"}`,
                                                              `Notes: ${item.notes ?? "N/A"}`,
                                                              item.fund_short_name ? `Fund: ${item.fund_short_name}` : ""
                                                          ]
                                                              .filter(Boolean)
                                                              .join(" | ")
                                                      );
                                                  },
                                              };
                                              })
                                        : undefined,
                                // Fallback action if no original_trade_id
                                action:
                                    !contextMenuRow.original_trade_id ||
                                    contextMenuRow.original_trade_id === null ||
                                    String(contextMenuRow.original_trade_id) === "-"
                                        ? () => {
                                              alert(
                                                  `No history available for trade ${contextMenuRow.trade_id ?? "N/A"}. This trade has no original_trade_id.`
                                              );
                                          }
                                        : undefined,
                            },
                            {
                                label: "View/Edit",
                                submenu:
                                    contextMenuRow.trade_count && contextMenuRow.trade_count > 1 && contextMenuRow.grouped_trades
                                        ? contextMenuRow.grouped_trades.map((trade) => {
                                              // Only show fund info when fund is "all" (fundId === 0)
                                              const showFundInfo = fundId === 0;
                                              // Fund ID to name mapping
                                              const fundMap: Record<number, string> = {
                                                  1: "GMF",
                                                  6: "GCF",
                                              };
                                              const qty = typeof trade.quantity === "number"
                                                  ? trade.quantity.toLocaleString()
                                                  : String(trade.quantity || "N/A");
                                              const fundLabel = showFundInfo
                                                  ? ` [${fundMap[trade.fund_id] || `Fund ${trade.fund_id}`}]`
                                                  : "";
                                              return {
                                                  label: `Trade ${trade.trade_id}: ${qty}${fundLabel}`,
                                                  action: () => {
                                                      setIsEditing((prev) => !prev);
                                                      // You could also show trade details here if needed
                                                  },
                                              };
                                          })
                                        : undefined,
                                action:
                                    !contextMenuRow.trade_count || contextMenuRow.trade_count <= 1 || !contextMenuRow.grouped_trades
                                        ? () => {
                                              setIsEditing((prev) => !prev);
                                          }
                                        : undefined,
                            },
                            {
                                label: "New",
                                action: () => {
                                    alert(`Create new trade based on ${contextMenuRow.ticker ?? contextMenuRow.underlying ?? "position"}`);
                                },
                            },
                            {
                                label: "+/-",
                                action: () => {
                                    alert(`Adjust quantity for trade ${contextMenuRow.trade_id ?? "N/A"}${contextMenuRow.ticker ? ` (${contextMenuRow.ticker})` : ""}\nCurrent quantity: ${contextMenuRow.quantity ?? "N/A"}`);
                                },
                            },
                            {
                                label: "Roll",
                                action: () => {
                                    alert(`Roll trade ${contextMenuRow.trade_id ?? "N/A"}${contextMenuRow.ticker ? ` (${contextMenuRow.ticker})` : ""}\nCurrent maturity: ${contextMenuRow.maturity_date ?? "N/A"}`);
                                },
                            },
                        ] as ContextMenuItem[]}
                        position={contextMenu.position}
                        isOpen={contextMenu.isOpen}
                        onClose={() => {
                            setContextMenu((prev) => ({ ...prev, isOpen: false }));
                            setContextMenuRow(null);
                            contextMenuRowRef.current = null;
                            lastContextPositionRef.current = null;
                        }}
                    />
                </>
            )}
        </div>
    );
};

export default PortfolioTableAGGrid;
