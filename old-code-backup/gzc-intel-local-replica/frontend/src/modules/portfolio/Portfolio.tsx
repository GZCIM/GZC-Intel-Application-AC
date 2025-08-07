import React, { useState, useEffect } from "react";
import { PortfolioMetrics } from "./components/PortfolioMetrics";
import { PortfolioFilters } from "./components/PortfolioFilters";
import { PortfolioTable } from "./components/PortfolioTable";
import { PortfolioFilter } from "./types/portfolio";
import { useQuoteStream } from "./hooks/useQuoteStream";
// Mock contexts for now since ui-library has issues
const useQuoteContext = () => ({
    updateQuote: (quote: any) => console.log('Quote update:', quote)
});

const useAuthContext = () => ({
    getToken: async () => 'mock-token'
});
import { quantumTheme } from "../../theme/quantum";

const Portfolio = () => {
    const contextValue = useAuthContext();
    const { getToken } = contextValue;
    const { updateQuote } = useQuoteContext();

    useEffect(() => {
        console.log("[Portfolio] Component mounted");
        console.log("[Portfolio] Auth context value:", contextValue);
    }, [contextValue]);

    useQuoteStream("esp", updateQuote, true, getToken);

    const [filters, setFilters] = useState<PortfolioFilter>({
        symbol: "",
        fundId: undefined,
        trader: "",
        position: "",
        search: "",
        assetClass: "",
        status: ""
    });

    return (
        <div style={{ 
            height: '100%',
            width: '100%',
            backgroundColor: quantumTheme.background,
            color: quantumTheme.text,
            padding: '16px',
            overflow: 'auto'
        }}>
            <PortfolioMetrics isConnected={true} />
            <PortfolioFilters filters={filters} onFilterChange={setFilters} />
            <PortfolioTable filters={filters} />
        </div>
    );
};

Portfolio.displayName = 'Portfolio';

export default Portfolio;
