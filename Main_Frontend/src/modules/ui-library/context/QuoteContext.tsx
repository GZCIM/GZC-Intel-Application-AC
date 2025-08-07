//gzc-ui\src\context\QuoteContext.tsx
import React, { createContext, useContext, useState, useCallback } from "react";

import { QuoteMessage } from "../types/quote";

type QuoteKey = string;

interface QuoteContextValue {
    latestQuotes: Record<QuoteKey, QuoteMessage>;
    updateQuote: (quote: QuoteMessage) => void;
}

const QuoteContext = createContext<QuoteContextValue | undefined>(undefined);

export const QuoteProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [latestQuotes, setLatestQuotes] = useState<
        Record<QuoteKey, QuoteMessage>
    >({});

    const updateQuote = useCallback((quote: QuoteMessage) => {
        if (quote.type === "status") {
            console.log("Status message received:", quote.message);
        } else {
            const key = `${quote.symbol}_${
                quote.entry_type == 0 ? "ask" : "bid"
            }`;
            setLatestQuotes((prev) => ({ ...prev, [key]: quote }));
        }
    }, []);

    return (
        <QuoteContext.Provider value={{ latestQuotes, updateQuote }}>
            {children}
        </QuoteContext.Provider>
    );
};

export function useQuoteContext(): QuoteContextValue {
    const context = useContext(QuoteContext);
    if (!context) {
        throw new Error("useQuoteContext must be used within a QuoteProvider");
    }
    return context;
}
