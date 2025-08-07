import React, { createContext, useContext, useState, useCallback } from "react";
import { ESPQuote, RFSQuote } from "../types/quote";

interface QuotesContextType {
    espQuotes: ESPQuote[];
    rfsQuotes: RFSQuote[];
    updateESPQuotes: (quote: ESPQuote) => void;
    updateRFSQuotes: (quote: RFSQuote) => void;
}

const QuotesContext = createContext<QuotesContextType | undefined>(undefined);

export const QuotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [espQuotes, setESPQuotes] = useState<Map<string, ESPQuote>>(new Map());
    const [rfsQuotes, setRFSQuotes] = useState<Map<string, RFSQuote[]>>(new Map()); // ✅ Store multiple quotes per symbol

    const updateESPQuotes = (newQuote: ESPQuote) => {
        setESPQuotes((prevQuotes) => {
            const newQuotes = new Map(prevQuotes);
            newQuotes.set(newQuote.quote_id, newQuote); // ✅ Store only latest quote per ID
            return newQuotes;
        });
    };

    const updateRFSQuotes = useCallback((quote: RFSQuote) => {
        setRFSQuotes((prevQuotes) => {
            const newQuotes = new Map(prevQuotes);

            // ✅ Store latest 10 quotes per symbol
            const existingQuotes = newQuotes.get(quote.symbol) || [];
            const updatedQuotes = [quote, ...existingQuotes].slice(0, 10);

            newQuotes.set(quote.symbol, updatedQuotes);
            return newQuotes;
        });
    }, []);

    return (
        <QuotesContext.Provider
            value={{
                espQuotes: Array.from(espQuotes.values()), // ✅ Convert ESP Map to array
                rfsQuotes: Array.from(rfsQuotes.values()).flat(), // ✅ Convert RFS Map to list of all quotes
                updateESPQuotes,
                updateRFSQuotes,
            }}
        >
            {children}
        </QuotesContext.Provider>
    );
};

export const useQuotes = () => {
    const context = useContext(QuotesContext);
    if (!context) {
        throw new Error("useQuotes must be used within a QuotesProvider");
    }
    return context;
};
