# MotoShop POS: Complete Zero-Cost ($0.00/Month) Serverless AWS Deployment Guide

> **System**: MotoShop Management System (Next.js 16 + FastAPI Microservices)  
> **Deployment Architecture**: Serverless Scale-to-Zero  
> **Base Monthly Cost**: **$0.00 / month** (100% Free Tiers)  
> **Cloud Providers**: AWS (Amplify + Lambda + HTTP API Gateway + SQS) + Supabase (Postgres) + Upstash (Redis)  
> **Document Version**: 1.0.0-SERVERLESS  

---

## Table of Contents

1. [Architecture & Zero-Cost Breakdown](#1-architecture--zero-cost-breakdown)
2. [Free-Tier Quotas & Limits](#2-free-tier-quotas--limits)
3. [Phase 1: Free Database & Redis Setup](#3-phase-1-free-database--redis-setup)
   - [1.1 Supabase PostgreSQL Setup](#11-supabase-postgresql-setup)
   - [1.2 Upstash Serverless Redis Setup](#12-upstash-serverless-redis-setup)
4. [Phase 2: Deploying Backend via AWS SAM](#4-phase-2-deploying-backend-via-aws-sam)
   - [2.1 Prerequisites](#21-prerequisites)
   - [2.2 Build and Deploy](#22-build-and-deploy)
5. [Phase 3: Deploying Frontend on AWS Amplify Hosting](#5-phase-3-deploying-frontend-on-aws-amplify-hosting)
   - [3.1 Connect Repository](#31-connect-repository)
   - [3.2 Configure Reverse Proxy Rewrites (Zero-CORS)](#32-configure-reverse-proxy-rewrites-zero-cors)
6. [Phase 4: End-to-End Verification & Testing](#6-phase-4-end-to-end-verification--testing)
7. [Phase 5: Maintaining Local Development Parity](#7-phase-5-maintaining-local-development-parity)
8. [Phase 6: Automated CI/CD via GitHub Actions](#8-phase-6-automated-cicd-via-github-actions)
9. [Phase 7: Free-Tier Health & Troubleshooting](#9-phase-7-free-tier-health--troubleshooting)

---

## 1. Architecture & Zero-Cost Breakdown

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    CLIENT BROWSER                      │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                                                          ▼
                               ┌────────────────────────────────────────────────────────┐
                               │             AWS Amplify Hosting (Next.js)              │
                               │             URL: https://main.xxxxxx.amplifyapp.com    │
                               │                                                        │
                               │   Rewrite: /api/* ──► AWS HTTP API Gateway             │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                                                          ▼
                               ┌────────────────────────────────────────────────────────┐
                               │                 AWS HTTP API Gateway                   │
                               │             ($1.00 / 1M requests; 1M FREE/mo)          │
                               └───────┬──────────────┬──────────────┬──────────────┬───┘
                                       │              │              │              │
                   /api/v1/auth/*      │              │              │              │ /api/v1/repairs/*
                   ┌───────────────────┘              │              │              └───────────────────┐
                   ▼                                  ▼              ▼                                  ▼
        ┌─────────────────────┐    ┌─────────────────────┐┌─────────────────────┐    ┌─────────────────────┐
        │ Auth Service        │    │ Inventory Service   ││ Sales Service       │    │ Repairs Service     │
        │ AWS Lambda (256MB)  │    │ AWS Lambda (256MB)  ││ AWS Lambda (256MB)  │    │ AWS Lambda (256MB)  │
        │ Handler: Mangum     │    │ Handler: Mangum     ││ Handler: Mangum     │    │ Handler: Mangum     │
        └──────────┬──────────┘    └──────────┬──────────┘└──────────┬──────────┘    └──────────┬──────────┘
                   │                          │                      │                          │
                   └──────────────────────────┼──────────────────────┴──────────────────────────┘
                                              │
                                              ▼
        ┌───────────────────────────────────────────────────────────────────────────────────────────────┐
        │                                  Zero-Cost Serverless State                                   │
        │                                                                                               │
        │   ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌───────────────────┐   │
        │   │ Supabase PostgreSQL (Free)   │  │ Upstash Redis (Free)         │  │ AWS SQS (Free)    │   │
        │   │ 500 MB DB / Pooling          │  │ 10,000 commands/day          │  │ 1M requests/mo    │   │
        │   │ 5 Schemas (auth/inv/sales...)│  │ Session & Token Blacklist    │  │ Saga Event Broker │   │
        │   └──────────────────────────────┘  └──────────────────────────────┘  └───────────────────┘   │
        └───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Cost Comparison Table

| Component | Provisioned ECS + RDS Setup | Serverless Setup (Option 3) |
|---|---|---|
| **Frontend Compute** | ~$4.50 / mo (ECS Fargate) | **$0.00** (AWS Amplify Free Tier) |
| **API Gateway / Load Balancer** | ~$22.50 / mo (ALB) | **$0.00** (HTTP API Gateway, 1M free requests/mo) |
| **Backend Microservices** | ~$18.00 / mo (4 Fargate containers) | **$0.00** (AWS Lambda, 1M free requests & 3.2M sec compute/mo) |
| **PostgreSQL Database** | ~$18.00 / mo (RDS db.t4g.micro) | **$0.00** (Supabase Free Tier, 500MB storage) |
| **Redis Cache** | ~$4.50 / mo (ECS Fargate) | **$0.00** (Upstash Free Tier, 10k cmds/day) |
| **Message Broker (Saga)** | ~$4.50 / mo (ECS Fargate) | **$0.00** (AWS SQS, 1M requests free forever) |
| **Total Monthly Cost** | **~$80.00 – $116.00 / month** | **$0.00 / month** |

---

## 2. Free-Tier Quotas & Limits

For a typical motorcycle repair shop and POS counter processing 50–200 transactions per day, this free-tier infrastructure provides more than enough headroom:

| Service | Free Tier Allocation | Estimated Shop Usage | Safety Margin |
|---|---|---|---|
| **AWS Lambda** | 1,000,000 requests/mo + 3.2M sec compute | ~15,000 requests/mo | **98.5% unused** |
| **AWS HTTP API Gateway** | 1,000,000 requests/mo free | ~15,000 requests/mo | **98.5% unused** |
| **AWS SQS** | 1,000,000 requests/mo free forever | ~5,000 messages/mo | **99.5% unused** |
| **AWS Amplify Hosting** | 15 GB served/mo + 1,000 build mins | ~1.5 GB served/mo | **90% unused** |
| **Supabase Postgres** | 500 MB database storage | ~15 MB initial data | **97% unused** |
| **Upstash Redis** | 10,000 commands/day | ~600 commands/day | **94% unused** |

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
     ```
     postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```
   - **Crucial step**: Change the protocol prefix from `postgresql://` to `postgresql+asyncpg://` for SQLAlchemy:
     ```
     postgresql+asyncpg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```

#### Initializing Schemas & Seed Data on Supabase:
1. In the Supabase sidebar, click the **SQL Editor** icon.
2. Click **New Query**.
3. Open [init.sql](file:///d:/POS/motorcycle-shop-management-system/init.sql), copy its entire contents, paste into the Supabase SQL editor, and click **Run**.
4. Open a second query tab, paste the contents of [backend/seed_operational_data.sql](file:///d:/POS/motorcycle-shop-management-system/backend/seed_operational_data.sql), and click **Run**.
5. Click **Table Editor** in the sidebar. You will see all tables created across the schemas (`auth.users`, `inventory.items`, `sales.transactions`, `repairs.job_orders`, etc.).

---

### 3.2 Upstash Serverless Redis Setup
Upstash provides serverless Redis with per-command pricing and a permanent free tier:

1. Go to [upstash.com](https://upstash.com) and create a free account.
2. Click **Create Database**:
   - **Name**: `motoshop-redis`
   - **Type**: Regional
   - **Region**: `ap-southeast-1` (Singapore)
   - **Primary Zone**: AWS
3. Under the **Connect** section:
   - Select **redis-py** or copy the **Redis URL**.
   - It will look like:
     ```
     rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
     ```
   *(Note the `rediss://` with double 's', indicating TLS encryption).*

---

## 4. Phase 2: Deploying Backend via AWS SAM

The project includes an [AWS SAM template](file:///d:/POS/motorcycle-shop-management-system/template.yaml) that provisions the 4 FastAPI microservices as Lambda container images, sets up the HTTP API Gateway, and creates the SQS queue with a single command.

### 4.1 Prerequisites
Ensure you have the following installed:
1. **AWS CLI v2**: Configured with your AWS credentials (`aws configure`).
2. **AWS SAM CLI**: Install via `winget install Amazon.SAM-CLI` (Windows) or download from [AWS SAM documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
3. **Docker Desktop**: Running in Linux container mode.

Verify installation:
```bash
sam --version
```

### 4.2 Build and Deploy
In the root directory of `motorcycle-shop-management-system`:

```powershell
# 1. Build the Lambda container images
sam build

# 2. Deploy with guided prompt
sam deploy --guided
```

When prompted by SAM CLI, provide:
- **Stack Name**: `motoshop-serverless`
- **AWS Region**: `ap-southeast-1`
- **Parameter DatabaseUrl**: `[Paste your Supabase postgresql+asyncpg:// connection string]`
- **Parameter RedisUrl**: `[Paste your Upstash rediss:// connection string]`
- **Parameter JwtSecretKey**: `[Enter a secure random 32-character string]`
- **Parameter CookieSecure**: `true`
- **Confirm changes before deploy**: `y`
- **Allow SAM CLI to create IAM roles**: `y`
- **Disable rollback**: `n`
- **Save arguments to configuration file (samconfig.toml)**: `y`

SAM will build the container images, push them to an automatically managed ECR repository, deploy the CloudFormation stack, and output your API Gateway URL:

```
Outputs
-----------------------------------------------------------------------------
Key                 HttpApiUrl
Description         Base URL for the AWS HTTP API Gateway
Value               https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com
-----------------------------------------------------------------------------
```

**Copy this `HttpApiUrl`** — you will use it in Phase 3.

---

## 5. Phase 3: Deploying Frontend on AWS Amplify Hosting

AWS Amplify Hosting builds and runs Next.js applications directly from your GitHub repository, complete with SSL and global CDN distribution.

### 5.1 Connect Repository to AWS Amplify
1. Open the [AWS Amplify Console](https://ap-southeast-1.console.aws.amazon.com/amplify/home?region=ap-southeast-1).
2. Click **Deploy an app** → Select **GitHub** → Click **Next**.
3. Authorize AWS Amplify to access your GitHub repository.
4. Select your repository: `motorcycle-shop-management-system`.
5. Select the branch to deploy: `main` (or `develop`).
6. In the **App settings**:
   - **App name**: `motoshop-frontend`
   - **Monorepo / Base directory**: `frontend` *(important! Specify `frontend`)*
   - Build specification will automatically detect [frontend/amplify.yml](file:///d:/POS/motorcycle-shop-management-system/frontend/amplify.yml).
7. Click **Next** → Review → Click **Save and deploy**.
8. Amplify will run `npm ci` and `npm run build`. In 2–3 minutes, your app is live!

---

### 5.2 Configure Reverse Proxy Rewrites (Zero-CORS)

To avoid CORS restrictions and cookie domain issues, configure Amplify to forward all `/api/*` requests to your AWS HTTP API Gateway behind the scenes:

1. In the AWS Amplify Console sidebar, click **Hosting** → **Rewrites and redirects**.
2. Click **Add rewrite**:
   - **Source address**: `/api/<*>`
   - **Target address**: `https://<YOUR_API_ID>.execute-api.ap-southeast-1.amazonaws.com/api/<*>`
   - **Type**: `200 (Rewrite)`
3. Save the rule.

> [!TIP]
> Now, whenever the browser makes a request to `/api/v1/auth/login`, it sends it to your Amplify domain (`https://main.xxxx.amplifyapp.com/api/v1/auth/login`). Amplify transparently proxies it to AWS HTTP API Gateway. **Cookies and tokens work out of the box with zero CORS errors.**

---

## 6. Phase 4: End-to-End Verification & Testing

Open your AWS Amplify public domain:

1. **Test Authentication**:
   - Log in using seed credentials:
     - **Email**: `admin@motoshop.com`
     - **Password**: `admin123`
   - Verify that the HttpOnly session cookie is saved and the dashboard loads your user profile.
2. **Test Inventory & POS**:
   - Open the **POS / Sales** screen.
   - Search for an item (e.g. `Yamalube 10W-40` or `Brake Pad`).
   - Add items to cart and click **Checkout**.
   - Verify transaction completion and receipt generation.
3. **Test Workshop / Repairs Board**:
   - Open **Job Orders**.
   - Create a new repair ticket.
   - Verify that changes reflect immediately.

---

## 7. Phase 5: Maintaining Local Development Parity

Deploying serverless does **NOT** break your local workflow:

```powershell
# You can still run your entire stack locally anytime with Docker Compose!
docker compose up -d
```

- When running locally via `docker-compose.yml`, the application uses the local PostgreSQL container, local Redis, and RabbitMQ.
- When running in the cloud, the Lambda functions automatically detect the Supabase and Upstash environment variables.

---

## 8. Phase 6: Automated CI/CD via GitHub Actions

The repository includes [.github/workflows/deploy-serverless.yml](file:///d:/POS/motorcycle-shop-management-system/.github/workflows/deploy-serverless.yml) to automate deployments on every push to `main`.

### 6.1 Required GitHub Secrets
In your repository, navigate to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret Name | Description | Example Value |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | IAM deployment user access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | IAM deployment user secret key | `wJal...` |
| `DATABASE_URL` | Supabase connection string | `postgresql+asyncpg://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` |
| `REDIS_URL` | Upstash Redis connection string | `rediss://default:[PASS]@[ENDPOINT].upstash.io:6379` |
| `JWT_SECRET_KEY` | Secret key for signing session tokens | `your-secure-32-char-random-jwt-secret` |

### 6.2 How the Pipeline Operates
- **Backend**: Pushing a commit to `main` triggers GitHub Actions to run frontend and backend test suites, compile Lambda container images with `sam build`, and deploy the CloudFormation stack via `sam deploy`.
- **Frontend**: AWS Amplify Hosting is natively connected to GitHub and automatically builds and deploys your Next.js frontend whenever changes are pushed to `main`.

---

## 9. Phase 7: Free-Tier Health & Troubleshooting

### Keeping Free Supabase Active
- **Supabase Policy**: Free-tier projects pause after 1 week of complete inactivity.
- **Prevention**: As long as the POS is opened occasionally, the database stays active. If you are not using the system for weeks and the project is paused, click **Restore Project** in the Supabase web dashboard (takes ~1 minute).

### Monitoring Lambda Logs
To view live logs from any Lambda function:
```bash
sam logs -n AuthFunction --stack-name motoshop-serverless --tail
sam logs -n SalesFunction --stack-name motoshop-serverless --tail
```

### Checking Upstash Command Usage
Open your Upstash dashboard at [console.upstash.com](https://console.upstash.com) to view daily command counts and latency charts.
