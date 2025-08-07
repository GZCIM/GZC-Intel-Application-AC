import { useState, useEffect, useRef } from "react";
import { useAuthContext, useDateContext } from "../../ui-library";
import { alova } from "../utils/alova"; // NEW
import { Transaction } from "../types/transaction";

export const useTransactionsData = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentDate } = useDateContext();
    const { getToken } = useAuthContext();
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                const token = await getToken();
                console.log("[TransactionsData] Token:", token);

                const params = new URLSearchParams();
                if (currentDate) {
                    params.append(
                        "currentDate",
                        currentDate.toISOString().split("T")[0]
                    );
                }

                const url = `/transactions/unmatched?${params.toString()}`;
                console.log("[TransactionsData] Fetching:", url);

                const request = alova.Get<{ data: { data: Transaction[] } }>(
                    url,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const response = await request.send();
                console.log("[TransactionsData] Response:", response);

                if (response?.data) {
                    setTransactions(response.data.data);
                } else {
                    setTransactions([]);
                }

                setError(null);
            } catch (err) {
                if (err instanceof Error) {
                    console.error("[TransactionsData] Error:", err.message);
                    setError(err.message);
                } else {
                    console.error("[TransactionsData] Unknown error:", err);
                    setError("Unexpected error");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5 * 60 * 1000); // 5-minute polling
        return () => clearInterval(interval);
    }, [currentDate, getToken]);

    return { transactions, isLoading, error };
};
