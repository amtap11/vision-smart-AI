#!/bin/bash

# ============================================
# Docker Image Build Script
# ============================================
# Builds production-ready Docker images for Vision Smart AI
#
# Usage:
#   ./scripts/build.sh              # Build all images
#   ./scripts/build.sh backend      # Build backend only
#   ./scripts/build.sh frontend     # Build frontend only
#   ./scripts/build.sh --no-cache   # Build without cache

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Default values
BUILD_BACKEND=true
BUILD_FRONTEND=true
NO_CACHE=""
VITE_API_URL="${VITE_API_URL:-http://localhost:3001}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        backend)
            BUILD_FRONTEND=false
            shift
            ;;
        frontend)
            BUILD_BACKEND=false
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [backend|frontend] [--no-cache]"
            echo ""
            echo "Options:"
            echo "  backend         Build backend image only"
            echo "  frontend        Build frontend image only"
            echo "  --no-cache      Build without using cache"
            echo "  -h, --help      Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    echo "Please start Docker and try again"
    exit 1
fi

# Main build process
print_header "Vision Smart AI - Docker Build"

echo "Build Configuration:"
echo "  Backend:     $BUILD_BACKEND"
echo "  Frontend:    $BUILD_FRONTEND"
echo "  No Cache:    ${NO_CACHE:-false}"
echo "  API URL:     $VITE_API_URL"
echo ""

# Build backend
if [ "$BUILD_BACKEND" = true ]; then
    print_header "Building Backend Image"

    print_info "Building vision-smart-ai-backend..."

    if docker build $NO_CACHE \
        -t vision-smart-ai-backend:latest \
        --target production \
        -f backend/Dockerfile \
        backend/; then
        print_success "Backend image built successfully"

        # Show image size
        SIZE=$(docker images vision-smart-ai-backend:latest --format "{{.Size}}")
        print_info "Image size: $SIZE"
    else
        print_error "Backend build failed"
        exit 1
    fi
fi

# Build frontend
if [ "$BUILD_FRONTEND" = true ]; then
    print_header "Building Frontend Image"

    print_info "Building vision-smart-ai-frontend..."
    print_info "API URL: $VITE_API_URL"

    if docker build $NO_CACHE \
        -t vision-smart-ai-frontend:latest \
        --target production \
        --build-arg VITE_API_URL="$VITE_API_URL" \
        -f Dockerfile \
        .; then
        print_success "Frontend image built successfully"

        # Show image size
        SIZE=$(docker images vision-smart-ai-frontend:latest --format "{{.Size}}")
        print_info "Image size: $SIZE"
    else
        print_error "Frontend build failed"
        exit 1
    fi
fi

# Summary
print_header "Build Complete"

echo -e "${GREEN}All images built successfully!${NC}\n"

echo "Available images:"
docker images | grep -E "REPOSITORY|vision-smart-ai"

echo ""
echo "Next steps:"
echo "  1. Test locally:     docker compose up"
echo "  2. Tag for registry: ./scripts/tag.sh <version>"
echo "  3. Push to registry: ./scripts/push.sh"
echo ""
