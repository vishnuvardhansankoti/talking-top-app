# PR Summary
## Sprint 9 Production Azure Static Web App Deployment

## Objective
Provision and deploy the Talking Tom static build to a single Azure Static Web App production environment via GitHub Actions.

## Changes
- Added production-only Azure Static Web App infrastructure:
  - `infra/static-web-app/main.bicep`
  - `infra/static-web-app/parameters/production.bicepparam`
- Added production-only GitHub Actions workflows:
  - `.github/workflows/infra-deploy.yml` for OIDC-authenticated provisioning
  - `.github/workflows/deploy-static-web-app.yml` for validate/build/deploy with no deployment on `pull_request`
- Added Azure pipeline setup assets:
  - `.azure/pipeline-setup.md`
  - `scripts/setup-azure-auth-for-pipeline.sh`
- Updated Sprint 9 orchestration docs to reflect a single `production` environment instead of `dev`/`staging`/`production`.

## Validation
- `npm test` -> 148/148 pass
- `npm run build` -> success, static output written to `build`
- Diagnostics -> no errors reported in the new workflow, IaC, script, or Sprint 9 documentation files

## Remaining QA Gate
- Configure the real GitHub `production` environment variables and `AZURE_STATIC_WEB_APPS_API_TOKEN` secret.
- Run the provisioning workflow against Azure.
- Run the deployment workflow and verify the hosted production URL.