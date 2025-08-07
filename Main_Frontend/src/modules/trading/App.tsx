import React from "react";
import { QuotesProvider } from "./context/QuotesContext";
import { TradeExecutionProvider } from "./context/TradeExecutionContext";
import WebSocketESP from "./components/WebSocketESP";
import WebSocketRFS from "./components/WebSocketRFS";
import TradeRequest from "./components/TradeRequest";
import TradeExecutions from "./components/TradeExecutions";

const App: React.FC = () => {
    return (
        <QuotesProvider>
            <TradeExecutionProvider>
                <div className="container">
                    <h1>FIX Protocol Trading Dashboard</h1>

                    {/* Real-Time Quotes via WebSocket */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "20px",
                        }}
                    >
                        <div style={{ width: "50%" }}>
                            <WebSocketRFS />
                        </div>
                        <div style={{ width: "50%" }}>
                            <WebSocketESP />
                        </div>
                    </div>

                    {/* Trade Execution Section */}
                    <TradeRequest />
                    <TradeExecutions />
                </div>
            </TradeExecutionProvider>
        </QuotesProvider>
    );
};

App.displayName = 'TradingApp';

export default App;
