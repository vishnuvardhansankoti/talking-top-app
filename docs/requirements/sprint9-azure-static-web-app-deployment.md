# Sprint 9 Requirements: Azure Static Web App Deployment via GitHub Actions

**Document:** `docs/requirements/sprint9-azure-static-web-app-deployment.md`
**Sprint Date:** May 2026
**Status:** [Final]

---

## Sprint 9 Goal

Provision a new production Azure Static Web App and deploy the Talking Tom static build through GitHub Actions using an auditable pipeline with Azure-authenticated automation.

---

## Change Request Addressed

| ID | Title | Source |
|----|-------|--------|
| CR-3 | Deploy Talking Tom to Azure Static Web Apps via GitHub Actions | User request 2026-05-02 |

---

## User Stories

---

### US-9.1 — Provisioning: Azure resources can be created from GitHub Actions

**As a maintainer, I want GitHub Actions to provision the Azure Static Web App infrastructure, so that environment setup is repeatable and not dependent on manual portal clicks.**

#### Acceptance Criteria [Final]

- [ ] AC-9.1.1 Infrastructure definitions exist in source control and can create the production Azure Static Web App stack.
- [ ] AC-9.1.2 Provisioning runs in a dedicated GitHub Actions workflow separate from application deployment.
- [ ] AC-9.1.3 Azure authentication for provisioning uses `azure/login@v2` with OIDC and `id-token: write` permission.
- [ ] AC-9.1.4 The pipeline identity is a dedicated user-assigned managed identity in a separate resource group from the app resources.
- [ ] AC-9.1.5 Resource names, subscription IDs, and resource group names are provided via GitHub environment variables or workflow inputs, not hardcoded in workflow steps.

---

### US-9.2 — Deployment: Static build is deployed to Azure Static Web Apps from GitHub Actions

**As a maintainer, I want the repository build output to deploy automatically to Azure Static Web Apps, so that the published site stays aligned with mainline code.**

#### Acceptance Criteria [Final]

- [ ] AC-9.2.1 A GitHub Actions workflow builds the app with the repository's standard commands before any deployment step runs.
- [ ] AC-9.2.2 The deployment workflow publishes the SvelteKit static output from `build/` to Azure Static Web Apps.
- [ ] AC-9.2.3 `pull_request` triggers run validation only and do not perform Azure deployments.
- [ ] AC-9.2.4 Production deployment is gated behind a GitHub Environment approval check.
- [ ] AC-9.2.5 Deployment targets the production Azure Static Web App defined through GitHub Environment variables, not hardcoded workflow values.

---

### US-9.3 — Security: Azure credentials are managed without long-lived repository secrets

**As a maintainer, I want the pipeline to authenticate to Azure securely, so that deployment access is scoped and auditable.**

#### Acceptance Criteria [Final]

- [ ] AC-9.3.1 OIDC federated credential setup is documented for the `production` GitHub Environment.
- [ ] AC-9.3.2 The setup documentation explains required RBAC assignments for the pipeline identity.
- [ ] AC-9.3.3 The repository includes a setup script that automates or documents Azure auth bootstrap for the GitHub pipeline.
- [ ] AC-9.3.4 No publish profile or username/password credential is required in the steady-state deployment path.
- [ ] AC-9.3.5 If an Azure Static Web Apps deployment token is required by the deployment action, it is fetched or supplied per environment and never hardcoded in the workflow.

---

### US-9.4 — Operations: Deployment status is observable and recoverable

**As a maintainer, I want deployment stages and rollback inputs to be explicit, so that failed releases are easy to diagnose and recover.**

#### Acceptance Criteria [Final]

- [ ] AC-9.4.1 GitHub Actions jobs are separated into validate, provision, and deploy stages with clear dependencies.
- [ ] AC-9.4.2 The deployment workflow exposes the target environment and deployed commit in job summaries or logs.
- [ ] AC-9.4.3 The setup documentation defines how to redeploy the last known-good build to a target Azure Static Web App environment.
- [ ] AC-9.4.4 The Developer phase includes validation evidence for `npm test`, `npm run build`, and workflow syntax review.
- [ ] AC-9.4.5 The QA phase includes at least one successful end-to-end deployment verification against the Azure-hosted URL.

---

## Files Expected to Change

| File | Change |
|------|--------|
| `.github/workflows/infra-deploy.yml` | New workflow to provision Azure resources |
| `.github/workflows/deploy-static-web-app.yml` | New workflow to build and deploy the static site |
| `.azure/pipeline-setup.md` | Azure and GitHub environment setup instructions |
| `scripts/setup-azure-auth-for-pipeline.sh` | Auth bootstrap helper for OIDC / federated credential setup |
| `infra/static-web-app/main.bicep` | Azure Static Web App infrastructure definition |
| `infra/static-web-app/parameters/production.bicepparam` | Production environment parameters |

---

## Out of Scope (Sprint 9)

- Azure Functions or API backends
- CDN, WAF, or Front Door integration
- Custom domain cutover
- Runtime application feature changes
- Telemetry dashboards beyond basic workflow logging

---

## Dependencies

| Dependency | Status |
|------------|--------|
| Existing static SvelteKit build output in `build/` | ✅ Present |
| Azure subscription with permission to create resource groups, managed identities, and Static Web Apps | ⚠️ Required |
| GitHub repository environment: `production` | ⚠️ Must be created |
| Azure CLI support for Static Web Apps secret retrieval and deployment auth | ⚠️ Must be validated during Developer phase |

---

## Definition of Done

- [ ] All AC above passing
- [ ] Provisioning workflow can create a new environment from source-controlled IaC
- [ ] Deployment workflow can publish the current app build to Azure Static Web Apps
- [ ] GitHub Environment approvals configured for `production`
- [ ] `.azure/pipeline-setup.md` documents the end-to-end setup steps
- [ ] QA confirms Azure-hosted deployment is accessible and functional