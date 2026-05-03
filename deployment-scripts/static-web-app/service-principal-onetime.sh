az ad sp create-for-rbac --name "my-swa-deploy-sp" --role contributor \
  --scopes /subscriptions/d7b747bf-f824-4852-9c2b-145ec1c2f4a7/resourceGroups/product-pocs-rg \
  --sdk-auth

az ad app list --display-name "my-swa-deploy-sp" --query "[0].id" -o tsv

az ad app federated-credential create \
  --id <APP_OBJECT_ID> \
  --parameters '{
    "name": "github-actions-production",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:vishnuvardhansankoti/talking-tom-app:environment:production",
    "description": "GitHub Actions deploy to production",
    "audiences": ["api://AzureADTokenExchange"]
  }'