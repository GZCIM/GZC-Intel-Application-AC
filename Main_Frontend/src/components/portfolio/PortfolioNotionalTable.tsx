import React, { useMemo } from "react";

type PositionRow = Record<string, any>;

export type NotionalPlacement = "off" | "above" | "below";

interface PortfolioNotionalTableProps {
    positions: PositionRow[];
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

export const PortfolioNotionalTable: React.FC<PortfolioNotionalTableProps> = ({ positions, theme }) => {
    const rowsByBucket = useMemo(() => {
        const buckets = new Map<string, Map<string, { notional: number; notionalUsd: number }>>();
        const ensure = (bucket: string, ccy: string) => {
            if (!buckets.has(bucket)) buckets.set(bucket, new Map());
            const m = buckets.get(bucket)!;
            if (!m.has(ccy)) m.set(ccy, { notional: 0, notionalUsd: 0 });
            return m.get(ccy)!;
        };

        positions.forEach((p) => {
            const tradeType = String(p.trade_type || "");
            const bucket = tradeType.includes("Option") ? "FXOptions" : "FX";
            const ccy = String(p.trade_currency || p.trade_ccy || p.tradeCurrency || "").toUpperCase();
            if (!ccy) return;

            // Heuristics:
            // - Use quantity as native notional if present, otherwise use position
            // - Convert to USD using eod_price/price when available, otherwise 0
            const quantity = Number(p.quantity ?? p.position ?? 0) || 0;
            const rate = Number(p.eod_price ?? p.price ?? 0) || 0;
            const native = quantity; // assume quantity is in trade ccy
            const usd = ccy === "USD" ? native : (rate ? native * rate : 0);

            const acc = ensure(bucket, ccy);
            acc.notional += native;
            acc.notionalUsd += usd;
        });

        // Build rows
        const makeRows = (bucket: string) => {
            const map = buckets.get(bucket);
            if (!map) return [] as NotionalRow[];
            return Array.from(map.entries()).map(([ccy, v]) => ({ ccy, notional: v.notional, notionalUsd: v.notionalUsd, bucket }));
        };

        return {
            FX: makeRows("FX"),
            FXOptions: makeRows("FXOptions"),
        };
    }, [positions]);

    const sectionTotal = (rows: NotionalRow[]) => rows.reduce((a, r) => ({
        notional: a.notional + r.notional,
        notionalUsd: a.notionalUsd + r.notionalUsd,
    }), { notional: 0, notionalUsd: 0 });

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
            <TableSection title="FX" rows={rowsByBucket.FX} />
            <TableSection title="FXOptions" rows={rowsByBucket.FXOptions} />
        </div>
    );
};

export default PortfolioNotionalTable;


