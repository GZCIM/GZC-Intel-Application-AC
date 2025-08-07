@echo off
REM Build and Deploy Script for GZC Intel Application AC
REM Windows version

set ACR_NAME=gzcacr
set IMAGE_NAME=gzc-intel-application-ac
set VERSION=%1
if "%VERSION%"=="" set VERSION=v1
set FULL_IMAGE=%ACR_NAME%.azurecr.io/%IMAGE_NAME%:%VERSION%

echo ================================================
echo GZC Intel Application AC - Build ^& Deploy
echo ================================================
echo Image: %FULL_IMAGE%
echo.

REM Step 1: Login to Azure Container Registry
echo Step 1: Logging into Azure Container Registry...
az acr login --name %ACR_NAME%

REM Step 2: Build for linux/amd64 (Azure standard)
echo.
echo Step 2: Building Docker image for linux/amd64...
docker buildx create --use --name crossplatform 2>nul
docker buildx build ^
    --platform linux/amd64 ^
    -t %FULL_IMAGE% ^
    --push ^
    .

echo.
echo ================================================
echo Build Complete!
echo Image pushed to: %FULL_IMAGE%
echo.
echo To deploy to Azure Container Apps, run:
echo   az containerapp create ^
echo     --name %IMAGE_NAME% ^
echo     --resource-group gzc-kubernetes-rg ^
echo     --environment gzc-container-env ^
echo     --image %FULL_IMAGE% ^
echo     --target-port 80 ^
echo     --ingress external ^
echo     --cpu 0.5 --memory 1.0Gi
echo ================================================