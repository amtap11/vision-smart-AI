# Docker Deployment Guide

Production-grade Docker setup for Vision Smart AI, featuring multi-stage builds, optimized images, and comprehensive orchestration.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Docker Images](#docker-images)
- [Building Images](#building-images)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Image Tagging Strategy](#image-tagging-strategy)
- [Container Registry Setup](#container-registry-setup)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

The application consists of three containerized services:

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network                          │
│                  (vision-smart-ai-network)                  │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Frontend   │───>│   Backend    │───>│  PostgreSQL  │ │
│  │  (Nginx)     │    │  (Node.js)   │    │   Database   │ │
│  │   Port 80    │    │  Port 3001   │    │  Port 5432   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Service Details

| Service | Base Image | Size | Purpose |
|---------|-----------|------|---------|
| **Frontend** | `nginx:alpine` | ~50MB | Serves React SPA, proxies API requests |
| **Backend** | `node:20-alpine` | ~200MB | Express API, JWT auth, Gemini AI integration |
| **Database** | `postgres:15-alpine` | ~240MB | PostgreSQL database with persistence |

## Quick Start

### Prerequisites

- Docker 20.10+ or Docker Desktop
- Docker Compose 2.0+
- Git

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd vision-smart-AI

# Create environment file from template
cp .env.docker.example .env.docker

# Edit .env.docker with your configuration
nano .env.docker
```

### 2. Build and Run

```bash
# Build all images
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

### 3. Verify Deployment

```bash
# Check service health
docker compose ps

# Test backend health
curl http://localhost:3001/health

# Test frontend
curl http://localhost/health

# Access the application
open http://localhost
```

## Docker Images

### Frontend Image (`vision-smart-ai-frontend`)

**Multi-stage build:**

1. **Builder Stage** (`node:20-alpine`)
   - Installs npm dependencies
   - Builds React app with Vite
   - Outputs static files to `/app/dist`

2. **Production Stage** (`nginx:alpine`)
   - Copies built static files
   - Configures Nginx for SPA routing
   - Proxies `/api/*` to backend
   - Serves on port 80

**Key Features:**
- ✅ Optimized for production (minified, tree-shaken)
- ✅ Gzip compression enabled
- ✅ Static asset caching (1 year)
- ✅ Security headers (XSS, Frame Options, etc.)
- ✅ Health check endpoint at `/health`
- ✅ SPA routing support (all routes → index.html)

**Image Size:** ~50MB

### Backend Image (`vision-smart-ai-backend`)

**Multi-stage build:**

1. **Builder Stage** (`node:20-alpine`)
   - Installs all dependencies (including devDependencies)
   - Compiles TypeScript to JavaScript
   - Outputs to `/app/dist`

2. **Production Stage** (`node:20-alpine`)
   - Copies only production dependencies
   - Copies compiled JavaScript from builder
   - Runs as non-root user (nodejs:nodejs)
   - Uses dumb-init for proper signal handling

**Key Features:**
- ✅ Minimal attack surface (production deps only)
- ✅ Non-root user execution
- ✅ Health check endpoint at `/health`
- ✅ Database migration on startup
- ✅ Proper signal handling (graceful shutdown)
- ✅ Security hardened

**Image Size:** ~200MB

### Database Image (`postgres:15-alpine`)

**Configuration:**
- Official PostgreSQL 15 Alpine image
- Named volume for data persistence: `postgres_data`
- Health checks enabled
- Auto-initialization with migrations

**Image Size:** ~240MB

## Building Images

### Local Build

```bash
# Build all images
docker compose build

# Build with no cache (clean build)
docker compose build --no-cache

# Build specific service
docker compose build backend
docker compose build frontend

# Build with custom build args
docker compose build --build-arg VITE_API_URL=https://api.example.com frontend
```

### Production Build

```bash
# Set environment variables
export IMAGE_TAG=$(git rev-parse --short HEAD)
export DOCKER_REGISTRY=ghcr.io
export DOCKER_NAMESPACE=your-org

# Build with tags
docker build -t $DOCKER_REGISTRY/$DOCKER_NAMESPACE/vision-smart-ai-backend:$IMAGE_TAG \
  --target production \
  ./backend

docker build -t $DOCKER_REGISTRY/$DOCKER_NAMESPACE/vision-smart-ai-frontend:$IMAGE_TAG \
  --target production \
  --build-arg VITE_API_URL=https://api.example.com \
  .
```

### Verify Image Sizes

```bash
docker images | grep vision-smart-ai
```

## Local Development

### Using Docker Compose

```bash
# Start all services
docker compose up

# Start in detached mode
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop services
docker compose down

# Stop and remove volumes (⚠️ deletes database data)
docker compose down -v

# Restart a service
docker compose restart backend
```

### Development with Hot Reload

For development with hot reload, use the development setup instead:

```bash
# Frontend development (Vite dev server)
cd /path/to/vision-smart-AI
npm run dev

# Backend development (tsx watch)
cd /path/to/vision-smart-AI/backend
npm run dev

# Database only (Docker)
docker compose up postgres
```

### Accessing Services

| Service | URL | Container Name |
|---------|-----|----------------|
| Frontend | http://localhost | vision-smart-ai-frontend |
| Backend API | http://localhost:3001 | vision-smart-ai-backend |
| PostgreSQL | localhost:5432 | vision-smart-ai-db |

### Database Access

```bash
# Connect to database
docker compose exec postgres psql -U postgres -d vision_smart_ai

# View database logs
docker compose logs postgres

# Backup database
docker compose exec postgres pg_dump -U postgres vision_smart_ai > backup.sql

# Restore database
docker compose exec -T postgres psql -U postgres vision_smart_ai < backup.sql
```

## Production Deployment

### Environment Configuration

**Required Environment Variables:**

```bash
# .env.docker
JWT_SECRET=<strong-random-secret-minimum-32-chars>
GEMINI_API_KEY=<your-gemini-api-key>
VITE_API_URL=https://api.yourdomain.com
```

**Security Checklist:**

- ✅ Change default database password
- ✅ Use strong JWT_SECRET (32+ characters)
- ✅ Set NODE_ENV=production
- ✅ Use HTTPS in production (reverse proxy)
- ✅ Limit database ports (don't expose publicly)
- ✅ Enable firewall rules
- ✅ Use secrets management (AWS Secrets Manager, Vault, etc.)

### Deployment Steps

1. **Build Production Images**

```bash
# Set version tag
export IMAGE_TAG=$(git rev-parse --short HEAD)

# Build images
docker compose -f docker-compose.yml build
```

2. **Push to Registry**

```bash
# Tag images
docker tag vision-smart-ai-backend:latest $REGISTRY/backend:$IMAGE_TAG
docker tag vision-smart-ai-frontend:latest $REGISTRY/frontend:$IMAGE_TAG

# Push to registry
docker push $REGISTRY/backend:$IMAGE_TAG
docker push $REGISTRY/frontend:$IMAGE_TAG
```

3. **Deploy on Server**

```bash
# Pull images
docker compose pull

# Start services
docker compose up -d

# Verify health
docker compose ps
curl http://localhost:3001/health
```

### Scaling Services

```bash
# Scale backend to 3 instances
docker compose up -d --scale backend=3

# Note: Frontend should not be scaled (Nginx handles load)
# Use a load balancer (Nginx, HAProxy) in front for multiple frontends
```

### Rolling Updates

```bash
# Pull new images
docker compose pull

# Recreate services with new images
docker compose up -d --no-deps --build backend

# Zero-downtime update (requires load balancer)
docker compose up -d --scale backend=2
docker compose stop backend_old
docker compose rm backend_old
```

## Image Tagging Strategy

### Recommended Tagging Schemes

We use **semantic versioning** and **git-based tags** for production:

#### 1. Git Commit Hash (Recommended)

```bash
# Short commit hash (7 chars)
IMAGE_TAG=$(git rev-parse --short HEAD)
# Example: vision-smart-ai-backend:a7c3d2f

# Full commit hash (40 chars)
IMAGE_TAG=$(git rev-parse HEAD)
# Example: vision-smart-ai-backend:a7c3d2f8b1e4...
```

**Pros:**
- Immutable and traceable
- Links directly to source code
- Perfect for CI/CD pipelines

#### 2. Semantic Versioning

```bash
# Version tag
IMAGE_TAG=v1.2.3
# Example: vision-smart-ai-backend:v1.2.3
```

**Pros:**
- Human-readable
- Clear versioning
- Standard practice

#### 3. Environment-Based Tags

```bash
# Environment tags
IMAGE_TAG=production
IMAGE_TAG=staging
IMAGE_TAG=development
```

**Pros:**
- Clear environment separation
- Easy to understand

**Cons:**
- Mutable (tags can be overwritten)

#### 4. Hybrid Approach (Best Practice)

```bash
# Combine version + commit hash
VERSION=v1.2.3
COMMIT=$(git rev-parse --short HEAD)
IMAGE_TAG="${VERSION}-${COMMIT}"
# Example: vision-smart-ai-backend:v1.2.3-a7c3d2f

# Also tag as latest
docker tag app:${IMAGE_TAG} app:latest
```

### Tagging Examples

```bash
# Development build
docker build -t vision-smart-ai-backend:dev .

# Staging build with commit hash
docker build -t vision-smart-ai-backend:staging-$(git rev-parse --short HEAD) .

# Production release
docker build -t vision-smart-ai-backend:v1.0.0 .
docker tag vision-smart-ai-backend:v1.0.0 vision-smart-ai-backend:latest
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Build and Push
  run: |
    export IMAGE_TAG="${GITHUB_SHA::7}"
    docker build -t $REGISTRY/backend:$IMAGE_TAG ./backend
    docker tag $REGISTRY/backend:$IMAGE_TAG $REGISTRY/backend:latest
    docker push $REGISTRY/backend:$IMAGE_TAG
    docker push $REGISTRY/backend:latest
```

## Container Registry Setup

### Supported Registries

- **Docker Hub** (docker.io)
- **GitHub Container Registry** (ghcr.io)
- **Google Artifact Registry** (gcr.io)
- **AWS Elastic Container Registry** (ECR)
- **Azure Container Registry** (azurecr.io)

### Docker Hub Setup

```bash
# Login
docker login

# Tag images
docker tag vision-smart-ai-backend:latest username/vision-smart-ai-backend:v1.0.0

# Push
docker push username/vision-smart-ai-backend:v1.0.0
```

### GitHub Container Registry (ghcr.io)

```bash
# Login with PAT (Personal Access Token)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag images
docker tag vision-smart-ai-backend:latest ghcr.io/username/vision-smart-ai-backend:v1.0.0

# Push
docker push ghcr.io/username/vision-smart-ai-backend:v1.0.0
```

### AWS ECR Setup

```bash
# Login (requires AWS CLI)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Create repositories
aws ecr create-repository --repository-name vision-smart-ai-backend
aws ecr create-repository --repository-name vision-smart-ai-frontend

# Tag images
docker tag vision-smart-ai-backend:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/vision-smart-ai-backend:v1.0.0

# Push
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/vision-smart-ai-backend:v1.0.0
```

### Google Artifact Registry

```bash
# Configure authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Tag images
docker tag vision-smart-ai-backend:latest \
  us-central1-docker.pkg.dev/PROJECT_ID/vision-smart-ai/backend:v1.0.0

# Push
docker push us-central1-docker.pkg.dev/PROJECT_ID/vision-smart-ai/backend:v1.0.0
```

### Private Registry Best Practices

1. **Use Image Scanning**
   - Enable vulnerability scanning (ECR, GCR, Harbor)
   - Scan on push and periodically

2. **Implement Access Control**
   - Use IAM roles (AWS, GCP)
   - Use repository permissions (GitHub, Docker Hub)
   - Principle of least privilege

3. **Enable Image Signing**
   - Docker Content Trust (Notary)
   - Cosign for Kubernetes

4. **Set Retention Policies**
   - Keep last N versions
   - Delete untagged images
   - Archive old versions

## Environment Variables

### Frontend Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3001` | Yes |

### Backend Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` | Yes |
| `PORT` | Server port | `3001` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `JWT_SECRET` | JWT signing secret | `your-secret-key-min-32-chars` | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` | Yes |
| `GEMINI_API_KEY` | Gemini AI API key | `AIza...` | Yes |
| `FRONTEND_URL` | Frontend URL (CORS) | `http://localhost` | Yes |

### Database Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_DB` | Database name | `vision_smart_ai` | Yes |
| `POSTGRES_USER` | Database user | `postgres` | Yes |
| `POSTGRES_PASSWORD` | Database password | `password` | Yes |

## Troubleshooting

### Common Issues

#### 1. Backend can't connect to database

```bash
# Check database is running and healthy
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Verify network connectivity
docker compose exec backend ping postgres

# Check DATABASE_URL environment variable
docker compose exec backend env | grep DATABASE_URL
```

#### 2. Frontend returns 502 Bad Gateway

```bash
# Check backend is healthy
curl http://localhost:3001/health

# Check backend logs
docker compose logs backend

# Verify nginx configuration
docker compose exec frontend nginx -t

# Check nginx logs
docker compose logs frontend
```

#### 3. Database migration fails

```bash
# Check database is accessible
docker compose exec backend npm run db:migrate

# Manually run migrations
docker compose exec backend node dist/config/migrate.js

# Check database tables
docker compose exec postgres psql -U postgres -d vision_smart_ai -c "\dt"
```

#### 4. Image build fails

```bash
# Check Docker daemon is running
docker info

# Build with verbose output
docker compose build --progress=plain backend

# Check .dockerignore isn't excluding necessary files
cat .dockerignore
cat backend/.dockerignore

# Clear Docker build cache
docker builder prune
```

#### 5. Container keeps restarting

```bash
# Check container logs
docker compose logs backend

# Inspect container
docker compose ps

# Check health check status
docker inspect vision-smart-ai-backend | grep -A 10 Health

# Disable restart policy for debugging
docker compose up --no-deps backend
```

### Performance Optimization

#### 1. Reduce Image Build Time

```bash
# Use BuildKit (faster builds)
export DOCKER_BUILDKIT=1

# Build with cache from registry
docker buildx build --cache-from=type=registry,ref=myregistry/backend .

# Use build cache mount
RUN --mount=type=cache,target=/root/.npm npm ci
```

#### 2. Optimize Layer Caching

```dockerfile
# Good: Dependencies change less often than source
COPY package*.json ./
RUN npm ci
COPY . .

# Bad: Invalidates cache on every source change
COPY . .
RUN npm ci
```

#### 3. Reduce Image Size

```bash
# Use alpine base images ✅ Already done
# Remove dev dependencies ✅ Already done
# Use multi-stage builds ✅ Already done

# Analyze image layers
docker history vision-smart-ai-backend
```

### Security Hardening

```bash
# Scan images for vulnerabilities
docker scan vision-smart-ai-backend

# Run as non-root user ✅ Already done
# Use minimal base images ✅ Already done
# Don't expose unnecessary ports ✅ Already done

# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1
```

### Monitoring and Logging

```bash
# View resource usage
docker stats

# Export logs to file
docker compose logs > logs.txt

# Follow logs with timestamps
docker compose logs -f -t

# View logs for specific service
docker compose logs -f backend --tail=100
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `docker compose logs`
3. Open an issue on GitHub

---

**Version:** 1.0.0
**Last Updated:** 2025-12-13
