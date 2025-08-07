import { createAlova } from "alova";
import ReactHook from "alova/react";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const apiTimeout = parseInt(import.meta.env.VITE_API_TIMEOUT || "30000");

export const alova = createAlova({
    baseURL: backendUrl,
    statesHook: ReactHook,
    requestAdapter: (methodInstance) => {
        const controller = new AbortController();

        return {
            response: async () => {
                const timeoutId = setTimeout(() => controller.abort(), apiTimeout);
                
                try {
                    const res = await fetch(methodInstance.url, {
                        method: methodInstance.type,
                        headers: {
                            'Content-Type': 'application/json',
                            ...methodInstance.headers,
                        },
                        body: methodInstance.data
                            ? JSON.stringify(methodInstance.data)
                            : undefined,
                        signal: controller.signal,
                    });
                    
                    clearTimeout(timeoutId);

                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }

                    const json = await res.json();
                    return {
                        data: json,
                        status: res.status,
                        headers: res.headers,
                        statusText: res.statusText,
                    };
                } catch (error) {
                    clearTimeout(timeoutId);
                    throw error;
                }
            },
            headers: async () => methodInstance.headers || {},
            abort: () => controller.abort(),
            onDownload: undefined,
            onUpload: undefined,
        };
    },
});
