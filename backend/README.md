# Vision Smart AI - Backend Service

Backend API service for Vision Smart AI, providing authentication, user management, and Gemini API proxy functionality.

## Features

- **JWT-based Authentication**: Secure user authentication with token management
- **User Management**: Registration, login, logout endpoints
- **Gemini API Proxy**: Secure proxy to Google Gemini API
- **PostgreSQL Database**: User data persistence
- **Security**: CORS, Helmet, Rate Limiting
- **TypeScript**: Full type safety

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for PostgreSQL)
- Gemini API key

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start PostgreSQL Database

```bash
# From the project root
docker-compose up -d
```

This will start PostgreSQL on port 5432.

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/vision_smart_ai
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

### 4. Run Database Migrations

```bash
npm run db:migrate
```

This creates the necessary database tables.

### 5. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)

### Gemini API

- `POST /api/gemini/analyze` - Analyze data with Gemini AI (requires auth)

### Health Check

- `GET /health` - Health check endpoint

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

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database and configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Authentication middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions (JWT, etc.)
│   └── server.ts        # Express server setup
├── .env.example         # Environment variables template
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript configuration
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Restricted to frontend domain
- **Rate Limiting**: 100 requests per 15 minutes
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **Token Blacklist**: Logout invalidates tokens

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper `DATABASE_URL`
4. Set appropriate `FRONTEND_URL`
5. Use environment-specific `.env` file
6. Build the project: `npm run build`
7. Start: `npm start`

## Troubleshooting

### Database Connection Error

Ensure PostgreSQL is running:
```bash
docker-compose ps
```

If not running, start it:
```bash
docker-compose up -d
```

### Port Already in Use

Change the `PORT` in `.env` file or kill the process using port 3001.

### Gemini API Errors

Verify your `GEMINI_API_KEY` is correct in the `.env` file.
