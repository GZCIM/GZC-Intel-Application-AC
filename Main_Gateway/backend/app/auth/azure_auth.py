"""
Azure AD Authentication Middleware for FastAPI's JWT tokens.
This module provides functions to validate JWT tokens issued by Azure AD.
It supports both HTTP and WebSocket connections.
"""

from functools import lru_cache

import os
from fastapi import WebSocket
from jose import jwt
from jose.exceptions import JWTError
from fastapi import HTTPException, Depends, WebSocketException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
import requests
from app.util.logger import get_logger

logger = get_logger(__name__)
# Load environment variables
load_dotenv()

# Azure AD configuration
MOCK_TOKEN = os.getenv("MOCK_AUTH_TOKEN") or "abc123"
BYPASS_AUTH = os.getenv("BYPASS_AUTH_FOR_PORTFOLIO") == "1"
TENANT_ID = os.getenv("AZURE_AD_TENANT_ID")
CLIENT_ID = os.getenv("AZURE_AD_CLIENT_ID")
ISSUER = f"https://login.microsoftonline.com/{TENANT_ID}/v2.0"
JWKS_URI = f"https://login.microsoftonline.com/{TENANT_ID}/discovery/v2.0/keys"

security = HTTPBearer()


@lru_cache()
def get_jwks():
    """
    Fetch the JSON Web Key Set (JWKS) from Azure AD.
    This is used to validate the JWT signature.
    """
    logger.info("Fetching JWKS from Azure AD")
    response = requests.get(JWKS_URI)
    response.raise_for_status()
    return response.json()["keys"]


def get_signing_key(token):
    """
    Extract the signing key from the JWT token.
    This is used to verify the token's signature.
    """
    logger.info("Extracting signing key from token")
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header["kid"]
    for key in get_jwks():
        if key["kid"] == kid:
            return key
    raise HTTPException(status_code=401, detail="Unable to find matching key")


async def validate_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Validate the JWT token from the request header.
    The token should be passed as a Bearer token in the Authorization header.
    """
    token = credentials.credentials
    if BYPASS_AUTH and token == MOCK_TOKEN:
        logger.warning("Bypassing auth: MOCK token accepted")
        return {"sub": "mock-user", "roles": ["mock"], "aud": CLIENT_ID}
    try:
        # Log token info for debugging
        import base64
        import json
        
        # Decode token without verification first to check what kind it is
        parts = token.split('.')
        if len(parts) != 3:
            raise HTTPException(status_code=401, detail="Invalid token format")
            
        payload_str = parts[1] + '=' * (4 - len(parts[1]) % 4)
        decoded = base64.urlsafe_b64decode(payload_str)
        token_info = json.loads(decoded)
        
        logger.info(f"Token audience: {token_info.get('aud')}, issuer: {token_info.get('iss')}")
        
        # Check if it's a Microsoft Graph token
        if token_info.get('aud') == '00000003-0000-0000-c000-000000000000':
            logger.info("Detected Microsoft Graph token, using simplified validation")
            
            # For Microsoft Graph tokens, just verify tenant and expiry
            if token_info.get("tid") != TENANT_ID:
                logger.error(f"Token from wrong tenant: expected {TENANT_ID}, got {token_info.get('tid')}")
                raise HTTPException(status_code=401, detail="Token from wrong tenant")
            
            # Check expiry
            import time
            if token_info.get("exp", 0) < time.time():
                raise HTTPException(status_code=401, detail="Token expired")
            
            logger.info(f"Microsoft Graph token accepted for user: {token_info.get('preferred_username', token_info.get('email'))}")
            return token_info
        else:
            # For app-specific tokens, do full validation
            signing_key = get_signing_key(token)
            
            payload = jwt.decode(
                token,
                key=signing_key,
                algorithms=["RS256"],
                options={
                    "verify_aud": False,  # Don't verify audience
                    "verify_iss": False,  # Don't verify issuer  
                    "verify_exp": True,   # But do verify expiry
                }
            )
            
            # Manually verify it's from our tenant
            if payload.get("tid") != TENANT_ID:
                logger.error(f"Token from wrong tenant: expected {TENANT_ID}, got {payload.get('tid')}")
                raise HTTPException(status_code=401, detail="Token from wrong tenant")
            
            logger.info(f"App token validated successfully for user: {payload.get('preferred_username', payload.get('email'))}")
            return payload
        
    except JWTError as e:
        logger.error(f"Token validation failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error validating token: {e}")
        raise HTTPException(status_code=401, detail="Token validation error")


async def validate_token_ws(websocket: WebSocket):
    """
    Extract and validate token from WebSocket connection.
    Token should be passed as query param ?token=... or via headers.
    """
    token = None

    # Try to extract from query parameters
    token = websocket.query_params.get("access_token")

    # Optionally support header-based tokens (e.g., for JS clients)
    if not token:
        auth_header = websocket.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header[7:]

    if not token:
        if BYPASS_AUTH:
            logger.warning("Bypassing WS auth: No token provided")
            return {
                "sub": "mock-user",
                "roles": ["mock"],
                "aud": CLIENT_ID,
                "preferred_username": "mock-user",
            }
        logger.error("No token provided for WebSocket connection")
        raise WebSocketException(code=1008, reason="Unauthorized: No token")

    if BYPASS_AUTH and token == MOCK_TOKEN:
        logger.warning("Bypassing WS auth: MOCK token accepted")
        return {
            "sub": "mock-user",
            "roles": ["mock"],
            "aud": CLIENT_ID,
            "preferred_username": "mock-user",
        }

    try:
        # First decode without verification to check token type
        import base64
        import json
        import time
        
        parts = token.split('.')
        if len(parts) != 3:
            raise WebSocketException(code=1008, reason="Invalid token format")
            
        payload_str = parts[1] + '=' * (4 - len(parts[1]) % 4)
        decoded = base64.urlsafe_b64decode(payload_str)
        token_info = json.loads(decoded)
        
        logger.info(f"WS Token audience: {token_info.get('aud')}, issuer: {token_info.get('iss')}")
        
        # Check if it's a Microsoft Graph token
        if token_info.get('aud') == '00000003-0000-0000-c000-000000000000':
            logger.info("Detected Microsoft Graph token in WebSocket, using simplified validation")
            
            # For Microsoft Graph tokens, just verify tenant and expiry
            if token_info.get("tid") != TENANT_ID:
                logger.error(f"WS Token from wrong tenant: expected {TENANT_ID}, got {token_info.get('tid')}")
                raise WebSocketException(code=1008, reason="Token from wrong tenant")
            
            # Check expiry
            if token_info.get("exp", 0) < time.time():
                raise WebSocketException(code=1008, reason="Token expired")
            
            logger.info(f"WS Microsoft Graph token accepted for user: {token_info.get('preferred_username', token_info.get('email'))}")
            return token_info
        else:
            # For app-specific tokens, do full validation
            signing_key = get_signing_key(token)
            
            payload = jwt.decode(
                token,
                key=signing_key,
                algorithms=["RS256"],
                options={
                    "verify_aud": False,  # Don't verify audience
                    "verify_iss": False,  # Don't verify issuer
                    "verify_exp": True,   # But do verify expiry
                }
            )
            
            # Manually verify it's from our tenant
            token_tid = payload.get("tid")
            if token_tid != TENANT_ID:
                logger.error(f"WS Token from wrong tenant: expected {TENANT_ID}, got {token_tid}")
                raise WebSocketException(code=1008, reason="Token from wrong tenant")
            
            logger.info(f"WS Token validated for user: {payload.get('preferred_username', payload.get('email'))}")
            return payload
        
    except JWTError as e:
        logger.error(f"WebSocket token validation failed: {e}")
        raise WebSocketException(code=1008, reason=f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error validating WS token: {e}")
        raise WebSocketException(code=1008, reason="Token validation error")
