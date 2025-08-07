// src/context/TradeExecutionContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import useWebSocket from "react-use-websocket";
import API from "../util/api"; // Ensure API has WS_EXECUTION URL
import { ExecutionResult } from "../types/result"; // Import ExecutionResult type

// Define context type
interface TradeExecutionContextType {
  executions: ExecutionResult[];
}

// Create context
const TradeExecutionContext = createContext<TradeExecutionContextType | undefined>(undefined);

// Context Provider Component
export const TradeExecutionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [executions, setExecutions] = useState<ExecutionResult[]>([]);

  // Connect to execution result WebSocket
  const { lastMessage } = useWebSocket(API.EXECUTION_WEBSOCKET, {
    shouldReconnect: () => true, // Auto-reconnect on failure
  });

  // Handle new execution messages
  useEffect(() => {
    if (lastMessage?.data) {
      const parsedData: ExecutionResult = JSON.parse(lastMessage.data);
      setExecutions((prev) => [parsedData, ...prev]); // Add new execution at the top
    }
  }, [lastMessage]);

  return (
    <TradeExecutionContext.Provider value={{ executions }}>
      {children}
    </TradeExecutionContext.Provider>
  );
};

// Custom hook to use execution context
export const useTradeExecutions = () => {
  const context = useContext(TradeExecutionContext);
  if (!context) {
    throw new Error("useTradeExecutions must be used within a TradeExecutionProvider");
  }
  return context;
};
