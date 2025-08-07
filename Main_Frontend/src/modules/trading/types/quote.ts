// src/types/interfaces.ts

// ESP Quote Structure
export interface ESPQuote {
    quote_req_id: string;
    quote_id: string;
    symbol: string;
    settlement_type: string;
    entry_type: string;
    price: string;
    quantity: string;
    time_stamp: string;
    originator: string;
}

// RFS Quote Structure
export interface RFSQuote {
    symbol: string;
    currency: string;
    provider: string;
    quote_req_id: string;
    bid_price: string;
    ask_price: string;
    net_price: string;
    order_qty: string;
    settlement_type: string;
    side: string;
    md_entry_type: string;
    depth: string;
    time_stamp?: string;
    quote_id?: string;
    value_date?: string;
}
