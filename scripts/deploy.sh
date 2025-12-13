#!/bin/bash

# ============================================
# Docker Deployment Script
# ============================================
# Deploys Vision Smart AI using Docker Compose
#
# Usage:
#   ./scripts/deploy.sh                    # Start all services
#   ./scripts/deploy.sh stop              # Stop all services
#   ./scripts/deploy.sh restart           # Restart all services
#   ./scripts/deploy.sh logs              # View logs
#   ./scripts/deploy.sh status            # Check status

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

ENV_FILE=".env.docker"

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

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        echo "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        echo "Please start Docker and try again"
        exit 1
    fi
}

# Check if environment file exists
check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        print_warning "Environment file not found: $ENV_FILE"
        echo ""
        echo "Creating from template..."

        if [ -f ".env.docker.example" ]; then
            cp .env.docker.example "$ENV_FILE"
            print_success "Created $ENV_FILE from template"
            echo ""
            print_warning "Please edit $ENV_FILE and add your configuration:"
            echo "  - GEMINI_API_KEY"
            echo "  - JWT_SECRET (use a strong random string)"
            echo "  - VITE_API_URL (for production)"
            echo ""
            read -p "Press Enter after editing $ENV_FILE to continue..."
        else
            print_error "Template file .env.docker.example not found"
            exit 1
        fi
    fi
}

# Start services
start_services() {
    print_header "Starting Vision Smart AI Services"

    check_docker
    check_env_file

    print_info "Starting services..."

    if docker compose --env-file "$ENV_FILE" up -d; then
        print_success "Services started successfully"

        echo ""
        print_info "Waiting for services to be healthy..."
        sleep 5

        # Check service health
        docker compose ps

        echo ""
        print_success "Deployment complete!"
        echo ""
        echo "Access the application:"
        echo "  Frontend: http://localhost"
        echo "  Backend:  http://localhost:3001"
        echo "  Health:   http://localhost:3001/health"
        echo ""
        echo "Useful commands:"
        echo "  View logs:    docker compose logs -f"
        echo "  Check status: docker compose ps"
        echo "  Stop:         docker compose down"
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Stop services
stop_services() {
    print_header "Stopping Vision Smart AI Services"

    check_docker

    print_info "Stopping services..."

    if docker compose down; then
        print_success "Services stopped successfully"
    else
        print_error "Failed to stop services"
        exit 1
    fi
}

# Restart services
restart_services() {
    print_header "Restarting Vision Smart AI Services"

    stop_services
    start_services
}

# View logs
view_logs() {
    print_header "Viewing Logs"

    check_docker

    docker compose logs -f --tail=100
}

# Check status
check_status() {
    print_header "Service Status"

    check_docker

    docker compose ps

    echo ""
    print_info "Container Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

    echo ""
    print_info "Health Checks:"

    # Backend health
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_error "Backend is not responding"
    fi

    # Frontend health
    if curl -sf http://localhost/health > /dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend is not responding"
    fi

    # Database
    if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        print_success "Database is healthy"
    else
        print_error "Database is not responding"
    fi
}

# Pull latest images
pull_images() {
    print_header "Pulling Latest Images"

    check_docker

    print_info "Pulling images from registry..."

    if docker compose pull; then
        print_success "Images pulled successfully"
        echo ""
        print_warning "Run './scripts/deploy.sh restart' to use the new images"
    else
        print_error "Failed to pull images"
        exit 1
    fi
}

# Update deployment
update_deployment() {
    print_header "Updating Deployment"

    pull_images
    restart_services

    print_success "Deployment updated successfully"
}

# Backup database
backup_database() {
    print_header "Backing Up Database"

    check_docker

    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

    print_info "Creating backup: $BACKUP_FILE"

    if docker compose exec -T postgres pg_dump -U postgres vision_smart_ai > "$BACKUP_FILE"; then
        print_success "Database backed up to $BACKUP_FILE"
    else
        print_error "Backup failed"
        exit 1
    fi
}

# Show help
show_help() {
    echo "Vision Smart AI Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start          Start all services (default)"
    echo "  stop           Stop all services"
    echo "  restart        Restart all services"
    echo "  logs           View service logs"
    echo "  status         Check service status and health"
    echo "  pull           Pull latest images from registry"
    echo "  update         Pull images and restart services"
    echo "  backup         Backup database"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Start services"
    echo "  $0 logs         # View logs"
    echo "  $0 status       # Check status"
    echo ""
}

# Main script
COMMAND="${1:-start}"

case $COMMAND in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        view_logs
        ;;
    status)
        check_status
        ;;
    pull)
        pull_images
        ;;
    update)
        update_deployment
        ;;
    backup)
        backup_database
        ;;
    help|-h|--help)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac
