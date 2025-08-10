#!/bin/bash

echo "🔍 GZC INTEL DEPLOYMENT STATUS"
echo "=============================="
echo "📅 Generated: $(date)"
echo ""

echo "📱 ALL CONTAINER APPS:"
az containerapp list --resource-group gzc-kubernetes-rg \
  --query "[].{name:name,fqdn:properties.configuration.ingress.fqdn,image:properties.template.containers[0].image}" \
  --output table

echo ""
echo "🎯 PRODUCTION APP STATUS (gzc-intel-application-ac):"
az containerapp show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg \
  --query "{name:name,url:properties.configuration.ingress.fqdn,image:properties.template.containers[0].image,replicas:properties.template.scale.minReplicas}" \
  --output table

echo ""
echo "📋 ACTIVE REVISIONS (gzc-intel-application-ac):"
az containerapp revision list --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg \
  --query "[?properties.active==\`true\`].[name,properties.healthState,properties.trafficWeight,properties.template.containers[0].image]" \
  --output table

echo ""
echo "🏷️ RECENT IMAGES IN ACR:"
az acr repository show-tags --name gzcacr --repository gzc-intel-app \
  --output table --orderby time_desc | head -10

echo ""
echo "🌐 PRODUCTION URL:"
echo "https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io"

echo ""
echo "⚡ QUICK DEPLOY COMMAND:"
echo "az containerapp update --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --image gzcacr.azurecr.io/gzc-intel-app:[NEW_TAG]"