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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
	const [form, setForm] = useState<FXOptionFormData>(() => ({
		trade_id: data?.trade_id ?? null,
		fund_id: data?.fund_id ?? null,
		position: data?.position ?? "",
		quantity: data?.quantity ?? null,
		premium: data?.premium ?? null,
		option_type: data?.option_type ?? "",
		option_style: data?.option_style ?? "",
		strike: data?.strike ?? null,
		strike_currency: data?.strike_currency ?? "",
		underlying_trade_currency: data?.underlying_trade_currency ?? "",
		underlying_settlement_currency: data?.underlying_settlement_currency ?? "",
		maturity_date: data?.maturity_date ? toISODate(data?.maturity_date) : null,
		counterparty: data?.counterparty ?? null,
		notes: data?.notes ?? null,
	}));

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
		<div className="fx-option-form-overlay" role="dialog" aria-modal="true">
			<div
				className="fx-option-form-modal"
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

