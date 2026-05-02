# Sprint Context
## Talking Tom PWA - Sprint 9: Azure Static Web App Deployment

**Sprint:** Sprint 9 - Azure Static Web App Deployment  
**Date:** May 2, 2026  
**Sprint Goal:** Deliver CR-3: provision a new production Azure Static Web App and deploy the Talking Tom static build through GitHub Actions with production approval gating and Azure-authenticated automation.


## Current Scope

### Analyst Scope (✅ Complete)
- Requirements doc: `docs/requirements/sprint9-azure-static-web-app-deployment.md`
- CR-3: provision and deploy Talking Tom to Azure Static Web Apps via GitHub Actions
- Acceptance criteria: US-9.1 through US-9.4 marked [Final]

### Architect Scope (✅ Complete)
- ADR doc: `docs/project-management/ADR-sprint9.md`
- Pipeline design: separate infra provisioning and application deployment workflows
- Security design: GitHub OIDC with `azure/login@v2` and a dedicated pipeline managed identity
- Environment design: single `production` GitHub Environment with gated deployment

### Developer Scope (✅ Complete)
- Added `.github/workflows/infra-deploy.yml` for production Azure provisioning
- Added `.github/workflows/deploy-static-web-app.yml` for validate/build/deploy flow
- Added `.azure/pipeline-setup.md` and `scripts/setup-azure-auth-for-pipeline.sh`
- Added `infra/static-web-app/` Bicep definitions and the production parameter file
- Generated `docs/project-management/PR_SUMMARY.md` and validation evidence

### QA Scope (⬜ Pending)
- Verify provisioning workflow succeeds for the production environment
- Verify deployment workflow publishes `build/` to Azure Static Web Apps
- Validate hosted Azure URL and confirm approval gates behave correctly

---

## Acceptance Criteria (Sprint 9)

| ID | Criteria | Status |
|----|----------|--------|
| AC-S9-01 | IaC exists for the production Azure Static Web App target | 🟡 |
| AC-S9-02 | Provisioning runs in a dedicated GitHub Actions workflow | 🟡 |
| AC-S9-03 | Deployment workflow builds and deploys the static output from `build/` | 🟡 |
| AC-S9-04 | `pull_request` runs validation only and does not deploy to Azure | 🟡 |
| AC-S9-05 | Azure authentication uses OIDC with `azure/login@v2` | 🟡 |
| AC-S9-06 | The `production` GitHub Environment approval gates deployment | 🟡 |
| AC-S9-07 | Setup guide documents auth bootstrap and rollback steps | 🟡 |
| AC-S9-08 | QA verifies the Azure-hosted URL after deployment | ⬜ |
