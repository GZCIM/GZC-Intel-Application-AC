import { useState, useEffect } from "react";
import { useDateContext } from "../../ui-library";
import { apiClient } from "../../../utils/axios";
import { PortfolioItem, PortfolioFilter } from "../types/portfolio";

export const usePortfolioData = (filters?: PortfolioFilter) => {
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentDate } = useDateContext();
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Token is now handled automatically by the apiClient interceptor
                console.log("[PortfolioData] Making authenticated request...");

                const params = new URLSearchParams();
                if (filters?.symbol) params.append("symbol", filters.symbol);
                if (filters?.fundId)
                    params.append("fundId", filters.fundId.toString());
                if (filters?.trader) params.append("trader", filters.trader);
                if (filters?.position)
                    params.append("position", filters.position);
                if (currentDate) {
                    params.append(
                        "currentDate",
                        currentDate.toISOString().split("T")[0]
                    );
                }

                console.log("[PortfolioData] Filters:", filters);
                const url = `/portfolio?${params.toString()}`;
                console.log("[PortfolioData] Fetching:", url);

                const response = await apiClient.get<{
                    data: { data: PortfolioItem[] };
                }>(url);
                console.log("[PortfolioData] Response:", response);

                if (response?.data) {
                    setPortfolio(response.data.data);
                } else {
                    setPortfolio([]);
                }

                setError(null);
            } catch (err) {
                if (err instanceof Error) {
                    console.error("[PortfolioData] Error:", err.message);
                    setError(err.message);
                } else {
                    console.error("[PortfolioData] Unknown error:", err);
                    setError("Unexpected error");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [
        filters?.symbol,
        filters?.fundId,
        filters?.trader,
        filters?.position,
        currentDate,
    ]);

    return { portfolio, isLoading, error };
};
