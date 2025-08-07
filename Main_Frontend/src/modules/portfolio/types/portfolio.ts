export interface PortfolioItem {
    Id: number;
    TradeID: number;
    TradeDate: string;
    TradeType: number;
    BaseCurrency: string;
    QuoteCurrency: string;
    QuoteType: number;
    ExpirationOrMaturityDate: string;
    OriginalId: number;
    TradeEvent: number;
    Fund: number;
    Position: string;
    Trader: string;
    ModUser: string;
    ModTimestamp: string;
    ExecutionID: string | null;
    OrderID: string;
    Symbol: string;
    Side: string;
    OrderQty: number;
    Price: number;
    Currency: string;
    CounterpartyID: string;
    Note: string;
}

export interface PortfolioFilter {
    fundId?: number;
    symbol?: string;
    trader?: string;
    position?: string;
    search: string;
    assetClass: string;
    status: string;
}

