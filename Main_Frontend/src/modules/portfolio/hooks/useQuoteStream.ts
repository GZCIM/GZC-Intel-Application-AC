import { useEffect, useRef } from "react";
import type { QuoteMessage } from "../../ui-library";

export type StreamType = "esp" | "rfs" | "exec";

/**
 * Connects to a WebSocket stream with token-aware access.
 * Token fetch logic MUST be passed in from a hook-safe layer (e.g., context or component).
 */
export const useQuoteStream = (
    type: StreamType,
    onMessage: (msg: QuoteMessage) => void,
    enabled: boolean,
    getToken: () => Promise<string>
) => {
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        const connect = async () => {
            try {
                const token = await getToken();
                if (cancelled) return;
                console.log(
                    "[useQuoteStream] Connecting to stream",
                    import.meta.env.VITE_STREAM_URL,
                    type,
                    "with token",
                    token
                );

                const ws = new WebSocket(
                    `${import.meta.env.VITE_STREAM_URL}_${type}?access_token=${token}`
                );
                wsRef.current = ws;

                ws.onmessage = (event) => {
                    try {
                        const msg: QuoteMessage = JSON.parse(event.data);
                        onMessage(msg);
                    } catch (err) {
                        console.error(
                            "[useQuoteStream] Failed to parse message",
                            err
                        );
                    }
                };

                ws.onclose = () =>
                    console.warn(
                        `[useQuoteStream] WebSocket closed for stream ${type}`
                    );
                ws.onerror = (err) =>
                    console.error("[useQuoteStream] WebSocket error", err);
            } catch (err) {
                console.error("[useQuoteStream] Failed to connect", err);
            }
        };

        connect();

        return () => {
            cancelled = true;
            wsRef.current?.close();
        };
    }, [type, onMessage, enabled, getToken]);
};
