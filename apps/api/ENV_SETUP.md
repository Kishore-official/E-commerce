# Environment Variables Setup

## Required Environment Variables

This document lists all required and optional environment variables for the API.

## Quick Start

1. Create a `.env` file in `apps/api/` directory
2. Copy the variables below and fill in your values
3. **NEVER commit `.env` to version control**

## Required Variables (Production)

These variables **MUST** be set in production or the application will fail to start:

### Authentication
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```
**Generate a strong secret:**
```bash
openssl rand -base64 32
```

### Database
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
MONGODB_DB_NAME=E-commerce
```

### S3 Storage (Production)
```bash
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=ecommerce
S3_REGION=us-east-1
```

## Optional Variables (with defaults)

### Application
```bash
NODE_ENV=development
API_PORT=3000
API_PREFIX=api/v1
API_BASE_URL=http://localhost:3000
STOREFRONT_URL=http://localhost:3001
VENDOR_URL=http://localhost:3002
ADMIN_URL=http://localhost:3003
```

### JWT Expiration
```bash
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

### Redis
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### OpenSearch
```bash
OPENSEARCH_NODE=http://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin
```

### S3 (Local Development with MinIO)
```bash
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=ecommerce
S3_REGION=us-east-1
```

## Security Notes

1. **JWT_SECRET**: Must be a strong, random string. Never use default values in production.
2. **MONGODB_URI**: Contains credentials. Never commit to version control.
3. **S3 credentials**: Required in production. Local defaults are for development only.
4. All secrets are validated at startup - missing required variables will cause the app to fail fast.

## Example .env File

```bash
# Application
NODE_ENV=development
API_PORT=3000

# Authentication (REQUIRED)
JWT_SECRET=your-generated-secret-here

# Database (REQUIRED)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
MONGODB_DB_NAME=E-commerce

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# S3 (use production values in production)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=ecommerce

# OpenSearch
OPENSEARCH_NODE=http://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin
```

