# MKT-CORE Deployment Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Redis Configuration](#redis-configuration)
7. [File Storage (AWS S3)](#file-storage-aws-s3)
8. [OAuth2 Integration](#oauth2-integration)
9. [Payment Gateway Integration](#payment-gateway-integration)
10. [Deployment Steps](#deployment-steps)
11. [Post-Deployment Tasks](#post-deployment-tasks)
12. [Monitoring & Health Checks](#monitoring--health-checks)
13. [Troubleshooting](#troubleshooting)
14. [Security Considerations](#security-considerations)

---

## 📖 Overview

**mkt-core** là module tùy biến của Twenty CRM, cung cấp các tính năng quản lý doanh nghiệp bao gồm:

- **License Management**: Quản lý license với gia hạn tự động
- **Order Processing**: Workflow đơn hàng và order items
- **Invoice System**: Tạo và quản lý hóa đơn
- **Payment Integration**: SEPay, BIDV QR code
- **Department Hierarchy**: Phân cấp phòng ban dạng tree
- **Product Integration**: OAuth2 sync với MKT Server
- **RBAC Enterprise**: Role-based access control
- **KPI Tracking**: Theo dõi KPI với templates
- **2FA Authentication**: OTP-based security
- **Reseller Management**: Tier system quản lý đại lý

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Twenty CRM Frontend                       │
│                  (React + Recoil + GraphQL)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ GraphQL API
┌──────────────────────┴──────────────────────────────────────┐
│              Twenty Server (NestJS)                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │            mkt-core Module                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │    │
│  │  │ License  │  │  Order   │  │   Invoice    │    │    │
│  │  └──────────┘  └──────────┘  └──────────────┘    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │    │
│  │  │ Payment  │  │ Customer │  │  Department  │    │    │
│  │  └──────────┘  └──────────┘  └──────────────┘    │    │
│  │  ┌──────────────────────────────────────────┐    │    │
│  │  │    Product Integration (OAuth2)          │    │    │
│  │  └──────────────────────────────────────────┘    │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────┬─────────────┬─────────────┬──────────────────┘
               │             │             │
       ┌───────▼───────┐ ┌──▼──────┐ ┌───▼────────┐
       │  PostgreSQL   │ │  Redis  │ │   AWS S3   │
       └───────────────┘ └─────────┘ └────────────┘
               │
       ┌───────▼───────┐
       │  MKT Server   │
       │   (OAuth2)    │
       └───────────────┘
```

---

## ✅ Prerequisites

### Minimum Requirements

| Component | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20.x LTS | Runtime environment |
| **Yarn** | 4.x | Package manager |
| **PostgreSQL** | 15+ | Primary database |
| **Redis** | 7+ | Caching & session management |
| **Docker** | 24+ (optional) | Containerized deployment |
| **AWS Account** | - | S3 file storage (optional) |

### System Resources

**Development Environment:**
- CPU: 4 cores
- RAM: 8GB minimum
- Disk: 20GB free space

**Production Environment:**
- CPU: 8+ cores
- RAM: 16GB minimum
- Disk: 100GB+ SSD
- Network: 1Gbps

---

## 🔧 Environment Configuration

### Core Environment Variables

Tạo file `.env` trong `packages/twenty-server/`:

```bash
# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=production
PORT=3000
FRONT_BASE_URL=https://your-crm-domain.com
SERVER_URL=https://api.your-crm-domain.com

# ============================================
# DATABASE CONFIGURATION
# ============================================
PG_DATABASE_URL=postgresql://user:password@localhost:5432/crm_db
PG_SSL_ALLOW_SELF_SIGNED=false

# Connection Pool
PG_POOL_MIN=2
PG_POOL_MAX=10

# ============================================
# REDIS CONFIGURATION
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Cache TTL (seconds)
CACHE_STORAGE_TTL=604800  # 7 days

# ============================================
# FILE STORAGE (AWS S3)
# ============================================
STORAGE_TYPE=S_3  # hoặc LOCAL cho development

# AWS S3 Configuration
STORAGE_S3_REGION=ap-southeast-1
STORAGE_S3_NAME=your-crm-bucket
STORAGE_S3_ENDPOINT=https://s3.amazonaws.com
STORAGE_S3_ACCESS_KEY_ID=your-access-key
STORAGE_S3_SECRET_ACCESS_KEY=your-secret-key

# Local Storage (fallback)
STORAGE_LOCAL_PATH=.local-storage

# ============================================
# AUTHENTICATION & SECURITY
# ============================================
APP_SECRET=your-super-secret-key-min-32-chars
ACCESS_TOKEN_SECRET=your-access-token-secret
REFRESH_TOKEN_SECRET=your-refresh-token-secret
ACCESS_TOKEN_EXPIRES_IN=30m
REFRESH_TOKEN_EXPIRES_IN=90d
REFRESH_TOKEN_COOL_DOWN=1m

# ============================================
# MKT-CORE SPECIFIC
# ============================================

# MKT Product Integration (OAuth2)
MKT_SERVER_BASE_URL=https://mkt-server.example.com
MKT_OAUTH2_CLIENT_ID=your-client-id
MKT_OAUTH2_CLIENT_SECRET=your-client-secret
MKT_OAUTH2_TOKEN_URL=https://mkt-server.example.com/oauth/token
MKT_OAUTH2_SCOPES=product:read,package:read

# Product Sync Configuration
MKT_AUTO_SYNC_ENABLED=true
MKT_SCHEDULED_SYNC_ENABLED=true
MKT_SCHEDULED_SYNC_CRON=0 */30 * * * *  # Every 30 minutes
MKT_PRODUCT_CACHE_TTL=86400  # 24 hours

# Payment Gateway (SEPay)
SEPAY_API_URL=https://api.sepay.vn
SEPAY_API_KEY=your-sepay-api-key
SEPAY_WEBHOOK_SECRET=your-webhook-secret
SEPAY_ACCOUNT_NUMBER=1234567890
SEPAY_BANK_CODE=BIDV

# Invoice Configuration
INVOICE_STORAGE_PATH=/var/invoices
INVOICE_EXPORT_ENABLED=true
INVOICE_AUTO_SEND_EMAIL=true

# License Management
LICENSE_AUTO_RENEWAL_ENABLED=true
LICENSE_RENEWAL_REMINDER_DAYS=7,3,1
LICENSE_GRACE_PERIOD_DAYS=3

# ============================================
# EMAIL CONFIGURATION
# ============================================
EMAIL_FROM_ADDRESS=noreply@your-crm-domain.com
EMAIL_FROM_NAME=Your CRM System

# SMTP Configuration
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password
EMAIL_SMTP_SECURE=false

# ============================================
# LOGGING & MONITORING
# ============================================
LOG_LEVELS=log,error,warn
LOGGER_IS_BUFFER_ENABLED=true
LOGGER_DRIVER=console  # hoặc winston

# Sentry (Optional)
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.0.0

# ============================================
# BACKGROUND JOBS (BullMQ)
# ============================================
QUEUE_REDIS_HOST=localhost
QUEUE_REDIS_PORT=6379
QUEUE_REDIS_PASSWORD=your-redis-password

# Worker Configuration
WORKERS_ENABLED=true
WORKER_CONCURRENCY=5

# ============================================
# CORS & SECURITY
# ============================================
CORS_ALLOWED_ORIGINS=https://your-crm-domain.com
ALLOWED_CORS_CREDENTIAL=true
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# ============================================
# DEVELOPMENT ONLY
# ============================================
# Seeder flags (set to false in production)
SEED_ON_STARTUP=false
DEBUG_MODE=false
```

---

## 🗄️ Database Setup

### 1. PostgreSQL Installation

**Ubuntu/Debian:**
```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Docker:**
```bash
docker run -d \
  --name crm-postgres \
  -e POSTGRES_USER=crmuser \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=crm_db \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine
```

### 2. Database Initialization

```bash
# Create database
psql -U postgres -c "CREATE DATABASE crm_db;"
psql -U postgres -c "CREATE USER crmuser WITH ENCRYPTED PASSWORD 'secure_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE crm_db TO crmuser;"

# Enable required extensions
psql -U crmuser -d crm_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql -U crmuser -d crm_db -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"
```

### 3. Run Migrations

```bash
cd packages/twenty-server

# Run core migrations
npx nx run twenty-server:database:migrate:prod

# Sync metadata
npx nx run twenty-server:command workspace:sync-metadata -f
```

### 4. Seed Development Data (Optional)

```bash
# Seed mkt-core data
npx nx command twenty-server -- mkt-license-data-seed-dev-workspace
npx nx command twenty-server -- mkt-customer-tag-data-seed-dev-workspace
npx nx command twenty-server -- mkt-department-data-seed-dev-workspace
npx nx command twenty-server -- mkt-payment-data-seed-dev-workspace
npx nx command twenty-server -- mkt-invoice-data-seed-dev-workspace
```

### 5. Database Backup Strategy

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/var/backups/crm"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U crmuser crm_db | gzip > "$BACKUP_DIR/crm_db_$DATE.sql.gz"

# Retention: keep last 30 days
find "$BACKUP_DIR" -name "crm_db_*.sql.gz" -mtime +30 -delete
```

**Crontab entry:**
```cron
0 2 * * * /usr/local/bin/crm-backup.sh
```

---

## 🔴 Redis Configuration

### 1. Redis Installation

**Ubuntu/Debian:**
```bash
# Install Redis 7
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

**Key configurations in redis.conf:**
```conf
# Bind to localhost (change for remote access)
bind 127.0.0.1

# Set password
requirepass your-redis-password

# Enable persistence
save 900 1
save 300 10
save 60 10000

# Max memory policy
maxmemory 2gb
maxmemory-policy allkeys-lru

# Enable AOF
appendonly yes
appendfsync everysec
```

**Docker:**
```bash
docker run -d \
  --name crm-redis \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine \
  redis-server --requirepass your-redis-password
```

### 2. Redis Namespaces (mkt-core)

mkt-core sử dụng các Redis namespaces sau:

| Namespace | Purpose | TTL |
|-----------|---------|-----|
| `MktProduct:digital:{id}` | Product cache | 24h |
| `MktProduct:digital:code:{code}` | Product code mapping | 24h |
| `MktProduct:digital:pkgs:{id}` | Product packages | 24h |
| `MktAuth:token:{workspaceId}` | OAuth2 tokens | Token expiry |
| `MktRbac:permissions:{userId}` | RBAC permissions | 1h |
| `Session:{sessionId}` | User sessions | Session expiry |

### 3. Redis Monitoring

```bash
# Monitor commands
redis-cli -a your-redis-password MONITOR

# Get memory stats
redis-cli -a your-redis-password INFO memory

# Check connected clients
redis-cli -a your-redis-password CLIENT LIST
```

---

## 📦 File Storage (AWS S3)

### 1. Create S3 Bucket

```bash
# Using AWS CLI
aws s3 mb s3://your-crm-bucket --region ap-southeast-1

# Set bucket policy (public read for files endpoint)
aws s3api put-bucket-policy --bucket your-crm-bucket --policy file://bucket-policy.json
```

**bucket-policy.json:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-crm-bucket/*"
    }
  ]
}
```

### 2. Configure CORS

```json
[
  {
    "AllowedOrigins": ["https://your-crm-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply CORS:
```bash
aws s3api put-bucket-cors --bucket your-crm-bucket --cors-configuration file://cors.json
```

### 3. IAM Policy for S3 Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::your-crm-bucket"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::your-crm-bucket/*"
    }
  ]
}
```

### 4. S3 Lifecycle Rules (Cost Optimization)

```json
{
  "Rules": [
    {
      "Id": "ArchiveOldFiles",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 180,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

---

## 🔐 OAuth2 Integration

### MKT Server Product Integration

mkt-core tích hợp với MKT Server để sync products và packages qua OAuth2.

### 1. Register OAuth2 Client

Trên MKT Server, tạo OAuth2 client:

```
Client ID: crm-client-12345
Client Secret: super-secret-client-key
Grant Types: client_credentials
Scopes: product:read, package:read
Token Endpoint: https://mkt-server.example.com/oauth/token
```

### 2. Environment Variables

```bash
MKT_SERVER_BASE_URL=https://mkt-server.example.com
MKT_OAUTH2_CLIENT_ID=crm-client-12345
MKT_OAUTH2_CLIENT_SECRET=super-secret-client-key
MKT_OAUTH2_TOKEN_URL=https://mkt-server.example.com/oauth/token
MKT_OAUTH2_SCOPES=product:read,package:read
```

### 3. Test OAuth2 Connection

```bash
curl -X POST https://mkt-server.example.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=crm-client-12345" \
  -d "client_secret=super-secret-client-key" \
  -d "scope=product:read package:read"
```

Expected response:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 4. Sync Configuration

```bash
# Auto-sync on token acquired (khi workspace lấy token lần đầu)
MKT_AUTO_SYNC_ENABLED=true

# Scheduled sync with cron
MKT_SCHEDULED_SYNC_ENABLED=true
MKT_SCHEDULED_SYNC_CRON=0 */30 * * * *  # Every 30 minutes

# Cache TTL
MKT_PRODUCT_CACHE_TTL=86400  # 24 hours
```

---

## 💳 Payment Gateway Integration

### SEPay Integration

### 1. Register SEPay Account

1. Đăng ký tài khoản tại https://sepay.vn
2. Lấy API Key từ dashboard
3. Cấu hình webhook URL

### 2. Environment Variables

```bash
SEPAY_API_URL=https://api.sepay.vn
SEPAY_API_KEY=your-sepay-api-key
SEPAY_WEBHOOK_SECRET=your-webhook-secret
SEPAY_ACCOUNT_NUMBER=1234567890
SEPAY_BANK_CODE=BIDV
```

### 3. Webhook Configuration

**Webhook Endpoint:**
```
POST https://api.your-crm-domain.com/mkt-payment/sepay/webhook
```

**Webhook Signature Verification:**
SEPay sẽ gửi `X-Signature` header. Server sẽ verify với `SEPAY_WEBHOOK_SECRET`.

### 4. Test Webhook (Development)

Sử dụng ngrok để expose local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3000
ngrok http 3000

# Update webhook URL trên SEPay dashboard
https://abc123.ngrok.io/mkt-payment/sepay/webhook
```

### 5. Payment Flow

```
1. User tạo order → Generate QR code (BIDV)
2. User scan QR → Transfer tiền
3. SEPay nhận tiền → Call webhook
4. CRM verify webhook → Update order status
5. Auto-renew license nếu là license renewal
```

---

## 🚀 Deployment Steps

### Option 1: Manual Deployment (VPS/EC2)

#### 1. Install Dependencies

```bash
# Clone repository
git clone https://github.com/your-org/twenty-crm.git
cd twenty-crm

# Install dependencies
yarn install

# Build packages
npx nx build twenty-server
npx nx build twenty-front
```

#### 2. Configure Environment

```bash
# Copy environment template
cp packages/twenty-server/.env.example packages/twenty-server/.env

# Edit environment variables
nano packages/twenty-server/.env
```

#### 3. Database Migration

```bash
cd packages/twenty-server

# Run migrations
npx nx run twenty-server:database:migrate:prod

# Sync metadata
npx nx run twenty-server:command workspace:sync-metadata -f
```

#### 4. Start Services

```bash
# Start backend server
npx nx start twenty-server

# Start worker (in separate terminal)
npx nx run twenty-server:worker

# Start frontend (in separate terminal)
npx nx start twenty-front
```

#### 5. Setup Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'crm-server',
      script: 'npx',
      args: 'nx start twenty-server',
      cwd: '/path/to/twenty-crm',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'crm-worker',
      script: 'npx',
      args: 'nx run twenty-server:worker',
      cwd: '/path/to/twenty-crm',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

### Option 2: Docker Deployment

#### 1. Create docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: crm-postgres
    environment:
      POSTGRES_USER: crmuser
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: crm_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U crmuser" ]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: crm-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: always
    healthcheck:
      test: [ "CMD", "redis-cli", "ping" ]
      interval: 10s
      timeout: 3s
      retries: 5

  server:
    build:
      context: ..
      dockerfile: packages/twenty-server/Dockerfile
    container_name: crm-server
    environment:
      NODE_ENV: production
      PG_DATABASE_URL: postgresql://crmuser:${PG_PASSWORD}@postgres:5432/crm_db
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      STORAGE_TYPE: S_3
      STORAGE_S3_REGION: ${STORAGE_S3_REGION}
      STORAGE_S3_NAME: ${STORAGE_S3_NAME}
      STORAGE_S3_ACCESS_KEY_ID: ${STORAGE_S3_ACCESS_KEY_ID}
      STORAGE_S3_SECRET_ACCESS_KEY: ${STORAGE_S3_SECRET_ACCESS_KEY}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always

  worker:
    build:
      context: ..
      dockerfile: packages/twenty-server/Dockerfile
    container_name: crm-worker
    command: npx nx run twenty-server:worker
    environment:
      NODE_ENV: production
      PG_DATABASE_URL: postgresql://crmuser:${PG_PASSWORD}@postgres:5432/crm_db
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    depends_on:
      - postgres
      - redis
    restart: always

  frontend:
    build:
      context: ..
      dockerfile: packages/twenty-front/Dockerfile
    container_name: crm-frontend
    environment:
      REACT_APP_SERVER_BASE_URL: https://api.your-crm-domain.com
    ports:
      - "3001:3000"
    restart: always

volumes:
  postgres_data:
  redis_data:
```

#### 2. Create .env file

```bash
PG_PASSWORD=secure_db_password
REDIS_PASSWORD=secure_redis_password
STORAGE_S3_REGION=ap-southeast-1
STORAGE_S3_NAME=your-crm-bucket
STORAGE_S3_ACCESS_KEY_ID=your-access-key
STORAGE_S3_SECRET_ACCESS_KEY=your-secret-key
```

#### 3. Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f server

# Run migrations
docker-compose exec server npx nx run twenty-server:database:migrate:prod

# Sync metadata
docker-compose exec server npx nx run twenty-server:command workspace:sync-metadata -f
```

---

### Option 3: Kubernetes Deployment

#### 1. Create Kubernetes Manifests

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crm-server
  namespace: crm
spec:
  replicas: 3
  selector:
    matchLabels:
      app: crm-server
  template:
    metadata:
      labels:
        app: crm-server
    spec:
      containers:
      - name: server
        image: your-registry/crm-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PG_DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: crm-secrets
              key: database-url
        - name: REDIS_HOST
          value: "redis-service"
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: crm-secrets
              key: redis-password
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

**service.yaml:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: crm-server-service
  namespace: crm
spec:
  selector:
    app: crm-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

**secrets.yaml:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: crm-secrets
  namespace: crm
type: Opaque
stringData:
  database-url: postgresql://user:pass@postgres:5432/crm_db
  redis-password: your-redis-password
  storage-s3-access-key: your-s3-access-key
  storage-s3-secret-key: your-s3-secret-key
```

#### 2. Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace crm

# Apply manifests
kubectl apply -f secrets.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Check status
kubectl get pods -n crm
kubectl get svc -n crm

# View logs
kubectl logs -f deployment/crm-server -n crm
```

---

## ✅ Post-Deployment Tasks

### 1. Create Admin User

```bash
# Access server container
docker-compose exec server bash

# Run create-admin command
npx nx command twenty-server -- user:create-admin \
  --email admin@your-domain.com \
  --password SecurePassword123!
```

### 2. Create First Workspace

GraphQL mutation:
```graphql
mutation CreateWorkspace {
  createWorkspace(data: {
    name: "Main Workspace"
    displayName: "Main Workspace"
    logo: ""
  }) {
    id
    name
    displayName
  }
}
```

### 3. Sync Metadata

```bash
npx nx run twenty-server:command workspace:sync-metadata -f -w <workspace-id>
```

### 4. Verify Services

```bash
# Check server health
curl http://localhost:3000/health

# Check GraphQL endpoint
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { __typename }"}'

# Check Redis connection
redis-cli -a your-redis-password PING

# Check PostgreSQL connection
psql -U crmuser -d crm_db -c "SELECT version();"
```

### 5. Setup SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-crm-domain.com -d api.your-crm-domain.com

# Auto-renewal (crontab)
0 3 * * * certbot renew --quiet
```

### 6. Configure Nginx Reverse Proxy

**/etc/nginx/sites-available/crm:**
```nginx
upstream crm_backend {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-crm-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-crm-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-crm-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-crm-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /graphql {
        proxy_pass http://crm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File uploads
    location /files {
        proxy_pass http://crm_backend;
        client_max_body_size 100M;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://crm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📊 Monitoring & Health Checks

### 1. Application Health Check

```bash
# Health endpoint
GET /health

Response:
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

### 2. Prometheus Metrics (Optional)

Install `@willsoto/nestjs-prometheus`:

```bash
yarn add @willsoto/nestjs-prometheus prom-client
```

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'crm-server'
    static_configs:
      - targets: ['localhost:3000']
```

### 3. Grafana Dashboard

Import dashboard for NestJS metrics:
- Dashboard ID: 11159 (NestJS Prometheus)
- Data source: Prometheus

### 4. Log Aggregation (ELK Stack)

**filebeat.yml:**
```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/crm/*.log
  json.keys_under_root: true

output.elasticsearch:
  hosts: ["localhost:9200"]
```

### 5. Uptime Monitoring

Sử dụng services:
- **UptimeRobot**: https://uptimerobot.com (free)
- **Pingdom**: https://www.pingdom.com
- **StatusCake**: https://www.statuscake.com

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if port is listening
sudo netstat -tulpn | grep 5432

# Test connection
psql -U crmuser -d crm_db -h localhost
```

#### 2. Redis Connection Timeout

**Error:**
```
Error: Redis connection timeout
```

**Solution:**
```bash
# Check Redis status
redis-cli -a your-redis-password PING

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Restart Redis
sudo systemctl restart redis-server
```

#### 3. S3 Upload Failed

**Error:**
```
Error: Access Denied when uploading to S3
```

**Solution:**
```bash
# Verify IAM permissions
aws iam get-user-policy --user-name crm-user --policy-name s3-access

# Test S3 access
aws s3 ls s3://your-crm-bucket

# Check CORS configuration
aws s3api get-bucket-cors --bucket your-crm-bucket
```

#### 4. OAuth2 Token Expired

**Error:**
```
Error: MKT Server returned 401 Unauthorized
```

**Solution:**
```bash
# Clear cached token
redis-cli -a your-redis-password DEL "MktAuth:token:*"

# Check OAuth2 credentials
curl -X POST $MKT_OAUTH2_TOKEN_URL \
  -d "grant_type=client_credentials" \
  -d "client_id=$MKT_OAUTH2_CLIENT_ID" \
  -d "client_secret=$MKT_OAUTH2_CLIENT_SECRET"
```

#### 5. Worker Not Processing Jobs

**Error:**
```
Jobs stuck in queue, not being processed
```

**Solution:**
```bash
# Check worker status
pm2 list | grep crm-worker

# Check BullMQ queues
redis-cli -a your-redis-password KEYS "bull:*"

# Restart worker
pm2 restart crm-worker

# Clear stuck jobs (careful!)
redis-cli -a your-redis-password FLUSHDB
```

#### 6. High Memory Usage

```bash
# Check memory usage
free -h
docker stats

# Optimize PostgreSQL
# Edit postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB

# Optimize Redis
# Edit redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

#### 7. Slow GraphQL Queries

```bash
# Enable query logging
LOG_LEVELS=log,error,warn,debug
QUERY_LOG_ENABLED=true

# Analyze slow queries
psql -U crmuser -d crm_db
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# Add indexes
CREATE INDEX idx_orders_created_at ON "mktOrder" (createdAt);
CREATE INDEX idx_licenses_status ON "mktLicense" (status);
```

---

## 🔒 Security Considerations

### 1. Environment Variables

**Never commit secrets to git:**
```bash
# Add to .gitignore
.env
.env.local
.env.production
*.pem
*.key
```

### 2. Database Security

```bash
# Use SSL for production
PG_SSL_ALLOW_SELF_SIGNED=false

# Restrict network access
# postgresql.conf
listen_addresses = 'localhost'

# Use strong passwords
pg_password_encryption = scram-sha-256
```

### 3. API Rate Limiting

Already configured in environment:
```bash
THROTTLE_TTL=60       # 60 seconds
THROTTLE_LIMIT=100    # 100 requests per 60s
```

### 4. CORS Configuration

```bash
# Restrict origins
CORS_ALLOWED_ORIGINS=https://your-crm-domain.com
ALLOWED_CORS_CREDENTIAL=true
```

### 5. Webhook Security

SEPay webhook verification:
```typescript
// Verify signature
const signature = req.headers['x-signature'];
const payload = JSON.stringify(req.body);
const computedSignature = crypto
  .createHmac('sha256', SEPAY_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

if (signature !== computedSignature) {
  throw new UnauthorizedException('Invalid webhook signature');
}
```

### 6. Data Encryption

```bash
# Encrypt sensitive fields
# Use typeorm transformers
@Column({
  type: 'text',
  transformer: {
    to: (value) => encrypt(value),
    from: (value) => decrypt(value),
  }
})
secretKey: string;
```

### 7. Security Headers

Configure Helmet middleware:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

### 8. Regular Security Updates

```bash
# Check for vulnerabilities
yarn audit

# Update dependencies
yarn upgrade-interactive

# Update Docker base images
docker pull postgres:15-alpine
docker pull redis:7-alpine
```

---

## 📚 Additional Resources

### Documentation
- **Twenty CRM Official Docs**: https://docs.twenty.com
- **NestJS Documentation**: https://docs.nestjs.com
- **TypeORM Documentation**: https://typeorm.io
- **PostgreSQL Best Practices**: https://wiki.postgresql.org/wiki/Performance_Optimization

### Community
- **Twenty CRM GitHub**: https://github.com/twentyhq/twenty
- **Discord Community**: https://discord.gg/twenty

### Tools
- **pgAdmin**: PostgreSQL GUI
- **Redis Commander**: Redis GUI
- **Postman**: API testing
- **k6**: Load testing

---

## 📝 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-06 | Initial deployment guide |

---

## 👥 Support

For issues or questions:
- **Email**: support@your-crm-domain.com
- **Slack**: #crm-support
- **Issue Tracker**: https://github.com/your-org/twenty-crm/issues

---

**Author**: MKT-Core Team
**Last Updated**: 2026-02-06
**License**: MIT
