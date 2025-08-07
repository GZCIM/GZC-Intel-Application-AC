# Secret Configuration

This application requires the following secrets to run:

## Azure Redis Password

The Azure Redis password is required to connect to the production Redis instance.

To run the application locally:

```bash
export REDIS_PASSWORD="your-azure-redis-password"
./run-azure-replica.sh
```

## Getting the Redis Password

The Redis password can be retrieved from Azure:

```bash
az redis list-keys --name GZCRedis --resource-group GZC_backend_tools --query primaryKey --output tsv
```

## Security Note

Never commit secrets to Git. Always use environment variables or secure secret management systems.