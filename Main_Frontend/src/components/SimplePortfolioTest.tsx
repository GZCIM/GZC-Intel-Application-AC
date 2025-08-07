import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export const SimplePortfolioTest: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const { getAccessToken, isAuthenticated } = useAuth();

    const testAPI = async () => {
        setLoading(true);
        setError("");

        if (!isAuthenticated) {
            setError("Not authenticated - please login first");
            setLoading(false);
            return;
        }

        try {
            console.log("Testing portfolio API...");
            const token = await getAccessToken();

            const response = await fetch("http://localhost:5000/portfolio/", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const result = await response.json();
                setData(result);
                console.log("Portfolio API Success:", result);
            } else {
                const errorText = await response.text();
                setError(`API Error: ${response.status} - ${errorText}`);
                console.error(
                    "Portfolio API Error:",
                    response.status,
                    errorText
                );
            }
        } catch (err) {
            const errorMsg = `Network Error: ${err}`;
            setError(errorMsg);
            console.error("Portfolio Network Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Auto-test on mount
    useEffect(() => {
        testAPI();
    }, []);

    return (
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "#1a1a1a",
                color: "white",
                padding: "20px",
                borderRadius: "8px",
                border: "2px solid #7A9E65",
                minWidth: "400px",
                maxHeight: "80vh",
                overflow: "auto",
                zIndex: 10001,
            }}
        >
            <h2 style={{ color: "#7A9E65", margin: "0 0 15px 0" }}>
                📊 Portfolio API Test
            </h2>

            <button
                onClick={testAPI}
                disabled={loading}
                style={{
                    background: "#7A9E65",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    cursor: loading ? "not-allowed" : "pointer",
                    marginBottom: "15px",
                }}
            >
                {loading ? "Testing..." : "Test API"}
            </button>

            {error && (
                <div
                    style={{
                        background: "#dc3545",
                        padding: "10px",
                        borderRadius: "4px",
                        marginBottom: "15px",
                    }}
                >
                    <strong>❌ Error:</strong> {error}
                </div>
            )}

            {data && (
                <div>
                    <div
                        style={{
                            background: "#28a745",
                            padding: "10px",
                            borderRadius: "4px",
                            marginBottom: "15px",
                        }}
                    >
                        <strong>✅ Success!</strong> Found{" "}
                        {data.data?.length || 0} portfolio items
                    </div>

                    <div
                        style={{
                            background: "#2a2a2a",
                            padding: "15px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            maxHeight: "300px",
                            overflow: "auto",
                        }}
                    >
                        <strong>Portfolio Data Preview:</strong>
                        <pre
                            style={{
                                margin: "10px 0 0 0",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};
