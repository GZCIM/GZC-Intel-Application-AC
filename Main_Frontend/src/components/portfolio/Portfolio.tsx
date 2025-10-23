import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import {
    apiClient as portfolioApi,
    setPortfolioAuthTokenProvider,
} from "../../utils/axios";
import { useAuthContext } from "../../modules/ui-library";
import { useTheme } from "../../contexts/ThemeContext";
import PortfolioTableAGGrid from "./PortfolioTableAGGrid";
import "../../styles/portfolio.css";

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
        id?: string; // component instance id from layout system
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
    id,
}) => {
    const { currentTheme } = useTheme();
    const auth = useAuthContext();
    const [toolsEditing, setToolsEditing] = useState(false);
    const headerRef = useRef<HTMLDivElement | null>(null);
    const [headerWidth, setHeaderWidth] = useState<number>(0);
    // Anchor element for EOD datepicker portal positioning
    const dateButtonRef = useRef<HTMLButtonElement | null>(null);
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
    const [dataMode, setDataMode] = useState<"live" | "eod">("live");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const prevBusinessDate = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const wd = d.getDay();
        if (wd === 0) d.setDate(d.getDate() - 2);
        if (wd === 6) d.setDate(d.getDate() - 1);
        return d;
    };

    const effectiveDate = useMemo(() => {
        const today = new Date();
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        if (dataMode === "eod") {
            if (selectedDate) return selectedDate; // allow manual override for EOD
            return fmt(prevBusinessDate());
        }
        return fmt(today);
    }, [dataMode, selectedDate]);
    const [portfolioMode, setPortfolioMode] = useState<"active" | "virtual">(
        "active"
    );
    const [selectedFundId, setSelectedFundId] = useState<string>("1"); // 0=ALL, 1=GMF, 6=GCF
    const [funds, setFunds] = useState<
        Array<{ id: number; short_name: string; full_name: string }>
    >([]);
    // Temporary debug views for FX trades APIs
    const [fxTrades, setFxTrades] = useState<any[] | null>(null);
    const [fxOptions, setFxOptions] = useState<any[] | null>(null);
    const [fxError, setFxError] = useState<string | null>(null);
    const [fxLoading, setFxLoading] = useState<"none" | "trades" | "options">(
        "none"
    );

    // Track header width for responsive controls behavior
    useEffect(() => {
        if (!headerRef.current) return;
        const el = headerRef.current;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const cr = entry.contentRect;
                setHeaderWidth(cr.width);
            }
        });
        ro.observe(el);
        setHeaderWidth(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, []);

    const loadFxTrades = async () => {
        try {
            setFxLoading("trades");
            // use authorized client so bearer token is attached
            const resp = await portfolioApi.get(`/api/portfolio/fx-positions`, {
                params: {
                    fundId: selectedFundId,
                    date: effectiveDate,
                },
            });
            setFxTrades(resp.data?.data || []);
            setFxError(null);
        } catch (err: any) {
            setFxTrades([]);
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail || err?.message;
            setFxError(
                status
                    ? `FX positions error ${status}: ${
                          typeof detail === "string"
                              ? detail
                              : JSON.stringify(detail)
                      }`
                    : "Failed to load FX positions. Are you signed in?"
            );
        } finally {
            setFxLoading("none");
        }
    };

    const loadFxOptions = async () => {
        try {
            setFxLoading("options");
            const resp = await portfolioApi.get(
                `/api/portfolio/fx-option-positions`,
                {
                    params: {
                        fundId: selectedFundId,
                        date: effectiveDate,
                    },
                }
            );
            setFxOptions(resp.data?.data || []);
            setFxError(null);
        } catch (err: any) {
            setFxOptions([]);
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail || err?.message;
            setFxError(
                status
                    ? `FX options error ${status}: ${
                          typeof detail === "string"
                              ? detail
                              : JSON.stringify(detail)
                      }`
                    : "Failed to load FX option positions. Are you signed in?"
            );
        } finally {
            setFxLoading("none");
        }
    };

    // Auto-load on first render and when fund/date changes
    useEffect(() => {
        let mounted = true;
        // Configure token provider so apiClient adds Authorization header
        setPortfolioAuthTokenProvider(auth.getToken);

        // Listen for 401s from axios and surface a friendly error
        const onAuthError = () => {
            if (!mounted) return;
            setFxError("Failed to load FX positions. Are you signed in?");
        };
        window.addEventListener(
            "portfolio-auth-error",
            onAuthError as EventListener
        );

        // Listen to global Tools menu edit toggle so window controls appear
        const onEditToggle = (e: Event) => {
            const detail = (e as CustomEvent).detail || {};
            setToolsEditing(!!detail.unlocked);
        };
        window.addEventListener(
            "gzc:edit-mode-toggled",
            onEditToggle as EventListener
        );

        (async () => {
            try {
                // Proactively ensure token is available before first calls
                const token = await auth.getToken();
            } catch (e) {
                // If token retrieval fails, still attempt loads; axios interceptor will attach if later available
            }
            // Load data once token is ready
            await loadFxTrades();
            await loadFxOptions();
        })();

        return () => {
            mounted = false;
            window.removeEventListener(
                "portfolio-auth-error",
                onAuthError as EventListener
            );
            window.removeEventListener(
                "gzc:edit-mode-toggled",
                onEditToggle as EventListener
            );
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFundId, effectiveDate]);

    // Load funds once on mount
    useEffect(() => {
        (async () => {
            try {
                const resp = await portfolioApi.get(`/api/db/funds`);
                const list = (resp.data?.data || []).map((f: any) => ({
                    id: Number(f.id),
                    short_name: String(f.short_name),
                    full_name: String(f.full_name),
                }));
                setFunds(list);
            } catch (e) {
                // keep fallback hardcoded options
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load persisted mode/date from localStorage (force default Active on first render)
    useEffect(() => {
        try {
            const savedMode = localStorage.getItem("portfolio.dataMode");
            if (savedMode === "live" || savedMode === "eod") {
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

    // Ensure a dedicated portal exists for react-datepicker (stable alignment)
    useEffect(() => {
        const id = "gzc-datepicker-portal";
        if (!document.getElementById(id)) {
            const el = document.createElement("div");
            el.id = id;
            document.body.appendChild(el);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem("portfolio.fundId", selectedFundId);
        } catch (_) {}
    }, [selectedFundId]);

    const formatDateBadge = (value?: string) => {
        try {
            if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value; // already yyyy-mm-dd
            const d = value ? new Date(value) : new Date();
            return d.toISOString().slice(0, 10); // yyyy-mm-dd
        } catch (_) {
            return new Date().toISOString().slice(0, 10);
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

    // Expose theme as CSS variables for consistent styling without hardcoded colors
    const cssVars: React.CSSProperties = {
        ["--gzc-bg" as any]: currentTheme.background,
        ["--gzc-surface" as any]: currentTheme.surface,
        ["--gzc-surface-alt" as any]:
            (currentTheme as any).surfaceAlt || currentTheme.surface,
        ["--gzc-border" as any]: currentTheme.border,
        ["--gzc-text" as any]: currentTheme.text,
        ["--gzc-text-secondary" as any]: currentTheme.textSecondary,
        ["--gzc-success" as any]: (currentTheme as any).success || "#6aa84f",
    };

    // Ensure variables are also available to portal-rooted elements (e.g., datepicker popper)
    useEffect(() => {
        const root = document.documentElement;
        try {
            root.style.setProperty(
                "--gzc-bg",
                String(cssVars["--gzc-bg" as any])
            );
            root.style.setProperty(
                "--gzc-surface",
                String(cssVars["--gzc-surface" as any])
            );
            root.style.setProperty(
                "--gzc-surface-alt",
                String(cssVars["--gzc-surface-alt" as any])
            );
            root.style.setProperty(
                "--gzc-border",
                String(cssVars["--gzc-border" as any])
            );
            root.style.setProperty(
                "--gzc-text",
                String(cssVars["--gzc-text" as any])
            );
            root.style.setProperty(
                "--gzc-text-secondary",
                String(cssVars["--gzc-text-secondary" as any])
            );
            root.style.setProperty(
                "--gzc-success",
                String(cssVars["--gzc-success" as any])
            );
        } catch (_) {}
    }, [currentTheme]);

    return (
        <div
            style={{
                backgroundColor: currentTheme.surface,
                borderRadius: "8px",
                border: `1px solid ${currentTheme.border}`,
                overflow: "hidden",
                height: "100%",
                maxHeight: "100%", // Ensure it doesn't exceed container
                display: "flex",
                flexDirection: "column",
                ...cssVars,
            }}
        >
            {/* Themed utility styles for chips and datepicker (match GZC Dark) */}
            <style>
                {`
                /* Chip buttons used by Live/EOD selectors */
                .gzc-chip {
                    padding: 4px 8px;
                    background-color: var(--gzc-bg);
                    color: var(--gzc-text-secondary);
                    border: 1px solid var(--gzc-border);
                    border-color: color-mix(in hsl, var(--gzc-border) 60%, transparent);
                    border-radius: 4px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: background-color .15s ease, color .15s ease, border-color .15s ease;
                }
                .gzc-chip:hover {
                    background-color: var(--gzc-surface);
                    color: var(--gzc-text);
                    border-color: var(--gzc-border);
                }
                .gzc-chip--active {
                    color: #ffffff;
                    background-color: var(--gzc-surface);
                    border: 1px solid var(--gzc-success);
                    box-shadow: inset 0 -1px 0 rgba(0,0,0,.2);
                }

                /* Date input button (customInput) */
                .gzc-date-input {
                    padding: 4px 8px;
                    background-color: var(--gzc-bg);
                    color: var(--gzc-text);
                    border: 1px solid var(--gzc-border);
                    border-radius: 4px;
                    font-size: 11px;
                }
                /* stronger specificity to override library styles */
                .gzc-date-input.gzc-date-input--themed,
                .gzc-chip.gzc-date-input--themed {
                    background-color: var(--gzc-bg);
                    color: var(--gzc-text);
                    border-color: var(--gzc-border);
                }
                .gzc-date--green {
                    color: var(--gzc-success) !important;
                }
                .gzc-chip.gzc-date--green,
                .gzc-date-input.gzc-date--green {
                    color: var(--gzc-success) !important;
                    border-color: var(--gzc-border) !important; /* keep neutral border */
                }

                /* React Datepicker dark theming */
                .gzc-datepicker-popper {
                    z-index: 30000 !important; /* Higher than any other element */
                }
                .gzc-datepicker-popper .react-datepicker {
                    z-index: 30000 !important; /* Ensure calendar itself has high z-index */
                    position: relative !important;
                }
                /* Force right alignment when above (top-end) */
                .gzc-datepicker-popper[data-popper-placement^="top-end"] {
                    right: 0 !important;
                    left: auto !important;
                }
                .gzc-datepicker-popper .react-datepicker {
                    background-color: var(--gzc-surface);
                    border: 1px solid var(--gzc-border);
                    color: var(--gzc-text);
                    box-shadow: 0 8px 18px rgba(0,0,0,0.25);
                }
                .gzc-datepicker-popper .react-datepicker__month-container,
                .gzc-datepicker-popper .react-datepicker__month,
                .gzc-datepicker-popper .react-datepicker__week {
                    background-color: var(--gzc-surface);
                    color: var(--gzc-text);
                }
                .gzc-datepicker-popper .react-datepicker__header {
                    background-color: var(--gzc-surface-alt) !important;
                    border-bottom: 1px solid var(--gzc-border) !important;
                    color: var(--gzc-text) !important;
                }
                /* Header refinements: title bar and weekday strip */
                .gzc-datepicker-popper .react-datepicker__header,
                .gzc-datepicker-popper .react-datepicker__day-names {
                    color: var(--gzc-text);
                }
                .gzc-datepicker-popper .react-datepicker__current-month,
                .gzc-datepicker-popper .react-datepicker__year-select,
                .gzc-datepicker-popper .react-datepicker__month-select {
                    color: var(--gzc-text) !important;
                    visibility: visible !important;
                }
                .gzc-datepicker-popper .react-datepicker__day-names {
                    background-color: var(--gzc-surface-alt) !important;
                }
                .gzc-datepicker-popper .react-datepicker__day-name {
                    color: var(--gzc-text-secondary) !important;
                }
                .gzc-datepicker-popper .react-datepicker__current-month,
                .gzc-datepicker-popper .react-datepicker-time__header,
                .gzc-datepicker-popper .react-datepicker-year-header {
                    color: var(--gzc-text);
                }
                .gzc-datepicker-popper .react-datepicker__day-name,
                .gzc-datepicker-popper .react-datepicker__day,
                .gzc-datepicker-popper .react-datepicker__time-name {
                    color: var(--gzc-text);
                }
                .gzc-datepicker-popper .react-datepicker__day--outside-month {
                    color: color-mix(in hsl, var(--gzc-text) 55%, transparent);
                }
                .gzc-datepicker-popper .react-datepicker__day:hover,
                .gzc-datepicker-popper .react-datepicker__day--keyboard-selected {
                    background-color: var(--gzc-surface);
                    border-radius: 4px;
                }
                .gzc-datepicker-popper .react-datepicker__day--selected,
                .gzc-datepicker-popper .react-datepicker__day--in-selecting-range,
                .gzc-datepicker-popper .react-datepicker__day--in-range {
                    background-color: var(--gzc-success);
                    color: #ffffff;
                    border-radius: 4px;
                }
                .gzc-datepicker-popper .react-datepicker__triangle::after,
                .gzc-datepicker-popper .react-datepicker__triangle::before {
                    border-bottom-color: var(--gzc-surface);
                }
                /* Navigation arrows */
                .gzc-datepicker-popper .react-datepicker__navigation-icon::before {
                    border-color: var(--gzc-text);
                    top: 6px;
                }
                .gzc-datepicker-popper .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
                    border-color: var(--gzc-success);
                }
                .gzc-datepicker-popper .react-datepicker__navigation--previous,
                .gzc-datepicker-popper .react-datepicker__navigation--next {
                    outline: none;
                }

                /* Force calendar above all elements */
                .react-datepicker {
                    z-index: 50000 !important;
                    position: absolute !important;
                }
                .react-datepicker-popper {
                    z-index: 50000 !important;
                }
                /* Additional specificity for calendar elements */
                div.react-datepicker {
                    z-index: 50000 !important;
                    position: absolute !important;
                }
                /* Override any parent stacking contexts */
                .gzc-datepicker-popper .react-datepicker {
                    z-index: 50000 !important;
                    position: absolute !important;
                    transform: translateZ(0) !important;
                }
                /* Break out of React Grid Layout stacking context */
                .gzc-datepicker-popper {
                    z-index: 50000 !important;
                    position: fixed !important;
                }
                /* Override React Grid Layout stacking context completely */
                .react-grid-item .gzc-datepicker-popper {
                    z-index: 50000 !important;
                    position: fixed !important;
                    transform: none !important;
                }
                /* Ensure datepicker appears above react-grid-layout */
                .react-grid-layout .gzc-datepicker-popper {
                    z-index: 50000 !important;
                    position: fixed !important;
                }
                `}
            </style>
            <div
                style={{
                    padding: "8px",
                    borderBottom: `1px solid ${currentTheme.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    overflowX: "hidden", // prevent horizontal overflow
                    overflowY: "hidden",
                    position: "relative",
                    maxWidth: "100%", // Ensure header doesn't exceed container width
                    // Reserve space on the right for floating window controls during edit mode
                    paddingRight: isEditMode || toolsEditing ? 140 : undefined,
                    // Ensure enough height so inner controls are not overlapped vertically
                    minHeight: isEditMode || toolsEditing ? 46 : undefined,
                }}
                ref={headerRef}
            >
                {(isEditMode || toolsEditing) && (
                    <div
                        style={{
                            position: "absolute",
                            right: 8,
                            top: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            zIndex: 2,
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
                {componentState === "minimized" && isEditMode ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}
                    >
                        {isEditMode || toolsEditing ? (
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
                        {(isEditMode || toolsEditing) && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    flexShrink: 0,
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
                        {isEditMode || toolsEditing ? (
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
                                    whiteSpace: "nowrap",
                                    minWidth: 0,
                                    overflow: "hidden",
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
                                    {(!(isEditMode || toolsEditing) ||
                                        headerWidth > 900) && (
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
                                    )}
                                </div>
                                {portfolioMode === "active" && (
                                    <>
                                        {/* Hide Fund block entirely when editing and header is narrow */}
                                        {(!(isEditMode || toolsEditing) ||
                                            headerWidth > 1000) && (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 6,
                                                    alignItems: "center",
                                                    whiteSpace: "nowrap",
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
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    <option value="0">
                                                        ALL
                                                    </option>
                                                    {(funds.length
                                                        ? funds
                                                        : [
                                                              {
                                                                  id: 1,
                                                                  short_name:
                                                                      "GMF",
                                                                  full_name:
                                                                      "Global Macro Fund",
                                                              },
                                                              {
                                                                  id: 6,
                                                                  short_name:
                                                                      "GCF",
                                                                  full_name:
                                                                      "Global Currencies Fund",
                                                              },
                                                          ]
                                                    ).map((f) => (
                                                        <option
                                                            key={f.id}
                                                            value={String(f.id)}
                                                        >
                                                            {f.short_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </>
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
                                            onClick={() => {
                                                // Create new virtual portfolio
                                            }}
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
                        {(!(isEditMode || toolsEditing) ||
                            headerWidth > 880) && (
                            <div
                                style={{
                                    marginLeft: isEditMode ? undefined : "auto",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    overflowX: "auto",
                                }}
                            >
                                <button
                                    onClick={() => {
                                        // Portfolio: Sync DB
                                    }}
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
                                        boxShadow:
                                            "inset 0 -1px 0 rgba(0,0,0,0.2)",
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
                                                fxLoading === "trades"
                                                    ? 0.6
                                                    : 1,
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
                                                fxLoading === "options"
                                                    ? 0.6
                                                    : 1,
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
                                        className={`gzc-chip ${
                                            dataMode === "live"
                                                ? "gzc-chip--active"
                                                : ""
                                        }`}
                                    >
                                        Live
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDataMode("eod");
                                            if (!selectedDate) {
                                                const d = prevBusinessDate()
                                                    .toISOString()
                                                    .slice(0, 10);
                                                setSelectedDate(d);
                                            }
                                        }}
                                        className={`gzc-chip ${
                                            dataMode === "eod"
                                                ? "gzc-chip--active"
                                                : ""
                                        }`}
                                    >
                                        EOD
                                    </button>
                                </div>
                                {dataMode === "eod" ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        {(() => {
                                            const CustomInput =
                                                React.forwardRef<
                                                    HTMLButtonElement,
                                                    any
                                                >(({ value, onClick }, ref) => (
                                                    <button
                                                        ref={(el) => {
                                                            if (
                                                                typeof ref ===
                                                                "function"
                                                            )
                                                                ref(el);
                                                            else if (
                                                                ref &&
                                                                typeof ref ===
                                                                    "object"
                                                            )
                                                                (
                                                                    ref as any
                                                                ).current = el;
                                                            dateButtonRef.current =
                                                                el;
                                                        }}
                                                        onClick={onClick}
                                                        type="button"
                                                        className={`gzc-chip gzc-date-input gzc-date-input--themed ${
                                                            dataMode === "eod"
                                                                ? "gzc-chip--active"
                                                                : ""
                                                        } gzc-date--green`}
                                                        title="Select EOD date"
                                                        style={{
                                                            width: 120,
                                                            textAlign: "left",
                                                            display:
                                                                "inline-block", // Ensure proper inline positioning
                                                            position:
                                                                "relative", // Ensure proper positioning context
                                                        }}
                                                    >
                                                        {value || "yyyy-mm-dd"}
                                                    </button>
                                                ));
                                            CustomInput.displayName =
                                                "CustomDateInput";
                                            // Use relative positioning container - simpler and more reliable
                                            const RelativePopperContainer = ({
                                                className,
                                                children,
                                            }: any) => {
                                                return (
                                                    <div
                                                        className={`${className} gzc-datepicker-popper`}
                                                        style={{
                                                            position:
                                                                "absolute",
                                                            top: "100%",
                                                            right: 0,
                                                            zIndex: 30000, // Higher than any other element (20060)
                                                            marginTop: "4px",
                                                            isolation:
                                                                "isolate", // Create new stacking context
                                                            transform:
                                                                "translateZ(0)", // Force hardware acceleration
                                                        }}
                                                    >
                                                        {children}
                                                    </div>
                                                );
                                            };
                                            return (
                                                <span
                                                    style={{
                                                        position: "relative",
                                                        display: "inline-block",
                                                    }}
                                                >
                                                    <DatePicker
                                                        selected={(() => {
                                                            try {
                                                                return new Date(
                                                                    (selectedDate ||
                                                                        effectiveDate) +
                                                                        "T00:00:00"
                                                                );
                                                            } catch (_) {
                                                                return new Date();
                                                            }
                                                        })()}
                                                        onChange={(
                                                            d: Date | null
                                                        ) => {
                                                            if (!d) return;
                                                            try {
                                                                const iso = d
                                                                    .toISOString()
                                                                    .slice(
                                                                        0,
                                                                        10
                                                                    );
                                                                setSelectedDate(
                                                                    iso
                                                                );
                                                            } catch (_) {}
                                                        }}
                                                        maxDate={new Date()}
                                                        calendarClassName="react-datepicker"
                                                        popperClassName="gzc-datepicker-popper"
                                                        popperPlacement="bottom-end"
                                                        popperModifiers={[
                                                            {
                                                                name: "preventOverflow",
                                                                options: {
                                                                    rootBoundary:
                                                                        "viewport",
                                                                    tether: false,
                                                                    padding: 8,
                                                                },
                                                            },
                                                            {
                                                                name: "flip",
                                                                options: {
                                                                    fallbackPlacements:
                                                                        [
                                                                            "top-end",
                                                                            "bottom-start",
                                                                            "top-start",
                                                                        ],
                                                                },
                                                            },
                                                        ]}
                                                        popperContainer={
                                                            RelativePopperContainer
                                                        }
                                                        customInput={
                                                            <CustomInput />
                                                        }
                                                        dateFormat="yyyy-MM-dd"
                                                    />
                                                </span>
                                            );
                                        })()}
                                        <style>
                                            {`
                                            /* Input styling to match dark theme */
                                            .gzc-date-input {
                                                padding: 4px 8px;
                                                background-color: ${currentTheme.background};
                                                color: ${currentTheme.text};
                                                border: 1px solid ${currentTheme.border};
                                                border-radius: 4px;
                                                font-size: 11px;
                                                width: 120px;
                                            }
                                            `}
                                        </style>
                                    </div>
                                ) : (
                                    <span
                                        title="Date"
                                        className="gzc-chip gzc-date-input gzc-date-input--themed gzc-date--green"
                                        style={{
                                            display: "inline-block",
                                            width: 120,
                                            textAlign: "left",
                                        }}
                                    >
                                        {formatDateBadge(effectiveDate)}
                                    </span>
                                )}
                            </div>
                        )}
                        {/* window controls moved next to title for guaranteed visibility in edit mode */}
                    </div>
                )}

                {/* Row 2: Create action when in Virtual portfolio mode, placed below (single instance) */}
                {/* removed duplicate rendering; creation button now only appears under selector on the left column */}
            </div>

            {componentState === "minimized" ? null : (
                <div
                    className="portfolio-card-body"
                    style={{
                        flex: 1,
                        minHeight: 0,
                        maxHeight: "100%", // Ensure it doesn't exceed container
                        backgroundColor: currentTheme.background,
                        padding: "12px 12px 0 12px",
                        display: "flex",
                        alignItems: "stretch",
                        justifyContent: "stretch",
                        color: currentTheme.textSecondary,
                        fontSize: 12,
                        borderTop: `1px solid ${currentTheme.border}20`,
                        overflow: "hidden", // Keep scrollbars inside table, not here
                    }}
                >
                    <div style={{ flex: 1, display: "flex", gap: 12 }}>
                        <div
                            className="portfolio-dashed-wrap"
                            style={{
                                flex: 1,
                                border: `1px dashed ${currentTheme.border}`,
                                borderRadius: 4,
                                padding: 8,
                                height: "100%",
                                maxHeight: "100%",
                                overflow: "hidden", // container stays clipped
                                display: "flex",
                                flexDirection: "column",
                                minHeight: 0, // allow child grid to size/scroll
                                width: "100%",
                            }}
                        >
                            <PortfolioTableAGGrid
                                selectedDate={effectiveDate}
                                fundId={Number(selectedFundId) || 0}
                                isLive={dataMode === "live"}
                                externalEditing={isEditMode || toolsEditing}
                                componentId={
                                    id ||
                                    (window as any)?.componentId ||
                                    undefined
                                }
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;
