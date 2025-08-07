import { useState, useEffect, useRef } from "react";
import { useAuthContext, useDateContext} from "../../ui-library";
import { alova } from "../utils/alova"; // uses baseURL internally
import { PortfolioItem, PortfolioFilter } from "../types/portfolio";


export const usePortfolioData = (filters?: PortfolioFilter) => {
    //const getTokenRef = useRef(getToken);
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentDate } = useDateContext();
    const { getToken } = useAuthContext();
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                const token = await getToken();
                console.log("[PortfolioData] Token:", token);
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
                const url = `/portfolio?${params.toString()}`; // relative to baseURL
                console.log("[PortfolioData] Fetching:", url);

                const request = alova.Get<{ data: { data: PortfolioItem[] } }>(
                    url,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const response = await request.send();
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
        getToken
    ]);

    return { portfolio, isLoading, error };
};
