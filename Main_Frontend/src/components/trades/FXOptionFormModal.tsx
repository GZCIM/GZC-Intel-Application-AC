import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "./TradeForms.css";
import { useTheme } from "../../contexts/ThemeContext";

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
	// Preserve any extra fields passed in via data to render transparently
	const rawRowData = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
	const [rawRow] = useState<Record<string, unknown> | null>(rawRowData);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
	const [form, setForm] = useState<FXOptionFormData>(() => {
		const raw = rawRowData;
		return {
			trade_id: data?.trade_id ?? null,
			fund_id: data?.fund_id ?? null,
			position: data?.position ?? (raw?.position as string) ?? "",
			quantity: data?.quantity ?? (raw?.quantity as number) ?? null,
			premium: data?.premium ?? (raw?.premium as number) ?? null,
			option_type: data?.option_type ?? (raw?.option_type as string) ?? "",
			option_style: data?.option_style ?? (raw?.option_style as string) ?? "",
			strike: data?.strike ?? (raw?.strike as number) ?? null,
			strike_currency: data?.strike_currency ?? (raw?.strike_currency as string) ?? "",
			underlying_trade_currency: data?.underlying_trade_currency ?? (raw?.underlying_trade_currency as string) ?? "",
			underlying_settlement_currency: data?.underlying_settlement_currency ?? (raw?.underlying_settlement_currency as string) ?? "",
			maturity_date: data?.maturity_date ? toISODate(data?.maturity_date) : (raw?.maturity_date ? toISODate(raw.maturity_date as string) : null),
			counterparty: (data as any)?.counter_party_code ?? (raw?.counter_party_code as string) ?? data?.counterparty ?? null,
			notes: data?.notes ?? (raw?.notes as string) ?? null,
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
            console.info("[FXOptionFormModal] Opening with data:", form);
        } else {
            console.info("[FXOptionFormModal] Closed");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);
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

