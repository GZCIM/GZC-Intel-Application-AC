export interface QuoteMessage {
    symbol: string;
    price: number;
    side: QuoteSide;
    timestamp: string;
    type?: string; // for status messages
    message?: string; // for status messages
    entry_type?: number; // 0 for ask, 1 for bid
    [key: string]: unknown; // allows flexibility for extra props
}
export type QuoteSide = "Buy" | "Sell";
export type StreamType = "esp" | "rfs" | "exec";
export interface QuoteInput {
    symbol: string;
    entryType: "ask" | "bid";
    tradeDate: string; // yyyy-mm-dd
    expirationDate: string; // yyyy-mm-dd
}
export interface QuoteHistorySet {
    ytd?: number;
    mtd?: number;
    dtd?: number;
}

export interface QuoteHistory {
    symbol: string;
    bid?: QuoteHistorySet;
    ask?: QuoteHistorySet;
}
