# Register Microsoft.Web resource provider
az provider register --namespace Microsoft.Web

# Wait for registration to complete (takes 1-2 minutes)
az provider show --namespace Microsoft.Web --query "registrationState" -o tsv

# Keep checking until it returns "Registered"
# Or watch it continuously:
az provider show --namespace Microsoft.Web --query "registrationState" -o tsv 

