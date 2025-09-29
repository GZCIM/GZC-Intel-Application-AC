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
    const [portfolios, setPortfolios] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");

    useEffect(() => {
        const fetchPortfolios = async () => {
            setLoading(true);
            setError(null);
            try {
                const resp = await axios.get(`${apiEndpoint}/api/portfolio/list`);
                const list = (resp.data?.data || resp.data || []).map((p: any, idx: number) => ({
                    id: String(p.id ?? idx),
                    name: String(p.name ?? p.title ?? `Portfolio ${idx + 1}`),
                }));
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                </div>

                <div style={{ marginLeft: "auto", fontSize: 11, color: currentTheme.textSecondary }}>
                    {loading ? "Loading..." : error ? "" : selectedPortfolio ? selectedPortfolio.name : "No selection"}
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
