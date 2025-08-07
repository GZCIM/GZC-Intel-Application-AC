import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useMsal } from "@azure/msal-react";

export const AuthDebugger: React.FC = () => {
    const { isAuthenticated, accounts } = useAuth();
    const { instance } = useMsal();

    const envCheck = {
        clientId: import.meta.env.VITE_CLIENT_ID || "❌ Missing",
        tenantId: import.meta.env.VITE_TENANT_ID || "❌ Missing",
        backendUrl:
            import.meta.env.VITE_BACKEND_URL ||
            "http://localhost:5000 (default)",
    };

    const authToken = localStorage.getItem("authToken");

    return (
        <div
            style={{
                position: "fixed",
                top: "10px",
                right: "10px",
                background: "#1a1a1a",
                color: "white",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #333",
                fontSize: "12px",
                maxWidth: "400px",
                zIndex: 10000,
            }}
        >
            <h4 style={{ margin: "0 0 10px 0", color: "#7A9E65" }}>
                🔍 Auth Debugger
            </h4>

            <div style={{ marginBottom: "10px" }}>
                <strong>Environment Variables:</strong>
                <div>CLIENT_ID: {envCheck.clientId}</div>
                <div>TENANT_ID: {envCheck.tenantId}</div>
                <div>BACKEND_URL: {envCheck.backendUrl}</div>
            </div>

            <div style={{ marginBottom: "10px" }}>
                <strong>MSAL State:</strong>
                <div>Authenticated: {isAuthenticated ? "✅ Yes" : "❌ No"}</div>
                <div>Accounts: {accounts.length}</div>
                <div>Instance Ready: {instance ? "✅ Yes" : "❌ No"}</div>
            </div>

            <div>
                <strong>Token Storage:</strong>
                <div>AuthToken: {authToken ? "✅ Present" : "❌ Missing"}</div>
                {authToken && (
                    <div style={{ fontSize: "10px", wordBreak: "break-all" }}>
                        Token: {authToken.substring(0, 20)}...
                    </div>
                )}
            </div>
        </div>
    );
};
