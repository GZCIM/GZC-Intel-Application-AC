from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.controllers import (
    fix_controller,
    historical_quotes_controller,
    portfolio_controller,
    transactions_controller,
    preferences_controller,
    cosmos_config_controller,
    proxy_controller,
    db_controller,
    funds_controller,
    table_config_controller,
)
from app.util.logger import configure_logging, get_logger
from app.services.azure_managed_identity import get_azure_service
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

    # Initialize Azure Managed Identity Service first
    azure_service = await get_azure_service()
    app.state.azure_service = azure_service
    logger.info("✅ Azure Managed Identity Service initialized")

    # Initialize database tables
    from app.database.init_db import create_tables

    if create_tables():
        logger.info("Database tables ready")
    else:
        logger.warning("Database initialization had issues - continuing anyway")

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
        os.getenv("EXEC_STREAM_URL", "ws://localhost:5100/ws_execution"),
        fix_controller.FixController.exec_clients,
        stream=fix_controller.FixController.EXEC,
    )
    logger.info("FastAPI application initialized")
    yield

    # Cleanup on shutdown
    if hasattr(app.state, "azure_service"):
        await app.state.azure_service.close()
        logger.info("Azure Managed Identity Service closed")


app = FastAPI(title="GZC Portfolio API", version="1.0", lifespan=lifespan)

# CORS Configuration - Production Security Fix
# Only allow specific origins - NEVER use wildcard (*) in production
allowed_origins = [
    "https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io",  # Production frontend
    "http://localhost:3500",  # Local development
    "http://localhost:3501",  # Alternative dev port
    "http://localhost:9000",  # Frontend dev server
    "http://localhost:5173",  # Vite default port
]

# Only allow in development for additional origins
if os.getenv("ENVIRONMENT") == "development":
    allowed_origins.extend(
        [
            "http://127.0.0.1:3500",
            "http://127.0.0.1:3501",
            "http://127.0.0.1:9000",
            "http://127.0.0.1:5173",
        ]
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["X-Total-Count"],
)


# Security Headers Middleware - Critical Security Fix
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # Add security headers to prevent common attacks
    response.headers.update(
        {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' *.microsoft.com *.microsoftonline.com; style-src 'self' 'unsafe-inline'; connect-src 'self' *.microsoft.com *.microsoftonline.com wss: ws:",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        }
    )
    return response


# Register routers
app.include_router(fix_controller.router)
app.include_router(historical_quotes_controller.router)
app.include_router(portfolio_controller.router)
app.include_router(transactions_controller.router)
app.include_router(preferences_controller.router)
app.include_router(proxy_controller.router)
app.include_router(cosmos_config_controller.router)
app.include_router(db_controller.router)
app.include_router(funds_controller.router)
app.include_router(table_config_controller.router)


# Application runs here


@app.get("/health")
async def health_check(request: Request):
    """Enhanced health check including Azure services status."""
    basic_health = {"status": "ok", "timestamp": "2025-08-11T21:54:00Z"}

    # Add Azure services health check
    if hasattr(request.app.state, "azure_service"):
        try:
            azure_health = await request.app.state.azure_service.health_check()
            basic_health["azure_services"] = azure_health
        except Exception as e:
            basic_health["azure_services"] = {"error": str(e)}

    return basic_health


@app.get("/health/azure")
async def azure_health_check(request: Request):
    """Dedicated Azure services health check endpoint."""
    if hasattr(request.app.state, "azure_service"):
        return await request.app.state.azure_service.health_check()
    else:
        return {"error": "Azure Managed Identity Service not initialized"}


def start():
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=5000, reload=True)
