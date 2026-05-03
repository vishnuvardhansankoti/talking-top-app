az ad sp create-for-rbac --name "my-swa-deploy-sp" --role contributor \
  --scopes /subscriptions/d7b747bf-f824-4852-9c2b-145ec1c2f4a7/resourceGroups/product-pocs-rg \
  --sdk-auth
