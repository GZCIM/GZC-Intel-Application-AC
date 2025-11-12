import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "./TradeForms.css";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthContext } from "../../modules/ui-library";
import axios from "axios";

export type FXOptionFormMode = "create" | "view" | "edit";

export interface FXOptionFormData {
	trade_id?: number | null;
	fund_id?: number | null;
	position?: "Buy" | "Sell" | "" | null;
	quantity?: number | null;
	premium?: number | null;
	option_type?: "Call" | "Put" | "" | null;
	option_style?: "European" | "American" | "" | null;
	strike?: number | null;
	strike_currency?: string | null;
	underlying_trade_currency?: string | null;
	underlying_settlement_currency?: string | null;
	maturity_date?: string | null; // ISO date
	counterparty?: string | null;
	notes?: string | null;
}

export interface FXOptionFormModalProps {
	isOpen: boolean;
	mode: FXOptionFormMode;
	data?: Partial<FXOptionFormData>;
	onClose: () => void;
	onSubmit?: (payload: FXOptionFormData) => void;
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

export const FXOptionFormModal: React.FC<FXOptionFormModalProps> = ({
	isOpen,
	mode,
	data,
	onClose,
	onSubmit,
	title,
}) => {
	const { currentTheme: theme } = useTheme();
	const { getToken } = useAuthContext();
	// Preserve any extra fields passed in via data to render transparently
	const rawRowData = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
	const [rawRow] = useState<Record<string, unknown> | null>(rawRowData);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
	const normalizeOptionType = (val: any): string => {
		if (!val) return "";
		const s = String(val).trim().toLowerCase();
		if (s === "call" || s === "c") return "Call";
		if (s === "put" || s === "p") return "Put";
		return ""; // Return empty if not recognized
	};

	const normalizeOptionStyle = (val: any): string => {
		if (!val) return "";
		const s = String(val).trim().toLowerCase();
		if (s === "european" || s === "e") return "European";
		if (s === "american" || s === "a") return "American";
		return ""; // Return empty if not recognized
	};

	const [form, setForm] = useState<FXOptionFormData>(() => {
		const raw = rawRowData;
		const initialForm = {
			trade_id: data?.trade_id ?? null,
			fund_id: data?.fund_id ?? null,
			position: data?.position ?? (raw?.position as string) ?? "",
			quantity: data?.quantity ?? (raw?.quantity as number) ?? null,
			premium: data?.premium ?? (raw?.premium as number) ?? null,
			option_type: normalizeOptionType(data?.option_type ?? raw?.option_type),
			option_style: normalizeOptionStyle(data?.option_style ?? raw?.option_style),
			strike: data?.strike ?? (raw?.strike as number) ?? null,
			strike_currency: data?.strike_currency ?? (raw?.strike_currency as string) ?? "",
			underlying_trade_currency: data?.underlying_trade_currency ?? (raw?.underlying_trade_currency as string) ?? "",
			underlying_settlement_currency: data?.underlying_settlement_currency ?? (raw?.underlying_settlement_currency as string) ?? "",
			maturity_date: data?.maturity_date ? toISODate(data?.maturity_date) : (raw?.maturity_date ? toISODate(raw.maturity_date as string) : null),
			counterparty: (data as any)?.counter_party_code ?? (raw?.counter_party_code as string) ?? data?.counterparty ?? null,
			notes: data?.notes ?? (raw?.notes as string) ?? null,
		};
		console.info("[FXOptionFormModal] Initial form state:", initialForm, { data, raw });
		return initialForm;
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
            el.className = "fx-option-form-portal-container";
            document.body.appendChild(el);
            containerRef.current = el;
            setPortalEl(el);
        } else {
            setPortalEl(containerRef.current);
        }
        console.info("[FXOptionFormModal] Portal prepared");
        return () => {
            if (containerRef.current) {
                document.body.removeChild(containerRef.current);
                containerRef.current = null;
                setPortalEl(null);
            }
            console.info("[FXOptionFormModal] Portal cleaned up");
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Update form state when modal opens with new data
            const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
            console.info("[FXOptionFormModal] Opening with data:", {
                data,
                raw,
                option_type_from_data: data?.option_type,
                option_type_from_raw: raw?.option_type,
                option_style_from_data: data?.option_style,
                option_style_from_raw: raw?.option_style,
                all_raw_keys: raw ? Object.keys(raw) : [],
            });
            if (raw || data) {
                const rawOptionType = data?.option_type ?? raw?.option_type;
                const rawOptionStyle = data?.option_style ?? raw?.option_style;
                console.info("[FXOptionFormModal] Raw values from data prop:", {
                    rawOptionType,
                    rawOptionStyle,
                    allDataKeys: data ? Object.keys(data) : [],
                    allRawKeys: raw ? Object.keys(raw) : [],
                });
                const normalizedOptionType = normalizeOptionType(rawOptionType);
                const normalizedOptionStyle = normalizeOptionStyle(rawOptionStyle);
                console.info("[FXOptionFormModal] Normalized values:", {
                    normalizedOptionType,
                    normalizedOptionStyle,
                });
                setForm((prev) => {
                    const updatedForm = {
                        ...prev,
                        trade_id: data?.trade_id ?? prev.trade_id,
                        fund_id: data?.fund_id ?? prev.fund_id,
                        position: data?.position ?? (raw?.position as string) ?? prev.position,
                        quantity: data?.quantity ?? (raw?.quantity as number) ?? prev.quantity,
                        premium: data?.premium ?? (raw?.premium as number) ?? prev.premium,
                        option_type: normalizedOptionType || prev.option_type || "",
                        option_style: normalizedOptionStyle || prev.option_style || "",
                        strike: data?.strike ?? (raw?.strike as number) ?? prev.strike,
                        strike_currency: data?.strike_currency ?? (raw?.strike_currency as string) ?? prev.strike_currency,
                        underlying_trade_currency: data?.underlying_trade_currency ?? (raw?.underlying_trade_currency as string) ?? prev.underlying_trade_currency,
                        underlying_settlement_currency: data?.underlying_settlement_currency ?? (raw?.underlying_settlement_currency as string) ?? prev.underlying_settlement_currency,
                        maturity_date: data?.maturity_date ? toISODate(data?.maturity_date) : (raw?.maturity_date ? toISODate(raw.maturity_date as string) : prev.maturity_date),
                        counterparty: (data as any)?.counter_party_code ?? (raw?.counter_party_code as string) ?? data?.counterparty ?? prev.counterparty,
                        notes: data?.notes ?? (raw?.notes as string) ?? prev.notes,
                    };
                    console.info("[FXOptionFormModal] Setting form state:", updatedForm);
                    return updatedForm;
                });
            }
        } else {
            console.info("[FXOptionFormModal] Closed");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, data]);

    // Hydrate missing fields from backend by trade_id
    useEffect(() => {
        const hydrate = async () => {
            if (!isOpen) return;
            const id = form.trade_id;
            const needsHydration =
                !form.option_type ||
                !form.option_style ||
                form.premium == null ||
                !form.strike ||
                !form.strike_currency ||
                !form.underlying_trade_currency ||
                !form.underlying_settlement_currency ||
                !form.maturity_date ||
                (form.position ?? "") === "";
            if (!id || !needsHydration) return;
            try {
                console.info("[FXOptionFormModal] Hydrating missing fields for trade_id:", id);
                const token = await getToken();
                const resp = await axios.get(`/api/portfolio/fx-option-trade/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const row = resp.data?.data || resp.data;
                console.info("[FXOptionFormModal] Hydrated data from backend:", row);
                console.info("[FXOptionFormModal] Raw option_type:", row?.option_type, "Raw option_style:", row?.option_style);
                if (row) {
                    const normalizedType = normalizeOptionType(row.option_type);
                    const normalizedStyle = normalizeOptionStyle(row.option_style);
                    console.info("[FXOptionFormModal] Normalized option_type:", normalizedType, "Normalized option_style:", normalizedStyle);
                    setForm((f) => ({
                        ...f,
                        trade_id: row.trade_id ?? f.trade_id,
                        fund_id: row.fund_id ?? f.fund_id,
                        original_trade_id: row.original_trade_id ?? f.original_trade_id,
                        trade_type: "FX Option",
                        trade_date: row.trade_date ?? f.trade_date,
                        position: row.position ?? f.position,
                        quantity: row.quantity ?? f.quantity,
                        premium: row.premium ?? f.premium,
                        option_type: normalizedType || f.option_type || "",
                        option_style: normalizedStyle || f.option_style || "",
                        strike: row.strike ?? f.strike,
                        strike_currency: row.strike_currency ?? f.strike_currency,
                        underlying_trade_currency: row.underlying_trade_currency ?? f.underlying_trade_currency,
                        underlying_settlement_currency: row.underlying_settlement_currency ?? f.underlying_settlement_currency,
                        maturity_date: row.maturity_date
                            ? toISODate(row.maturity_date)
                            : f.maturity_date,
                        counterparty: row.counterparty ?? row.counter_party_code ?? f.counterparty,
                        notes: row.notes ?? f.notes,
                    }));
                }
            } catch (e) {
                console.warn("[FXOptionFormModal] hydrate failed", e);
            }
        };
        hydrate();
    }, [isOpen, form.trade_id, getToken, form.option_type, form.option_style, form.premium, form.strike, form.strike_currency, form.underlying_trade_currency, form.underlying_settlement_currency, form.maturity_date, form.position]);

	const readonly = mode === "view";
	const heading =
		title ??
		(mode === "create"
			? "New FX Option"
			: mode === "edit"
			? "Edit FX Option"
			: "View FX Option");

	const canSubmit = useMemo(() => {
		if (readonly) return false;
		return Boolean(
			form.position &&
				clampNumber(form.quantity) &&
				form.maturity_date &&
				clampNumber(form.strike) !== null &&
				form.underlying_trade_currency &&
				form.underlying_settlement_currency &&
				form.option_type
		);
	}, [form, readonly]);

	const handleSubmit = () => {
		if (!onSubmit || !canSubmit) return;
		onSubmit({
			...form,
			quantity: clampNumber(form.quantity),
			premium: clampNumber(form.premium),
			strike: clampNumber(form.strike),
			maturity_date: toISODate(form.maturity_date),
		});
	};

    if (!isOpen || !portalEl) return null;

	return ReactDOM.createPortal(
		<div
			className="fx-option-form-overlay"
			role="dialog"
			aria-modal="true"
			onClick={onClose}
		>
			<div
				className="fx-option-form-modal"
				onClick={(e) => e.stopPropagation()}
				style={{
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
				} as React.CSSProperties}
			>
				<div className="fx-option-form-header">
					<h3 className="fx-option-form-title">{heading}</h3>
					<button
						className="fx-option-form-close"
						onClick={onClose}
						aria-label="Close"
					>
						×
					</button>
				</div>
				<div className="fx-option-form-body">
					<div className="fx-option-form-grid">
						<label className="fld">
							<span>Position</span>
							<select
								disabled={readonly}
								value={form.position ?? ""}
								onChange={(e) =>
									setForm((f) => ({ ...f, position: e.target.value as any }))
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
							<span>Premium</span>
							<input
								type="number"
								inputMode="decimal"
								disabled={readonly}
								value={form.premium ?? ""}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										premium: clampNumber(e.target.value),
									}))
								}
							/>
						</label>
						<label className="fld">
							<span>Option Type</span>
							<select
								disabled={readonly}
								value={form.option_type ?? ""}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										option_type: e.target.value as any,
									}))
								}
							>
								<option value="">Select</option>
								<option value="Call">Call</option>
								<option value="Put">Put</option>
							</select>
						</label>
						<label className="fld">
							<span>Style</span>
							<select
								disabled={readonly}
								value={form.option_style ?? ""}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										option_style: e.target.value as any,
									}))
								}
							>
								<option value="">Select</option>
								<option value="European">European</option>
								<option value="American">American</option>
							</select>
						</label>
						<label className="fld">
							<span>Strike</span>
							<input
								type="number"
								inputMode="decimal"
								disabled={readonly}
								value={form.strike ?? ""}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										strike: clampNumber(e.target.value),
									}))
								}
							/>
						</label>
						<label className="fld">
							<span>Strike Currency</span>
							<input
								type="text"
								disabled={readonly}
								value={form.strike_currency ?? ""}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										strike_currency: e.target.value.toUpperCase(),
									}))
								}
							/>
						</label>
						<label className="fld">
							<span>Underlying Trade Currency</span>
							<input
								type="text"
								disabled={readonly}
								value={form.underlying_trade_currency ?? ""}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										underlying_trade_currency: e.target.value.toUpperCase(),
									}))
								}
							/>
						</label>
						<label className="fld">
							<span>Underlying Settlement Currency</span>
							<input
								type="text"
								disabled={readonly}
								value={form.underlying_settlement_currency ?? ""}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										underlying_settlement_currency: e.target.value.toUpperCase(),
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
										maturity_date: toISODate(e.target.value),
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
									setForm((f) => ({ ...f, counterparty: e.target.value }))
								}
							/>
						</label>
						<label className="fld fld-notes">
							<span>Notes</span>
							<textarea
								disabled={readonly}
								value={form.notes ?? ""}
								onChange={(e) =>
									setForm((f) => ({ ...f, notes: e.target.value }))
								}
							/>
						</label>
					</div>
				</div>
				{/* Additional fields: render any remaining DB columns */}
				{rawRow && (
					<div className="fx-option-form-body">
						<div className="fx-option-form-grid">
							{Object.entries(rawRow)
								.filter(([k]) => {
									// Exclude keys already rendered above (all form fields + details)
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
										"trade_price", // shown as "Premium" in main form
										// Computed fields that should never be shown in forms
										"itd_pnl",
										"ytd_pnl",
										"mtd_pnl",
										"dtd_pnl",
										"eod_price",
										"eom_price",
										"eoy_price",
										"current_price",
										"price", // computed, not raw trade field
									];
									const knownKeys = new Set<string>([...baseKeys, ...extraKnown]);
									if (knownKeys.has(k)) return false;
									// Hide keys that look like computed PnL or derived prices
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
										<input disabled value={value == null ? "" : String(value)} />
									</label>
								))}
						</div>
					</div>
				)}
				<div className="fx-option-form-footer">
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

export default FXOptionFormModal;

