import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "./TradeForms.css";
import { useTheme } from "../../contexts/ThemeContext";

export type FXForwardFormMode = "create" | "view" | "edit";

export interface FXForwardFormData {
    trade_id?: number | null;
    fund_id?: number | null;
    position?: "Buy" | "Sell" | "" | null;
    quantity?: number | null;
    price?: number | null;
    trade_currency?: string | null;
    settlement_currency?: string | null;
    maturity_date?: string | null; // ISO date
    counterparty?: string | null;
    notes?: string | null;
}

export interface FXForwardFormModalProps {
    isOpen: boolean;
    mode: FXForwardFormMode;
    data?: Partial<FXForwardFormData>;
    onClose: () => void;
    onSubmit?: (payload: FXForwardFormData) => void;
    title?: string;
}

function clampNumber(n: any): number | null {
    if (n === null || n === undefined || n === "") return null;
    const v = Number(n);
    return Number.isFinite(v) ? v : null;
}

function toISODate(d: any): string | null {
    if (!d) return null;
    try {
        return String(d).slice(0, 10);
    } catch {
        return null;
    }
}

export const FXForwardFormModal: React.FC<FXForwardFormModalProps> = ({
    isOpen,
    mode,
    data,
    onClose,
    onSubmit,
    title,
}) => {
    const { currentTheme: theme } = useTheme();
    // Preserve any extra fields passed in via data to render transparently
    const [rawRow] = useState<Record<string, unknown> | null>(
        data && typeof data === "object"
            ? (data as Record<string, unknown>)
            : null
    );
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
    const [form, setForm] = useState<FXForwardFormData>(() => {
        const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
        return {
            trade_id: data?.trade_id ?? null,
            fund_id: data?.fund_id ?? null,
            position: data?.position ?? "",
            quantity: data?.quantity ?? null,
            price: data?.price ?? (raw?.trade_price as number) ?? null,
            trade_currency: data?.trade_currency ?? "",
            settlement_currency: data?.settlement_currency ?? "",
            maturity_date: data?.maturity_date
                ? toISODate(data?.maturity_date)
                : null,
            counterparty: (data as any)?.counter_party_code ?? data?.counterparty ?? null,
            notes: data?.notes ?? null,
        };
    });

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!containerRef.current) {
            const el = document.createElement("div");
            el.className = "fx-forward-form-portal-container";
            document.body.appendChild(el);
            containerRef.current = el;
            setPortalEl(el);
        } else {
            setPortalEl(containerRef.current);
        }
        console.info("[FXForwardFormModal] Portal prepared");
        return () => {
            if (containerRef.current) {
                document.body.removeChild(containerRef.current);
                containerRef.current = null;
                setPortalEl(null);
            }
            console.info("[FXForwardFormModal] Portal cleaned up");
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            console.info("[FXForwardFormModal] Opening with data:", data);
            // Update form state when modal opens with new data
            const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
            if (raw || data) {
                setForm((prev) => ({
                    ...prev,
                    trade_id: data?.trade_id ?? prev.trade_id,
                    fund_id: data?.fund_id ?? prev.fund_id,
                    position: data?.position ?? (raw?.position as string) ?? prev.position,
                    quantity: data?.quantity ?? (raw?.quantity as number) ?? prev.quantity,
                    price: data?.price ?? (raw?.trade_price as number) ?? prev.price,
                    trade_currency: data?.trade_currency ?? (raw?.trade_currency as string) ?? prev.trade_currency,
                    settlement_currency: data?.settlement_currency ?? (raw?.settlement_currency as string) ?? prev.settlement_currency,
                    maturity_date: data?.maturity_date ? toISODate(data?.maturity_date) : (raw?.maturity_date ? toISODate(raw.maturity_date as string) : prev.maturity_date),
                    counterparty: (data as any)?.counter_party_code ?? (raw?.counter_party_code as string) ?? data?.counterparty ?? prev.counterparty,
                    notes: data?.notes ?? (raw?.notes as string) ?? prev.notes,
                }));
            }
        } else {
            console.info("[FXForwardFormModal] Closed");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, data]);
    const readonly = mode === "view";
    const heading =
        title ??
        (mode === "create"
            ? "New FX Forward"
            : mode === "edit"
            ? "Edit FX Forward"
            : "View FX Forward");

    const canSubmit = useMemo(() => {
        if (readonly) return false;
        return Boolean(
            form.position &&
                clampNumber(form.quantity) &&
                form.maturity_date &&
                form.trade_currency &&
                form.settlement_currency
        );
    }, [form, readonly]);

    const handleSubmit = () => {
        if (!onSubmit || !canSubmit) return;
        onSubmit({
            ...form,
            quantity: clampNumber(form.quantity),
            price: clampNumber(form.price),
            maturity_date: toISODate(form.maturity_date),
        });
    };

    if (!isOpen || !portalEl) return null;

    return ReactDOM.createPortal(
        <div
            className="fx-forward-form-overlay"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="fx-forward-form-modal"
                onClick={(e) => e.stopPropagation()}
                style={
                    {
                        // inject theme variables for CSS to consume
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        "--surface": theme?.surface,
                        "--surfaceAlt": theme?.surfaceAlt,
                        "--text": theme?.text,
                        "--textSecondary": theme?.textSecondary ?? "#aeb6c0",
                        "--border": theme?.border,
                        "--primary": theme?.primary ?? "#1f6feb",
                        "--onPrimary": "#ffffff",
                        "--primaryDisabled": "#274777",
                    } as React.CSSProperties
                }
            >
                <div className="fx-forward-form-header">
                    <h3 className="fx-forward-form-title">{heading}</h3>
                    <button
                        className="fx-forward-form-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <div className="fx-forward-form-body">
                    <div className="fx-forward-form-grid">
                        <label className="fld">
                            <span>Position</span>
                            <select
                                disabled={readonly}
                                value={form.position ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        position: e.target.value as any,
                                    }))
                                }
                            >
                                <option value="">Select</option>
                                <option value="Buy">Buy</option>
                                <option value="Sell">Sell</option>
                            </select>
                        </label>
                        <label className="fld">
                            <span>Quantity</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                disabled={readonly}
                                value={form.quantity ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        quantity: clampNumber(e.target.value),
                                    }))
                                }
                            />
                        </label>
                        <label className="fld">
                            <span>Price</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                disabled={readonly}
                                value={form.price ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        price: clampNumber(e.target.value),
                                    }))
                                }
                            />
                        </label>
                        <label className="fld">
                            <span>Trade Currency</span>
                            <input
                                type="text"
                                disabled={readonly}
                                value={form.trade_currency ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        trade_currency:
                                            e.target.value.toUpperCase(),
                                    }))
                                }
                            />
                        </label>
                        <label className="fld">
                            <span>Settlement Currency</span>
                            <input
                                type="text"
                                disabled={readonly}
                                value={form.settlement_currency ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        settlement_currency:
                                            e.target.value.toUpperCase(),
                                    }))
                                }
                            />
                        </label>
                        <label className="fld">
                            <span>Maturity Date</span>
                            <input
                                type="date"
                                disabled={readonly}
                                value={form.maturity_date ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        maturity_date: toISODate(
                                            e.target.value
                                        ),
                                    }))
                                }
                            />
                        </label>
                        <label className="fld">
                            <span>Counterparty</span>
                            <input
                                type="text"
                                disabled={readonly}
                                value={form.counterparty ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        counterparty: e.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className="fld fld-notes">
                            <span>Notes</span>
                            <textarea
                                disabled={readonly}
                                value={form.notes ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        notes: e.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>
                </div>
                {/* Additional fields: render any remaining DB columns */}
                {rawRow && (
                    <div className="fx-forward-form-body">
                        <div className="fx-forward-form-grid">
                            {Object.entries(rawRow)
                                .filter(([k]) => {
                                    // Exclude any keys already rendered above (all form fields + details)
                                    const baseKeys = Object.keys(form);
                                    const extraKnown = [
                                        "trade_type",
                                        "trade_date",
                                        "original_trade_id",
                                        "grouped_trades",
                                        "trade_count",
                                        "ticker",
                                        "underlying",
                                        "counter_party_code", // shown as "Counterparty" in main form
                                        "trade_price", // shown as "Price" in main form
                                        // Common computed fields we never show in forms
                                        "itd_pnl",
                                        "ytd_pnl",
                                        "mtd_pnl",
                                        "dtd_pnl",
                                        "eod_price",
                                        "eom_price",
                                        "eoy_price",
                                        "current_price",
                                        "price", // non-trade computed price already shown via form 'price' if needed
                                    ];
                                    const knownKeys = new Set<string>([...baseKeys, ...extraKnown]);
                                    if (knownKeys.has(k)) return false;
                                    // Hide any keys that look like computed PnL or derived prices
                                    const kl = k.toLowerCase();
                                    if (kl.endsWith("_pnl")) return false;
                                    if (/(^|_)current_price$/.test(kl)) return false;
                                    if (kl === "eod_price" || kl === "eom_price" || kl === "eoy_price") return false;
                                    if (kl === "price") return false;
                                    // Hide computed date buckets (today/period-related)
                                    if (/^(eod|eom|eoy|dtd|mtd|ytd|itd)_(date|ts|timestamp)$/.test(kl)) return false;
                                    if (kl === "selected_date" || kl === "as_of" || kl === "today") return false;
                                    if (kl.startsWith("calc_")) return false;
                                    return true;
                                })
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([key, value]) => (
                                    <label className="fld" key={key}>
                                        <span>{String(key)}</span>
                                        <input
                                            disabled
                                            value={
                                                value == null
                                                    ? ""
                                                    : String(value)
                                            }
                                        />
                                    </label>
                                ))}
                        </div>
                    </div>
                )}
                <div className="fx-forward-form-footer">
                    <button className="btn secondary" onClick={onClose}>
                        Cancel
                    </button>
                    {!readonly && (
                        <button
                            className="btn primary"
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                        >
                            {mode === "create" ? "Create" : "Save"}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        portalEl
    );
};

export default FXForwardFormModal;
