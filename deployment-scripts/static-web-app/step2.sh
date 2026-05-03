#!/bin/bash
set -e

# Configuration (set these or source from step1)
export RESOURCE_GROUP="${RESOURCE_GROUP:-product-pocs-rg}"
export STATIC_WEB_APP_NAME="${STATIC_WEB_APP_NAME:-talking-tom-app}"

# Install SWA CLI globally (one-time)
echo "📦 Installing SWA CLI..."
npm install -g @azure/static-web-apps-cli 

# Get deployment token
echo "🔑 Getting deployment token..."
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
  --name $STATIC_WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.apiKey" -o tsv)

# Navigate to project root
cd /Users/vishnusankoti/Vishnu/shankotai-hotmail-repos/talking-tom-app

# Build the UI
echo "🔨 Building UI..."
npm run build

# Deploy to Azure Static Web Apps using SWA CLI
echo "🚀 Deploying to Azure Static Web Apps..."
swa deploy \
  --deployment-token $DEPLOYMENT_TOKEN \
  --app-location ./build \
  --env production

echo "✅ Deployment complete!"
echo "URL: https://$(az staticwebapp show --name $STATIC_WEB_APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv)"