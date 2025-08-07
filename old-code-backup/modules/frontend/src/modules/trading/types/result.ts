// src/types/result.ts

export interface ExecutionResult {
    order_id: string;
    cl_ord_id: string;
    exec_type: string;
    ord_status: string;
    symbol: string;
    side: string;
    price: string;
    quantity: string;
    last_price?: string;
    last_quantity?: string;
    text?: string;
    quote_id?: string;
    session_type: string; // "ESP" or "RFS"
  }
