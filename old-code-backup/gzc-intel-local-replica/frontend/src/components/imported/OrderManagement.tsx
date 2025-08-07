import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { theme } from "../../theme";

// Mock quotes update function - replace with your actual implementation
const mockUpdateQuotes = (data: any) => {
    console.log("Mock order data:", data);
};

const OrderManagement: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
    const [symbol, setSymbol] = useState("EUR/USD");
    const [quantity, setQuantity] = useState("1000000");
    const [settlType, setSettlType] = useState("SP");
    const [side, setSide] = useState("1");
    const [currency, setCurrency] = useState("USD");

    // Mock WebSocket connection with realistic behavior
    useEffect(() => {
        // Simulate connection
        setTimeout(() => {
            setConnectionStatus("Connected");
        }, 1000);

        // Mock data injection every 3 seconds
        const mockDataInterval = setInterval(() => {
            const mockRFSData = {
                symbol: symbol,
                currency: currency,
                provider: "MOCK_PROVIDER",
                quote_req_id: `RFS_${Date.now()}`,
                bid_price: (1.0800 + Math.random() * 0.002).toFixed(4),
                ask_price: (1.0805 + Math.random() * 0.002).toFixed(4),
                net_price: (1.0802 + Math.random() * 0.002).toFixed(4),
                order_qty: quantity,
                settlement_type: settlType,
                side: side,
                md_entry_type: "RFS",
                depth: "1",
                time_stamp: new Date().toISOString(),
                quote_id: `Q_${Date.now()}`,
                value_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            
            mockUpdateQuotes(mockRFSData);
        }, 3000);

        return () => {
            clearInterval(mockDataInterval);
            setConnectionStatus("Disconnected");
        };
    }, [symbol, quantity, settlType, side, currency]);

    const requestRFSQuote = async () => {
        try {
            
            // Mock immediate response
            const mockResponse = {
                symbol: symbol,
                currency: currency,
                provider: "IMMEDIATE_PROVIDER",
                quote_req_id: `RFS_REQ_${Date.now()}`,
                bid_price: (1.0798 + Math.random() * 0.003).toFixed(4),
                ask_price: (1.0803 + Math.random() * 0.003).toFixed(4),
                net_price: (1.0800 + Math.random() * 0.003).toFixed(4),
                order_qty: quantity,
                settlement_type: settlType,
                side: side,
                md_entry_type: "RFS_REQUEST",
                depth: "1",
                time_stamp: new Date().toISOString(),
                quote_id: `Q_REQ_${Date.now()}`,
                value_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            
            mockUpdateQuotes(mockResponse);
        } catch (error) {
            console.error("Request RFS Quote Failed (MOCK):", error);
        }
    };

    const selectStyle = {
        background: `linear-gradient(to bottom, ${theme.surfaceAlt}CC, ${theme.surface}EE)`,
        border: `1px solid ${theme.border}`,
        borderRadius: "6px",
        padding: "6px 10px",
        color: theme.text,
        fontSize: theme.typography.input.fontSize,
        fontWeight: theme.typography.input.fontWeight,
        cursor: "pointer",
        minWidth: "100px",
        outline: "none",
        appearance: "none" as any,
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c8c0b0CC' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        backgroundSize: "14px",
        paddingRight: "28px",
        backdropFilter: "blur(8px)",
        transition: "all 0.2s ease"
    };

    const labelStyle = {
        fontSize: "9px",
        color: theme.textSecondary,
        fontWeight: "500",
        textTransform: "uppercase" as const,
        letterSpacing: "0.5px"
    };

    return (
        <div style={{ height: "100%" }}>
            <h3 style={{ 
                fontSize: "11px", 
                fontWeight: "500", 
                color: theme.text,
                margin: "0 0 12px 0"
            }}>
                RFS Quotes
            </h3>
            
            <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                marginBottom: "12px"
            }}>
                <div>
                    <label style={labelStyle}>Symbol</label>
                    <select 
                        value={symbol} 
                        onChange={(e) => setSymbol(e.target.value)}
                        style={{ ...selectStyle, width: "100%" }}
                        className="no-drag"
                    >
                        <option value="EUR/USD">EUR/USD</option>
                        <option value="USD/JPY">USD/JPY</option>
                        <option value="GBP/USD">GBP/USD</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Quantity</label>
                    <select 
                        value={quantity} 
                        onChange={(e) => setQuantity(e.target.value)}
                        style={{ ...selectStyle, width: "100%" }}
                    >
                        <option value="1000000">1M</option>
                        <option value="5000000">5M</option>
                        <option value="10000000">10M</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Settlement</label>
                    <select 
                        value={settlType} 
                        onChange={(e) => setSettlType(e.target.value)}
                        style={{ ...selectStyle, width: "100%" }}
                    >
                        <option value="SP">SP</option>
                        <option value="TOM">TOM</option>
                        <option value="SNX">SNX</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Side</label>
                    <select 
                        value={side} 
                        onChange={(e) => setSide(e.target.value)}
                        style={{ ...selectStyle, width: "100%" }}
                    >
                        <option value="1">Buy</option>
                        <option value="2">Sell</option>
                    </select>
                </div>
            </div>

            <motion.button 
                className="no-drag"
                whileHover={{ scale: 1.01, boxShadow: `0 4px 20px ${theme.primary}40` }}
                whileTap={{ scale: 0.99 }}
                onClick={requestRFSQuote}
                style={{
                    background: theme.gradient,
                    border: `1px solid ${theme.primary}40`,
                    borderRadius: "6px",
                    padding: "6px 20px",
                    color: theme.text,
                    fontWeight: "400",
                    fontSize: "11px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    width: "100%",
                    position: "relative",
                    backdropFilter: "blur(10px)",
                    overflow: "hidden",
                    opacity: 0.9
                }}
            >
                {/* Vertical divider line */}
                <span style={{
                    position: "absolute",
                    left: "50%",
                    top: "20%",
                    bottom: "20%",
                    width: "1px",
                    background: `linear-gradient(to bottom, transparent, ${theme.primary}40, transparent)`,
                    transform: "translateX(-50%)"
                }} />
                Request RFS Quote
            </motion.button>
        </div>
    );
};

export default OrderManagement;