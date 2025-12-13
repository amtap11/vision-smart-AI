#!/bin/bash

# ============================================
# Docker Image Push Script
# ============================================
# Pushes Docker images to a container registry
#
# Usage:
#   ./scripts/push.sh                                    # Push with git commit hash
#   ./scripts/push.sh v1.0.0                            # Push with custom tag
#   ./scripts/push.sh v1.0.0 --registry ghcr.io         # Use specific registry
#   ./scripts/push.sh --latest                          # Push as latest only

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
REGISTRY="${DOCKER_REGISTRY:-docker.io}"
NAMESPACE="${DOCKER_NAMESPACE:-}"
PUSH_LATEST=true
CUSTOM_TAG=""

# Image names
BACKEND_IMAGE="vision-smart-ai-backend"
FRONTEND_IMAGE="vision-smart-ai-frontend"

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

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --latest)
            CUSTOM_TAG="latest"
            shift
            ;;
        --no-latest)
            PUSH_LATEST=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [TAG] [OPTIONS]"
            echo ""
            echo "Arguments:"
            echo "  TAG                 Image tag (default: git commit hash)"
            echo ""
            echo "Options:"
            echo "  --registry REG      Registry URL (default: \$DOCKER_REGISTRY or docker.io)"
            echo "  --namespace NS      Registry namespace (default: \$DOCKER_NAMESPACE)"
            echo "  --latest            Push as 'latest' only"
            echo "  --no-latest         Don't push 'latest' tag"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  DOCKER_REGISTRY     Default registry (e.g., ghcr.io, gcr.io)"
            echo "  DOCKER_NAMESPACE    Default namespace (e.g., username, org-name)"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Push with git hash"
            echo "  $0 v1.0.0                            # Push as v1.0.0"
            echo "  $0 --registry ghcr.io --namespace myorg v1.0.0"
            exit 0
            ;;
        *)
            if [ -z "$CUSTOM_TAG" ]; then
                CUSTOM_TAG="$1"
            else
                print_error "Unknown option: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# Check if namespace is set
if [ -z "$NAMESPACE" ]; then
    print_error "Namespace is required"
    echo ""
    echo "Set namespace with:"
    echo "  export DOCKER_NAMESPACE=your-username"
    echo "  or"
    echo "  ./scripts/push.sh --namespace your-username"
    exit 1
fi

# Determine tag to use
if [ -z "$CUSTOM_TAG" ]; then
    # Check if we're in a git repository
    if git rev-parse --git-dir > /dev/null 2>&1; then
        GIT_HASH=$(git rev-parse --short HEAD)
        IMAGE_TAG="$GIT_HASH"
        print_info "Using git commit hash as tag: $IMAGE_TAG"
    else
        print_error "Not in a git repository and no tag specified"
        echo "Please specify a tag: ./scripts/push.sh <tag>"
        exit 1
    fi
elif [ "$CUSTOM_TAG" = "latest" ]; then
    IMAGE_TAG="latest"
    PUSH_LATEST=false  # Don't push twice
else
    IMAGE_TAG="$CUSTOM_TAG"
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check if images exist locally
print_info "Checking local images..."

if ! docker image inspect "$BACKEND_IMAGE:latest" > /dev/null 2>&1; then
    print_error "Backend image not found locally"
    echo "Build it first: ./scripts/build.sh backend"
    exit 1
fi

if ! docker image inspect "$FRONTEND_IMAGE:latest" > /dev/null 2>&1; then
    print_error "Frontend image not found locally"
    echo "Build it first: ./scripts/build.sh frontend"
    exit 1
fi

print_success "Local images found"

# Construct full image names
BACKEND_FULL="$REGISTRY/$NAMESPACE/$BACKEND_IMAGE"
FRONTEND_FULL="$REGISTRY/$NAMESPACE/$FRONTEND_IMAGE"

# Main push process
print_header "Vision Smart AI - Docker Push"

echo "Push Configuration:"
echo "  Registry:    $REGISTRY"
echo "  Namespace:   $NAMESPACE"
echo "  Tag:         $IMAGE_TAG"
echo "  Push Latest: $PUSH_LATEST"
echo ""

# Tag images
print_header "Tagging Images"

print_info "Tagging backend: $BACKEND_FULL:$IMAGE_TAG"
docker tag "$BACKEND_IMAGE:latest" "$BACKEND_FULL:$IMAGE_TAG"

print_info "Tagging frontend: $FRONTEND_FULL:$IMAGE_TAG"
docker tag "$FRONTEND_IMAGE:latest" "$FRONTEND_FULL:$IMAGE_TAG"

if [ "$PUSH_LATEST" = true ]; then
    print_info "Tagging as latest..."
    docker tag "$BACKEND_IMAGE:latest" "$BACKEND_FULL:latest"
    docker tag "$FRONTEND_IMAGE:latest" "$FRONTEND_FULL:latest"
fi

print_success "Images tagged"

# Push images
print_header "Pushing Images to Registry"

print_warning "Make sure you're logged in to $REGISTRY"
echo "Login with: docker login $REGISTRY"
echo ""

read -p "Continue with push? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Push cancelled"
    exit 0
fi

# Push backend
print_info "Pushing backend image: $BACKEND_FULL:$IMAGE_TAG"
if docker push "$BACKEND_FULL:$IMAGE_TAG"; then
    print_success "Backend image pushed: $BACKEND_FULL:$IMAGE_TAG"
else
    print_error "Failed to push backend image"
    exit 1
fi

# Push frontend
print_info "Pushing frontend image: $FRONTEND_FULL:$IMAGE_TAG"
if docker push "$FRONTEND_FULL:$IMAGE_TAG"; then
    print_success "Frontend image pushed: $FRONTEND_FULL:$IMAGE_TAG"
else
    print_error "Failed to push frontend image"
    exit 1
fi

# Push latest tags
if [ "$PUSH_LATEST" = true ]; then
    print_info "Pushing latest tags..."

    docker push "$BACKEND_FULL:latest"
    print_success "Backend latest pushed"

    docker push "$FRONTEND_FULL:latest"
    print_success "Frontend latest pushed"
fi

# Summary
print_header "Push Complete"

echo -e "${GREEN}All images pushed successfully!${NC}\n"

echo "Pushed images:"
echo "  Backend:  $BACKEND_FULL:$IMAGE_TAG"
echo "  Frontend: $FRONTEND_FULL:$IMAGE_TAG"

if [ "$PUSH_LATEST" = true ]; then
    echo "  Backend:  $BACKEND_FULL:latest"
    echo "  Frontend: $FRONTEND_FULL:latest"
fi

echo ""
echo "Pull commands:"
echo "  docker pull $BACKEND_FULL:$IMAGE_TAG"
echo "  docker pull $FRONTEND_FULL:$IMAGE_TAG"
echo ""
