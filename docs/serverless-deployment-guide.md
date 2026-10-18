# MotoShop POS: Complete Zero-Cost ($0.00/Month) Serverless AWS Deployment Guide

> **System**: MotoShop Management System (Next.js 16 + FastAPI Modular Monolith)  
> **Deployment Architecture**: Zero-Cost AWS Serverless Scale-to-Zero  
> **Base Monthly Cost**: **$0.00 / month** (100% Free Tiers)  
> **Cloud Provider**: AWS (Lambda + HTTP API Gateway + CloudFront + S3 + RDS PostgreSQL)  
> **Document Version**: 2.0.0-MODULAR-MONOLITH  

---

## Table of Contents

1. [Architecture & Zero-Cost Breakdown](#1-architecture--zero-cost-breakdown)
2. [AWS Free-Tier Quotas & Capacity Ledger](#2-aws-free-tier-quotas--capacity-ledger)
3. [Phase 1: AWS RDS PostgreSQL 16 Setup (Private VPC Topology)](#3-phase-1-aws-rds-postgresql-16-setup-private-vpc-topology)
4. [Phase 2: Deploying Modular Monolith Backend via AWS SAM](#4-phase-2-deploying-modular-monolith-backend-via-aws-sam)
5. [Phase 3: Deploying Frontend SPA to S3 & CloudFront](#5-phase-3-deploying-frontend-spa-to-s3--cloudfront)
6. [Phase 4: Automated CI/CD via GitHub Actions](#6-phase-4-automated-cicd-via-github-actions)
7. [Phase 5: Zero-Cost Guardrails & Billing Alerts ($0.01 Threshold)](#7-phase-5-zero-cost-guardrails--billing-alerts-001-threshold)
8. [Phase 6: Health Verification & Troubleshooting](#8-phase-6-health-verification--troubleshooting)

---

## 1. Architecture & Zero-Cost Breakdown

MotoShop POS deploys on AWS as a serverless, scale-to-zero application designed for counter terminals, tablets, and mobile devices. All compute, database, and content delivery components operate strictly within AWS Free Tier quotas.

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    CLIENT BROWSER                      │
                               │        (POS Terminal, Counter Tablet, Mobile)          │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                                                          ▼ HTTPS (Port 443)
                               ┌────────────────────────────────────────────────────────┐
                               │             AWS CloudFront Distribution                │
                               │        (1 TB / mo Transfer + 10M Reqs/mo ALWAYS FREE)  │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                               ┌──────────────────────────┴─────────────────────────────┐
                               │ Default: /*                                            │ Route: /api/*
                               ▼                                                        ▼
                ┌─────────────────────────────┐                          ┌─────────────────────────────┐
                │       AWS S3 Bucket         │                          │    AWS HTTP API Gateway     │
                │  (Next.js Static SPA)       │                          │  (1M Requests/mo Free Tier) │
                │  Protected via OAC          │                          └──────────────┬──────────────┘
                └─────────────────────────────┘                                         │ Proxies /api/v1/*
                                                                                        ▼
                                                                         ┌─────────────────────────────┐
                                                                         │     AWS Lambda Monolith     │
                                                                         │     (FastAPI + Mangum)      │
                                                                         │     Memory: 256MB           │
                                                                         └──────────────┬──────────────┘
                                                                                        │ Hyperplane ENI
                                                                                        ▼ (Port 5432)
                                                                         ┌─────────────────────────────┐
                                                                         │     AWS RDS PostgreSQL      │
                                                                         │     (db.t4g.micro, 20GB)    │
                                                                         │     Private VPC Subnets     │
                                                                         └─────────────────────────────┘
```

### Cost Comparison Table

| Component | Provisioned Container Setup | Zero-Cost Serverless Setup |
|---|---|---|
| **Frontend CDN & Static Compute** | ~$4.50 / mo (ECS Fargate) | **$0.00** (AWS S3 + CloudFront Always Free Tier) |
| **API Gateway / Load Balancer** | ~$22.50 / mo (ALB) | **$0.00** (HTTP API Gateway, 1M free requests/mo) |
| **Backend Compute** | ~$18.00 / mo (ECS Fargate containers) | **$0.00** (AWS Lambda, 1M free requests & 3.2M sec compute/mo) |
| **PostgreSQL Database** | ~$18.00 / mo (RDS db.t4g.micro) | **$0.00** (AWS RDS Free Tier, 750 hrs/mo db.t4g.micro + 20GB gp3) |
| **State / Cache Storage** | ~$15.00 / mo (ElastiCache Redis) | **$0.00** (Postgres-native `auth.revoked_tokens` & `idempotency_keys`) |
| **Total Monthly Cost** | **~$78.00 – $115.00 / month** | **$0.00 / month** |

---

## 2. AWS Free-Tier Quotas & Capacity Ledger

For a typical motorcycle repair shop and POS counter processing 50–200 transactions per day (~5 concurrent staff users), the free-tier allocations provide massive headroom:

| Service | Free Tier Allocation | Estimated Shop Usage | Safety Margin |
|---|---|---|---|
| **AWS Lambda** | 1,000,000 requests/mo + 3.2M sec compute | ~25,000 requests/mo | **97.5% unused** |
| **AWS HTTP API Gateway** | 1,000,000 requests/mo free | ~25,000 requests/mo | **97.5% unused** |
| **AWS CloudFront** | 1 TB data transfer out/mo + 10M requests | ~3 GB / ~20,000 requests | **99.7% unused** |
| **AWS S3** | 5 GB standard storage + 20,000 GET requests | ~80 MB static assets | **98.4% unused** |
| **AWS RDS PostgreSQL** | 750 hours/mo `db.t4g.micro` + 20 GB gp3 | 1 instance 24/7 (744 hrs) + ~250 MB | **100% covered** |

---

## 3. Phase 1: AWS RDS PostgreSQL 16 Setup (Private VPC Topology)

MotoShop POS requires a PostgreSQL 16 database with the 5 domain schemas (`auth`, `inventory`, `sales`, `repairs`, `audit`). To ensure enterprise-grade security without NAT gateway costs ($32+/mo), RDS is deployed into private VPC subnets with `PubliclyAccessible: false`.

### 3.1 Network & Security Groups Setup

1. Open the **AWS Management Console** and navigate to **VPC** in your target region (e.g., `ap-southeast-1` Singapore).
2. Note your **VPC ID** (default VPC or custom VPC) and its **Subnet IDs** (minimum 2 across different Availability Zones).
3. Under **Security Groups**, create two security groups:
   - **`motoshop-lambda-sg`**:
     - Description: `Security group for MotoShop Lambda functions`
     - Inbound rules: None required.
     - Outbound rules: Allow all IPv4 traffic (`0.0.0.0/0`).
   - **`motoshop-rds-sg`**:
     - Description: `Security group for MotoShop RDS PostgreSQL`
     - Inbound rules:
       - **Type**: `PostgreSQL` (Port `5432`)
       - **Source**: Select `Custom` and choose `motoshop-lambda-sg` (allows only Lambda functions to reach the database).
     - Outbound rules: Leave default.

### 3.2 Create the RDS PostgreSQL Instance

1. In the AWS Console, navigate to **RDS** → **Databases** → **Create database**.
2. Choose a database creation method: **Standard create**.
3. Engine options:
   - **Engine type**: `PostgreSQL`
   - **Engine Version**: `PostgreSQL 16.x`
4. Templates: Select **Free tier** (this automatically locks eligible settings).
5. Settings:
   - **DB instance identifier**: `motoshop-db`
   - **Master username**: `postgres`
   - **Master password**: Enter a strong password and save it securely.
6. Instance configuration:
   - **DB instance class**: `db.t4g.micro` (2 vCPUs, 1 GB RAM, AWS Graviton2).
7. Storage:
   - **Storage type**: `General Purpose SSD (gp3)`
   - **Allocated storage**: `20` GiB
   - **Enable storage autoscaling**: **UNCHECK** (Prevents unexpected storage increases that exceed the 20 GB free tier).
8. Connectivity:
   - **Virtual private cloud (VPC)**: Select your VPC.
   - **Public access**: **No** (`PubliclyAccessible: false`).
   - **VPC security group**: Choose `Existing` and select `motoshop-rds-sg` (remove `default`).
   - **Database port**: `5432`.
9. Additional configuration:
   - **Initial database name**: `motorcycle_shop`
   - **Automated backups**: 7 days retention (within free tier).
   - **Encryption**: Enable encryption (uses free default AWS KMS key).
10. Click **Create database**. Provisioning takes ~5–10 minutes.

### 3.3 Connection String Construction

Once RDS status turns **Available**, copy the **Endpoint** from the Connectivity tab. Your async connection string will be:

```
postgresql+asyncpg://postgres:[PASSWORD]@[RDS_ENDPOINT]:5432/motorcycle_shop
```

> [!NOTE]
> **Zero-Touch Automated Seeding**: You do **not** need to expose RDS to the public internet or configure a bastion host. The project includes a dedicated `MigrationFunction` Lambda that executes inside your private VPC. During initial deployment or CI/CD, it creates all schemas, tables, and automatically populates default staff accounts and catalog seed data (`backend/seed_operational_data.sql`).

---

## 4. Phase 2: Deploying Modular Monolith Backend via AWS SAM

The project includes an [AWS SAM template](file:///d:/POS/motorcycle-shop-management-system/template.yaml) that provisions the FastAPI Modular Monolith as an on-demand Lambda function behind AWS HTTP API Gateway, accompanied by S3 and CloudFront resources.

### 4.1 Prerequisites
1. **AWS CLI v2**: Configured with deployment credentials (`aws configure`).
2. **AWS SAM CLI**: Installed via `winget install Amazon.SAM-CLI` (Windows) or package manager.
3. **Docker Desktop**: Running locally to build container images.

Verify installation:
```bash
sam --version
```

### 4.2 Build and Guided Deployment

From the repository root:

```bash
# 1. Build container images for Lambda
sam build

# 2. Deploy with guided prompt (initial setup)
sam deploy --guided
```

When prompted by the SAM CLI, provide:

| Prompt | Value | Description |
|---|---|---|
| **Stack Name** | `motoshop-serverless` | CloudFormation stack identifier |
| **AWS Region** | `ap-southeast-1` | Choose region matching your RDS instance |
| **Parameter DatabaseUrl** | `postgresql+asyncpg://...` | RDS asyncpg connection string from Phase 1 |
| **Parameter JwtSecretKey** | `[64-character-hex-string]` | Secure random secret key for session JWTs |
| **Parameter CookieSecure** | `true` | Enforces `Secure; HttpOnly; SameSite=Lax` cookies |
| **Parameter VpcSubnetIds** | `subnet-0123...,subnet-0456...` | Comma-separated private subnets housing RDS |
| **Parameter VpcSecurityGroupIds** | `sg-0abc123...` | `motoshop-lambda-sg` ID created in Phase 1 |
| **Confirm changes before deploy** | `y` | Reviews CloudFormation changeset |
| **Allow SAM CLI to create IAM roles** | `y` | Grants SAM permission to create execution roles |
| **Save arguments to samconfig.toml** | `y` | Saves configuration for future headless deploys |

### 4.3 Deployment Outputs
Upon successful deployment, SAM outputs the provisioned resource identifiers:
* `CloudFrontUrl`: Public HTTPS address (`https://dXXXXXXXXXX.cloudfront.net`).
* `HttpApiUrl`: Direct AWS HTTP API Gateway endpoint (`https://xxxx.execute-api.ap-southeast-1.amazonaws.com`).
* `FrontendBucketName`: Private S3 bucket name (`motoshop-frontend-[ACCOUNT]-[REGION]`).
* `CloudFrontDistributionId`: CloudFront Distribution ID for cache invalidations.
* `MigrationFunctionName`: Lambda function for applying database migrations inside the VPC.

---

## 5. Phase 3: Deploying Frontend SPA to S3 & CloudFront

The Next.js 16 frontend is compiled as a 100% static Single-Page Application (SPA) with client-side hydration.

### 5.1 Static Export Compilation

Run the build from the `frontend/` directory with static export enabled:

```bash
cd frontend

# Install clean production dependencies
npm ci

# Compile static HTML/CSS/JS export into frontend/out
NEXT_OUTPUT_MODE=export NEXT_PUBLIC_API_URL="/api/v1" npm run build
```

> [!IMPORTANT]
> Setting `NEXT_OUTPUT_MODE=export` triggers `output: 'export'` in `next.config.ts`, generating the `frontend/out` directory. `NEXT_PUBLIC_API_URL="/api/v1"` ensures that API requests use same-origin relative paths proxied through CloudFront.

### 5.2 Synchronize to S3 & Invalidate CloudFront Edge Cache

From the repository root (replacing with your outputs from Phase 2):

```bash
# 1. Sync static build directory to private S3 bucket
aws s3 sync frontend/out s3://[FrontendBucketName] --delete

# 2. Invalidate CloudFront edge cache so users receive the new version immediately
aws cloudfront create-invalidation \
  --distribution-id [CloudFrontDistributionId] \
  --paths "/*"
```

### 5.3 Zero-CORS & SPA Route Rewrites

* **Unified Same-Origin Routing**: CloudFront routes requests matching `/api/*` to the AWS HTTP API Gateway, while serving all static assets (`/*`) from S3 via Origin Access Control (OAC). This eliminates CORS preflight `OPTIONS` requests entirely.
* **Client-Side Routing**: CloudFront custom error responses map `403` and `404` status codes to `/index.html` with an HTTP `200` status, allowing Next.js client-side navigation (`/sales/pos`, `/repairs/board`, `/settings`) to refresh seamlessly without "Access Denied" errors.

---

## 6. Phase 4: Automated CI/CD via GitHub Actions

The repository includes [.github/workflows/deploy-serverless.yml](file:///d:/POS/motorcycle-shop-management-system/.github/workflows/deploy-serverless.yml) to automate testing, backend deployment, database migration/seeding, and frontend synchronization on every push to `main`.

### 6.1 Required GitHub Repository Secrets

In your GitHub repository, navigate to **Settings → Secrets and variables → Actions → Repository secrets** and add the following 4 secrets:

| Secret Name | Description | Example Value |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | IAM deployment user access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | IAM deployment user secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `DATABASE_URL` | RDS PostgreSQL async connection string | `postgresql+asyncpg://postgres:pass@rds-endpoint:5432/motorcycle_shop` |
| `JWT_SECRET_KEY` | 64-character random hex string for tokens | `c48e89a31a9...` |

> [!TIP]
> **Zero Configuration Maintenance**: Notice that `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`, and `MigrationFunctionName` are **not** needed in GitHub Secrets. The workflow dynamically queries your CloudFormation stack outputs via AWS CLI, preventing drift and copy-paste errors.

### 6.2 Pipeline Execution Flow

```mermaid
flowchart TD
    Push[Push to main] --> CI[Job 1: CI Checks & Lint]
    CI -->|Pass| DeployBackend[Job 2: SAM Build & Deploy Backend]
    DeployBackend --> Migrate[Invoke VPC Migration Lambda]
    Migrate --> Seed[Auto-Seed Tables & Operational Data]
    Seed --> DeployFrontend[Job 3: Static Export Next.js SPA]
    DeployFrontend --> S3Sync[Sync Assets to S3 via OAC]
    S3Sync --> Invalidate[Invalidate CloudFront Cache]
    Invalidate --> Done[🎉 Deployment Complete]
```

1. **CI Checks**: Runs ESLint, TypeScript static verification, Next.js build, dependency security audits, Bandit SAST, and backend test suites.
2. **Backend SAM Deploy**: Runs `sam build` and `sam deploy` targeting the `motoshop-serverless` stack.
3. **VPC Migration Lambda**: Invokes `MigrationFunction` inside the private VPC. If tables are uninitialized, it creates all schemas and populates initial operational data (`seed_operational_data.sql`).
4. **Static Frontend Export**: Compiles Next.js with `NEXT_OUTPUT_MODE=export` and syncs the bundle to S3.
5. **Edge Cache Invalidation**: Invalidates CloudFront edge distribution caches (`/*`).

---

## 7. Phase 5: Zero-Cost Guardrails & Billing Alerts ($0.01 Threshold)

To guarantee that your deployment remains **$0.00 / month**, configure AWS Budgets and CloudWatch alarms to notify you immediately if any unexpected usage occurs.

### 7.1 Setup an AWS Budget ($0.01 Threshold)

1. In the AWS Console, open **Billing and Cost Management** → **Budgets** (or search **AWS Budgets**).
2. Click **Create budget** → select **Cost budget (Recommended)**.
3. Budget configuration:
   - **Period**: Monthly
   - **Budget renewal type**: Recurring
   - **Budgeting method**: Fixed
   - **Budgeted amount**: `$0.01`
   - **Budget name**: `motoshop-zero-cost-guardrail`
4. Alert thresholds:
   - **Alert 1 (Actual)**: Trigger when actual cost exceeds **$0.01** (100% of budgeted amount).
   - **Alert 2 (Forecasted)**: Trigger when forecasted cost exceeds **$0.01**.
   - **Email recipients**: Enter your shop owner or technical contact email.
5. Click **Create budget**.

### 7.2 Enable AWS Free Tier Usage Alerts

1. Open **Billing Preferences** in the AWS Console.
2. Under **Alert preferences**, check **Receive AWS Free Tier usage alerts**.
3. Enter your alert email address and click **Save preferences**.
4. AWS will proactively email you when any resource approaches 85% of its free-tier monthly quota.

### 7.3 Disable Storage Autoscaling Verification

Verify that your RDS instance has storage autoscaling disabled:
```bash
aws rds modify-db-instance \
  --db-instance-identifier motoshop-db \
  --max-allocated-storage 20 \
  --apply-immediately
```
This guarantees that storage never expands beyond the 20 GB free-tier threshold.

---

## 8. Phase 6: Health Verification & Troubleshooting

### 8.1 Verifying Live Deployment

Test your CloudFront endpoint using `curl` or in the browser:

```bash
# 1. Test Health Endpoint
curl -i https://[CloudFrontDomain]/api/v1/health

# Expected Response:
# HTTP/2 200
# {"status":"healthy","service":"motoshop-modular-monolith","version":"2.0.0"}

# 2. Test Seeded Login (Admin)
curl -X POST https://[CloudFrontDomain]/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@motoshop.com","password":"admin123"}'
```

### 8.2 Default Seed Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@motoshop.com` | `admin123` | Full system access, staff provisioning, void invoices |
| **Manager** | `manager@motoshop.com` | `manager123` | Inventory management, job approvals, reporting |
| **Cashier** | `cashier@motoshop.com` | `cashier123` | POS checkout, invoice printing, payments |
| **Mechanic** | `mechanic@motoshop.com` | `mechanic123` | Repair job management, parts requests, labor commission |

> [!CAUTION]
> Log in as Admin immediately upon initial deployment and update passwords in **Settings → Profile → Change Password**.

### 8.3 Monitoring Lambda Logs via SAM CLI

To view real-time logs from the Modular Monolith Lambda function:
```bash
sam logs -n MonolithFunction --stack-name motoshop-serverless --tail
```

To view logs from the VPC Migration Lambda:
```bash
sam logs -n MigrationFunction --stack-name motoshop-serverless --tail
```

### 8.4 Common Troubleshooting Scenarios

| Issue | Root Cause | Solution |
|---|---|---|
| **Lambda times out after 30s connecting to DB** | Security group misconfiguration or missing subnets | Ensure `motoshop-rds-sg` has an inbound rule allowing port 5432 from `motoshop-lambda-sg`. Verify `VpcSubnetIds` includes subnets with access to the DB subnet group. |
| **Next.js routes return 403 on refresh** | Direct S3 path lookup without SPA fallback | CloudFront custom error response missing. Verify `template.yaml` includes error responses mapping 403 and 404 to `/index.html` with HTTP 200. |
| **Frontend build has missing `out/` folder** | Next.js built in standalone mode | Ensure `NEXT_OUTPUT_MODE=export` is set before running `npm run build`. |
| **CORS errors in browser console** | Custom domain mismatch or direct API invocation | Always point the frontend to `/api/v1` (relative path) so CloudFront proxies requests same-origin. |

### 8.5 Local Development Parity

Deploying serverless does not alter your local development experience. You can run the entire system locally with hot-reloading at any time:

```bash
# 1. Start local Postgres 16 and backend container
docker compose up -d

# 2. Start Next.js development server
npm --prefix frontend run dev
```

Local development uses:
* **Frontend**: `http://localhost:3000`
* **FastAPI Backend**: `http://localhost:8000`
* **PostgreSQL Database**: `localhost:5432` (`postgres:123`, db: `motorcycle_shop`)
