# MotoShop POS: Zero-Cost AWS System Design & Architecture
## Optimized for 5 Users — 100% Free Tier Serverless Infrastructure

---

## Executive Summary

| Attribute | Specification |
|---|---|
| **Target Scale** | ~5 Concurrent Users (1 Shop Owner/Manager, 1–2 Cashiers, 2–3 Mechanics) |
| **Primary Goal** | **$0.00 / Month Deployment Cost** on AWS |
| **Backend Architecture** | Consolidated **FastAPI Modular Monolith** (Merges 4 microservices into 1 unified app) |
| **Backend Compute** | **AWS Lambda** (Python 3.12 + Mangum ASGI) via **AWS HTTP API Gateway** |
| **Frontend Compute & CDN**| **AWS S3 + CloudFront** (Next.js Static Export SPA `output: 'export'`) |
| **Database** | **AWS RDS PostgreSQL** (`db.t4g.micro` 20GB storage, 12-Month Free Tier) |
| **Caching & Transactions**| **PostgreSQL-native** ACID Transactions, Table-based Idempotency & Token Revocation (Zero Redis / Zero RabbitMQ) |
| **CI/CD Automation** | **GitHub Actions** (SAM Deploy + S3 Sync + CloudFront Invalidation + VPC Migration Lambda) |
| **Domain & SSL** | Free Default AWS CloudFront Domain (`https://dXXXXXXXXXX.cloudfront.net`) with ACM Managed SSL |

---

## 1. High-Level Architecture Diagram

```
                                  ┌──────────────────────────────────────────────┐
                                  │           5 Shop Users (Browsers)            │
                                  │      (POS Terminal, Counter Tablet, Mobile)  │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                                         │ HTTPS (Port 443)
                                                         ▼
                       ┌─────────────────────────────────────────────────────────────────┐
                       │                   AWS CloudFront Distribution                   │
                       │           (1 TB / mo Transfer + 10M Requests / mo FREE)         │
                       └───────────────────┬─────────────────────────┬───────────────────┘
                                           │                         │
                          Default Behavior │ /*                      │ Behavior: /api/*
                                           ▼                         ▼
               ┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
               │          AWS S3 Bucket              │   │        AWS HTTP API Gateway         │
               │   (Next.js Static Export SPA)       │   │    (1M Requests / mo Free Tier)     │
               │   HTML, CSS, JS, Motorcycle Assets  │   └──────────────────┬──────────────────┘
               └─────────────────────────────────────┘                      │
                                                                            │ Proxies /api/v1/*
                                                                            ▼
                                                 ┌─────────────────────────────────────────────────────┐
                                                 │       AWS Lambda: Modular Monolith Backend          │
                                                 │         (FastAPI + Mangum ASGI Adapter)             │
                                                 │        Memory: 256MB | Pure On-Demand               │
                                                 │                                                     │
                                                 │   ┌───────────────┐        ┌────────────────────┐   │
                                                 │   │ Auth Router   │        │ Inventory Router   │   │
                                                 │   └───────────────┘        └────────────────────┘   │
                                                 │   ┌───────────────┐        ┌────────────────────┐   │
                                                 │   │ Sales Router  │        │ Repairs Router     │   │
                                                 │   └───────────────┘        └────────────────────┘   │
                                                 └──────────────────────────┬──────────────────────────┘
                                                                            │
                                                                            │ asyncpg Connection Pool
                                                                            ▼
                                                 ┌─────────────────────────────────────────────────────┐
                                                 │          Private VPC / Security Group               │
                                                 │                                                     │
                                                 │        AWS RDS PostgreSQL (db.t4g.micro)            │
                                                 │   - 20 GB gp3 SSD Storage                           │
                                                 │   - Schemas: auth, inventory, sales, repairs        │
                                                 │   - Idempotency Keys & Revoked Tokens Tables        │
                                                 │   - Native ACID Transactions (No Saga / No SQS)     │
                                                 └─────────────────────────────────────────────────────┘
```

---

## 2. Architectural Transformations & Cost-Zero Rationales

### 2.1 Microservices $\to$ Modular Monolith
* **Before**: 4 Docker containers (`auth`, `inventory`, `sales`, `repairs`) + KrakenD Gateway + RabbitMQ Broker + Redis Cache.
* **Problem**: 7 distinct running services require substantial RAM (minimum ~2GB RAM continuous compute), exceeding free-tier single-container limits.
* **Solution**: Consolidate the 4 domain modules into a single FastAPI repository with clean boundary packages:
  ```
  backend/
  ├── app/
  │   ├── main.py              # Root FastAPI application with Mangum handler
  │   ├── core/                # DB session, security, config, idempotency
  │   ├── modules/
  │   │   ├── auth/            # Users, JWT, RBAC, sessions
  │   │   ├── inventory/       # Stock, parts, services, categories
  │   │   ├── sales/           # POS orders, invoices, payments, commission
  │   │   └── repairs/         # Job orders, repair workflow, mechanics
  │   └── migrations/          # Consolidated Alembic migrations
  ```
* **Benefit**: Reduces container cold starts from 4 to 1, eliminates KrakenD and RabbitMQ container costs entirely, and runs inside a single 256MB Lambda function.

### 2.2 Redis & RabbitMQ Elimination $\to$ PostgreSQL Native State
* **Transactions**: Sales checkout reserving inventory and completing repair jobs now executes inside a single standard **ACID PostgreSQL Transaction** (`async with session.begin(): ...`). Distributed rollbacks and two-phase commits are obsolete.
* **Idempotency**: Requests carrying an `Idempotency-Key` header are deduplicated via a lightweight PostgreSQL table:
  ```sql
  CREATE TABLE auth.idempotency_keys (
      key VARCHAR(128) PRIMARY KEY,
      endpoint VARCHAR(255) NOT NULL,
      response_code INT NOT NULL,
      response_body JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
  );
  ```
* **Token Blacklisting**: Revoked tokens and logout states are validated against a simple indexed `auth.revoked_tokens` table.

### 2.3 Single-Origin Unified CloudFront Distribution (Zero-CORS)
* CloudFront serves both static assets (`/*`) and API routes (`/api/*`) on the same hostname:
  * `https://dXXXXXXXXXX.cloudfront.net/` $\to$ S3 Bucket.
  * `https://dXXXXXXXXXX.cloudfront.net/api/*` $\to$ AWS HTTP API Gateway.
* **No CORS Preflight Overheads**: Browsers treat all API calls as same-origin requests. This eliminates 100% of HTTP `OPTIONS` requests, cutting Lambda invocations and network latency in half!
* **Cookie Support**: `HttpOnly; SameSite=Lax; Secure` cookies for refresh tokens work out of the box without cross-domain cookie restrictions.

---

## 3. Monthly Cost & Free-Tier Quota Ledger

| Component | AWS Resource | AWS Free Tier Allocation | Estimated 5-User Monthly Usage | Projected Cost |
|---|---|---|---|---|
| **Frontend CDN** | AWS CloudFront | 1,000 GB transfer/mo + 10,000,000 HTTPS requests/mo (Always Free) | ~3 GB transfer/mo + ~15,000 requests/mo | **$0.00** |
| **Static Storage**| AWS S3 | 5 GB Standard Storage + 20,000 GET requests (Always Free Tier) | ~80 MB bundle size + ~12,000 GETs/mo | **$0.00** |
| **API Gateway** | AWS HTTP API | 1,000,000 requests/mo (12 Months Free) | ~25,000 requests/mo | **$0.00** |
| **Backend Compute**| AWS Lambda (256MB)| 1,000,000 requests/mo + 3.2M compute-seconds/mo (Always Free) | ~25,000 requests/mo + ~7,500 compute-sec/mo | **$0.00** |
| **Database** | AWS RDS PostgreSQL | 750 hours/mo `db.t4g.micro` + 20GB gp3 SSD (12 Months Free) | 744 hours/mo (1 active instance) | **$0.00** |
| **SSL Certificate**| AWS ACM | Unlimited Public SSL Certificates (Always Free) | 1 CloudFront Default Certificate | **$0.00** |
| **CI/CD** | GitHub Actions | 2,000 build minutes/mo for public/private repos | ~120 build minutes/mo | **$0.00** |
| **Total Monthly Cost** | | | | **$0.00 / Month** |

---

## 4. GitHub Actions CI/CD Pipeline Specification

### 4.1 Deployment Workflow (`.github/workflows/deploy.yml`)

```yaml
name: Deploy MotoShop POS (Zero-Cost Serverless)

on:
  push:
    branches: [main]

jobs:
  test:
    name: Lint & Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node & Python
        uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - name: Run Frontend Tests
        run: cd frontend && npm ci && npm run test --if-present
      - name: Run Backend Tests
        run: cd backend && pip install -r requirements.txt && pytest

  deploy-backend:
    name: Deploy Backend & Run Migrations
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      - uses: aws-actions/setup-sam@v2
      - name: Build & Deploy SAM Stack
        run: |
          sam build --use-container
          sam deploy --no-confirm-changeset --no-fail-on-empty-changeset \
            --stack-name motoshop-pos-prod \
            --parameter-overrides \
              DatabaseUrl="${{ secrets.DATABASE_URL }}" \
              JwtSecretKey="${{ secrets.JWT_SECRET_KEY }}"
      - name: Invoke VPC Migration Lambda
        run: |
          aws lambda invoke \
            --function-name motoshop-db-migration \
            --payload '{}' \
            migration_output.json
          cat migration_output.json

  deploy-frontend:
    name: Build & Sync Static Frontend
    needs: deploy-backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Build Static Next.js SPA
        run: |
          cd frontend
          npm ci
          NEXT_PUBLIC_API_URL="/api/v1" npm run build
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      - name: Sync S3 Bucket & Invalidate CloudFront
        run: |
          aws s3 sync frontend/out s3://${{ secrets.S3_BUCKET_NAME }} --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

---

## 5. Security & VPC Network Topology

```
AWS REGION (e.g. ap-southeast-1)
┌────────────────────────────────────────────────────────────────────────┐
│ PUBLIC CLOUD / EDGE                                                    │
│   CloudFront CDN (HTTPS Port 443)                                      │
│      ├──► S3 Bucket (Private, Origin Access Control - OAC)             │
│      └──► AWS HTTP API Gateway                                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ VPC (Virtual Private Cloud)                                            │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Lambda Execution Environment (Attached via Hyperplane ENI)     │   │
│   │  - motoshop-backend-monolith                                   │   │
│   │  - motoshop-db-migration                                       │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   │ Inbound PostgreSQL Port 5432       │
│                                   ▼ (Restricted to Lambda SecGroup)    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Private Database Subnet                                        │   │
│   │  - AWS RDS PostgreSQL (db.t4g.micro)                           │   │
│   │  - Public Accessibility: DISABLED                              │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **RDS Isolation**: The database instance resides in private database subnets with `PubliclyAccessible: false`. It cannot be probed or attacked from the public internet.
2. **Lambda Hyperplane ENI**: Lambda functions connect directly to the private VPC subnets to reach RDS via internal IP addresses.
3. **No NAT Gateway Needed**: Because the backend does not query external third-party internet APIs during normal POS workflows, an expensive AWS NAT Gateway ($32+/mo) is **NOT** provisioned.
4. **Migration Runner**: Schema migrations are invoked internally through the dedicated `motoshop-db-migration` Lambda inside the VPC, keeping database credentials and ports strictly internal.

---

## 6. Migration Roadmap (From Current Repo to Zero-Cost Target)

1. **Step 1: Modular Monolith Consolidation (`backend/app`)**
   - Unify `auth_service`, `inventory_service`, `sales_service`, and `repairs_service` under a single FastAPI router structure.
   - Replace distributed RabbitMQ event listeners with direct async service calls.
   - Add database migration for `idempotency_keys` and `revoked_tokens` tables.
2. **Step 2: Frontend Static Export Configuration**
   - Update `frontend/next.config.ts` to `output: 'export'`.
   - Verify all routes use client-side hydration for dynamic data.
3. **Step 3: AWS SAM CloudFormation Infrastructure Template**
   - Update `template.yaml` to declare the single consolidated FastAPI Lambda, HTTP API Gateway, S3 Bucket with OAC, CloudFront Distribution, and RDS `db.t4g.micro`.
4. **Step 4: GitHub Actions Setup**
   - Configure secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DATABASE_URL`, `JWT_SECRET_KEY`) and run the end-to-end automated deployment.
