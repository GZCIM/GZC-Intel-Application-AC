"""
Azure AD Token Validator
Validates JWT tokens from Azure AD with proper key verification
"""
import jwt
import requests
import logging
import time
from typing import Dict, Optional, Any
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey

logger = logging.getLogger(__name__)

class AzureADTokenValidator:
    def __init__(self, tenant_id: str, client_id: str):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.issuer = f"https://login.microsoftonline.com/{tenant_id}/v2.0"
        self.jwks_uri = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
        self._keys_cache = {}
        self._keys_cache_expiry = 0
        
    def _get_signing_keys(self) -> Dict[str, Any]:
        """Get signing keys from Azure AD with caching"""
        current_time = time.time()
        
        # Use cached keys if still valid (cache for 1 hour)
        if current_time < self._keys_cache_expiry and self._keys_cache:
            return self._keys_cache
            
        try:
            response = requests.get(self.jwks_uri, timeout=10)
            response.raise_for_status()
            
            keys_data = response.json()
            keys = {}
            
            for key_data in keys_data.get('keys', []):
                kid = key_data.get('kid')
                if kid:
                    keys[kid] = key_data
                    
            self._keys_cache = keys
            self._keys_cache_expiry = current_time + 3600  # Cache for 1 hour
            
            logger.info(f"Retrieved {len(keys)} signing keys from Azure AD")
            return keys
            
        except Exception as e:
            logger.error(f"Failed to get signing keys: {e}")
            # Return cached keys if available, even if expired
            return self._keys_cache if self._keys_cache else {}
    
    def _get_public_key(self, kid: str) -> Optional[RSAPublicKey]:
        """Get public key for token verification"""
        keys = self._get_signing_keys()
        key_data = keys.get(kid)
        
        if not key_data:
            logger.warning(f"Key ID {kid} not found in JWKS")
            return None
            
        try:
            # Convert JWK to PEM format
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
            return public_key
        except Exception as e:
            logger.error(f"Failed to create public key from JWK: {e}")
            return None
    
    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate Azure AD token and return user claims
        Returns None if token is invalid
        """
        try:
            logger.debug(f"Validating token: {token[:20]}...")
            
            # Decode header to get key ID
            unverified_header = jwt.get_unverified_header(token)
            logger.debug(f"Token header: {unverified_header}")
            kid = unverified_header.get('kid')
            
            if not kid:
                logger.warning("No key ID in token header")
                return None
                
            # Get public key for verification
            public_key = self._get_public_key(kid)
            if not public_key:
                logger.warning(f"Could not get public key for kid: {kid}")
                return None
                
            # Verify and decode token
            # Accept both client_id and api://client_id as valid audiences
            expected_audiences = [self.client_id, f"api://{self.client_id}"]
            logger.debug(f"Expected audiences: {expected_audiences}")
            logger.debug(f"Expected issuer: {self.issuer}")
            
            decoded = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience=expected_audiences,  # Verify audience matches our app (either format)
                issuer=self.issuer,          # Verify issuer is correct
                options={
                    'verify_exp': True,   # Verify expiration
                    'verify_iat': True,   # Verify issued at
                    'verify_aud': True,   # Verify audience
                    'verify_iss': True,   # Verify issuer
                }
            )
            
            logger.debug(f"Successfully decoded token. Claims: {decoded}")
            
            # Extract user information
            user_info = {
                'user_id': decoded.get('oid') or decoded.get('sub'),  # Object ID or subject
                'email': decoded.get('email') or decoded.get('preferred_username') or decoded.get('upn'),
                'name': decoded.get('name'),
                'tenant_id': decoded.get('tid'),
                'app_id': decoded.get('aud'),
                'issued_at': decoded.get('iat'),
                'expires_at': decoded.get('exp')
            }
            
            logger.info(f"Successfully validated token for user: {user_info['email']}")
            return user_info
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidAudienceError:
            logger.warning("Token audience is invalid")
            return None
        except jwt.InvalidIssuerError:
            logger.warning("Token issuer is invalid")  
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Token is invalid: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error validating token: {e}")
            return None
    
    def is_token_expired(self, user_info: Dict[str, Any]) -> bool:
        """Check if token is expired based on exp claim"""
        exp = user_info.get('expires_at')
        if not exp:
            return True
            
        return time.time() >= exp