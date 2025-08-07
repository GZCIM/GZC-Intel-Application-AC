import React, { useState } from "react";
import axios, { AxiosError } from "axios";
import API from "../util/api";
import { useQuotes } from "../context/QuotesContext";
import { ESPQuote, RFSQuote } from "../types/quote";

const TradeRequest: React.FC = () => {
    const { espQuotes, rfsQuotes } = useQuotes();
    const [selectedQuote, setSelectedQuote] = useState<{
        type: "ESP" | "RFS";
        quote: ESPQuote | RFSQuote;
    } | null>(null);
    const [tradeResponse, setTradeResponse] = useState<string | null>(null);
    const [isVirtualTrade, setIsVirtualTrade] = useState<boolean>(false);

    const handleTradeRequest = async () => {
        if (!selectedQuote) {
            setTradeResponse("Please select a quote to trade.");
            return;
        }

        try {
            const isSwap =
                selectedQuote.type === "RFS" &&
                typeof selectedQuote.quote.settlement_type === "string" &&
                selectedQuote.quote.settlement_type.includes("_");

            const tradeUrl = isSwap
                ? API.RFS_SWAP_TRADE
                : selectedQuote.type === "ESP"
                ? API.ESP_TRADE
                : API.RFS_TRADE;

            const tradeData = {
                ...selectedQuote.quote,
                virtual: isVirtualTrade,
            };

            await axios.post(tradeUrl, tradeData);

            setTradeResponse(
                isVirtualTrade
                    ? "Virtual Trade request saved successfully."
                    : "Trade request sent successfully."
            );
            setSelectedQuote(null);
        } catch (error) {
            const axiosError = error as AxiosError;
            setTradeResponse(
                `Trade Request Failed: ${
                    axiosError.response?.data || axiosError.message
                }`
            );
        }
    };

    return (
        <div>
            <h2>Trade Request</h2>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: "48%" }}>
                    <h3>Select an RFS Quote</h3>
                    <ul>
                        {[...rfsQuotes]
                            .reverse()
                            //.filter((quote) => quote.provider === "UBS")
                            .map((quote, index) => (
                                <li
                                    key={index}
                                    style={{
                                        padding: "10px",
                                        border: "1px solid gray",
                                        marginBottom: "5px",
                                        cursor: "pointer",
                                        backgroundColor:
                                            selectedQuote?.quote.quote_id ===
                                            quote.quote_id
                                                ? "#cce5ff"
                                                : "white",
                                    }}
                                    onClick={() =>
                                        setSelectedQuote({ type: "RFS", quote })
                                    }
                                >
                                    {quote.provider} {quote.symbol} -{" "}
                                    {quote.bid_price || "N/A"} /{" "}
                                    {quote.ask_price || "N/A"} (
                                    {quote.time_stamp})
                                </li>
                            ))}
                    </ul>
                </div>

                <div style={{ width: "48%" }}>
                    <h3>Select an ESP Quote</h3>
                    <ul>
                        {[...espQuotes]
                            .reverse()
                            .slice(0, 10)
                            .map((quote, index) => (
                                <li
                                    key={index}
                                    style={{
                                        padding: "10px",
                                        border: "1px solid gray",
                                        marginBottom: "5px",
                                        cursor: "pointer",
                                        backgroundColor:
                                            selectedQuote?.quote.quote_id ===
                                            quote.quote_id
                                                ? "#cce5ff"
                                                : "white",
                                    }}
                                    onClick={() =>
                                        setSelectedQuote({ type: "ESP", quote })
                                    }
                                >
                                    {quote.symbol} - {quote.price} (
                                    {quote.time_stamp})
                                </li>
                            ))}
                    </ul>
                </div>
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                }}
            >
                <h3>Selected Quote</h3>
                <textarea
                    value={
                        selectedQuote
                            ? `${selectedQuote.type} - ${
                                  selectedQuote.quote.symbol
                              } - ${
                                  "price" in selectedQuote.quote
                                      ? selectedQuote.quote.price
                                      : selectedQuote.quote.bid_price +
                                        " / " +
                                        selectedQuote.quote.ask_price
                              } (${selectedQuote.quote.time_stamp})`
                            : "Please select a quote to trade."
                    }
                    readOnly
                    style={{ width: "60%", height: "30px", fontSize: "12px" }}
                />
                <label>
                    <input
                        type="checkbox"
                        checked={isVirtualTrade}
                        onChange={(e) => setIsVirtualTrade(e.target.checked)}
                    />
                    Virtual Trade
                </label>
                <button onClick={handleTradeRequest} disabled={!selectedQuote}>
                    Send Trade Request
                </button>
            </div>
            {tradeResponse && <p>{tradeResponse}</p>}
        </div>
    );
};

export default TradeRequest;
