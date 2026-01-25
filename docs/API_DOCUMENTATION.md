# Vision Smart AI - API Documentation

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [Gemini AI](#gemini-ai-endpoints)
  - [Health Check](#health-check-endpoint)
- [Request/Response Examples](#requestresponse-examples)
- [Status Codes](#status-codes)

## Overview

The Vision Smart AI backend provides a RESTful API for user authentication and AI-powered data analysis. All endpoints return JSON responses and use standard HTTP status codes.

**API Version**: 1.0
**Last Updated**: 2025-12-19

## Base URL

### Development
```
http://localhost:3001
```

### Production
```
https://your-domain.com
```

## Authentication

The API uses **JWT (JSON Web Token)** authentication for protected endpoints.

### How to Authenticate

1. **Register** or **Login** to receive a JWT token
2. Include the token in the `Authorization` header for subsequent requests:

```
Authorization: Bearer <your-jwt-token>
```

### Token Lifecycle

- **Expiration**: 7 days (configurable via `JWT_EXPIRES_IN`)
- **Refresh**: Not implemented (tokens expire after 7 days)
- **Logout**: Invalidates token via blacklist

## Rate Limiting

The API implements rate limiting to prevent abuse:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| **General API** | 100 requests | 15 minutes |
| **Authentication** (`/login`) | 5 requests | 15 minutes |
| **Registration** (`/register`) | 3 requests | 1 hour |
| **AI Operations** (`/gemini/*`) | 20 requests | 1 hour |

**Response Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

**Rate Limit Exceeded Response**:
```json
{
  "error": "Too many requests, please try again later."
}
```

## Error Handling

### Error Response Format

All error responses follow this structure:

```json
{
  "error": "Error message",
  "details": [] // Optional, for validation errors
}
```

### Common Error Codes

| Status | Meaning | Example |
|--------|---------|---------|
| `400` | Bad Request | Invalid input, validation failed |
| `401` | Unauthorized | Missing or invalid token |
| `403` | Forbidden | Access denied |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Email already registered |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | Gemini API not configured |

---

## Endpoints

### Authentication Endpoints

#### 1. Get CSRF Token

Get a CSRF token for state-changing operations.

**Endpoint**: `GET /api/auth/csrf-token`
**Authentication**: Not required
**Rate Limit**: General (100/15min)

**Response**:
```json
{
  "csrfToken": "abc123..."
}
```

---

#### 2. Register User

Create a new user account.

**Endpoint**: `POST /api/auth/register`
**Authentication**: Not required
**Rate Limit**: 3 requests per hour per IP

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Validation Rules**:
- `email`: Valid email format
- `password`:
  - Minimum 8 characters (configurable to 12+)
  - Must contain uppercase, lowercase, number, special character
  - Not in common passwords list
- `name`: 2-100 characters

**Success Response** (201 Created):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

400 Bad Request (Validation Failed):
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "minimum": 8,
      "type": "string",
      "message": "Password must be at least 8 characters",
      "path": ["password"]
    }
  ]
}
```

409 Conflict (Email Exists):
```json
{
  "error": "User with this email already exists"
}
```

---

#### 3. Login User

Authenticate and receive a JWT token.

**Endpoint**: `POST /api/auth/login`
**Authentication**: Not required
**Rate Limit**: 5 requests per 15 minutes

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response** (401 Unauthorized):
```json
{
  "error": "Invalid email or password"
}
```

---

#### 4. Logout User

Invalidate the current JWT token.

**Endpoint**: `POST /api/auth/logout`
**Authentication**: **Required** (Bearer token)
**Rate Limit**: General (100/15min)

**Headers**:
```
Authorization: Bearer <your-jwt-token>
```

**Success Response** (200 OK):
```json
{
  "message": "Logout successful"
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "No token provided"
}
```

---

#### 5. Get Current User

Retrieve the authenticated user's information.

**Endpoint**: `GET /api/auth/me`
**Authentication**: **Required** (Bearer token)
**Rate Limit**: General (100/15min)

**Headers**:
```
Authorization: Bearer <your-jwt-token>
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-12-19T10:00:00.000Z",
    "updated_at": "2025-12-19T10:00:00.000Z"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "User not found"
}
```

---

### Gemini AI Endpoints

#### 1. Analyze Data

Send a prompt to Google Gemini AI for analysis.

**Endpoint**: `POST /api/gemini/analyze`
**Authentication**: **Required** (Bearer token)
**Rate Limit**: 20 requests per hour

**Headers**:
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "prompt": "Analyze the following data and provide insights...",
  "context": {
    "dataColumns": ["age", "income", "city"],
    "rowCount": 1000
  },
  "model": "gemini-3",
  "responseMimeType": "application/json",
  "responseSchema": {
    "type": "object",
    "properties": {
      "insights": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    }
  }
}
```

**Request Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | AI prompt (1-10,000 characters) |
| `context` | object | No | Additional context data |
| `model` | string | No | Gemini model (default: "gemini-3") |
| `responseMimeType` | string | No | Expected response type (e.g., "application/json") |
| `responseSchema` | object | No | JSON schema for structured output |

**Success Response** (200 OK):
```json
{
  "success": true,
  "result": "{\"insights\": [\"Insight 1\", \"Insight 2\"]}",
  "model": "gemini-3"
}
```

**Error Responses**:

400 Bad Request (Validation Failed):
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "too_big",
      "maximum": 10000,
      "type": "string",
      "message": "Prompt is too long",
      "path": ["prompt"]
    }
  ]
}
```

503 Service Unavailable (API Key Missing):
```json
{
  "error": "Gemini API is not configured",
  "message": "API key is missing or invalid"
}
```

500 Internal Server Error (API Error):
```json
{
  "error": "Analysis failed",
  "message": "Rate limit exceeded for Gemini API"
}
```

---

### Health Check Endpoint

#### Check Server Health

Verify the backend server is running.

**Endpoint**: `GET /health`
**Authentication**: Not required
**Rate Limit**: General (100/15min)

**Success Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T10:00:00.000Z"
}
```

---

## Request/Response Examples

### Example 1: Complete User Registration Flow

```bash
# 1. Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!",
    "name": "Alice Smith"
  }'

# Response:
{
  "message": "User registered successfully",
  "user": {
    "id": 5,
    "email": "alice@example.com",
    "name": "Alice Smith"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImVtYWlsIjoiYWxpY2VAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDMyNTAwMDAsImV4cCI6MTcwMzg1NDgwMH0.abc123"
}
```

### Example 2: Login and Access Protected Endpoint

```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'

# Save the token from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Get current user info
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "user": {
    "id": 5,
    "email": "alice@example.com",
    "name": "Alice Smith",
    "created_at": "2025-12-19T10:00:00.000Z",
    "updated_at": "2025-12-19T10:00:00.000Z"
  }
}
```

### Example 3: AI Analysis Request

```bash
# Analyze data with Gemini AI
curl -X POST http://localhost:3001/api/gemini/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Suggest 3 analytical questions for a healthcare dataset with columns: patient_id, age, diagnosis, admission_date, discharge_date",
    "model": "gemini-3",
    "responseMimeType": "application/json",
    "responseSchema": {
      "type": "object",
      "properties": {
        "questions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "question": { "type": "string" },
              "feasibility": { "type": "string" },
              "reasoning": { "type": "string" }
            }
          }
        }
      }
    }
  }'

# Response:
{
  "success": true,
  "result": "{\"questions\": [{\"question\": \"What is the average length of stay by diagnosis?\", \"feasibility\": \"High\", \"reasoning\": \"We have admission and discharge dates to calculate stay duration\"}]}",
  "model": "gemini-3"
}
```

### Example 4: Logout

```bash
# Logout and invalidate token
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "message": "Logout successful"
}

# Token is now blacklisted and cannot be used
```

---

## Status Codes

### Success Codes

| Code | Status | Usage |
|------|--------|-------|
| `200` | OK | Successful GET, POST (login, logout) |
| `201` | Created | Successful POST (registration) |

### Client Error Codes

| Code | Status | Usage |
|------|--------|-------|
| `400` | Bad Request | Invalid input, validation errors |
| `401` | Unauthorized | Missing/invalid token, wrong credentials |
| `403` | Forbidden | Access denied (not used currently) |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Email already exists |
| `429` | Too Many Requests | Rate limit exceeded |

### Server Error Codes

| Code | Status | Usage |
|------|--------|-------|
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | External service (Gemini) not configured |

---

## Security Headers

All API responses include the following security headers (via Helmet):

```
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=15552000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer
```

---

## CORS Configuration

**Allowed Origins**:
- Development: `http://localhost:3000`
- Production: Configured via `FRONTEND_URL` environment variable

**Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`
**Allowed Headers**: `Content-Type, Authorization`
**Credentials**: Enabled

---

## Audit Logging

The API logs all security-relevant events:

- **Authentication Events**: Registration, login, logout
- **Authorization Failures**: Invalid tokens, unauthorized access
- **Data Access**: Gemini API calls
- **Security Violations**: Rate limiting, CSRF failures

**Log Retention**: 90 days (configurable)

---

## Testing the API

### Using cURL

See [Request/Response Examples](#requestresponse-examples) above.

### Using Postman

1. Import the endpoints from this documentation
2. Set environment variable `BASE_URL` = `http://localhost:3001`
3. Create a `TOKEN` variable and save it after login
4. Use `{{BASE_URL}}` and `{{TOKEN}}` in requests

### Using the Frontend

The frontend (`apiClient.ts`) automatically handles:
- Token management (localStorage)
- Authorization headers
- Request/response formatting
- Error handling

---

## Environment Variables

Required backend environment variables for API operation:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/vision_smart_ai

# JWT Authentication
JWT_SECRET=your-super-secret-key-min-64-chars
JWT_EXPIRES_IN=7d

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# CORS
FRONTEND_URL=http://localhost:3000
```

---

## Additional Resources

- [Setup Guide](../SETUP.md) - Development setup
- [Security Policy](../SECURITY.md) - Security measures
- [Application Overview](./APPLICATION_OVERVIEW.md) - Architecture
- [Developer Guide](./DEVELOPER_GUIDE.md) - Development workflows

---

**Version**: 1.0
**Last Updated**: 2025-12-19
**Maintained By**: Vision Smart AI Team
