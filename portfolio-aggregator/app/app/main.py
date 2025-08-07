from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers import (
    fix_controller,
    historical_quotes_controller,
    portfolio_controller,
    transactions_controller,
)
from app.util.logger import configure_logging, get_logger
import os
from dotenv import load_dotenv
import asyncio
configure_logging()
logger = get_logger(__name__)
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("Starting FastAPI application")
    # Delay to ensure event loop is fully initialized
    await asyncio.sleep(0.5)
    fix_controller.FixController.start_microservice_stream(
        os.getenv("ESP_STREAM_URL", "ws://localhost:5100/ws_esp"),
        fix_controller.FixController.esp_clients,
        stream=fix_controller.FixController.ESP,
    )
    fix_controller.FixController.start_microservice_stream(
        os.getenv("RFS_STREAM_URL", "ws://localhost:5100/ws_rfs"),
        fix_controller.FixController.rfs_clients,
        stream=fix_controller.FixController.RFS,
    )
    fix_controller.FixController.start_microservice_stream(
        os.getenv(
            "EXEC_STREAM_URL", "ws://localhost:5100/ws_execution"
        ),
        fix_controller.FixController.exec_clients,
        stream=fix_controller.FixController.EXEC,
    )
    logger.info("FastAPI application initialized")
    yield


app = FastAPI(
    title="GZC Portfolio API", version="1.0", lifespan=lifespan
)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(fix_controller.router)
app.include_router(historical_quotes_controller.router)
app.include_router(portfolio_controller.router)
app.include_router(transactions_controller.router)


# Application runs here


@app.get("/health")
async def health_check():
    return {"status": "ok"}


def start():
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=5000, reload=True)
