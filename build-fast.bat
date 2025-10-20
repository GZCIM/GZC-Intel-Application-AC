@echo off
REM Fast Docker build script for Windows
echo 🚀 Starting fast Docker build...

REM Enable BuildKit for faster builds
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

REM Build with maximum parallelism and caching
docker build ^
    --build-arg BUILDKIT_INLINE_CACHE=1 ^
    --build-arg VITE_APPLICATIONINSIGHTS_CONNECTION_STRING="%VITE_APPLICATIONINSIGHTS_CONNECTION_STRING%" ^
    --build-arg VITE_CLIENT_ID="%VITE_CLIENT_ID%" ^
    --build-arg VITE_TENANT_ID="%VITE_TENANT_ID%" ^
    --build-arg VITE_APP_VERSION="%VITE_APP_VERSION%" ^
    --progress=plain ^
    --no-cache ^
    -t gzc-intel-app:latest ^
    .

echo ✅ Build completed!
