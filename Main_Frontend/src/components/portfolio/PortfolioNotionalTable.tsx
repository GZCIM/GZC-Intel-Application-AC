import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../utils/axios";

type PositionRow = Record<string, any>;

export type NotionalPlacement = "off" | "above" | "below";

interface PortfolioNotionalTableProps {
    // Backend-driven: compute and return per-ccy notionals for FX and FXOptions
    selectedDate: string; // YYYY-MM-DD
    fundId: number | null | undefined; // 0 or null => ALL
    theme: {
        background: string;
        surface: string;
        surfaceAlt: string;
        text: string;
        border: string;
        primary: string;
    };
}

interface NotionalRow {
    ccy: string;
    notional: number;
    notionalUsd: number;
    bucket: string; // e.g., FX, FXOptions
}

function formatNumber(n: number): string {
    return n.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

export const PortfolioNotionalTable: React.FC<PortfolioNotionalTableProps> = ({ selectedDate, fundId, theme }) => {
    const [rowsByBucket, setRowsByBucket] = useState<{ FX: NotionalRow[]; FXOptions: NotionalRow[] }>({ FX: [], FXOptions: [] });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                setLoading(true);
                setError(null);
                const params = new URLSearchParams();
                params.set("date", selectedDate);
                if (fundId !== null && fundId !== undefined) {
                    params.set("fundId", String(fundId));
                }
                const { data } = await apiClient.get(`/api/portfolio/notional-summary?${params.toString()}`);
                if (cancelled) return;
                const fx: NotionalRow[] = (data?.data?.FX || []).map((r: any) => ({
                    ccy: String(r.ccy || "").toUpperCase(),
                    notional: Number(r.notional || 0),
                    notionalUsd: Number(r.notional_usd || 0),
                    bucket: "FX",
                }));
                const fxopt: NotionalRow[] = (data?.data?.FXOptions || []).map((r: any) => ({
                    ccy: String(r.ccy || "").toUpperCase(),
                    notional: Number(r.notional || 0),
                    notionalUsd: Number(r.notional_usd || 0),
                    bucket: "FXOptions",
                }));
                setRowsByBucket({ FX: fx, FXOptions: fxopt });
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.message || "Failed to load notional summary");
                setRowsByBucket({ FX: [], FXOptions: [] });
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (selectedDate) load();
        return () => { cancelled = true; };
    }, [selectedDate, fundId]);

    const sectionTotal = (rows: NotionalRow[]) => rows.reduce((a, r) => ({
        notional: a.notional + r.notional,
        notionalUsd: a.notionalUsd + r.notionalUsd,
    }), { notional: 0, notionalUsd: 0 });

    // Combine FX and FXOptions into total exposure per CCY (both sides of trades)
    const combinedRows: NotionalRow[] = useMemo(() => {
        const map = new Map<string, { notional: number; notionalUsd: number }>();
        const add = (rows: NotionalRow[]) => {
            rows.forEach((r) => {
                const key = r.ccy.toUpperCase();
                const prev = map.get(key) || { notional: 0, notionalUsd: 0 };
                map.set(key, { notional: prev.notional + r.notional, notionalUsd: prev.notionalUsd + r.notionalUsd });
            });
        };
        add(rowsByBucket.FX);
        add(rowsByBucket.FXOptions);
        return Array.from(map.entries()).map(([ccy, v]) => ({ ccy, notional: v.notional, notionalUsd: v.notionalUsd, bucket: "ALL" }));
    }, [rowsByBucket]);

    const TableSection: React.FC<{ title: string; rows: NotionalRow[] }> = ({ title, rows }) => {
        if (!rows.length) return null;
        const t = sectionTotal(rows);
        return (
            <div style={{ marginBottom: 8 }}>
                <div style={{
                    fontWeight: 700,
                    padding: "6px 8px",
                    background: theme.surfaceAlt,
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                }}>{title}</div>
                <div>
                    {rows.map((r, idx) => (
                        <div key={`${title}-${r.ccy}-${idx}`} style={{
                            display: "grid",
                            gridTemplateColumns: "120px 1fr 1fr",
                            gap: 8,
                            padding: "6px 8px",
                            borderLeft: `1px solid ${theme.border}`,
                            borderRight: `1px solid ${theme.border}`,
                            borderBottom: `1px solid ${theme.border}`,
                            background: idx % 2 ? theme.surface : theme.background,
                            color: theme.text,
                        }}>
                            <div style={{ fontWeight: 600 }}>{r.ccy}</div>
                            <div>{formatNumber(r.notional)}</div>
                            <div>{formatNumber(r.notionalUsd)}</div>
                        </div>
                    ))}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "120px 1fr 1fr",
                        gap: 8,
                        padding: "6px 8px",
                        border: `1px solid ${theme.border}`,
                        background: theme.surfaceAlt,
                        color: theme.text,
                        fontWeight: 700,
                    }}>
                        <div>Total {title}</div>
                        <div>{formatNumber(t.notional)}</div>
                        <div>{formatNumber(t.notionalUsd)}</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            overflow: "hidden",
            background: theme.background,
        }}>
            {loading && (
                <div style={{ padding: "8px", color: theme.text }}>Loading notional…</div>
            )}
            {error && (
                <div style={{ padding: "8px", color: theme.text }}>Error: {error}</div>
            )}
            <div style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 1fr",
                gap: 8,
                padding: "8px",
                background: theme.surface,
                color: theme.text,
                fontWeight: 700,
            }}>
                <div>CCY</div>
                <div>Notional</div>
                <div>Notional USD</div>
            </div>
            {/* Combined view across FX and FXOptions */}
            <TableSection title="Total by CCY" rows={combinedRows} />
            <TableSection title="FX" rows={rowsByBucket.FX} />
            <TableSection title="FXOptions" rows={rowsByBucket.FXOptions} />
        </div>
    );
};

export default PortfolioNotionalTable;


