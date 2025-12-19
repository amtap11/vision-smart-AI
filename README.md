<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Vision Smart AI - Intelligent Data Analytics Platform

**Vision Smart AI** is a comprehensive, AI-powered data analytics platform that transforms raw CSV data into actionable insights. Built with React, TypeScript, and Google Gemini AI, it provides an intuitive interface for data exploration, visualization, and reporting.

🔗 **View in AI Studio**: https://ai.studio/apps/drive/180frbSHAVqfWljF59mLh7GD7l6agIQLM

## ✨ Key Features

- 🤖 **AI-Powered Analysis** - Leverage Google Gemini 2.5 Flash for intelligent insights
- 📊 **Interactive Dashboards** - Dynamic visualizations with Recharts (bar, line, pie, KPI, scatter)
- 🔍 **Smart Analysis** - Introspection, goal setting, and AI-driven recommendations
- 🛠️ **Data Studio** - Quality assessment, transformations, and multi-file merging
- 📈 **Advanced Analytics** - Correlation, regression, clustering, time series forecasting
- 📝 **Report Generation** - Executive-ready reports with AI-generated summaries
- 🔐 **Secure Authentication** - JWT-based user management with PostgreSQL
- 🐳 **Docker Ready** - Complete containerized deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for full stack deployment)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Run Locally (Frontend Only)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set your Gemini API key** in `.env.local`:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add GEMINI_API_KEY=your_key_here
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Access the app**: http://localhost:3000

### Run Full Stack (Frontend + Backend + Database)

For complete authentication and backend API features:

1. **Install all dependencies**:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

2. **Start PostgreSQL database**:
   ```bash
   docker-compose up -d
   ```

3. **Configure backend environment**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit backend/.env with DATABASE_URL, GEMINI_API_KEY, JWT_SECRET
   npm run db:migrate  # Run database migrations
   cd ..
   ```

4. **Start both servers**:
   ```bash
   # Terminal 1 - Frontend
   npm run dev

   # Terminal 2 - Backend
   cd backend && npm run dev
   ```

5. **Access the app**: http://localhost:3000

See [SETUP.md](SETUP.md) for detailed setup instructions.

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

## 🎯 Feature Overview

### 🔐 Authentication & User Management
- Secure JWT-based authentication
- User registration and login
- Session management with token blacklisting
- Password policy enforcement

### 📤 Data Upload & Management
- Drag-and-drop CSV file upload
- Multiple dataset support
- Automatic data profiling and quality scoring
- Dataset management (view, switch, delete)

### 🧠 Smart Analysis
**Introspection Mode**: AI generates relevant analytical questions based on your data structure
- Automatic question generation with feasibility assessment
- Answer questions to guide analysis direction

**Goal Setting**: Define strategic objectives with AI assistance
- AI-suggested goals based on your data
- Step-by-step roadmaps for each goal
- Actionable recommendations with impact ratings

**AI Diagnostics**: Deep-dive analysis of recommendations and insights

### 🛠️ Data Studio
**Data Quality Assessment**
- Automated quality scoring (0-100)
- Column profiling (types, missing values, unique counts)
- Issue identification and recommendations

**Data Transformation**
- AI-powered transformation suggestions
- Natural language transformation commands
- Manual operations (rename, delete, calculate, filter)
- Fill missing values, remove duplicates, normalize data

**Data Merging**
- AI-suggested merge strategies
- Multiple join types (inner, outer, left, right)
- Preview before applying

### 📊 Live Dashboard
- Dynamic visualizations: bar charts, line charts, pie charts, KPIs, scatter plots
- AI-generated chart explanations
- Interactive charts with tooltips and zoom
- Natural language chart requests
- Export charts as images

### 📈 Multi-File Analysis (Deep Dive)
**Statistical Analysis**
- Correlation matrices
- Linear regression analysis
- Hypothesis testing (t-tests, chi-square)
- Distribution analysis

**Advanced Analytics**
- K-means clustering with optimal K suggestion
- Time series forecasting
- Pattern detection across datasets
- AI Model Advisor chat assistant

### 📝 Report Generation
- Build comprehensive reports with charts and insights
- AI-generated executive summaries
- Quality review and scoring
- Export as HTML (print to PDF)
- Report history and versioning

### 🌳 Tree Visualization
- Hierarchical data visualization
- Interactive expandable/collapsible nodes
- Auto-layout with zoom and pan

## 🏗️ Technology Stack

**Frontend**
- React 18.2 with TypeScript
- Vite (build tool)
- Recharts (data visualization)
- Lucide React (icons)
- PapaParse (CSV parsing)

**Backend**
- Node.js 20+ with Express
- TypeScript
- PostgreSQL 15 (database)
- JWT authentication
- bcrypt (password hashing)
- Helmet, CORS, rate limiting (security)

**AI Integration**
- Google Gemini 2.5 Flash
- Structured JSON output
- Context-aware analysis

**DevOps**
- Docker & Docker Compose
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)

## 📚 Documentation

### Getting Started
- [Setup Guide](SETUP.md) - Complete development environment setup
- [Docker Deployment Guide](DOCKER.md) - Containerized deployment with Docker Compose
- [Gemini API Setup](GEMINI_SETUP.md) - Configure Google Gemini AI integration

### Architecture & Development
- [Application Overview](docs/APPLICATION_OVERVIEW.md) - Architecture, tech stack, and system design
- [Developer Guide](docs/DEVELOPER_GUIDE.md) - Development workflows, coding standards, and best practices
- [API Documentation](docs/API_DOCUMENTATION.md) - Complete REST API reference

### Features & Security
- [Features Guide](docs/FEATURES.md) - Detailed feature documentation and usage
- [Security Policy](SECURITY.md) - Security measures and vulnerability reporting
- [Security Checklist](docs/SECURITY_CHECKLIST.md) - Security audit checklist
- [Incident Response Plan](docs/INCIDENT_RESPONSE_PLAN.md) - Security incident procedures

### Additional Resources
- [Scripts Documentation](scripts/README.md) - Docker utility scripts reference
- [Backend Documentation](backend/README.md) - Backend service documentation
