import { Configuration, LogLevel } from "@azure/msal-browser";
import { PublicClientApplication } from "@azure/msal-browser";

// Build-time environment variables - no runtime injection needed
const clientId = import.meta.env.VITE_CLIENT_ID;
const tenantId = import.meta.env.VITE_TENANT_ID;

// Validate configuration at runtime
if (!clientId) {
    console.error("❌ MSAL CLIENT_ID is not configured! Expected VITE_CLIENT_ID environment variable.");
}
if (!tenantId) {
    console.error("❌ MSAL TENANT_ID is not configured! Expected VITE_TENANT_ID environment variable.");
}
const authority = `https://login.microsoftonline.com/${tenantId}`;

export const msalConfig: Configuration = {
    auth: {
        clientId,
        authority,
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: true, // CRITICAL: Enable for better persistence across page refreshes
    },
    system: {
        loggerOptions: {
            loggerCallback: (
                level: LogLevel,
                message: string,
                containsPii: boolean
            ): void => {
                if (containsPii) return;
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        break;
                    case LogLevel.Info:
                        console.info(message);
                        break;
                    case LogLevel.Verbose:
                        console.debug(message);
                        break;
                    case LogLevel.Warning:
                        console.warn(message);
                        break;
                }
            },
        },
    },
};
export const loginRequest = {
    scopes: ["User.Read"],
};
export const msalInstance = new PublicClientApplication(msalConfig);

// Expose MSAL instance to window for debugging and frontend tests
if (typeof window !== 'undefined') {
    (window as any).msalInstance = msalInstance;
}
