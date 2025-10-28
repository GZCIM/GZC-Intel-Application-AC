import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface PortfolioHeaderProps {
    title: string;
    dateText: string; // yyyy-mm-dd
    portfolioMode: "active" | "virtual";
    onChangePortfolioMode: (mode: "active" | "virtual") => void;
    funds: Array<{ id: number; short_name: string; full_name: string }>;
    selectedFundId: string;
    onChangeFund: (id: string) => void;
    onSyncDb?: () => void;
    onLoadFxTrades?: () => void;
    onLoadFxOptions?: () => void;
    dataMode: "live" | "eod";
    onChangeDataMode: (mode: "live" | "eod") => void;
}

// Sticky, always-visible unified Portfolio header. Occupies the component viewport width.
const PortfolioHeader: React.FC<PortfolioHeaderProps> = ({
    title,
    dateText,
    portfolioMode,
    onChangePortfolioMode,
    funds,
    selectedFundId,
    onChangeFund,
    onSyncDb,
    onLoadFxTrades,
    onLoadFxOptions,
    dataMode,
    onChangeDataMode,
}) => {
    const { currentTheme } = useTheme();
    const chip = (active: boolean) => ({
        padding: "4px 8px",
        backgroundColor: active ? currentTheme.surface : "#1e1e1e",
        color: active ? "#ffffff" : currentTheme.textSecondary,
        border: `1px solid ${active ? (currentTheme.success || "#6aa84f") : currentTheme.border + "66"}`,
        borderRadius: 4,
        fontSize: 11,
        cursor: "pointer" as const,
    });
    return (
        <div
            className="gzc-portfolio-header"
            style={{
                position: "sticky",
                top: 0,
                left: 0,
                width: "100%",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 8px",
                borderBottom: `1px solid ${currentTheme.border}`,
                background: currentTheme.surface,
                flexWrap: "wrap",
            }}
        >
            <span style={{ color: currentTheme.text, fontWeight: 600, fontSize: 12 }}>Portfolio</span>

            <button
                onClick={() => onChangePortfolioMode("active")}
                style={chip(portfolioMode === "active")}
            >
                Active
            </button>
            <button
                onClick={() => onChangePortfolioMode("virtual")}
                style={chip(portfolioMode === "virtual")}
            >
                Virtual
            </button>

            <span style={{ color: currentTheme.textSecondary, fontSize: 12 }}>Fund</span>
            <span
                style={{
                    padding: "4px 8px",
                    backgroundColor: "#1e1e1e",
                    color: currentTheme.text,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: 4,
                    fontSize: 11,
                    minWidth: 40,
                    textAlign: "center" as const,
                }}
                title="Selected fund"
            >
                {(() => {
                    const f = funds.find((x) => String(x.id) === selectedFundId);
                    return f?.short_name || "GMF";
                })()}
            </span>

            <button onClick={onSyncDb} style={{
                padding: "4px 12px",
                backgroundColor: "#5da0ea",
                color: "#ffffff",
                border: `1px solid #3b82f6`,
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
            }}>Sync DB</button>

            <button onClick={onLoadFxTrades} style={{
                padding: "4px 8px",
                backgroundColor: "#1e1e1e",
                color: "#eaeaea",
                border: `1px solid ${currentTheme.border}66`,
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
            }}>FX Trades</button>

            <button onClick={onLoadFxOptions} style={{
                padding: "4px 8px",
                backgroundColor: "#1e1e1e",
                color: "#eaeaea",
                border: `1px solid ${currentTheme.border}66`,
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
            }}>FX Options</button>

            <button
                onClick={() => onChangeDataMode("live")}
                className={`gzc-chip ${dataMode === "live" ? "gzc-chip--active" : ""}`}
                style={chip(dataMode === "live")}
            >
                Live
            </button>
            <button
                onClick={() => onChangeDataMode("eod")}
                className={`gzc-chip ${dataMode === "eod" ? "gzc-chip--active" : ""}`}
                style={chip(dataMode === "eod")}
            >
                EOD
            </button>

            <span
                style={{
                    color: currentTheme.success,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${currentTheme.success || "#6aa84f"}`,
                    borderRadius: 4,
                    padding: "4px 8px",
                }}
                title="Date"
            >
                {dateText}
            </span>
        </div>
    );
};

export default PortfolioHeader;


