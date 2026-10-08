# MotoShop POS: Complete Zero-Cost ($0.00/Month) Serverless AWS Deployment Guide

> **System**: MotoShop Management System (Next.js 16 + FastAPI Modular Monolith)  
> **Deployment Architecture**: Zero-Cost AWS Serverless Scale-to-Zero  
> **Base Monthly Cost**: **$0.00 / month** (100% Free Tiers)  
> **Cloud Provider**: AWS (Lambda + HTTP API Gateway + CloudFront + S3 + RDS PostgreSQL)  
> **Document Version**: 2.0.0-MODULAR-MONOLITH  

---

## Table of Contents

1. [Architecture & Zero-Cost Breakdown](#1-architecture--zero-cost-breakdown)
2. [Free-Tier Quotas & Limits](#2-free-tier-quotas--limits)
3. [Phase 1: AWS RDS PostgreSQL Setup](#3-phase-1-aws-rds-postgresql-setup)
4. [Phase 2: Deploying Backend via AWS SAM](#4-phase-2-deploying-backend-via-aws-sam)
5. [Phase 3: Deploying Frontend to S3 & CloudFront](#5-phase-3-deploying-frontend-to-s3--cloudfront)
6. [Phase 4: Automated CI/CD via GitHub Actions](#6-phase-4-automated-cicd-via-github-actions)
7. [Phase 5: Free-Tier Health & Troubleshooting](#7-phase-5-free-tier-health--troubleshooting)

---

## 1. Architecture & Zero-Cost Breakdown

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    CLIENT BROWSER                      │
                               │        (POS Terminal, Counter Tablet, Mobile)          │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                                                          ▼ HTTPS (Port 443)
                               ┌────────────────────────────────────────────────────────┐
                               │             AWS CloudFront Distribution                │
                               │           (1 TB / mo Transfer + 10M Reqs/mo FREE)      │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                               ┌──────────────────────────┴─────────────────────────────┐
                               │ Default: /*                                            │ Route: /api/*
                               ▼                                                        ▼
                ┌─────────────────────────────┐                          ┌─────────────────────────────┐
                │       AWS S3 Bucket         │                          │    AWS HTTP API Gateway     │
                │  (Next.js Static SPA)       │                          │  (1M Requests/mo Free Tier) │
                │  Protected via OAC          │                          └──────────────┬──────────────┘
                └─────────────────────────────┘                                         │
                                                                                        ▼
                                                                         ┌─────────────────────────────┐
                                                                         │    AWS Lambda Monolith      │
                                                                         │    (FastAPI + Mangum)       │
                                                                         │    Memory: 256MB            │
                                                                         └──────────────┬──────────────┘
                                                                                        │
                                                                                        ▼
                                                                         ┌─────────────────────────────┐
                                                                         │    AWS RDS PostgreSQL       │
                                                                         │    (db.t4g.micro, 20GB)     │
                                                                         │    Private VPC Subnet       │
                                                                         └─────────────────────────────┘
```

### Cost Comparison Table

| Component | Provisioned Container Setup | Serverless Modular Monolith Setup |
|---|---|---|
| **Frontend CDN & Static Compute** | ~$4.50 / mo (ECS Fargate) | **$0.00** (AWS S3 + CloudFront Always Free Tier) |
| **API Gateway / Load Balancer** | ~$22.50 / mo (ALB) | **$0.00** (HTTP API Gateway, 1M free requests/mo) |
| **Backend Compute** | ~$18.00 / mo (ECS Fargate containers) | **$0.00** (AWS Lambda, 1M free requests & 3.2M sec compute/mo) |
| **PostgreSQL Database** | ~$18.00 / mo (RDS db.t4g.micro) | **$0.00** (AWS RDS Free Tier, 750 hrs/mo db.t4g.micro + 20GB gp3) |
| **Total Monthly Cost** | **~$63.00 – $100.00 / month** | **$0.00 / month** |

---

## 2. Free-Tier Quotas & Limits

For a typical motorcycle repair shop and POS counter processing 50–200 transactions per day, this free-tier infrastructure provides generous headroom:

| Service | Free Tier Allocation | Estimated Shop Usage | Safety Margin |
|---|---|---|---|
| **AWS Lambda** | 1,000,000 requests/mo + 3.2M sec compute | ~15,000 requests/mo | **98.5% unused** |
| **AWS HTTP API Gateway** | 1,000,000 requests/mo free | ~15,000 requests/mo | **98.5% unused** |
| **AWS CloudFront** | 1 TB data transfer out/mo + 10M requests | ~2 GB / ~30,000 requests | **99.7% unused** |
| **AWS S3** | 5 GB standard storage + 20,000 GET requests | ~50 MB static assets | **99.0% unused** |
| **AWS RDS PostgreSQL** | 750 hours/mo `db.t4g.micro` + 20 GB gp3 | 1 instance 24/7 + ~200 MB data | **100% covered** |


---

## 3. Phase 1: Free Database & Redis Setup

### 3.1 Supabase PostgreSQL Setup
Supabase provides a hosted PostgreSQL 16 database with built-in connection pooling:

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project**:
   - **Name**: `motoshop-pos`
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select `Southeast Asia (Singapore)` to minimize latency.
   - **Pricing Plan**: **Free tier ($0/month)**.
3. Once provisioned, open **Project Settings → Database → Connection string**:
   - Select **URI** mode and copy the string.
   - It will look like:
---

## 3. Phase 1: PostgreSQL Database Setup

MotoShop requires a PostgreSQL 16 database with the 5 domain schemas (`auth`, `inventory`, `sales`, `repairs`, `audit`).

### Option A: AWS RDS PostgreSQL (Always Free Tier Eligible)
1. In the AWS Console, navigate to **RDS** → **Create database**.
2. Select **PostgreSQL 16**.
3. Choose **Free tier** template.
4. Set DB instance identifier to `motoshop-db`.
5. Master username: `postgres`, Password: `[YOUR_STRONG_PASSWORD]`.
6. Instance configuration: `db.t4g.micro` (750 hours/month free).
7. Storage: 20 GB gp3 with storage autoscaling disabled.
8. Network: Place in private VPC subnets with `PubliclyAccessible: false`.
9. The resulting connection string will look like:
   ```
   postgresql+asyncpg://postgres:[PASSWORD]@[RDS_ENDPOINT]:5432/motorcycle_shop
   ```

### Initializing Schemas & Seed Data:
Run schemas and operational seed data via `psql`:
```bash
PGPASSWORD="[PASSWORD]" psql -h [RDS_ENDPOINT] -U postgres -d motorcycle_shop -f init.sql
PGPASSWORD="[PASSWORD]" psql -h [RDS_ENDPOINT] -U postgres -d motorcycle_shop -f backend/seed_operational_data.sql
```

---

## 4. Phase 2: Deploying Backend via AWS SAM

The project includes an [AWS SAM template](file:///d:/POS/motorcycle-shop-management-system/template.yaml) that provisions the FastAPI Modular Monolith as an on-demand Lambda function behind AWS HTTP API Gateway.

### 4.1 Prerequisites
1. **AWS CLI v2**: Configured with your AWS credentials (`aws configure`).
2. **AWS SAM CLI**: Install via `winget install Amazon.SAM-CLI` (Windows) or follow AWS SAM documentation.
3. **Docker Desktop**: Running locally to build container images.

Verify installation:
```bash
sam --version
```

### 4.2 Build and Deploy
From the repository root:

```bash
# 1. Build the SAM application
sam build

# 2. Deploy with guided prompt (initial setup)
sam deploy --guided
```

When prompted by SAM CLI, provide:
- **Stack Name**: `motoshop-serverless`
- **AWS Region**: `ap-southeast-1`
- **Parameter DatabaseUrl**: `[Paste your postgresql+asyncpg:// connection string]`
- **Parameter JwtSecretKey**: `[Enter a secure random 64-character hex string]`
- **Parameter CookieSecure**: `true`
- **Confirm changes before deploy**: `y`
- **Allow SAM CLI to create IAM roles**: `y`
- **Save arguments to configuration file (samconfig.toml)**: `y`

SAM builds the container image, pushes it to an automatically managed ECR repository, deploys the CloudFormation stack, and outputs:
- `HttpApiUrl`: The API Gateway base URL.
- `CloudFrontDomain`: The CloudFront CDN distribution domain (`https://dXXXXXXXXXX.cloudfront.net`).
- `FrontendBucketName`: The private S3 bucket name.

---

## 5. Phase 3: Deploying Frontend to S3 & CloudFront

The Next.js 16 frontend is compiled as a 100% static Single-Page Application (SPA) with client-side hydration:

```bash
# 1. Navigate to frontend and compile static export
cd frontend
npm ci
npm run build

# 2. Synchronize static HTML/JS/CSS to S3 bucket
aws s3 sync out/ s3://[FrontendBucketName] --delete

# 3. Invalidate CloudFront edge cache
aws cloudfront create-invalidation \
  --distribution-id [CloudFrontDistributionId] \
  --paths "/*"
```

> [!TIP]
> **Zero-CORS Architecture**: CloudFront automatically proxies `/api/*` requests to the AWS HTTP API Gateway origin, while serving static routes (`/*`) from S3 via Origin Access Control (OAC). Cookies and tokens work seamlessly out of the box with zero CORS overhead.

---

## 6. Phase 4: Automated CI/CD via GitHub Actions

The repository includes [.github/workflows/deploy-serverless.yml](file:///d:/POS/motorcycle-shop-management-system/.github/workflows/deploy-serverless.yml) to automate deployments on every push to `main`.

### 6.1 Required GitHub Secrets
In your repository, navigate to **Settings → Secrets and variables → Actions → Repository secrets** and add:

| Secret Name | Description | Example Value |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | IAM deployment user access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | IAM deployment user secret key | `wJalrXUtnFEMI...` |
| `DATABASE_URL` | RDS PostgreSQL async connection string | `postgresql+asyncpg://postgres:pass@rds-endpoint:5432/motorcycle_shop` |
| `JWT_SECRET_KEY` | Secret key for signing session tokens | 64-character random hex string |
| `S3_BUCKET_NAME` | Private S3 bucket name | `motoshop-frontend-123456789012` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID | `E1A2B3C4D5E6F7` |

### 6.2 Pipeline Operation
1. **CI Checks**: Runs `.github/workflows/ci.yml` (ESLint, TypeScript, Next.js build, strict `npm audit`, 43 backend tests with Postgres 16 service, Gitleaks, Bandit SAST, pip-audit, and Trivy scan).
2. **Backend Deployment**: Executes `sam build` and `sam deploy` targeting `motoshop-serverless`.
3. **VPC Migration Lambda**: Invokes `MigrationFunction` to apply schema updates inside the private RDS VPC subnet.
4. **Frontend Static Sync**: Compiles static Next.js assets and synchronizes them to S3.
5. **Cache Invalidation**: Invalidates CloudFront edge distribution caches.

---

## 7. Phase 5: Free-Tier Health & Troubleshooting

### Monitoring Lambda Logs
To view live logs from the Modular Monolith Lambda function:
```bash
sam logs -n MonolithFunction --stack-name motoshop-serverless --tail
```

### Local Development Parity
Deploying serverless does not break your local development workflow. You can run the entire system locally at any time:
```bash
docker compose up -d
npm --prefix frontend run dev
```
Local development uses `motoshop-backend` on port `8000`, `motoshop-db` on port `5432`, and the Next.js dev server on port `3000`.

