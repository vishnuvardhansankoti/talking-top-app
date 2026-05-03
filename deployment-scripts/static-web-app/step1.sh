# Set variables
export RESOURCE_GROUP="product-pocs-rg"
export LOCATION="eastus2"
export STATIC_WEB_APP_NAME="talking-tom-app"

# Login to Azure
az login

# Create Static Web Apps
az staticwebapp create \
  --name $STATIC_WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Free

# Get deployment token (save this!)
az staticwebapp secrets list \
  --name $STATIC_WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.apiKey" \
  --output tsv

# Get the Static Web Apps URL
az staticwebapp show \
  --name $STATIC_WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "defaultHostname" \
  --output tsv