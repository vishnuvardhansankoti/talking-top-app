# ADR-Sprint9: Azure Static Web App Provisioning and Deployment via GitHub Actions

**Status:** Approved  
**Date:** 2026-05-02  
**Author:** Architect Agent  
**Sprint:** 9  
**Change Request:** CR-3 (Azure Static Web App deployment)

---

## 1. Context

The repository currently produces a static SvelteKit build and has no existing Azure deployment automation, no `.github/workflows` deployment files, and no `.azure` or `infra` folder for deployment infrastructure.

The requested target is a new Azure Static Web App deployed via GitHub Actions. The workflow must support provisioning as well as deployment, and must fit the team's orchestrated Analyst -> Architect -> Developer -> QA lifecycle.

---

## 2. Decision

### 2.1 Pipeline split

Use two separate GitHub Actions workflows:

1. `infra-deploy.yml`
   - Purpose: provision or update Azure resources from IaC.
   - Authentication: `azure/login@v2` with OIDC.
   - Trigger: manual (`workflow_dispatch`) and optional protected push trigger for infrastructure changes.

2. `deploy-static-web-app.yml`
   - Purpose: validate, build, and deploy the app.
   - Trigger: push to `main` for deployment, pull requests for validation only.
   - Rule: `pull_request` must not execute Azure deployment jobs.

This split keeps infrastructure mutation and application release independently auditable.

### 2.2 Environment model

Use a single GitHub Environment and a single Azure deployment target:

- `production`

The production environment maps to one Azure Static Web App instance provisioned from the repository IaC.

### 2.3 Azure authentication

Provision a dedicated user-assigned managed identity for the GitHub pipeline in a separate resource group.

Required approach:

- GitHub Actions uses `azure/login@v2`
- Workflow permissions include `id-token: write`
- Federated credentials are created per GitHub Environment subject
- RBAC is granted only to the resource groups needed for provisioning and deployment

No long-lived username/password or publish profile is used for steady-state deployment.

### 2.4 Deployment action strategy

Application deployment will use Azure Static Web Apps compatible GitHub Actions flow with explicit pre-build validation:

- Validate and test locally in workflow first
- Build the static site using repository-standard commands
- Deploy the generated `build/` output to the environment-specific Azure Static Web App

If Azure Static Web Apps deployment requires an API token for the deploy action, retrieve or inject it per environment and never hardcode it in workflow YAML.

### 2.5 Repository additions

The Developer phase should add the following structure:

```text
.github/workflows/
  infra-deploy.yml
  deploy-static-web-app.yml
.azure/
  pipeline-setup.md
infra/static-web-app/
  main.bicep
  parameters/
    production.bicepparam
scripts/
  setup-azure-auth-for-pipeline.sh
```

---

## 3. Workflow Design

### 3.1 Validate stage

The deployment workflow starts with a validation job:

- install dependencies
- run `npm test`
- run `npm run build`
- publish job summary with commit SHA and environment target

This job is the only one allowed on `pull_request`.

### 3.2 Provision stage

The infrastructure workflow provisions:

- the production resource group, if needed
- the production Azure Static Web App
- pipeline managed identity prerequisites, if not already present
- role assignments documented in setup guidance

Provisioning uses Bicep with the production parameter file.

### 3.3 Deploy stage

Deployment occurs after validation and only on non-PR triggers.

The deployment job:

- binds to the `production` GitHub Environment
- requires approval checks defined in GitHub
- consumes production environment variables and secrets
- targets the production Azure Static Web App resource

---

## 4. Operational Rules

### 4.1 Secrets and variables

Store deployment-related values in GitHub Environments, not inline in YAML:

- Azure subscription ID
- resource group name
- static web app name
- tenant ID if required
- deployment token if required by the deploy action

### 4.2 Rollback

Rollback is operationally defined as rerunning the deployment workflow against a previously known-good commit for the affected environment.

The setup documentation must include:

- how to select the target environment
- how to redeploy a previous commit
- which GitHub Environment approval is required

### 4.3 QA gate

QA sign-off requires:

- successful workflow execution evidence
- accessible Azure-hosted URL
- smoke validation of the deployed Talking Tom experience in the hosted environment

---

## 5. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Azure Static Web Apps deploy action may still require a deployment token | Medium | Fetch or store the production token as an environment secret; do not hardcode it |
| Provisioning scope may exceed least-privilege RBAC if not constrained | Medium | Use a dedicated pipeline identity and a production-scoped role assignment |
| No existing IaC baseline in repo | Low | Keep the first implementation minimal and production-scoped |

---

## 6. Developer Handoff

The next phase is Developer.

Success criteria for Developer completion:

1. Add IaC, GitHub Actions workflows, and Azure setup documentation.
2. Validate `npm test` and `npm run build` before deployment jobs.
3. Produce `PR_SUMMARY.md` describing provisioning and deployment behavior.
4. Hand off to QA with evidence that workflow syntax and dependency ordering are correct.