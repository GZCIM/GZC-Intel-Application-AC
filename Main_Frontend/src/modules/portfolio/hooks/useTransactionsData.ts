import { useState, useEffect } from "react";
import { useDateContext } from "../../ui-library";
import { apiClient } from "../../../utils/axios";
import { Transaction } from "../types/transaction";

export const useTransactionsData = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentDate } = useDateContext();
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Token is now handled automatically by the apiClient interceptor
                console.log(
                    "[TransactionsData] Making authenticated request..."
                );

                const params = new URLSearchParams();
                if (currentDate) {
                    params.append(
                        "currentDate",
                        currentDate.toISOString().split("T")[0]
                    );
                }

                const url = `/transactions/unmatched?${params.toString()}`;
                console.log("[TransactionsData] Fetching:", url);

                const response = await apiClient.get<{
                    data: { data: Transaction[] };
                }>(url);
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
    }, [currentDate]);

    return { transactions, isLoading, error };
};
