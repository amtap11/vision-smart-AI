<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/180frbSHAVqfWljF59mLh7GD7l6agIQLM

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 🐳 Docker Deployment

Run the full application stack (frontend, backend, and database) with Docker:

**Prerequisites:** Docker and Docker Compose

### Quick Start with Docker

```bash
# 1. Copy environment template
cp .env.docker.example .env.docker

# 2. Edit .env.docker and add your GEMINI_API_KEY and JWT_SECRET
nano .env.docker

# 3. Start all services
./scripts/deploy.sh

# 4. Access the application
open http://localhost
```

### Build Docker Images

```bash
# Build all images
./scripts/build.sh

# Build specific service
./scripts/build.sh backend
./scripts/build.sh frontend
```

### Manage Deployment

```bash
# View logs
./scripts/deploy.sh logs

# Check status
./scripts/deploy.sh status

# Stop services
./scripts/deploy.sh stop

# Restart services
./scripts/deploy.sh restart
```

### Push to Container Registry

```bash
# Set your registry credentials
export DOCKER_NAMESPACE=your-username

# Push images with version tag
./scripts/push.sh v1.0.0

# Push to specific registry (e.g., GitHub Container Registry)
./scripts/push.sh --registry ghcr.io --namespace your-org v1.0.0
```

For detailed Docker documentation, see [DOCKER.md](DOCKER.md).

## 📚 Documentation

- [Docker Deployment Guide](DOCKER.md) - Comprehensive Docker setup and deployment guide
- [Setup Guide](SETUP.md) - Detailed development setup instructions
- [Scripts Documentation](scripts/README.md) - Docker utility scripts reference
