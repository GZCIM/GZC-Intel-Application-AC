"""
Proxy Controller for Main_Gateway
Routes all external service requests through the gateway for:
- Centralized authentication
- Request logging
- Rate limiting
- Service isolation
"""
from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import JSONResponse
import httpx
import os
from app.util.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/proxy", tags=["proxy"])image.png
# Service routing configuration
SERVICE_ROUTES = {
    "components": {
        "url": os.getenv("COMPONENT_SERVICE_URL", "http://localhost:3200"),
        "timeout": 30
    },
    "bloomberg": {
        "url": os.getenv("BLOOMBERG_SERVICE_URL", "http://52.149.235.82"),
        "timeout": 60
    },
    "fss": {
        "url": os.getenv("FSS_SERVICE_URL", "http://localhost:5100"),
        "timeout": 30
    }
}

@router.get("/components")
async def proxy_list_components(request: Request):
    """Proxy request to component service for listing components"""
    try:
        service_config = SERVICE_ROUTES.get("components")
        if not service_config:
            raise HTTPException(status_code=404, detail="Service not configured")

        # Log the request
        logger.info(f"Proxying component list request from {request.client.host}")

        async with httpx.AsyncClient(timeout=service_config["timeout"]) as client:
            # Forward the request
            response = await client.get(
                f"{service_config['url']}/api/components",
                headers={
                    "X-Forwarded-For": request.client.host,
                    "X-Gateway-Request": "true"
                }
            )

            # Return the response
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )

    except httpx.TimeoutException:
        logger.error("Component service timeout")
        raise HTTPException(status_code=504, detail="Component service timeout")
    except Exception as e:
        logger.error(f"Error proxying component request: {e}")
        raise HTTPException(status_code=502, detail="Service unavailable")

@router.get("/components/{component_id}")
async def proxy_get_component(component_id: str, request: Request):
    """Proxy request to component service for specific component"""
    try:
        service_config = SERVICE_ROUTES.get("components")
        if not service_config:
            raise HTTPException(status_code=404, detail="Service not configured")

        # Log the request
        logger.info(f"Proxying component {component_id} request from {request.client.host}")

        async with httpx.AsyncClient(timeout=service_config["timeout"]) as client:
            # Forward the request
            response = await client.get(
                f"{service_config['url']}/api/components/{component_id}",
                headers={
                    "X-Forwarded-For": request.client.host,
                    "X-Gateway-Request": "true"
                }
            )

            # Return the response
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )

    except httpx.TimeoutException:
        logger.error("Component service timeout")
        raise HTTPException(status_code=504, detail="Component service timeout")
    except Exception as e:
        logger.error(f"Error proxying component request: {e}")
        raise HTTPException(status_code=502, detail="Service unavailable")

@router.api_route("/bloomberg/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_bloomberg_request(path: str, request: Request):
    """Proxy requests to Bloomberg service through K8s gateway"""
    try:
        service_config = SERVICE_ROUTES.get("bloomberg")
        if not service_config:
            raise HTTPException(status_code=404, detail="Service not configured")

        # Log the request
        logger.info(f"Proxying Bloomberg request: {request.method} /{path}")

        # Get request body if present
        body = None
        if request.method in ["POST", "PUT"]:
            body = await request.body()

        async with httpx.AsyncClient(timeout=service_config["timeout"]) as client:
            # Forward the request
            response = await client.request(
                method=request.method,
                url=f"{service_config['url']}/api/{path}",
                headers={
                    "X-Forwarded-For": request.client.host,
                    "X-Gateway-Request": "true",
                    "Content-Type": request.headers.get("Content-Type", "application/json")
                },
                content=body,
                params=dict(request.query_params)
            )

            # Return the response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers)
            )

    except httpx.TimeoutException:
        logger.error("Bloomberg service timeout")
        raise HTTPException(status_code=504, detail="Bloomberg service timeout")
    except Exception as e:
        logger.error(f"Error proxying Bloomberg request: {e}")
        raise HTTPException(status_code=502, detail="Service unavailable")

@router.get("/health")
async def proxy_health_check():
    """Check health of all proxied services"""
    health_status = {}

    for service_name, config in SERVICE_ROUTES.items():
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{config['url']}/health")
                health_status[service_name] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "url": config['url']
                }
        except Exception as e:
            health_status[service_name] = {
                "status": "unreachable",
                "url": config['url'],
                "error": str(e)
            }

    # Overall health is healthy only if all services are healthy
    all_healthy = all(s.get("status") == "healthy" for s in health_status.values())

    return {
        "overall": "healthy" if all_healthy else "degraded",
        "services": health_status
    }
