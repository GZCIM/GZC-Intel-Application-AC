import React, { useEffect, useState } from "react";
import { useQuotes } from "../context/QuotesContext";
import API from "../util/api";
import axios from "axios";

const WebSocketRFS: React.FC = () => {
    const { updateRFSQuotes } = useQuotes();
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [connectionStatus, setConnectionStatus] =
        useState<string>("Disconnected");
    const [symbol, setSymbol] = useState("EUR/USD");
    const [quantity, setQuantity] = useState("1000000");
    const [settlType, setSettlType] = useState("SP");
    const [side, setSide] = useState("1");
    const [currency, setCurrency] = useState("USD");
    const [secondSettlType, setSecondSettlType] = useState("SP");
    const [isSwap, setIsSwap] = useState(false);
    useEffect(() => {
        const socket = new WebSocket(API.RFS_WEBSOCKET);

        socket.onopen = () => {
            console.log("Connected to RFS WebSocket");
            setConnectionStatus("Connected");
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("📩 Received RFS WebSocket Message:", data);
                updateRFSQuotes(data);
            } catch (error) {
                console.error("🚨 Error parsing RFS WebSocket data:", error);
            }
        };

        socket.onclose = () => {
            console.log("Disconnected from RFS WebSocket");
            setConnectionStatus("Disconnected");
        };

        socket.onerror = (error) => {
            console.error("WebSocket Error:", error);
            setConnectionStatus("Error");
        };

        setWs(socket);

        return () => {
            socket.close();
        };
    }, [updateRFSQuotes]);

    const requestRFSQuote = async () => {
        try {
            await axios.post(API.REQUEST_RFS_QUOTE, {
                symbol,
                quantity,
                settl_type: settlType,
                side,
                currency,
                is_swap: isSwap, // 
                ...(isSwap && { second_settl_type: secondSettlType }),
            });
            console.log("Requested RFS quote.");
        } catch (error) {
            console.error("Request RFS Quote Failed:", error);
        }
    };

    return (
        <div>
            <h3>RFS Quotes</h3>
            <p>WebSocket Status: {connectionStatus}</p>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label>Symbol:</label>
                <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                >
                    <option value="EUR/USD">EUR/USD</option>
                    <option value="USD/JPY">USD/JPY</option>
                    <option value="GBP/USD">GBP/USD</option>
                </select>

                <label>Quantity:</label>
                <select
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                >
                    <option value="1000000">1,000,000</option>
                    <option value="5000000">5,000,000</option>
                    <option value="10000000">10,000,000</option>
                </select>

                <label>Settlement Type:</label>
                <select
                    value={settlType}
                    onChange={(e) => setSettlType(e.target.value)}
                >
                    <option value="SP">SP</option>
                    <option value="TOM">TOM</option>
                    <option value="SNX">SNX</option>
                    <option value="M1">M1</option>
                </select>
                {/* 🔧 ADDED: Swap checkbox */}
                <label>
                    <input
                        type="checkbox"
                        checked={isSwap}
                        onChange={() => setIsSwap(!isSwap)}
                    />
                    Swap
                </label>

                {/* 🔧 ADDED: Second Settlement Type if swap is enabled */}
                {isSwap && (
                    <>
                        <label>2nd Settlement Type:</label>
                        <select
                            value={secondSettlType}
                            onChange={(e) => setSecondSettlType(e.target.value)}
                        >
                            <option value="M1">M1</option>
                            <option value="M2">M2</option>
                            <option value="M3">M3</option>
                            <option value="M5">M5</option>
                        </select>
                    </>
                )}
                <label>Side:</label>
                <select value={side} onChange={(e) => setSide(e.target.value)}>
                    <option value="1">Buy</option>
                    <option value="2">Sell</option>
                </select>

                <label>Currency:</label>
                <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                </select>
            </div>

            <button onClick={requestRFSQuote} style={{ marginTop: "10px" }}>
                Request RFS Quote
            </button>
        </div>
    );
};

export default WebSocketRFS;
