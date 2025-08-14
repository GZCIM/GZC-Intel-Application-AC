import { Configuration, LogLevel } from "@azure/msal-browser";
import { PublicClientApplication } from "@azure/msal-browser";

// Hardcoded for production stability
const clientId = "a873f2d7-2ab9-4d59-a54c-90859226bf2e";
const tenantId = "8274c97d-de9d-4328-98cf-2d4ee94bf104";

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
    scopes: ["User.Read", "api://a873f2d7-2ab9-4d59-a54c-90859226bf2e/.default"],
};
// Create but don't initialize yet - will be initialized in main.tsx
export const msalInstance = new PublicClientApplication(msalConfig);

// DON'T expose to window here - main.tsx will do it after initialization
