import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export const PortfolioTest: React.FC = () => {
    const [result, setResult] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const { getAccessToken, isAuthenticated } = useAuth();

    const testPortfolioAPI = async () => {
        setLoading(true);
        setResult("Testing...");

        if (!isAuthenticated) {
            setResult("❌ Not authenticated - please login first");
            setLoading(false);
            return;
        }

        try {
            const token = await getAccessToken();
            const response = await fetch("http://localhost:5000/portfolio/", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const text = await response.text();

            if (response.ok) {
                setResult(
                    `✅ Success! Status: ${
                        response.status
                    }\nData: ${text.substring(0, 200)}...`
                );
            } else {
                setResult(
                    `❌ Failed! Status: ${response.status}\nError: ${text}`
                );
            }
        } catch (error) {
            setResult(`❌ Network Error: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                bottom: "10px",
                left: "10px",
                background: "#1a1a1a",
                color: "white",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #333",
                fontSize: "12px",
                maxWidth: "500px",
                zIndex: 10000,
            }}
        >
            <h4 style={{ margin: "0 0 10px 0", color: "#7A9E65" }}>
                🧪 Portfolio API Test
            </h4>

            <button
                onClick={testPortfolioAPI}
                disabled={loading}
                style={{
                    background: "#7A9E65",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: loading ? "not-allowed" : "pointer",
                    marginBottom: "10px",
                }}
            >
                {loading ? "Testing..." : "Test Portfolio API"}
            </button>

            {result && (
                <div
                    style={{
                        background: "#2a2a2a",
                        padding: "10px",
                        borderRadius: "4px",
                        whiteSpace: "pre-wrap",
                        fontSize: "11px",
                        maxHeight: "200px",
                        overflow: "auto",
                    }}
                >
                    {result}
                </div>
            )}
        </div>
    );
};
