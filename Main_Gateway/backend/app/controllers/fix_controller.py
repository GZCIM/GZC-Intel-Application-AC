import asyncio
import json
import time
import threading
import os
import requests
import websocket

from typing import Dict, List
from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    Request,
)
from starlette.websockets import WebSocketState
from fastapi.responses import JSONResponse

from app.auth.azure_auth import validate_token_ws, validate_token
from app.util.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class FixController:
    ESP = "esp"
    RFS = "rfs"
    EXEC = "exec"

    esp_clients: Dict[str, List[WebSocket]] = {}
    rfs_clients: Dict[str, List[WebSocket]] = {}
    exec_clients: Dict[str, List[WebSocket]] = {}

    rfs_quote_registry: Dict[str, Dict[str, float]] = {}

    event_loop = asyncio.get_event_loop()

    # --- Client Management ---
    @classmethod
    def get_client_dict(cls, stream: str) -> Dict[str, List[WebSocket]]:
        return {
            cls.ESP: cls.esp_clients,
            cls.RFS: cls.rfs_clients,
            cls.EXEC: cls.exec_clients,
        }[stream]

    @classmethod
    def add_client(cls, stream: str, user_id: str, ws: WebSocket):
        clients = cls.get_client_dict(stream)
        clients.setdefault(user_id, []).append(ws)

    @classmethod
    def remove_client(cls, stream: str, user_id: str, ws: WebSocket):
        clients = cls.get_client_dict(stream)
        if user_id in clients and ws in clients[user_id]:
            clients[user_id].remove(ws)
            if not clients[user_id]:
                del clients[user_id]

    # --- RFS Quote ID Registry ---
    @classmethod
    def register_rfs_quote_id(cls, user_id: str, quote_id: str):
        cls.rfs_quote_registry.setdefault(user_id, {})[
            quote_id
        ] = time.time()

    @classmethod
    def expire_rfs_quote_ids(cls, expiry_seconds: int = 600):
        now = time.time()
        for user_id in list(cls.rfs_quote_registry.keys()):
            valid = {
                qid: ts
                for qid, ts in cls.rfs_quote_registry[user_id].items()
                if now - ts < expiry_seconds
            }
            if valid:
                cls.rfs_quote_registry[user_id] = valid
            else:
                del cls.rfs_quote_registry[user_id]

    # --- Broadcast Logic ---
    @classmethod
    async def broadcast(
        cls,
        clients: Dict[str, List[WebSocket]],
        message: str,
        stream: str,
    ):
        cls.expire_rfs_quote_ids()
        disconnected_users = []

        for user_id, sockets in clients.items():
            active_sockets = []

            try:
                if stream == cls.RFS:
                    data = json.loads(message)
                    quote_id = data.get("request_quote_id")
                    if quote_id not in cls.rfs_quote_registry.get(
                        user_id, {}
                    ):
                        continue

                for ws in sockets:
                    if ws.application_state == WebSocketState.CONNECTED:
                        try:
                            await ws.send_text(message)
                            active_sockets.append(ws)
                        except Exception as e:
                            logger.warning(
                                f"[broadcast:{stream}] Send failed for {user_id}: {e}"
                            )
                    else:
                        logger.debug(
                            f"[broadcast:{stream}] Skipping closed WebSocket ({user_id})"
                        )

            except Exception as e:
                logger.error(
                    f"[broadcast:{stream}] Error for {user_id}: {e}"
                )

            if active_sockets:
                clients[user_id] = active_sockets
            else:
                disconnected_users.append(user_id)

        for user_id in disconnected_users:
            clients.pop(user_id, None)

    # --- Microservice Streaming Connector ---
    @classmethod
    def start_microservice_stream(
        cls,
        microservice_url: str,
        clients: Dict[str, List[WebSocket]],
        stream: str,
    ):
        def run():
            def on_message(ws, message):
                logger.debug(f"[From {microservice_url}] {message}")
                try:
                    future = asyncio.run_coroutine_threadsafe(
                        cls.broadcast(clients, message, stream),
                        cls.event_loop,
                    )
                    future.result(timeout=2)
                except Exception as e:
                    logger.error(
                        f"[broadcast:{stream}] Future failed: {e}"
                    )

            def on_error(ws, error):
                logger.error(f"[{stream}] WebSocket error: {error}")

            def on_close(ws, code, msg):
                logger.warning(
                    f"[{stream}] Closed: code={code}, msg={msg}. Reconnecting in 5s..."
                )
                time.sleep(5)

            def on_open(ws):
                logger.info(
                    f"[{stream}] Connected to {microservice_url}"
                )

            ws_app = websocket.WebSocketApp(
                microservice_url,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close,
            )

            while True:
                try:
                    ws_app.run_forever()
                except Exception as e:
                    logger.error(
                        f"[{stream}] run_forever exception: {e}"
                    )
                    time.sleep(5)

        threading.Thread(target=run, daemon=True).start()


# --- WebSocket Endpoints ---
@router.websocket("/ws_esp")
async def esp_stream(
    websocket: WebSocket, user_info: dict = Depends(validate_token_ws)
):
    # Emergency bypass for authentication issues
    if os.getenv("SKIP_AUTH_CHECK") == "true":
        user_id = os.getenv("DEFAULT_USER", "system_user")
    else:
        # Handle different claim names from MSAL tokens
        user_id = user_info.get("preferred_username") or user_info.get("email") or user_info.get("sub", "unknown-user")
    await websocket.accept()
    FixController.add_client(FixController.ESP, user_id, websocket)
    logger.info(f"WebSocket connected: /ws_esp ({user_id})")
    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "ping" or msg.strip() == '{"type":"ping"}':
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect as e:
        logger.info(
            f"WebSocket disconnected: /ws_esp ({user_id}), code={e.code}"
        )
    finally:
        FixController.remove_client(
            FixController.ESP, user_id, websocket
        )


@router.websocket("/ws_rfs")
async def rfs_stream(
    websocket: WebSocket, user_info: dict = Depends(validate_token_ws)
):
    # Emergency bypass for authentication issues
    if os.getenv("SKIP_AUTH_CHECK") == "true":
        user_id = os.getenv("DEFAULT_USER", "system_user")
    else:
        # Handle different claim names from MSAL tokens
        user_id = user_info.get("preferred_username") or user_info.get("email") or user_info.get("sub", "unknown-user")
    await websocket.accept()
    FixController.add_client(FixController.RFS, user_id, websocket)
    logger.info(f"WebSocket connected: /ws_rfs ({user_id})")
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect as e:
        logger.info(
            f"WebSocket disconnected: /ws_rfs ({user_id}), code={e.code}"
        )
    finally:
        FixController.remove_client(
            FixController.RFS, user_id, websocket
        )


@router.websocket("/ws_exec")
async def exec_stream(
    websocket: WebSocket, user_info: dict = Depends(validate_token_ws)
):
    # Emergency bypass for authentication issues
    if os.getenv("SKIP_AUTH_CHECK") == "true":
        user_id = os.getenv("DEFAULT_USER", "system_user")
    else:
        # Handle different claim names from MSAL tokens
        user_id = user_info.get("preferred_username") or user_info.get("email") or user_info.get("sub", "unknown-user")
    await websocket.accept()
    FixController.add_client(FixController.EXEC, user_id, websocket)
    logger.info(f"WebSocket connected: /ws_exec ({user_id})")
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect as e:
        logger.info(
            f"WebSocket disconnected: /ws_exec ({user_id}), code={e.code}"
        )
    finally:
        FixController.remove_client(
            FixController.EXEC, user_id, websocket
        )


# --- REST API Endpoints ---
@router.get("/api/ws_status")
async def get_websocket_status():
    return JSONResponse(
        {
            "esp": {
                k: len(v) for k, v in FixController.esp_clients.items()
            },
            "rfs": {
                k: len(v) for k, v in FixController.rfs_clients.items()
            },
            "exec": {
                k: len(v) for k, v in FixController.exec_clients.items()
            },
        }
    )


@router.post("/api/request_rfs_quote")
async def request_rfs_quote(
    request: Request, user_info: dict = Depends(validate_token)
):
    try:
        data = await request.json()
        backend_url = os.getenv(
            "RFS_QUOTE_REQUEST_URL",
            "http://localhost:5200/api/request_rfs_quote",
        )
        response = requests.post(backend_url, json=data)
        if response.ok:
            quote_id = response.json().get("quote_req_id")
            if quote_id:
                FixController.register_rfs_quote_id(
                    user_info["preferred_username"], quote_id
                )
        return JSONResponse(
            status_code=response.status_code, content=response.json()
        )
    except Exception as e:
        logger.error(f"Failed to forward quote request: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to forward quote request"},
        )
