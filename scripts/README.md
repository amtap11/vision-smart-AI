# Docker Scripts

Utility scripts for building, deploying, and managing Vision Smart AI Docker images.

## Available Scripts

### 🏗️ build.sh

Builds production-ready Docker images for the frontend and backend.

**Usage:**
```bash
# Build all images
./scripts/build.sh

# Build backend only
./scripts/build.sh backend

# Build frontend only
./scripts/build.sh frontend

# Build without cache
./scripts/build.sh --no-cache

# Build with custom API URL
VITE_API_URL=https://api.example.com ./scripts/build.sh frontend
```

**What it does:**
- Validates Docker installation
- Builds multi-stage Docker images
- Shows image sizes
- Provides next steps

### 📤 push.sh

Pushes Docker images to a container registry (Docker Hub, GitHub Container Registry, AWS ECR, etc.).

**Usage:**
```bash
# Push with git commit hash as tag
export DOCKER_NAMESPACE=your-username
./scripts/push.sh

# Push with custom tag
./scripts/push.sh v1.0.0

# Push to GitHub Container Registry
./scripts/push.sh --registry ghcr.io --namespace myorg v1.0.0

# Push as latest only
./scripts/push.sh --latest
```

**Environment Variables:**
- `DOCKER_REGISTRY` - Registry URL (default: docker.io)
- `DOCKER_NAMESPACE` - Your username or organization (required)

**Examples:**
```bash
# Docker Hub
export DOCKER_NAMESPACE=myusername
./scripts/push.sh v1.0.0

# GitHub Container Registry
export DOCKER_REGISTRY=ghcr.io
export DOCKER_NAMESPACE=myorg
./scripts/push.sh v1.0.0

# AWS ECR
export DOCKER_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com
export DOCKER_NAMESPACE=my-project
./scripts/push.sh v1.0.0
```

### 🚀 deploy.sh

Deploys and manages the application using Docker Compose.

**Usage:**
```bash
# Start all services
./scripts/deploy.sh
# or
./scripts/deploy.sh start

# Stop all services
./scripts/deploy.sh stop

# Restart services
./scripts/deploy.sh restart

# View logs
./scripts/deploy.sh logs

# Check service status
./scripts/deploy.sh status

# Pull latest images
./scripts/deploy.sh pull

# Update deployment (pull + restart)
./scripts/deploy.sh update

# Backup database
./scripts/deploy.sh backup
```

**What it does:**
- Manages Docker Compose lifecycle
- Validates environment configuration
- Monitors service health
- Creates database backups

## Quick Start

### Local Development

```bash
# 1. Build images
./scripts/build.sh

# 2. Configure environment
cp .env.docker.example .env.docker
# Edit .env.docker with your settings

# 3. Deploy
./scripts/deploy.sh

# 4. View logs
./scripts/deploy.sh logs

# 5. Check status
./scripts/deploy.sh status
```

### Production Deployment

```bash
# 1. Build production images
VITE_API_URL=https://api.yourdomain.com ./scripts/build.sh

# 2. Tag images with version
export DOCKER_REGISTRY=ghcr.io
export DOCKER_NAMESPACE=your-org
./scripts/push.sh v1.0.0

# 3. On production server, pull and deploy
./scripts/deploy.sh update
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up environment
        run: |
          echo "IMAGE_TAG=${GITHUB_SHA::7}" >> $GITHUB_ENV
          echo "DOCKER_REGISTRY=ghcr.io" >> $GITHUB_ENV
          echo "DOCKER_NAMESPACE=${{ github.repository_owner }}" >> $GITHUB_ENV

      - name: Login to GitHub Container Registry
        run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Build images
        run: ./scripts/build.sh

      - name: Push images
        run: ./scripts/push.sh ${{ env.IMAGE_TAG }} --no-latest
```

### GitLab CI Example

```yaml
build:
  stage: build
  script:
    - ./scripts/build.sh
    - export DOCKER_NAMESPACE=$CI_PROJECT_NAMESPACE
    - export DOCKER_REGISTRY=$CI_REGISTRY
    - echo $CI_REGISTRY_PASSWORD | docker login -u $CI_REGISTRY_USER --password-stdin $CI_REGISTRY
    - ./scripts/push.sh $CI_COMMIT_SHORT_SHA
```

## Registry Setup

### Docker Hub

```bash
# Login
docker login

# Set environment
export DOCKER_NAMESPACE=your-username

# Push
./scripts/push.sh v1.0.0
```

### GitHub Container Registry (ghcr.io)

```bash
# Create Personal Access Token with write:packages scope
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin

# Set environment
export DOCKER_REGISTRY=ghcr.io
export DOCKER_NAMESPACE=your-username

# Push
./scripts/push.sh v1.0.0
```

### AWS ECR

```bash
# Login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Create repositories
aws ecr create-repository --repository-name vision-smart-ai-backend
aws ecr create-repository --repository-name vision-smart-ai-frontend

# Set environment
export DOCKER_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com
export DOCKER_NAMESPACE=my-project

# Push
./scripts/push.sh v1.0.0
```

### Google Artifact Registry

```bash
# Configure authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Set environment
export DOCKER_REGISTRY=us-central1-docker.pkg.dev
export DOCKER_NAMESPACE=PROJECT_ID/vision-smart-ai

# Push
./scripts/push.sh v1.0.0
```

## Troubleshooting

### Permission Denied

If you get "Permission denied" when running scripts:

```bash
chmod +x scripts/*.sh
```

### Docker Not Running

```bash
# Check Docker status
docker info

# Start Docker (Linux)
sudo systemctl start docker

# Start Docker (macOS)
open -a Docker
```

### Build Fails

```bash
# Clean build without cache
./scripts/build.sh --no-cache

# Check Docker disk space
docker system df

# Clean up
docker system prune -a
```

### Push Fails

```bash
# Check if logged in
docker info | grep Username

# Login to registry
docker login

# Check namespace is set
echo $DOCKER_NAMESPACE
```

## Best Practices

1. **Version Tagging**: Use semantic versioning (v1.0.0) or git commit hashes
2. **Security**: Never commit registry credentials, use CI/CD secrets
3. **Testing**: Always test images locally before pushing to registry
4. **Cleanup**: Regularly clean up old images with `docker system prune`
5. **Monitoring**: Use `./scripts/deploy.sh status` to monitor deployments

## See Also

- [Main Docker Documentation](../DOCKER.md)
- [Setup Guide](../SETUP.md)
- [docker-compose.yml](../docker-compose.yml)
