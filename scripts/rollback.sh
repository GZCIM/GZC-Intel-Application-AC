#!/bin/bash
set -e

# EMERGENCY ROLLBACK SCRIPT
# Rolls back to previous working revision

echo "🆘 EMERGENCY ROLLBACK"
echo "===================="

APP_NAME="gzc-intel-application-ac"
RESOURCE_GROUP="gzc-kubernetes-rg"

echo "🔍 Getting revision history..."
REVISIONS=$(az containerapp revision list \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[].{name:name,created:properties.createdTime,active:properties.active,healthy:properties.healthState}" \
  --output table)

echo "$REVISIONS"
echo ""

if [ -z "$1" ]; then
  echo "❌ Please specify revision name to rollback to:"
  echo "Usage: ./scripts/rollback.sh <revision-name>"
  echo ""
  echo "Available revisions:"
  az containerapp revision list \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "[].name" \
    --output table
  exit 1
fi

ROLLBACK_REVISION="$1"
echo "🔄 Rolling back to: $ROLLBACK_REVISION"

# Set traffic to 100% on the specified revision
az containerapp ingress traffic set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --revision-weight "$ROLLBACK_REVISION=100"

echo ""
echo "✅ ROLLBACK COMPLETE"
echo "🌐 URL: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io"
echo "📋 Verify: ./scripts/deployment-status.sh"