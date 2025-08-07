// src/components/TradeExecutions.tsx
import React from "react";
import { useTradeExecutions } from "../context/TradeExecutionContext"; // Use context
import { ExecutionResult } from "../types/result";

const TradeExecutions: React.FC = () => {
  const { executions } = useTradeExecutions(); // Get executions from context

  return (
    <div>
      <h2>Trade Executions</h2>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>ClOrd ID</th>
            <th>Exec Type</th>
            <th>Status</th>
            <th>Symbol</th>
            <th>Side</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Last Price</th>
            <th>Last Quantity</th>
            <th>Quote ID</th>
            <th>Session Type</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((execution, index) => (
            <tr key={index}>
              <td>{execution.order_id}</td>
              <td>{execution.cl_ord_id}</td>
              <td>{execution.exec_type}</td>
              <td>{execution.ord_status}</td>
              <td>{execution.symbol}</td>
              <td>{execution.side}</td>
              <td>{execution.price}</td>
              <td>{execution.quantity}</td>
              <td>{execution.last_price ?? "N/A"}</td>
              <td>{execution.last_quantity ?? "N/A"}</td>
              <td>{execution.quote_id ?? "N/A"}</td>
              <td>{execution.session_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TradeExecutions;
