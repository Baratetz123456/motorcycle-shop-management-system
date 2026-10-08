# CI/CD Pipeline & Security Enforcement Documentation

## 1. Architecture Overview

MotoShop uses GitHub Actions for Continuous Integration (CI) and Continuous Deployment (CD) to an **AWS Zero-Cost Serverless Stack** (AWS Lambda + S3 + CloudFront + RDS PostgreSQL).

```mermaid
flowchart TD
    subgraph CI_Pipeline [CI Pipeline: .github/workflows/ci.yml]
        PR[PR / Push to develop or main] --> Job1[1. Frontend Checks]
        PR --> Job2[2. Backend Tests]
        PR --> Job3[3. Security Scans]

        subgraph Job1_Detail [Job 1: Frontend Checks]
            J1_Node[Node.js 20 & npm ci] --> J1_Lint[ESLint .]
            J1_Lint --> J1_Tsc[TypeScript Type-check]
            J1_Tsc --> J1_Build[Next.js Production Build]
            J1_Build --> J1_Audit[Strict npm audit: 0 High/Critical]
        end

        subgraph Job2_Detail [Job 2: Backend Tests]
            J2_Py[Python 3.12] --> J2_Pg[PostgreSQL 16 Alpine Service Container]
            J2_Pg --> J2_Init[Load init.sql + seed_operational_data.sql]
            J2_Init --> J2_Pytest[pytest tests/ -v: 43 Tests Passing]
        end

        subgraph Job3_Detail [Job 3: Security Scans]
            J3_Git[Gitleaks Secret Scan with .gitleaks.toml]
            J3_Bandit[Bandit SAST: High & Medium Code Flaws]
            J3_Pip[pip-audit: Python Dependency CVEs]
        end

        Job1 --> Job4[4. Docker Build & Trivy Scan]
        Job2 --> Job4
        Job3 --> Job4

        subgraph Job4_Detail [Job 4: Docker & Trivy]
            J4_BldFront[Build motoshop-frontend:ci]
            J4_BldBack[Build motoshop-backend:ci]
            J4_TrivyFront[Trivy Scan Frontend: Exit 1 on HIGH/CRITICAL]
            J4_TrivyBack[Trivy Scan Backend: Exit 1 on HIGH/CRITICAL]
        end
    end

    subgraph CD_Pipeline [CD Pipeline: .github/workflows/deploy-serverless.yml]
        PushMain[Push to main branch] --> RunCI[Execute CI Pipeline]
        RunCI --> DeployBack[Deploy Backend: AWS SAM Deploy MonolithFunction]
        DeployBack --> RunMigrate[Invoke VPC Migration Lambda: Schema Updates]
        RunMigrate --> DeployFront[Deploy Frontend: Build Static SPA & Sync to S3]
        DeployFront --> InvalidateCF[Invalidate CloudFront Edge Cache]
    end
```

---

## 2. CI Pipeline Specifications (`.github/workflows/ci.yml`)

**Trigger**: Pull requests and direct pushes targeting `develop` or `main`.  
**Concurrency**: `group: ci-${{ github.ref }}`, `cancel-in-progress: true`.

| Job Name | Steps Executed | Key Tools & Flags | Gate Criteria |
| :--- | :--- | :--- | :--- |
| **`frontend-checks`** | Node 20 setup, dependency install, static linting, typechecking, standalone compilation, dependency audit. | `npm ci`, `npx eslint .`, `npx tsc --noEmit`, `npm run build`, `npm audit --audit-level=high` | **Exit code 0** across all 29 routes. Zero High or Critical npm advisories. |
| **`backend-tests`** | Python 3.12 setup, PostgreSQL 16 container, schema initialization, pytest suite. | `postgres:16-alpine`, `psql -f init.sql -f seed_operational_data.sql`, `pytest tests/ -v` | **43 / 43 tests passing** (100%). Zero connection leaks via `conftest.py` engine disposal. |
| **`security-scans`** | Full repository history check for credentials, static Python code security analysis, Python dependency vulnerability audit. | `gitleaks-action@v2` with `.gitleaks.toml`, `bandit -r backend/app/ -ll`, `pip-audit -r backend/requirements.txt` | **Strict Zero-Tolerance Gate**: Build fails if any credential leaks, Bandit findings, or unpatched CVEs are detected. |
| **`docker-build-and-trivy`** | Multi-stage Docker builds of active production images, followed by container vulnerability scanning. | `docker/build-push-action@v6`, `aquasecurity/trivy-action@master` (`severity: HIGH,CRITICAL`, `exit-code: 1`) | Images must compile and pass Trivy vulnerability scan with zero High or Critical OS/package CVEs. |

---

## 3. CD Serverless Deployment Pipeline (`.github/workflows/deploy-serverless.yml`)

**Trigger**: Direct push to `main` branch.  
**Concurrency**: `cancel-in-progress: false` (prevents aborting active CloudFormation deployments).

### Step-by-Step Deployment Lifecycle:
1. **CI Verification Gate**: Invokes `.github/workflows/ci.yml` as a prerequisite workflow call. Deployment halts immediately if any test or security check fails.
2. **AWS SAM Backend Deployment**:
   ```bash
   sam build
   sam deploy \
     --no-confirm-changeset \
     --no-fail-on-empty-changeset \
     --stack-name motoshop-serverless \
     --region ap-southeast-1 \
     --capabilities CAPABILITY_IAM \
     --resolve-image-repos \
     --parameter-overrides \
         DatabaseUrl="${{ secrets.DATABASE_URL }}" \
         JwtSecretKey="${{ secrets.JWT_SECRET_KEY }}"
   ```
3. **Dedicated VPC Migration Lambda Execution**:
   Invokes `MigrationFunction` directly within the private RDS VPC subnet, running database migrations without exposing the database to the public internet:
   ```bash
   aws lambda invoke \
     --function-name <MigrationFunctionName> \
     --payload '{}' \
     migration_result.json
   ```
4. **Static SPA Frontend Deployment**:
   Compiles Next.js SPA to static HTML/CSS/JS artifacts (`output: 'export'`) and synchronizes directly to the private S3 bucket behind CloudFront Origin Access Control (OAC):
   ```bash
   aws s3 sync frontend/out s3://${{ secrets.S3_BUCKET_NAME }} --delete
   ```
5. **CloudFront Edge Cache Invalidation**:
   Clears edge caches globally so users immediately receive updated assets:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
     --paths "/*"
   ```

---

## 4. GitHub Secrets Configuration Reference

Configure repository secrets under: **Settings → Secrets and variables → Actions → Repository secrets**

| Secret Name | Description | Example / Format | Required For |
| :--- | :--- | :--- | :--- |
| `AWS_ACCESS_KEY_ID` | IAM deployment user access key | `AKIA...` | CD Pipeline (SAM & S3) |
| `AWS_SECRET_ACCESS_KEY` | IAM deployment user secret key | `wJalrXUtnFEMI...` | CD Pipeline (SAM & S3) |
| `DATABASE_URL` | Production RDS PostgreSQL connection string | `postgresql+asyncpg://user:pass@rds-host:5432/motorcycle_shop` | Backend Lambda Runtime |
| `JWT_SECRET_KEY` | Cryptographic secret for signing JWT access tokens | 64-char random hex string | Backend Lambda Runtime |
| `S3_BUCKET_NAME` | Name of the private S3 bucket hosting frontend SPA | `motoshop-frontend-123456789012` | Static Frontend Sync |
| `CLOUDFRONT_DISTRIBUTION_ID` | Distribution ID for the unified edge CDN | `E1A2B3C4D5E6F7` | Edge Cache Invalidation |

---

## 5. Local Pre-Flight Verification Commands

Developers should validate code and security gates locally before pushing changes:

```bash
# 1. Run all pre-flight security scanners (npm audit + Bandit SAST)
npm run test:security

# 2. Run full backend test suite (43 domain tests)
npm run test:backend

# 3. Run frontend Playwright end-to-end suite (40 tests)
npm run test:e2e

# 4. Verify static SPA production compilation
npm run build
```

---

## 6. Security Invariant & Zero-Tolerance Policies

1. **Strict Dependency Health**:
   - `frontend/package.json` must maintain **0 vulnerabilities** on `npm audit --audit-level=high`.
   - `backend/requirements.txt` must pass `pip-audit` without unpatched CVEs.
2. **Bandit Static Application Security Testing (SAST)**:
   - Scans `backend/app/` with `-ll` (blocking on Medium and High severity issues).
   - SQL injection, hardcoded secrets, weak cryptographic primitives, and shell execution are strictly prohibited.
3. **Gitleaks Secret Scanning**:
   - Evaluates full git commit history.
   - Any commit introducing real API credentials, AWS secret keys, or database passwords triggers immediate build failure.
   - Development test passwords (`POSTGRES_PASSWORD: "123"`, `admin123`) are explicitly isolated under [`.gitleaks.toml`](file:///d:/POS/motorcycle-shop-management-system/.gitleaks.toml).
4. **Trivy Container Hardening**:
   - Built container images are scanned prior to registry deployment.
   - Fails build with exit code 1 if unpatched High or Critical base OS or package vulnerabilities are detected.
