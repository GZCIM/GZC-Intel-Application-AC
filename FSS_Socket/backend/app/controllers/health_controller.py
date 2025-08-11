"""
Health check controller for FSS Socket Backend
"""
import logging
import json
from datetime import datetime
from flask import Blueprint, jsonify
from flask_cors import CORS

# Initialize blueprint
health_bp = Blueprint("health", __name__)
CORS(health_bp)
logger = logging.getLogger("health_controller")

@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint for FSS Socket Backend
    Returns system health status and connectivity information
    """
    try:
        health_status = {
            "status": "healthy",
            "service": "fss-socket-backend",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "version": "2.0.0",
            "components": {
                "websockets": {
                    "esp": "available",
                    "rfs": "available", 
                    "execution": "available"
                },
                "redis": "checking",
                "fix_gateway": "optional"
            }
        }
        
        # Check Redis connectivity
        try:
            from app.dao.redis_dao import RedisDAO
            import os
            
            redis_dao = RedisDAO(
                quote_type="health",
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                password=os.getenv("REDIS_PASSWORD"),
                ssl=os.getenv("REDIS_SSL", "False") == "True"
            )
            
            # Test Redis connection
            redis_dao.redis_client.ping()
            health_status["components"]["redis"] = "healthy"
            
        except Exception as redis_error:
            logger.warning(f"Redis connection issue: {redis_error}")
            health_status["components"]["redis"] = "unavailable"
            health_status["status"] = "degraded"
        
        # Check FIX gateway (optional - it's OK if not available in container environment)
        try:
            from app.util.fix_connection import FixConnection
            import os
            
            # Just check if configuration exists, don't actually connect
            fix_host = os.getenv("FIX_SOCKET_HOST")
            if fix_host:
                health_status["components"]["fix_gateway"] = "configured"
            else:
                health_status["components"]["fix_gateway"] = "not_configured"
                
        except Exception as fix_error:
            logger.info(f"FIX gateway check: {fix_error}")
            health_status["components"]["fix_gateway"] = "not_available"
        
        # Import connected clients count from controllers
        try:
            from app.controllers.esp_controller import connected_clients as esp_clients
            from app.controllers.rfs_controller import connected_clients as rfs_clients
            
            health_status["connections"] = {
                "esp_clients": len(esp_clients) if esp_clients else 0,
                "rfs_clients": len(rfs_clients) if rfs_clients else 0,
                "total_active": (len(esp_clients) if esp_clients else 0) + (len(rfs_clients) if rfs_clients else 0)
            }
        except Exception as conn_error:
            logger.warning(f"Could not get connection counts: {conn_error}")
            health_status["connections"] = {"status": "unknown"}
        
        return jsonify(health_status), 200
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "service": "fss-socket-backend", 
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "error": str(e)
        }), 500

@health_bp.route("/health/ready", methods=["GET"])
def readiness_check():
    """
    Readiness check - indicates if service is ready to accept traffic
    """
    try:
        # Check if essential components are working
        ready = True
        components = {}
        
        # Check if Flask app is responding
        components["flask"] = "ready"
        
        # Check WebSocket setup
        try:
            from flask_sock import Sock
            components["websockets"] = "ready"
        except Exception:
            components["websockets"] = "not_ready"
            ready = False
            
        return jsonify({
            "ready": ready,
            "service": "fss-socket-backend",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "components": components
        }), 200 if ready else 503
        
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return jsonify({
            "ready": False,
            "service": "fss-socket-backend",
            "timestamp": datetime.utcnow().isoformat() + "Z", 
            "error": str(e)
        }), 503

@health_bp.route("/health/live", methods=["GET"])
def liveness_check():
    """
    Liveness check - indicates if service is alive and responding
    """
    return jsonify({
        "alive": True,
        "service": "fss-socket-backend",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }), 200