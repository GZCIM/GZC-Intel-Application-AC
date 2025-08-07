import { useState, useEffect, useRef } from "react";
import { alova } from "../utils/alova"; // NEW
import { useAuthContext, useDateContext } from "../../ui-library";
import type { QuoteInput, QuoteHistory } from "../../ui-library";

export const useEodHistory = (quotes: QuoteInput[]) => {
    const [history, setHistory] = useState<Record<string, QuoteHistory>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { currentDate } = useDateContext();
    const { getToken } = useAuthContext();
    const getTokenRef = useRef(getToken);

    useEffect(() => {
        if (!quotes.length) return;
        setLoading(true);
        setError(null);

        const fetchEod = async () => {
            try {
                const token = await getTokenRef.current(); // UPDATED
                const request = alova.Post<Record<string, QuoteHistory>>( // NEW
                    "/historical_quote/",
                    {
                        quotes,
                        currentDate: currentDate.toISOString().split("T")[0],
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
                const response = await request.send(); // NEW
                setHistory(
                    response.data as unknown as Record<string, QuoteHistory>
                ); // UPDATED
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
