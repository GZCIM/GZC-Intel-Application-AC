import { Configuration, LogLevel } from "@azure/msal-browser";
import { PublicClientApplication } from "@azure/msal-browser";
// Vite uses import.meta.env (ensure VITE_ prefix for env vars)
const clientId = import.meta.env.VITE_CLIENT_ID || "";
const tenantId = import.meta.env.VITE_TENANT_ID || "";
const authority = `https://login.microsoftonline.com/${tenantId}`;

export const msalConfig: Configuration = {
    auth: {
        clientId,
        authority,
        redirectUri: "/",
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false,
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
    scopes: [`api://${clientId}/.default`],
};
export const msalInstance = new PublicClientApplication(msalConfig);
