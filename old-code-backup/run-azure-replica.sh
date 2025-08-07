#!/bin/bash
# Run exact Azure Container App replica locally
# Set REDIS_PASSWORD environment variable before running this script

if [ -z "$REDIS_PASSWORD" ]; then
    echo "Error: REDIS_PASSWORD environment variable not set"
    echo "Usage: REDIS_PASSWORD=your_password ./run-azure-replica.sh"
    exit 1
fi

docker run -d \
  --name gzc-production \
  --platform linux/amd64 \
  -p 3500:3500 \
  -p 5100:5100 \
  -e FIX_DEFAULT_SETTL_TYPE=SP \
  -e FIX_ESP_SENDER_COMP_ID_MKT=STR.NY.SIM.GZC.1 \
  -e FIX_ESP_SENDER_COMP_ID_TRD=TRD.NY.SIM.GZC.1 \
  -e FIX_ESP_STREAMING_PORT=9100 \
  -e FIX_ESP_TRADING_PORT=9110 \
  -e FIX_PASSWORD=mAZEqwdR \
  -e FIX_RFS_SENDER_COMP_ID_MKT=STR.RFS.NY.SIM.GZC.2 \
  -e FIX_RFS_SENDER_COMP_ID_TRD=TRD.RFS.NY.SIM.GZC.2 \
  -e FIX_SOCKET_HOST=172.191.91.80 \
  -e FIX_TARGET_COMP_ID=FSS \
  -e FIX_TLS_CERT=192.168.50.103.pem \
  -e FIX_TLS_KEY=192.168.50.103-key.pem \
  -e FIX_USERNAME=alex@gzcim.com \
  -e REDIS_HOST=GZCRedis.redis.cache.windows.net \
  -e REDIS_PASSWORD="${REDIS_PASSWORD}" \
  -e REDIS_PORT=6380 \
  -e REDIS_SSL=True \
  -e VITE_WEBSOCKET_ESP=/ws_esp \
  -e VITE_WEBSOCKET_EXECUTION=/ws_execution \
  -e VITE_WEBSOCKET_RFS=/ws_rfs \
  gzcacr.azurecr.io/gzc-intel-app:fss-complete-fix

echo "Container started with exact Azure configuration"
echo "Access the app at http://127.0.0.1:3500"