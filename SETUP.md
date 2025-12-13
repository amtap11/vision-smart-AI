# Vision Smart AI - Complete Setup Guide

This guide will walk you through setting up the complete Vision Smart AI platform with backend authentication and secure API integration.

## Architecture Overview

**Before Phase 1:**
- 100% client-side React application
- Hardcoded credentials
- Direct Gemini API calls from frontend
- No database, only localStorage

**After Phase 1:**
- Full-stack application (React + Express)
- JWT-based authentication with PostgreSQL database
- Secure Gemini API proxy through backend
- Token blacklist for logout functionality
- CORS, Helmet, and Rate Limiting security

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Project Structure

```
vision-smart-AI/
├── backend/                # Express backend service
│   ├── src/
│   │   ├── config/        # Database configuration
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Authentication middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Utilities (JWT, etc.)
│   │   └── server.ts      # Express server
│   ├── package.json
│   └── tsconfig.json
├── components/            # React components
├── services/             # API clients and services
├── docker-compose.yml    # PostgreSQL setup
└── package.json          # Frontend dependencies
```

## Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Start PostgreSQL Database

```bash
# Start PostgreSQL using Docker Compose
docker-compose up -d

# Verify it's running
docker-compose ps
```

This creates a PostgreSQL database:
- **Database name:** vision_smart_ai
- **User:** postgres
- **Password:** password
- **Port:** 5432

### 3. Configure Backend Environment

Create `backend/.env` file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/vision_smart_ai
GEMINI_API_KEY=your_actual_gemini_api_key_here
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

**Important:** Replace `GEMINI_API_KEY` with your actual API key.

### 4. Configure Frontend Environment

Create `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
VITE_API_URL=http://localhost:3001
```

### 5. Run Database Migrations

```bash
cd backend
npm run db:migrate
cd ..
```

This creates the necessary database tables:
- **users** - User accounts
- **token_blacklist** - Invalidated JWT tokens

### 6. Start the Application

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Backend will start on: `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Frontend will start on: `http://localhost:3000`

### 7. Access the Application

1. Open your browser to: `http://localhost:3000`
2. Click **"Sign In"** on the landing page
3. Click **"Need an account? Register"**
4. Create your account with:
   - Full Name
   - Email
   - Password (minimum 8 characters)
5. You'll be automatically logged in after registration

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)

### Gemini AI
- `POST /api/gemini/analyze` - Analyze data (requires auth)

### Health Check
- `GET /health` - Server health status

## Security Features Implemented

### ✅ Backend Security
- **Helmet:** Secure HTTP headers
- **CORS:** Restricted to frontend domain only
- **Rate Limiting:** 100 requests per 15 minutes per IP
- **Password Hashing:** bcryptjs with 10 salt rounds
- **JWT Tokens:** Secure token-based authentication
- **Token Blacklist:** Logout invalidates tokens
- **Environment Variables:** Secrets not in code

### ✅ Frontend Security
- **No Hardcoded Credentials:** All removed
- **Token Management:** Stored securely in localStorage
- **API Proxy:** No direct Gemini API exposure
- **Input Validation:** Email, password requirements

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Token Blacklist Table
```sql
CREATE TABLE token_blacklist (
  id SERIAL PRIMARY KEY,
  token VARCHAR(500) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### Database Connection Issues

**Problem:** Cannot connect to PostgreSQL

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# If not running, start it
docker-compose up -d

# Check logs
docker-compose logs postgres
```

### Port Already in Use

**Problem:** Port 3000 or 3001 is already in use

**Solution:**
```bash
# Find and kill the process
# On macOS/Linux:
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Gemini API Errors

**Problem:** API requests fail with 503 error

**Solution:**
- Verify `GEMINI_API_KEY` in `backend/.env`
- Check API key is valid
- Ensure you have API quota remaining

### CORS Errors

**Problem:** Frontend can't connect to backend

**Solution:**
- Verify `FRONTEND_URL` in `backend/.env` matches your frontend URL
- Ensure both servers are running
- Check `VITE_API_URL` in frontend `.env.local`

### Authentication Errors

**Problem:** Can't login after registration

**Solution:**
```bash
# Check backend logs for errors
cd backend
npm run dev

# Verify database is accessible
docker-compose logs postgres
```

## Production Deployment Checklist

Before deploying to production:

### Backend
- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique `JWT_SECRET` (minimum 32 characters)
- [ ] Configure production `DATABASE_URL`
- [ ] Set appropriate `FRONTEND_URL`
- [ ] Enable SSL/HTTPS
- [ ] Set up database backups
- [ ] Configure proper logging
- [ ] Set up monitoring (e.g., Sentry, DataDog)

### Frontend
- [ ] Update `VITE_API_URL` to production backend
- [ ] Build for production: `npm run build`
- [ ] Serve from CDN (e.g., Vercel, Netlify)
- [ ] Enable HTTPS
- [ ] Configure proper CSP headers

### Database
- [ ] Use managed PostgreSQL (e.g., AWS RDS, DigitalOcean)
- [ ] Enable automated backups
- [ ] Set up connection pooling
- [ ] Configure SSL connections
- [ ] Set up monitoring and alerts

### Security
- [ ] Run security audit: `npm audit`
- [ ] Update all dependencies
- [ ] Configure firewall rules
- [ ] Set up DDoS protection
- [ ] Enable request logging
- [ ] Configure rate limiting for production load

## Testing the Setup

### 1. Test Registration
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'
```

### 2. Test Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### 3. Test Protected Endpoint
```bash
# Replace YOUR_TOKEN with the token from login response
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## What's Next? (Future Phases)

Phase 1 is complete! Future enhancements could include:

- **Phase 2:** User workspaces and dataset persistence
- **Phase 3:** Collaborative features and sharing
- **Phase 4:** Advanced analytics and ML model training
- **Phase 5:** Real-time collaboration and notifications

## Support

For issues or questions:
1. Check this documentation
2. Review backend logs: `cd backend && npm run dev`
3. Check database: `docker-compose logs postgres`
4. Verify environment variables are set correctly

## Summary of Phase 1 Changes

### ✅ Created
- Express backend service with TypeScript
- PostgreSQL database with Docker Compose
- User authentication (register, login, logout)
- JWT token management with blacklist
- Gemini API proxy endpoint
- CORS, Helmet, and Rate Limiting security
- API client service for frontend
- Complete environment variable configuration

### ✅ Refactored
- Login.tsx - Now uses backend authentication
- App.tsx - Token-based session management
- Removed hardcoded credentials
- Secure API key storage in backend

### ✅ Security Improvements
- No credentials in code
- API keys on backend only
- Password hashing with bcrypt
- JWT authentication
- Token invalidation on logout
- Rate limiting
- CORS restrictions
- Security headers with Helmet

You're now running a production-ready foundation for Vision Smart AI! 🚀
