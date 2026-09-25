# MotoShop POS: Infrastructure & CI/CD Specification
## Document ID: SPEC-004 | Version: 1.0.0-PROD | Status: APPROVED

---

## 1. CloudFormation / SAM Infrastructure Topology

The AWS infrastructure is defined as a serverless SAM template (`template.yaml`).

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: MotoShop POS - Zero-Cost Serverless Modular Monolith

Parameters:
  DatabaseUrl:
    Type: String
    NoEcho: true
    Description: PostgreSQL connection string for RDS
  JwtSecretKey:
    Type: String
    NoEcho: true
    Description: Secret key for JWT signing

Globals:
  Function:
    Timeout: 30
    MemorySize: 256
    Runtime: python3.12
    Environment:
      Variables:
        DATABASE_URL: !Ref DatabaseUrl
        JWT_SECRET_KEY: !Ref JwtSecretKey
        PYTHONPATH: /var/task

Resources:
  # -------------------------------------------------------------------------
  # 1. AWS HTTP API Gateway ($1/M reqs; 1M free/mo)
  # -------------------------------------------------------------------------
  HttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      Name: motoshop-http-api
      CorsConfiguration:
        AllowOrigins: ['*']
        AllowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
        AllowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'Cookie', 'Accept']

  # -------------------------------------------------------------------------
  # 2. Consolidated Modular Monolith Lambda
  # -------------------------------------------------------------------------
  MonolithFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./backend
      Handler: app.main.handler
      Events:
        ApiRoot:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Path: /api/v1/{proxy+}
            Method: ANY

  # -------------------------------------------------------------------------
  # 3. Dedicated VPC Migration Lambda (Invoked during CI/CD)
  # -------------------------------------------------------------------------
  MigrationFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./backend
      Handler: app.migrations.runner.handler
      Timeout: 120
      MemorySize: 512

  # -------------------------------------------------------------------------
  # 4. Amazon S3 Bucket for Static SPA Frontend
  # -------------------------------------------------------------------------
  FrontendBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "motoshop-frontend-${AWS::AccountId}"
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  # -------------------------------------------------------------------------
  # 5. CloudFront Origin Access Control (OAC)
  # -------------------------------------------------------------------------
  CloudFrontOAC:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Name: motoshop-oac
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4

  # -------------------------------------------------------------------------
  # 6. Unified Amazon CloudFront Distribution (Always Free Tier)
  # -------------------------------------------------------------------------
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultRootObject: index.html
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt FrontendBucket.RegionalDomainName
            OriginAccessControlId: !GetAtt CloudFrontOAC.Id
            S3OriginConfig: {}
          - Id: ApiOrigin
            DomainName: !Sub "${HttpApi}.execute-api.${AWS::Region}.amazonaws.com"
            CustomOriginConfig:
              HTTPSPort: 443
              OriginProtocolPolicy: https-only
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods: ['GET', 'HEAD']
          CachedMethods: ['GET', 'HEAD']
          Compress: true
          ForwardedValues:
            QueryString: false
            Cookies:
              Forward: none
        CacheBehaviors:
          - PathPattern: /api/*
            TargetOriginId: ApiOrigin
            ViewerProtocolPolicy: https-only
            AllowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE']
            ForwardedValues:
              QueryString: true
              Cookies:
                Forward: all
              Headers: ['Authorization', 'Idempotency-Key', 'Accept']
            DefaultTTL: 0
            MinTTL: 0
            MaxTTL: 0
        CustomErrorResponses:
          - ErrorCode: 403
            ResponseCode: 200
            ResponsePagePath: /index.html
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html
```

---

## 2. Zero-Exposure Security Invariants

1. **Private S3 via OAC**: S3 bucket blocks 100% of direct public access. Only CloudFront with valid SigV4 signature can read frontend artifacts.
2. **Private VPC RDS**: RDS instance has `PubliclyAccessible: false`. No public IPv4 address is assigned, saving ~$3.60/month in AWS IPv4 charges.
3. **Internal Migration Lambda**: CI/CD invokes `MigrationFunction` through `aws lambda invoke`. Lambda executes `alembic upgrade head` from inside the private subnet, eliminating bastion hosts and NAT gateways.
