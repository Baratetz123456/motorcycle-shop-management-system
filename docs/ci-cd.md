# CI/CD Pipeline Documentation

## Architecture Overview

The MotoShop POS system uses GitHub Actions for Continuous Integration and Continuous Deployment to AWS ECS Fargate.

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                           │
│                                                             │
│  PR → develop/main     push → develop      push → main     │
│  ┌─────────────┐      ┌──────────────┐   ┌──────────────┐  │
│  │   CI Only   │      │   CI + CD    │   │  CI + CD     │  │
│  │             │      │   Staging    │   │  Production  │  │
│  │ • Lint      │      │   (auto)    │   │  (manual     │  │
│  │ • Type-check│      │             │   │   approval)  │  │
│  │ • Build     │      │             │   │              │  │
│  │ • Test      │      │             │   │              │  │
│  │ • Scan      │      │             │   │              │  │
│  └─────────────┘      └──────┬───────┘   └──────┬───────┘  │
│                              │                   │          │
└──────────────────────────────┼───────────────────┼──────────┘
                               │                   │
                     ┌─────────▼───────────────────▼─────────┐
                     │              AWS ECR                    │
                     │  5 repos × 2 environments = 10 repos   │
                     └─────────────────┬─────────────────────┘
                                       │
                     ┌─────────────────▼─────────────────────┐
                     │           AWS ECS Fargate              │
                     │                                        │
                     │  ┌──────────┐    ┌──────────────────┐  │
                     │  │ Staging  │    │   Production     │  │
                     │  │ Cluster  │    │   Cluster        │  │
                     │  └──────────┘    └──────────────────┘  │
                     │                                        │
                     │  Each cluster runs:                    │
                     │  • Frontend (Next.js, port 3000)       │
                     │  • Auth Service (FastAPI, port 8000)   │
                     │  • Inventory Service (port 8000)       │
                     │  • Sales Service (port 8000)           │
                     │  • Repairs Service (port 8000)         │
                     │  • KrakenD API Gateway (port 8080)     │
                     └────────────────────────────────────────┘
```

---

## Pipeline Details

### CI Pipeline (`ci.yml`)

**Trigger:** Pull requests to `develop` or `main`

| Job | Description | Duration (est.) |
|-----|-------------|-----------------|
| `frontend-checks` | ESLint, TypeScript type-check, Next.js build, npm audit | ~3 min |
| `backend-tests` | Install Python deps, run pytest | ~2 min |
| `docker-build` | Build all 5 Docker images (no push) | ~5 min |
| `security-scan` | Trivy HIGH/CRITICAL scan on all images | ~4 min |

All jobs run in parallel except `security-scan` which depends on `docker-build`.

### CD Staging (`deploy-staging.yml`)

**Trigger:** Push to `develop` (auto-deploy, no approval)

1. Runs full CI checks
2. Authenticates with AWS via secrets
3. Builds and pushes 5 Docker images to ECR (tagged `staging-<sha>`)
4. Renders ECS task definitions with new image URIs
5. Deploys to staging ECS cluster
6. Waits for service stability

### CD Production (`deploy-production.yml`)

**Trigger:** Push to `main` (requires manual approval)

Same as staging but:
- Uses GitHub Environment `production` with required reviewers
- Tags images with `prod-<sha>` prefix
- Deploys to production ECS cluster

---

## GitHub Secrets Configuration

Navigate to your repository: **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key | `wJal...` |
| `STAGING_ECR_REGISTRY` | Staging ECR registry URL | `123456789.dkr.ecr.ap-southeast-1.amazonaws.com` |
| `PROD_ECR_REGISTRY` | Production ECR registry URL | `123456789.dkr.ecr.ap-southeast-1.amazonaws.com` |
| `STAGING_ECS_CLUSTER` | Staging ECS cluster name | `motoshop-staging` |
| `PROD_ECS_CLUSTER` | Production ECS cluster name | `motoshop-production` |

> **Note:** `STAGING_ECR_REGISTRY` and `PROD_ECR_REGISTRY` may be the same if you use a single AWS account. They differ if you use separate accounts for staging and production.

---

## GitHub Environment Setup

Navigate to: **Settings → Environments → New environment**

1. Create an environment named `production`
2. Enable **Required reviewers** and add the team members who can approve production deployments
3. Optionally enable **Wait timer** (e.g., 5 minutes) for a cool-down period

---

## AWS Resources Checklist

### ECR Repositories (create 5 per environment)

```bash
# Staging
aws ecr create-repository --repository-name motoshop-frontend --region ap-southeast-1
aws ecr create-repository --repository-name motoshop-auth --region ap-southeast-1
aws ecr create-repository --repository-name motoshop-inventory --region ap-southeast-1
aws ecr create-repository --repository-name motoshop-sales --region ap-southeast-1
aws ecr create-repository --repository-name motoshop-repairs --region ap-southeast-1
```

### ECS Cluster

```bash
aws ecs create-cluster --cluster-name motoshop-staging --region ap-southeast-1
aws ecs create-cluster --cluster-name motoshop-production --region ap-southeast-1
```

### CloudWatch Log Groups

```bash
aws logs create-log-group --log-group-name /ecs/motoshop/frontend --region ap-southeast-1
aws logs create-log-group --log-group-name /ecs/motoshop/auth-service --region ap-southeast-1
aws logs create-log-group --log-group-name /ecs/motoshop/inventory-service --region ap-southeast-1
aws logs create-log-group --log-group-name /ecs/motoshop/sales-service --region ap-southeast-1
aws logs create-log-group --log-group-name /ecs/motoshop/repairs-service --region ap-southeast-1
```

### SSM Parameters (for backend service secrets)

```bash
aws ssm put-parameter \
  --name "/motoshop/database-url" \
  --type SecureString \
  --value "postgresql+asyncpg://user:pass@rds-endpoint:5432/motorcycle_shop" \
  --region ap-southeast-1

aws ssm put-parameter \
  --name "/motoshop/redis-url" \
  --type SecureString \
  --value "redis://elasticache-endpoint:6379" \
  --region ap-southeast-1

aws ssm put-parameter \
  --name "/motoshop/rabbitmq-url" \
  --type SecureString \
  --value "amqp://user:pass@amazonmq-endpoint:5672/" \
  --region ap-southeast-1
```

### IAM Roles

**ECS Task Execution Role** (`ecsTaskExecutionRole`):
- Managed policy: `AmazonECSTaskExecutionRolePolicy`
- Additional permissions: `ssm:GetParameters` for the `/motoshop/*` parameters
- Additional permissions: `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer`

**ECS Task Role** (`ecsTaskRole`):
- Any permissions your application code needs at runtime (e.g., S3 access, SES for emails)

### ALB Configuration

Create an Application Load Balancer with two target groups:

| Target Group | Port | Health Check Path | Targets |
|-------------|------|-------------------|---------|
| `motoshop-frontend-tg` | 3000 | `/` | Frontend ECS service |
| `motoshop-krakend-tg` | 8080 | `/__health` | KrakenD ECS service |

**Listener Rules** (on port 443/HTTPS):

| Priority | Condition | Action |
|----------|-----------|--------|
| 1 | Path pattern: `/api/*` | Forward to `motoshop-krakend-tg` |
| Default | All other paths | Forward to `motoshop-frontend-tg` |

---

## ECS Task Definitions

Task definition templates are in the `ecs/` directory. The `ACCOUNT_ID` placeholder must be replaced with your actual AWS account ID.

| File | Service | Container Port | CPU | Memory |
|------|---------|---------------|-----|--------|
| `task-def-frontend.json` | Frontend (Next.js) | 3000 | 256 | 512 MB |
| `task-def-auth.json` | Auth Service | 8000 | 256 | 512 MB |
| `task-def-inventory.json` | Inventory Service | 8000 | 256 | 512 MB |
| `task-def-sales.json` | Sales Service | 8000 | 256 | 512 MB |
| `task-def-repairs.json` | Repairs Service | 8000 | 256 | 512 MB |

> **Important:** Replace `ACCOUNT_ID` in all task definition files with your actual AWS account ID before the first deployment.

---

## Branching Workflow

```
feature/xyz  ──PR──▶  develop  ──merge──▶  main
                        │                    │
                   Auto-deploy           Manual approval
                   to staging            then deploy
                                         to production
```

1. Create feature branches from `develop`
2. Open a PR to `develop` → CI runs automatically
3. Merge to `develop` → auto-deploys to staging
4. When staging is verified, merge `develop` to `main` → triggers production pipeline
5. Approve the deployment in GitHub → deploys to production

---

## Rollback Procedures

### Quick Rollback (ECS)

Re-deploy the previous task definition revision:

```bash
# List recent task definition revisions
aws ecs list-task-definitions --family-prefix motoshop-frontend --sort DESC --max-items 5

# Update service to use a previous revision
aws ecs update-service \
  --cluster motoshop-production \
  --service frontend-service \
  --task-definition motoshop-frontend:PREVIOUS_REVISION \
  --force-new-deployment
```

### Image Rollback

Deploy a specific known-good image tag:

```bash
# Find previous image tags
aws ecr describe-images --repository-name motoshop-frontend --query 'sort_by(imageDetails,& imagePushedAt)[-5:].imageTags'
```

---

## Troubleshooting

### CI Failures

| Issue | Solution |
|-------|----------|
| ESLint errors | Fix lint issues locally: `cd frontend && npx eslint . --fix` |
| TypeScript errors | Fix types locally: `cd frontend && npx tsc --noEmit` |
| pytest failures | Run tests locally: `cd backend && pytest tests/ -v` |
| Docker build failure | Build locally: `docker build -f frontend/Dockerfile frontend/` |
| Trivy HIGH/CRITICAL | Update base images or fix vulnerabilities in dependencies |

### CD Failures

| Issue | Solution |
|-------|----------|
| ECR push fails | Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets |
| ECS deployment timeout | Check CloudWatch logs: `/ecs/motoshop/<service>` |
| Service not stabilizing | Check health check endpoint is responding |
| Task stopped immediately | Check container logs for startup errors |
