#!/usr/bin/env bash

set -euo pipefail

required_vars=(
  REPO_OWNER
  REPO_NAME
  AZURE_SUBSCRIPTION_ID
  AZURE_TENANT_ID
  AZURE_LOCATION
  PLATFORM_IDENTITY_RESOURCE_GROUP
  PLATFORM_IDENTITY_NAME
  PRODUCTION_RESOURCE_GROUP
)

for name in "${required_vars[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
done

az account set --subscription "$AZURE_SUBSCRIPTION_ID"

echo "Creating platform identity resource group: $PLATFORM_IDENTITY_RESOURCE_GROUP"
az group create \
  --name "$PLATFORM_IDENTITY_RESOURCE_GROUP" \
  --location "$AZURE_LOCATION" \
  --output none

echo "Creating user-assigned managed identity: $PLATFORM_IDENTITY_NAME"
az identity create \
  --name "$PLATFORM_IDENTITY_NAME" \
  --resource-group "$PLATFORM_IDENTITY_RESOURCE_GROUP" \
  --location "$AZURE_LOCATION" \
  --output none

client_id=$(az identity show \
  --name "$PLATFORM_IDENTITY_NAME" \
  --resource-group "$PLATFORM_IDENTITY_RESOURCE_GROUP" \
  --query clientId \
  --output tsv)

principal_id=$(az identity show \
  --name "$PLATFORM_IDENTITY_NAME" \
  --resource-group "$PLATFORM_IDENTITY_RESOURCE_GROUP" \
  --query principalId \
  --output tsv)

create_federated_credential() {
  local environment_name="$1"

  az identity federated-credential create \
    --name "${REPO_NAME}-${environment_name}" \
    --identity-name "$PLATFORM_IDENTITY_NAME" \
    --resource-group "$PLATFORM_IDENTITY_RESOURCE_GROUP" \
    --issuer "https://token.actions.githubusercontent.com" \
    --subject "repo:${REPO_OWNER}/${REPO_NAME}:environment:${environment_name}" \
    --audiences "api://AzureADTokenExchange" \
    --output none
}

assign_contributor() {
  local scope_resource_group="$1"

  az group create \
    --name "$scope_resource_group" \
    --location "$AZURE_LOCATION" \
    --output none

  az role assignment create \
    --assignee-object-id "$principal_id" \
    --assignee-principal-type ServicePrincipal \
    --role Contributor \
    --scope "/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${scope_resource_group}" \
    --output none
}

echo "Creating federated credential for the production GitHub Environment"
create_federated_credential production

echo "Assigning Contributor role to the production app resource group"
assign_contributor "$PRODUCTION_RESOURCE_GROUP"

cat <<EOF

Azure pipeline identity configured.

Set the following GitHub Environment variables in production:
  AZURE_CLIENT_ID=$client_id
  AZURE_TENANT_ID=$AZURE_TENANT_ID
  AZURE_SUBSCRIPTION_ID=$AZURE_SUBSCRIPTION_ID

Then set production-specific values for:
  AZURE_RESOURCE_GROUP
  AZURE_LOCATION
  AZURE_STATIC_WEB_APP_NAME

Finally, store the production Azure Static Web App deployment token as:
  AZURE_STATIC_WEB_APPS_API_TOKEN

EOF