import React, { useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";
import { ESPQuote } from "../types/quote";
import API from "../util/api";
import { useQuotes } from "../context/QuotesContext";
import axios from "axios";

const WebSocketESP = () => {
    const { updateESPQuotes } = useQuotes();
    const lastQuoteRef = useRef<ESPQuote | null>(null);
    const lastUpdateTimeRef = useRef<number>(0);
    const { lastMessage, sendMessage, readyState } = useWebSocket(
        API.ESP_WEBSOCKET,
        {
            shouldReconnect: () => true,
            onOpen: () => {
                console.log(`✅ WebSocket connected to ${API.ESP_WEBSOCKET}`);
                sendMessage(
                    JSON.stringify({ type: "SUBSCRIBE", market: "ESP" })
                );
            },
            onClose: () => {
                console.warn(`❌ WebSocket disconnected`);
            },
            onError: (event) => {
                console.error("❌ WebSocket Error:", event);
            },
        }
    );

    // Currency pairs for non-NDF and NDF
    const nonNDFCurrencyPairs = [
        "EUR/USD",
        "USD/JPY",
        "GBP/USD",
        "USD/CHF",
        "EUR/CHF",
        "AUD/USD",
        "USD/CAD",
        "NZD/USD",
    ];

    const ndfCurrencyPairs = [
        "USD/BRL",
        "USD/CLP",
        "USD/COP",
        "USD/PEN",
        "USD/KRW",
        "USD/TWD",
        "USD/CNH",
        "USD/INR",
    ];

    const [symbol, setSymbol] = useState("EUR/USD");
    const [settlType, setSettlType] = useState("SP");
    const [ndf, setNdf] = useState(false);

    // Get current currency pairs based on NDF state
    const currentCurrencyPairs = ndf ? ndfCurrencyPairs : nonNDFCurrencyPairs;

    // Handle NDF checkbox change
    const handleNDFChange = (checked: boolean) => {
        setNdf(checked);
        // Reset symbol to first option of the new list
        const newPairs = checked ? ndfCurrencyPairs : nonNDFCurrencyPairs;
        setSymbol(newPairs[0]);
    };

    useEffect(() => {
        if (lastMessage !== null) {
            console.log(`📩 Received ESP WebSocket Message:`, lastMessage.data);

            try {
                // ✅ Ignore non-JSON messages
                if (!lastMessage.data.startsWith("{")) {
                    console.warn(
                        "⚠️ Ignored Non-JSON Message:",
                        lastMessage.data
                    );
                    return;
                }

                const newQuote: ESPQuote = JSON.parse(lastMessage.data);

                // ✅ Prevent redundant updates by checking if the new quote is different
                if (lastQuoteRef.current?.quote_id === newQuote.quote_id) {
                    return;
                }

                // ✅ Throttle updates (only allow updates every 500ms)
                const now = Date.now();
                if (now - lastUpdateTimeRef.current < 500) {
                    return;
                }

                lastQuoteRef.current = newQuote;
                lastUpdateTimeRef.current = now;
                updateESPQuotes(newQuote);
            } catch (error) {
                console.error(
                    "🚨 Error parsing ESP WebSocket data:",
                    error,
                    "Raw Data:",
                    lastMessage.data
                );
            }
        }
    }, [lastMessage, updateESPQuotes]);

    const subscribeESPQuote = async () => {
        try {
            await axios.post(API.SUBSCRIBE_ESP_QUOTE, {
                symbol,
                settl_type: settlType,
                ndf: ndf,
            });
            console.log("Subscribed to ESP quotes.");
        } catch (error) {
            console.error("Subscription to ESP Quote Failed:", error);
        }
    };
    return (
        <div>
            <h2>ESP Quotes</h2>
            <p>
                WebSocket Status:{" "}
                {readyState === 1 ? "Connected" : "Not Connected"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label>Symbol:</label>
                <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                >
                    {currentCurrencyPairs.map((pair) => (
                        <option key={pair} value={pair}>
                            {pair}
                        </option>
                    ))}
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
            </div>
            {/* add NDF checkbox */}
            <label>NDF:</label>
            <input
                type="checkbox"
                checked={ndf}
                onChange={(e) => handleNDFChange(e.target.checked)}
            />

            <button onClick={subscribeESPQuote} style={{ marginTop: "10px" }}>
                Subscribe to ESP Quotes
            </button>
        </div>
    );
};

export default WebSocketESP;
