export type TransactionSide = "Buy" | "Sell";

export interface Transaction {
    id: string; // Unique transaction identifier
    symbol: string; // e.g., "EURUSD"
    side: TransactionSide; // Buy or Sell
    quantity: number; // Number of units
    price: number; // Executed price
    tradeDate: string; // ISO date string, e.g., "2024-05-06"
    status?: string; // Optional: e.g., "unmatched", "pending"
    counterparty?: string; // Optional: used in blotters
    note?: string; // Optional freeform field
}
