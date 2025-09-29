import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useTheme } from "../../contexts/ThemeContext";

interface PortfolioProps {
    apiEndpoint?: string;
}

export const Portfolio: React.FC<PortfolioProps> = ({
    apiEndpoint = process.env.NODE_ENV === "development"
        ? "http://localhost:8080"
        : "/api/bloomberg",
}) => {
    const { currentTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [portfolios, setPortfolios] = useState<
        Array<{ id: string; name: string }>
    >([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
    const [dataMode, setDataMode] = useState<"live" | "eod" | "date">("live");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [portfolioMode, setPortfolioMode] = useState<"active" | "virtual">(
        "active"
    );

    // Load persisted mode/date from localStorage
    useEffect(() => {
        try {
            const savedMode = localStorage.getItem("portfolio.dataMode");
            if (
                savedMode === "live" ||
                savedMode === "eod" ||
                savedMode === "date"
            ) {
                setDataMode(savedMode);
            }
            const savedDate = localStorage.getItem("portfolio.selectedDate");
            if (savedDate) {
                setSelectedDate(savedDate);
            }
            const savedPMode = localStorage.getItem("portfolio.mode");
            if (savedPMode === "active" || savedPMode === "virtual") {
                setPortfolioMode(savedPMode);
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

    const formatDateBadge = (value?: string) => {
        try {
            const d = value ? new Date(value) : new Date();
            return d.toLocaleDateString("en-GB"); // dd/MM/yyyy
        } catch (_) {
            return new Date().toLocaleDateString("en-GB");
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

    return (
        <div
            style={{
                backgroundColor: currentTheme.surface,
                borderRadius: "8px",
                border: `1px solid ${currentTheme.border}`,
                overflow: "hidden",
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                style={{
                    padding: "8px",
                    borderBottom: `1px solid ${currentTheme.border}`,
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                }}
            >
                {/* Left controls: Active/Virtual toggle and portfolio select */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Active/Virtual toggle */}
                    <div style={{ display: "flex", gap: 6 }}>
                        <button
                            type="button"
                            onClick={() => setPortfolioMode("active")}
                            style={{
                                padding: "4px 8px",
                                backgroundColor:
                                    portfolioMode === "active"
                                        ? currentTheme.success || "#6aa84f"
                                        : "#1e1e1e",
                                color:
                                    portfolioMode === "active"
                                        ? "#ffffff"
                                        : currentTheme.textSecondary,
                                border: `1px solid ${currentTheme.border}66`,
                                borderRadius: 4,
                                fontSize: 11,
                                cursor: "pointer",
                            }}
                        >
                            Active
                        </button>
                        <button
                            type="button"
                            onClick={() => setPortfolioMode("virtual")}
                            style={{
                                padding: "4px 8px",
                                backgroundColor:
                                    portfolioMode === "virtual"
                                        ? currentTheme.success || "#6aa84f"
                                        : "#1e1e1e",
                                color:
                                    portfolioMode === "virtual"
                                        ? "#ffffff"
                                        : currentTheme.textSecondary,
                                border: `1px solid ${currentTheme.border}66`,
                                borderRadius: 4,
                                fontSize: 11,
                                cursor: "pointer",
                            }}
                        >
                            Virtual
                        </button>
                    </div>

                    <label
                        style={{
                            fontSize: "12px",
                            color: currentTheme.textSecondary,
                            marginRight: 8,
                        }}
                    >
                        Portfolio:
                    </label>
                    <select
                        value={selectedPortfolioId}
                        onChange={(e) => setSelectedPortfolioId(e.target.value)}
                        aria-label="Select portfolio"
                        style={{
                            backgroundColor: currentTheme.background,
                            color: currentTheme.text,
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: 4,
                            padding: "4px 8px",
                            fontSize: 12,
                        }}
                    >
                        {portfolios.length === 0 ? (
                            <option value="">Select Portfolio</option>
                        ) : (
                            portfolios.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))
                        )}
                    </select>

                    {/* Show create action when in Virtual portfolio mode */}
                    {portfolioMode === "virtual" && (
                        <button
                            type="button"
                            onClick={() => console.log("Create new virtual portfolio")}
                            style={{
                                marginLeft: 8,
                                padding: "4px 10px",
                                backgroundColor: (currentTheme.success || "#6aa84f") + "33",
                                color: currentTheme.text,
                                border: `1px solid ${currentTheme.border}66`,
                                borderRadius: 4,
                                fontSize: 12,
                                cursor: "pointer",
                            }}
                            title="Create New Portfolio"
                        >
                            + Create New Portfolio
                        </button>
                    )}
                </div>

                {/* Right controls: Sync DB, Live/EOD/Date, Date control */}
                <div
                    style={{
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    <button
                        onClick={() => console.log("Portfolio: Sync DB")}
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
                            boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.2)",
                        }}
                    >
                        Sync DB
                    </button>
                    <div style={{ display: "flex", gap: 6 }}>
                        <button
                            onClick={() => setDataMode("live")}
                            style={{
                                padding: "4px 8px",
                                backgroundColor:
                                    dataMode === "live"
                                        ? currentTheme.success || "#6aa84f"
                                        : "#1e1e1e",
                                color:
                                    dataMode === "live"
                                        ? "#ffffff"
                                        : currentTheme.textSecondary,
                                border: `1px solid ${currentTheme.border}66`,
                                borderRadius: 4,
                                fontSize: 11,
                                cursor: "pointer",
                            }}
                        >
                            Live
                        </button>
                        <button
                            onClick={() => setDataMode("eod")}
                            style={{
                                padding: "4px 8px",
                                backgroundColor:
                                    dataMode === "eod"
                                        ? currentTheme.success || "#6aa84f"
                                        : "#1e1e1e",
                                color:
                                    dataMode === "eod"
                                        ? "#ffffff"
                                        : currentTheme.textSecondary,
                                border: `1px solid ${currentTheme.border}66`,
                                borderRadius: 4,
                                fontSize: 11,
                                cursor: "pointer",
                            }}
                        >
                            EOD
                        </button>
                        <button
                            onClick={() => setDataMode("date")}
                            style={{
                                padding: "4px 8px",
                                backgroundColor:
                                    dataMode === "date"
                                        ? currentTheme.success || "#6aa84f"
                                        : "#1e1e1e",
                                color:
                                    dataMode === "date"
                                        ? "#ffffff"
                                        : currentTheme.textSecondary,
                                border: `1px solid ${currentTheme.border}66`,
                                borderRadius: 4,
                                fontSize: 11,
                                cursor: "pointer",
                            }}
                        >
                            Date
                        </button>
                    </div>
                    {dataMode === "date" ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) =>
                                    setSelectedDate(e.target.value)
                                }
                                style={{
                                    padding: "4px 8px",
                                    backgroundColor: "#0f0f0f",
                                    color: "#eaeaea",
                                    border: `1px solid ${currentTheme.border}66`,
                                    borderRadius: 4,
                                    fontSize: 11,
                                }}
                            />
                        </div>
                    ) : (
                        <div
                            title="Date"
                            style={{
                                padding: "4px 8px",
                                backgroundColor: "#1e1e1e",
                                color: currentTheme.textSecondary,
                                border: `1px solid ${currentTheme.border}66`,
                                borderRadius: 4,
                                fontSize: 11,
                            }}
                        >
                            {formatDateBadge(selectedDate)}
                        </div>
                    )}
                </div>
            </div>

            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    backgroundColor: currentTheme.background,
                    padding: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: currentTheme.textSecondary,
                    fontSize: 12,
                    borderTop: `1px solid ${currentTheme.border}20`,
                }}
            >
                {selectedPortfolio ? (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `1px dashed ${currentTheme.border}`,
                            borderRadius: 4,
                            background: currentTheme.surface + "20",
                        }}
                    >
                        Portfolio view is coming soon
                    </div>
                ) : (
                    <div>Select a portfolio to view details</div>
                )}
            </div>
        </div>
    );
};

export default Portfolio;
