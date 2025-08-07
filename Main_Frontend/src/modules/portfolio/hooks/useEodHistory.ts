import { useState, useEffect } from "react";
import { apiClient } from "../../../utils/axios";
import { useDateContext } from "../../ui-library";
import type { QuoteInput, QuoteHistory } from "../../ui-library";

export const useEodHistory = (quotes: QuoteInput[]) => {
    const [history, setHistory] = useState<Record<string, QuoteHistory>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { currentDate } = useDateContext();

    useEffect(() => {
        if (!quotes.length) return;
        setLoading(true);
        setError(null);

        const fetchEod = async () => {
            try {
                // Token is now handled automatically by the apiClient interceptor
                console.log("[useEodHistory] Making authenticated request...");

                const response = await apiClient.post<
                    Record<string, QuoteHistory>
                >("/historical_quote/", {
                    quotes,
                    currentDate: currentDate.toISOString().split("T")[0],
                });
                setHistory(response.data);
            } catch (err: unknown) {
                console.error("[useEodHistory] Fetch error:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchEod();
    }, [quotes, currentDate]);

    return { history, loading, error };
};
