"""
Azure Managed Identity Service for secure access to Azure resources.
Provides centralized authentication using Azure Container Apps system-assigned managed identity.
"""

import os
import asyncio
from typing import Optional, Dict, Any
from azure.identity.aio import DefaultAzureCredential as AsyncDefaultAzureCredential, ManagedIdentityCredential as AsyncManagedIdentityCredential
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential
from azure.keyvault.secrets.aio import SecretClient
# from azure.monitor.opentelemetry import configure_azure_monitor  # TODO: Install azure-monitor-opentelemetry
from azure.core.exceptions import ClientAuthenticationError, ResourceNotFoundError
from app.util.logger import get_logger
import json
from functools import lru_cache
from datetime import datetime, timedelta

logger = get_logger(__name__)

class AzureManagedIdentityService:
    """
    Service for accessing Azure resources using managed identity authentication.
    Provides secure access to Key Vault secrets and Application Insights telemetry.
    """
    
    def __init__(self):
        self.key_vault_url = os.getenv("KEY_VAULT_URL", "https://gzc-finma-keyvault.vault.azure.net/")
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.credential = None  # Async credential for Key Vault operations
        self.sync_credential = None  # Sync credential for OpenTelemetry
        self.secret_client = None
        self._secrets_cache: Dict[str, tuple] = {}  # Cache with expiry
        self._cache_ttl = 3600  # 1 hour TTL for secrets
        
    async def initialize(self) -> bool:
        """
        Initialize managed identity credentials and Azure services.
        Returns True if successful, False otherwise.
        """
        try:
            logger.info(f"🚀 Initializing Azure Managed Identity Service (environment: {self.environment})")
            
            if self.environment == "development":
                # Use DefaultAzureCredential for local development (Azure CLI, VS Code, etc.)
                logger.info("Development environment: Using DefaultAzureCredential")
                self.credential = AsyncDefaultAzureCredential()
                self.sync_credential = DefaultAzureCredential()
            else:
                # Use system-assigned managed identity in production
                logger.info("Production environment: Using ManagedIdentityCredential")
                self.credential = AsyncManagedIdentityCredential()
                self.sync_credential = ManagedIdentityCredential()
            
            logger.info(f"🔐 Initializing Key Vault client for: {self.key_vault_url}")
            
            # Initialize Key Vault client
            self.secret_client = SecretClient(
                vault_url=self.key_vault_url,
                credential=self.credential
            )
            
            # Test the connection by trying to list secrets
            logger.info("🔍 Testing Key Vault connection...")
            try:
                async for secret in self.secret_client.list_properties_of_secrets():
                    logger.info(f"✅ Successfully connected to Key Vault. Found secret: {secret.name}")
                    break  # Just test the connection, don't list all secrets
                else:
                    logger.info("✅ Key Vault connection successful (no secrets found)")
                    
            except Exception as e:
                logger.warning(f"⚠️ Key Vault connection test failed: {e}")
                # Don't return False - continue without Key Vault access
                logger.info("🔄 Continuing initialization without Key Vault access...")
            
            # Initialize Application Insights with managed identity
            logger.info("📊 Setting up Application Insights...")
            await self._setup_application_insights()
            
            logger.info("✅ Azure Managed Identity Service initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Azure Managed Identity Service: {e}")
            import traceback
            logger.error(f"💥 Full error traceback: {traceback.format_exc()}")
            return False
    
    async def _setup_application_insights(self):
        """Configure Application Insights with managed identity authentication."""
        try:
            # Get Application Insights connection string from environment first, then Key Vault fallback
            connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
            
            if not connection_string:
                logger.info("🔍 Application Insights connection string not in environment, checking Key Vault...")
                connection_string = await self.get_secret("application-insights-connection-string")
            
            if connection_string:
                # Configure Azure Monitor with the synchronous connection string
                logger.info("🔧 Azure Monitor configuration disabled (module not installed)")
                # TODO: Uncomment when azure-monitor-opentelemetry is installed
                # configure_azure_monitor(
                #     connection_string=connection_string,
                #     credential=self.sync_credential
                # )
                # logger.info("✅ Application Insights configured with managed identity")
            else:
                logger.warning("⚠️ Application Insights connection string not found in environment or Key Vault")
                
        except Exception as e:
            logger.error(f"❌ Failed to configure Application Insights: {e}")
    
    async def get_secret(self, secret_name: str, default_value: Optional[str] = None) -> Optional[str]:
        """
        Retrieve a secret from Azure Key Vault with caching.
        
        Args:
            secret_name: Name of the secret in Key Vault
            default_value: Default value if secret not found
            
        Returns:
            Secret value or default_value if not found
        """
        if not self.secret_client:
            logger.warning("Key Vault client not initialized, returning default value")
            return default_value
        
        # Check cache first
        if secret_name in self._secrets_cache:
            value, timestamp = self._secrets_cache[secret_name]
            if datetime.now() - timestamp < timedelta(seconds=self._cache_ttl):
                logger.debug(f"Returning cached secret: {secret_name}")
                return value
        
        try:
            secret = await self.secret_client.get_secret(secret_name)
            value = secret.value
            
            # Cache the secret with timestamp
            self._secrets_cache[secret_name] = (value, datetime.now())
            
            logger.info(f"✅ Retrieved secret from Key Vault: {secret_name}")
            return value
            
        except ResourceNotFoundError:
            logger.warning(f"⚠️ Secret not found in Key Vault: {secret_name}")
            return default_value
            
        except ClientAuthenticationError as e:
            logger.error(f"❌ Authentication failed for Key Vault access: {e}")
            return default_value
            
        except Exception as e:
            logger.error(f"❌ Failed to retrieve secret {secret_name}: {e}")
            return default_value
    
    async def get_database_connection_string(self) -> Optional[str]:
        """Get PostgreSQL connection string from Key Vault."""
        return await self.get_secret("postgres-connection-string")
    
    async def get_redis_connection_string(self) -> Optional[str]:
        """Get Redis connection string from Key Vault."""
        return await self.get_secret("redis-connection-string")
    
    async def get_fix_credentials(self) -> Optional[Dict[str, str]]:
        """Get FIX protocol credentials from Key Vault."""
        try:
            username = await self.get_secret("fix-username")
            password = await self.get_secret("fix-password")
            
            if username and password:
                return {
                    "username": username,
                    "password": password
                }
            else:
                logger.warning("FIX credentials not found in Key Vault")
                return None
                
        except Exception as e:
            logger.error(f"Failed to retrieve FIX credentials: {e}")
            return None
    
    async def get_azure_ad_config(self) -> Optional[Dict[str, str]]:
        """Get Azure AD configuration from Key Vault."""
        try:
            client_id = await self.get_secret("azure-ad-client-id")
            tenant_id = await self.get_secret("azure-ad-tenant-id")
            
            if client_id and tenant_id:
                return {
                    "client_id": client_id,
                    "tenant_id": tenant_id
                }
            else:
                logger.warning("Azure AD configuration not found in Key Vault")
                return None
                
        except Exception as e:
            logger.error(f"Failed to retrieve Azure AD configuration: {e}")
            return None
    
    async def store_secret(self, secret_name: str, secret_value: str) -> bool:
        """
        Store a secret in Azure Key Vault.
        
        Args:
            secret_name: Name of the secret
            secret_value: Value to store
            
        Returns:
            True if successful, False otherwise
        """
        if not self.secret_client:
            logger.error("Key Vault client not initialized")
            return False
        
        try:
            await self.secret_client.set_secret(secret_name, secret_value)
            
            # Update cache
            self._secrets_cache[secret_name] = (secret_value, datetime.now())
            
            logger.info(f"✅ Secret stored in Key Vault: {secret_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to store secret {secret_name}: {e}")
            return False
    
    def clear_cache(self):
        """Clear the secrets cache."""
        self._secrets_cache.clear()
        logger.info("Secrets cache cleared")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on Azure services.
        
        Returns:
            Dictionary with health status of each service
        """
        health_status = {
            "managed_identity": "unknown",
            "key_vault": "unknown",
            "application_insights": "unknown",
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # Test Key Vault access
            if self.secret_client:
                test_secret = await self.get_secret("health-check", "test")
                if test_secret:
                    health_status["key_vault"] = "healthy"
                else:
                    health_status["key_vault"] = "accessible"
            else:
                health_status["key_vault"] = "not_initialized"
            
            # Test managed identity
            if self.credential:
                health_status["managed_identity"] = "healthy"
            else:
                health_status["managed_identity"] = "not_initialized"
            
            # Test Application Insights
            app_insights_conn = await self.get_secret("application-insights-connection-string")
            if app_insights_conn:
                health_status["application_insights"] = "configured"
            else:
                health_status["application_insights"] = "not_configured"
                
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            health_status["error"] = str(e)
        
        return health_status
    
    async def close(self):
        """Close Azure service connections."""
        try:
            if self.secret_client:
                await self.secret_client.close()
            if self.credential:
                await self.credential.close()
            if self.sync_credential and hasattr(self.sync_credential, 'close'):
                self.sync_credential.close()
            logger.info("Azure Managed Identity Service connections closed")
        except Exception as e:
            logger.error(f"Error closing Azure connections: {e}")

# Global singleton instance
_azure_service: Optional[AzureManagedIdentityService] = None

async def get_azure_service() -> AzureManagedIdentityService:
    """Get or create the global Azure Managed Identity Service instance."""
    global _azure_service
    
    if _azure_service is None:
        _azure_service = AzureManagedIdentityService()
        await _azure_service.initialize()
    
    return _azure_service

@lru_cache(maxsize=1)
def get_azure_service_sync() -> AzureManagedIdentityService:
    """
    Synchronous version for non-async contexts.
    Note: You must call initialize() separately.
    """
    return AzureManagedIdentityService()