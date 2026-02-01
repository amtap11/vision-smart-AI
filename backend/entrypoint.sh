#!/bin/sh

# ============================================
# Vision Smart AI Backend Entrypoint
# ============================================
# This script runs before the backend starts to:
# 1. Validate Gemini 3 API key is configured
# 2. Run database migrations
# 3. Start the server

set -e

echo "=========================================="
echo "Vision Smart AI Backend - Starting"
echo "=========================================="

# Function to log messages
log_info() {
    echo "[INFO] $1"
}

log_error() {
    echo "[ERROR] $1" >&2
}

log_success() {
    echo "[OK] $1"
}

# Step 1: Validate Gemini API Key
log_info "Validating Gemini 3 API configuration..."

if [ -z "$GEMINI_API_KEY" ]; then
    log_error "GEMINI_API_KEY environment variable is not set!"
    log_error "Please set your Gemini API key in the environment."
    log_error "Get your API key from: https://aistudio.google.com/apikey"
    exit 1
fi

if [ "$GEMINI_API_KEY" = "your_gemini_api_key_here" ]; then
    log_error "GEMINI_API_KEY is set to placeholder value!"
    log_error "Please update with your actual Gemini API key."
    log_error "Get your API key from: https://aistudio.google.com/apikey"
    exit 1
fi

# Validate API key format (basic check)
key_length=${#GEMINI_API_KEY}
if [ "$key_length" -lt 30 ]; then
    log_error "GEMINI_API_KEY appears to be invalid (too short)."
    log_error "Please check your API key and try again."
    exit 1
fi

log_success "Gemini 3 API key configured (${key_length} chars)"

# Step 2: Validate other required environment variables
log_info "Checking required environment variables..."

if [ -z "$JWT_SECRET" ]; then
    log_error "JWT_SECRET environment variable is not set!"
    exit 1
fi

jwt_length=${#JWT_SECRET}
if [ "$jwt_length" -lt 32 ]; then
    log_error "JWT_SECRET is too short (minimum 32 characters required)."
    exit 1
fi

log_success "JWT_SECRET configured (${jwt_length} chars)"

if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL environment variable is not set!"
    exit 1
fi

log_success "DATABASE_URL configured"

# Step 3: Wait for database to be ready
log_info "Waiting for database connection..."

# Extract host and port from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
    max_attempts=30
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            log_success "Database is reachable at $DB_HOST:$DB_PORT"
            break
        fi
        attempt=$((attempt + 1))
        log_info "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
    done

    if [ $attempt -eq $max_attempts ]; then
        log_error "Could not connect to database after $max_attempts attempts"
        exit 1
    fi
fi

# Step 4: Run database migrations
log_info "Running database migrations..."

if npm run db:migrate; then
    log_success "Database migrations completed"
else
    log_error "Database migration failed!"
    exit 1
fi

# Step 5: Start the server
echo ""
echo "=========================================="
echo "Starting Vision Smart AI Backend Server"
echo "=========================================="
echo "  Gemini Model: gemini-3"
echo "  Port: ${PORT:-3001}"
echo "  Environment: ${NODE_ENV:-development}"
echo "=========================================="
echo ""

# Execute the main command
exec node dist/server.js
