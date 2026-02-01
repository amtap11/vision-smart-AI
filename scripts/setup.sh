#!/bin/bash

# ============================================
# Vision Smart AI - First-Time Setup Script
# ============================================
# This script guides users through the initial setup process:
# 1. Installs all required dependencies
# 2. Configures Gemini 3 API key
# 3. Sets up environment configuration
# 4. Starts the system
#
# Usage:
#   ./scripts/setup.sh           # Interactive setup
#   ./scripts/setup.sh --check   # Check if setup is complete

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ENV_FILE=".env.docker"
SETUP_MARKER=".setup_complete"

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_step() {
    echo -e "\n${CYAN}>>> $1${NC}"
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

# Check if setup is already complete
check_setup_complete() {
    if [ -f "$SETUP_MARKER" ] && [ -f "$ENV_FILE" ]; then
        # Verify GEMINI_API_KEY is set and not placeholder
        if grep -q "^GEMINI_API_KEY=" "$ENV_FILE" 2>/dev/null; then
            API_KEY=$(grep "^GEMINI_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)
            if [ -n "$API_KEY" ] && [ "$API_KEY" != "your_gemini_api_key_here" ]; then
                return 0
            fi
        fi
    fi
    return 1
}

# Display welcome banner
show_welcome() {
    clear
    echo -e "${BOLD}${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║             🚀 Vision Smart AI Setup Wizard 🚀               ║"
    echo "║                                                              ║"
    echo "║     AI-Powered Data Analytics with Google Gemini 3           ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
}

# Check system requirements
check_requirements() {
    print_header "Step 1: Checking System Requirements"

    local requirements_met=true

    # Check Docker
    echo -n "Checking Docker... "
    if command -v docker &> /dev/null; then
        print_success "Docker installed ($(docker --version | cut -d' ' -f3 | tr -d ','))"
    else
        print_error "Docker not found"
        echo "  Please install Docker: https://docs.docker.com/get-docker/"
        requirements_met=false
    fi

    # Check Docker daemon
    echo -n "Checking Docker daemon... "
    if docker info &> /dev/null; then
        print_success "Docker daemon running"
    else
        print_error "Docker daemon not running"
        echo "  Please start Docker and try again"
        requirements_met=false
    fi

    # Check Docker Compose
    echo -n "Checking Docker Compose... "
    if docker compose version &> /dev/null; then
        print_success "Docker Compose available"
    else
        print_error "Docker Compose not found"
        echo "  Docker Compose V2 is required"
        requirements_met=false
    fi

    # Check curl (for API validation)
    echo -n "Checking curl... "
    if command -v curl &> /dev/null; then
        print_success "curl installed"
    else
        print_warning "curl not found (optional, for API validation)"
    fi

    if [ "$requirements_met" = false ]; then
        echo ""
        print_error "Some requirements are not met. Please install missing dependencies."
        exit 1
    fi

    print_success "All requirements satisfied!"
}

# Configure Gemini API
configure_gemini_api() {
    print_header "Step 2: Configure Google Gemini 3 API"

    echo -e "${BOLD}Gemini 3 is required for AI-powered data analytics.${NC}"
    echo ""
    echo "To get your Gemini API key:"
    echo "  1. Go to: https://aistudio.google.com/apikey"
    echo "  2. Sign in with your Google account"
    echo "  3. Create a new API key or use an existing one"
    echo "  4. Copy the API key"
    echo ""

    # Check if API key already exists in environment
    if [ -n "$GEMINI_API_KEY" ] && [ "$GEMINI_API_KEY" != "your_gemini_api_key_here" ]; then
        echo -n "Found GEMINI_API_KEY in environment. Use this key? [Y/n]: "
        read -r use_env_key
        if [ "$use_env_key" != "n" ] && [ "$use_env_key" != "N" ]; then
            API_KEY="$GEMINI_API_KEY"
            print_success "Using API key from environment"
            return 0
        fi
    fi

    # Prompt for API key
    while true; do
        echo -n -e "${CYAN}Enter your Gemini API key: ${NC}"
        read -r API_KEY

        if [ -z "$API_KEY" ]; then
            print_error "API key cannot be empty"
            continue
        fi

        # Basic format validation (Gemini API keys start with specific patterns)
        if [[ ! "$API_KEY" =~ ^[A-Za-z0-9_-]{30,}$ ]]; then
            print_warning "API key format looks unusual. Make sure you copied the complete key."
            echo -n "Continue anyway? [y/N]: "
            read -r continue_anyway
            if [ "$continue_anyway" != "y" ] && [ "$continue_anyway" != "Y" ]; then
                continue
            fi
        fi

        # Validate API key with Gemini API
        print_info "Validating API key with Gemini 3..."
        if validate_gemini_api "$API_KEY"; then
            print_success "Gemini 3 API key validated successfully!"
            break
        else
            print_error "Failed to validate API key"
            echo -n "Try again? [Y/n]: "
            read -r try_again
            if [ "$try_again" = "n" ] || [ "$try_again" = "N" ]; then
                print_error "Setup cannot continue without a valid Gemini API key"
                exit 1
            fi
        fi
    done
}

# Validate Gemini API key
validate_gemini_api() {
    local key="$1"

    # Test the API key with a simple request to Gemini 3
    if command -v curl &> /dev/null; then
        response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Content-Type: application/json" \
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3:generateContent?key=$key" \
            -d '{"contents":[{"parts":[{"text":"Hi"}]}]}' \
            2>/dev/null)

        # 200 = success, 400 = bad request but key valid, 401/403 = invalid key
        if [ "$response" = "200" ] || [ "$response" = "400" ]; then
            return 0
        fi
    else
        # If curl not available, assume key is valid
        print_warning "Cannot validate API key (curl not available)"
        return 0
    fi

    return 1
}

# Generate secure JWT secret
generate_jwt_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 48 | tr -d '\n'
    elif command -v head &> /dev/null; then
        head -c 48 /dev/urandom | base64 | tr -d '\n'
    else
        # Fallback to a timestamp-based random string
        echo "vision_smart_ai_$(date +%s)_$(echo $RANDOM$RANDOM$RANDOM | md5sum | head -c 32)"
    fi
}

# Create environment configuration
create_environment() {
    print_header "Step 3: Creating Environment Configuration"

    # Generate JWT secret
    print_info "Generating secure JWT secret..."
    JWT_SECRET=$(generate_jwt_secret)
    print_success "JWT secret generated"

    # Create .env.docker file
    print_info "Creating environment configuration..."

    cat > "$ENV_FILE" << EOF
# ============================================
# Vision Smart AI - Docker Environment
# ============================================
# Generated by setup.sh on $(date)

# ============================================
# Gemini 3 AI Configuration (REQUIRED)
# ============================================
GEMINI_API_KEY=$API_KEY

# ============================================
# Security Configuration
# ============================================
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# ============================================
# Frontend Configuration
# ============================================
VITE_API_URL=http://localhost:3001

# ============================================
# Docker Registry (for CI/CD)
# ============================================
DOCKER_REGISTRY=docker.io
DOCKER_NAMESPACE=vision-smart-ai
IMAGE_TAG=latest
EOF

    chmod 600 "$ENV_FILE"
    print_success "Environment file created: $ENV_FILE"
}

# Build Docker images
build_images() {
    print_header "Step 4: Building Docker Images"

    print_info "This may take a few minutes on first run..."
    echo ""

    if docker compose --env-file "$ENV_FILE" build; then
        print_success "Docker images built successfully"
    else
        print_error "Failed to build Docker images"
        exit 1
    fi
}

# Start services
start_services() {
    print_header "Step 5: Starting Vision Smart AI"

    print_info "Starting all services..."

    if docker compose --env-file "$ENV_FILE" up -d; then
        print_success "Services started"

        echo ""
        print_info "Waiting for services to initialize..."

        # Wait for services to be healthy
        local max_attempts=30
        local attempt=0

        while [ $attempt -lt $max_attempts ]; do
            sleep 2
            attempt=$((attempt + 1))

            # Check backend health
            if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
                print_success "Backend is ready"
                break
            fi

            echo -n "."
        done

        if [ $attempt -eq $max_attempts ]; then
            print_warning "Services are taking longer than expected to start"
            echo "Check status with: docker compose ps"
        fi
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Mark setup as complete
mark_setup_complete() {
    echo "$(date)" > "$SETUP_MARKER"
    chmod 644 "$SETUP_MARKER"
}

# Show completion message
show_completion() {
    print_header "Setup Complete!"

    echo -e "${BOLD}${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║         ✅ Vision Smart AI is Ready to Use! ✅               ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo ""
    echo "Access your application:"
    echo -e "  ${CYAN}Frontend:${NC}  http://localhost"
    echo -e "  ${CYAN}Backend:${NC}   http://localhost:3001"
    echo -e "  ${CYAN}Health:${NC}    http://localhost:3001/health"
    echo ""
    echo "Quick Start:"
    echo "  1. Open http://localhost in your browser"
    echo "  2. Create an account or login"
    echo "  3. Upload your data and start analyzing with Gemini 3 AI!"
    echo ""
    echo "Useful commands:"
    echo -e "  ${YELLOW}./scripts/deploy.sh status${NC}  - Check service status"
    echo -e "  ${YELLOW}./scripts/deploy.sh logs${NC}    - View service logs"
    echo -e "  ${YELLOW}./scripts/deploy.sh stop${NC}    - Stop all services"
    echo -e "  ${YELLOW}./scripts/deploy.sh restart${NC} - Restart services"
    echo ""
}

# Check only mode
run_check() {
    if check_setup_complete; then
        print_success "Setup is complete. Gemini 3 API is configured."
        echo ""
        echo "To reconfigure, delete $SETUP_MARKER and run setup again."
        exit 0
    else
        print_warning "Setup is not complete."
        echo ""
        echo "Run ./scripts/setup.sh to complete the setup."
        exit 1
    fi
}

# Main setup flow
run_setup() {
    show_welcome

    # Check if already set up
    if check_setup_complete; then
        print_info "Setup appears to be complete."
        echo -n "Run setup again? [y/N]: "
        read -r run_again
        if [ "$run_again" != "y" ] && [ "$run_again" != "Y" ]; then
            echo ""
            echo "To start services, run: ./scripts/deploy.sh"
            exit 0
        fi
    fi

    check_requirements
    configure_gemini_api
    create_environment
    build_images
    start_services
    mark_setup_complete
    show_completion
}

# Parse arguments
case "${1:-}" in
    --check|-c)
        run_check
        ;;
    --help|-h)
        echo "Vision Smart AI Setup Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --check, -c    Check if setup is complete"
        echo "  --help, -h     Show this help message"
        echo ""
        echo "Without options, runs the interactive setup wizard."
        ;;
    *)
        run_setup
        ;;
esac
