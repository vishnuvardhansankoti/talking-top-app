# Azure Static Web Apps Pipeline Setup

This repository uses two GitHub Actions workflows for Azure Static Web Apps:

- `.github/workflows/infra-deploy.yml` provisions or updates Azure resources.
- `.github/workflows/deploy-static-web-app.yml` validates, builds, and deploys the prebuilt `build/` output.

## 1. Prerequisites

- Azure subscription with permission to create resource groups, user-assigned managed identities, role assignments, and Azure Static Web Apps.
- GitHub repository admin access for environment creation and secret management.
- Azure CLI logged into the target tenant.

## 2. Create GitHub Environments

Create the `production` GitHub Environment in the repository settings.

Required policy:

- Add approval checks to the `production` environment.

## 3. Create a Dedicated Pipeline Identity

Use `scripts/setup-azure-auth-for-pipeline.sh` to create a dedicated user-assigned managed identity in a separate resource group from the app resource groups.

Recommended shell inputs:

```bash
export REPO_OWNER=vishnuvardhansankoti
export REPO_NAME=talking-top-app
export AZURE_SUBSCRIPTION_ID='<subscription-guid>'
export AZURE_TENANT_ID='<tenant-guid>'
export AZURE_LOCATION='eastus2'
export PLATFORM_IDENTITY_RESOURCE_GROUP='rg-talking-tom-platform'
export PLATFORM_IDENTITY_NAME='id-talking-tom-gha'
export PRODUCTION_RESOURCE_GROUP='rg-talking-tom-production'

bash scripts/setup-azure-auth-for-pipeline.sh
```

The script creates:

- the platform identity resource group
- the user-assigned managed identity
- a federated credential for the `production` GitHub Environment
- a Contributor role assignment on the production app resource group

## 4. Configure GitHub Environment Variables

Set these environment variables in the `production` GitHub Environment:

| Name | Example |
|------|---------|
| `AZURE_CLIENT_ID` | managed identity client ID output by the setup script |
| `AZURE_TENANT_ID` | Azure tenant GUID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription GUID |
| `AZURE_RESOURCE_GROUP` | `rg-talking-tom-production` |
| `AZURE_LOCATION` | `eastus2` |
| `AZURE_STATIC_WEB_APP_NAME` | `talking-tom-prod` |

## 5. Configure GitHub Environment Secrets

Set these secrets in the `production` GitHub Environment:

| Name | Purpose |
|------|---------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token for the target Azure Static Web App |

Notes:

- Azure Static Web Apps deployment still requires an environment-scoped deployment token for `Azure/static-web-apps-deploy@v1`.
- Do not store the token at the repository level; keep it scoped to the matching environment.

## 6. Provision the App Resources

Run `Provision Azure Static Web App Infra` in GitHub Actions.

Recommended sequence:

1. Run the workflow manually once with `workflow_dispatch`.
2. Confirm the run creates or updates the production Azure Static Web App.

The workflow will:

- log in to Azure with OIDC via `azure/login@v2`
- ensure the target resource group exists
- deploy `infra/static-web-app/main.bicep` with the environment parameter file

## 7. Retrieve Deployment Tokens

After the Static Web App exists, retrieve its deployment token and store it as the `production` environment secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.

Example:

```bash
az staticwebapp secrets list \
  --name talking-tom-prod \
  --resource-group rg-talking-tom-production \
  --query properties.apiKey \
  --output tsv
```

## 8. Deploy the Site

`Deploy Azure Static Web App` behaves as follows:

- `pull_request` to `main`: validate only, no Azure deployment
- `push` to `main`: validate and deploy to `production`
- `workflow_dispatch`: validate and deploy to `production`

Required validation gates before deployment:

- `npm test`
- `npm run build`

The workflow deploys the prebuilt `build/` directory with `skip_app_build: true`.

## 9. Rollback

To redeploy a known-good commit:

1. Open the `Deploy Azure Static Web App` workflow in GitHub Actions.
2. Use `Run workflow` from the desired commit or rerun the workflow for the historical commit.
3. Approve the `production` GitHub Environment gate if prompted.

## 10. Expected Review Points

- `production` is the only deployment environment.
- No `pull_request` event should deploy to Azure.