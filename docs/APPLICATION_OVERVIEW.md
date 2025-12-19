# Vision Smart AI - Application Overview

## Table of Contents

- [Introduction](#introduction)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Core Features](#core-features)
- [Data Flow](#data-flow)
- [Component Structure](#component-structure)
- [Security Architecture](#security-architecture)

## Introduction

**Vision Smart AI** is a comprehensive data analytics platform that combines advanced AI capabilities with powerful data visualization and analysis tools. Built with React and TypeScript on the frontend and Express/Node.js on the backend, it provides organizations with intelligent insights from their data through an intuitive interface.

### Key Capabilities

- **AI-Powered Analysis**: Leverage Google Gemini AI for intelligent data insights
- **Multi-Dataset Support**: Analyze single or multiple datasets simultaneously
- **Interactive Dashboards**: Real-time visualizations with Recharts
- **Report Generation**: Create executive-ready reports with charts and insights
- **Secure Authentication**: JWT-based user management with PostgreSQL
- **Data Quality Assessment**: Automated data profiling and quality scoring
- **Advanced Analytics**: Statistical analysis, clustering, forecasting, and more

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              React Application (Vite)                       │ │
│  │  - Components (17 UI components)                            │ │
│  │  - Services (API client, Gemini, Data processing)           │ │
│  │  - State Management (React Hooks + localStorage)            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Express)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Controllers:                                               │ │
│  │  - Auth Controller (register, login, logout)                │ │
│  │  - Gemini Controller (AI proxy)                             │ │
│  │                                                              │ │
│  │  Middleware:                                                 │ │
│  │  - JWT Authentication                                        │ │
│  │  - Rate Limiting                                             │ │
│  │  - Security Headers (Helmet)                                 │ │
│  │  - CORS                                                      │ │
│  │  - CSRF Protection                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                            │
│  - Users Table                                                   │
│  - Token Blacklist                                               │
│  - Audit Logs                                                    │
└─────────────────────────────────────────────────────────────────┘

External Services:
┌─────────────────────────────────────────────────────────────────┐
│                   Google Gemini API                              │
│  - Gemini 2.5 Flash Model                                        │
│  - Structured Output Generation                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Three-Tier Architecture

1. **Presentation Layer (Frontend)**
   - React 18.2 with TypeScript
   - Component-based UI architecture
   - Client-side state management
   - Responsive design with Lucide icons

2. **Application Layer (Backend)**
   - Express.js REST API
   - JWT authentication
   - Rate limiting and security middleware
   - AI service proxy

3. **Data Layer**
   - PostgreSQL 15 for persistent storage
   - Client-side localStorage for drafts/sessions
   - In-memory caching for performance

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2.0 | UI framework |
| **TypeScript** | ~5.8.2 | Type safety |
| **Vite** | ^6.2.0 | Build tool and dev server |
| **Recharts** | 2.12.7 | Data visualization |
| **Lucide React** | 0.263.1 | Icon library |
| **PapaParse** | 5.5.3 | CSV parsing |
| **Reselect** | 4.1.8 | Memoized selectors |
| **@google/genai** | 1.32.0 | Gemini AI SDK |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20+ | Runtime environment |
| **Express** | ^4.18.2 | Web framework |
| **TypeScript** | ^5.3.3 | Type safety |
| **PostgreSQL** | 15 | Database |
| **pg** | ^8.11.3 | PostgreSQL client |
| **jsonwebtoken** | ^9.0.2 | JWT authentication |
| **bcryptjs** | ^2.4.3 | Password hashing |
| **Helmet** | ^7.1.0 | Security headers |
| **CORS** | ^2.8.5 | Cross-origin requests |
| **express-rate-limit** | ^7.1.5 | Rate limiting |
| **Zod** | ^3.22.4 | Input validation |
| **dotenv** | ^16.3.1 | Environment variables |

### DevOps & Deployment

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Nginx** | Reverse proxy and static file serving |
| **GitHub Actions** | CI/CD pipeline |

## Core Features

### 1. Landing & Authentication

- **Landing Page**: Modern UI with feature showcase
- **User Registration**: Email/password signup with validation
- **User Login**: JWT-based authentication
- **Session Management**: Secure token handling with refresh

### 2. Data Upload & Management

- **CSV Upload**: Drag-and-drop or click to upload
- **Multiple Datasets**: Support for multiple files simultaneously
- **Dataset Management**: View, activate, and delete datasets
- **Data Profiling**: Automatic column analysis and type detection

### 3. Smart Analysis

**Introspection Mode**
- AI generates analytical questions based on your data
- Assesses feasibility and required columns
- User answers drive the analysis direction

**Goal Setting**
- AI suggests strategic business goals
- Provides detailed roadmaps for each goal
- Generates recommendations and action items

**AI Diagnostics**
- Analyzes goal feasibility
- Provides deep-dive recommendations
- Creates custom dashboard configurations

### 4. Data Studio

**Data Quality Assessment**
- Automated quality scoring (0-100)
- Missing value detection
- Column profiling and statistics
- Data type inference

**Data Transformation**
- AI-powered transformation suggestions
- Natural language transformation commands
- Column operations (rename, delete, calculate)
- Data cleaning and normalization

**Data Merging**
- Multi-file merge capabilities
- AI-suggested merge strategies
- Join type selection (inner, outer, left, right)
- Preview before applying

### 5. Live Dashboard

- **Real-time Visualizations**: Bar charts, line charts, pie charts, KPIs
- **Interactive Charts**: Hover tooltips, zoom, pan
- **Custom Chart Creation**: Natural language chart requests
- **Chart Explanations**: AI-powered insights for each visualization
- **Export Options**: Download charts as images

### 6. Multi-File Analysis (Deep Dive)

**Statistical Analysis**
- Correlation matrices
- Regression analysis
- T-tests and chi-square tests
- Distribution analysis

**Advanced Analytics**
- K-means clustering
- Time series forecasting
- Pattern detection
- Cross-file insights

**AI Model Advisor**
- Chat-based assistance
- Analysis recommendations
- Parameter tuning suggestions

### 7. Report Generation

**Report Builder**
- Drag-and-drop report items
- Add charts, insights, and text
- AI-generated executive summaries
- Quality review and scoring

**Export Options**
- HTML export with embedded charts
- PDF generation (via print)
- Report history and versioning

### 8. Tree Visualization

- Hierarchical data visualization
- Interactive tree diagrams
- Expandable/collapsible nodes

## Data Flow

### 1. User Authentication Flow

```
User → Login Form → Backend /api/auth/login
                    ↓
             Validate Credentials
                    ↓
             Generate JWT Token
                    ↓
         Store Token in localStorage
                    ↓
         Include in Authorization Header
                    ↓
         Access Protected Routes
```

### 2. Data Upload Flow

```
User Uploads CSV → FileUpload Component
                    ↓
              PapaParse (CSV → JSON)
                    ↓
         Generate Quality Report
                    ↓
         Store in datasets[] State
                    ↓
         Persist to localStorage
                    ↓
         Available for Analysis
```

### 3. AI Analysis Flow

```
User Action → Build AI Prompt
               ↓
       Check Authentication
               ↓
   Authenticated? → Backend /api/gemini/analyze
   Not Auth? → Direct Gemini API (if key set)
               ↓
       Gemini 2.5 Flash Model
               ↓
       Structured JSON Response
               ↓
       Parse & Display Results
               ↓
       Store in State/localStorage
```

### 4. Dashboard Generation Flow

```
Select Goal → AI Analysis
               ↓
       Generate ChartConfig[]
               ↓
       For each chart:
         - Aggregate data
         - Create Recharts component
         - Add AI explanation
               ↓
       Render Live Dashboard
               ↓
       Allow Export/Modify
```

## Component Structure

### Page Components (17 total)

1. **App.tsx** - Main application controller
2. **LandingPage.tsx** - Marketing/welcome page
3. **Login.tsx** - Authentication page
4. **Layout.tsx** - Main app layout with navigation
5. **ModeSelection.tsx** - Feature selection hub
6. **FileUpload.tsx** - CSV upload interface
7. **UploadOverlay.tsx** - Upload modal overlay
8. **SmartAnalysisWrapper.tsx** - Smart analysis orchestrator
9. **Introspection.tsx** - Introspection mode
10. **GoalSetting.tsx** - Goal selection and roadmap
11. **AIDiagnostics.tsx** - AI diagnostic analysis
12. **Dashboard.tsx** - Main dashboard (legacy)
13. **LiveDashboard.tsx** - Dynamic chart dashboard
14. **DataStudio.tsx** - Data transformation workspace
15. **DataQuality.tsx** - Quality assessment view
16. **MultiFileAnalysis.tsx** - Advanced analytics
17. **ReportGen.tsx** - Report generation
18. **TreeVisualizer.tsx** - Hierarchical tree view

### Service Modules

1. **apiClient.ts** - Backend API client with JWT handling
2. **dataService.ts** - Data processing and transformation logic
3. **geminiService.ts** - AI service integration (58KB, 1400+ lines)

### Type Definitions (types.ts)

- 20+ TypeScript interfaces
- Strong typing for all data structures
- Ensures type safety across the application

## Security Architecture

### Authentication & Authorization

- **JWT Tokens**: Signed with HS256 algorithm
- **Token Expiration**: 7 days default
- **Token Blacklist**: Invalidated tokens on logout
- **Password Hashing**: bcrypt with 10 salt rounds
- **Password Policy**: Minimum 8 characters (configurable to 12+)

### API Security

- **Rate Limiting**:
  - General: 100 req/15min
  - Auth: 5 req/15min
  - AI Operations: 20 req/hour
- **CORS**: Restricted to frontend domain
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **Input Validation**: Zod schemas on backend
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization

### Data Security

- **Environment Variables**: API keys never in code
- **Backend Proxy**: Gemini API key only on server
- **localStorage**: Only for non-sensitive data
- **Audit Logging**: All security events logged
- **HTTPS**: Required in production

### Deployment Security

- **Docker**: Containerized services
- **Multi-stage Builds**: Minimal attack surface
- **Alpine Base Images**: Small, secure images
- **Network Isolation**: Docker network segmentation

## Performance Optimizations

### Frontend

- **Code Splitting**: Vite-based lazy loading
- **Memoization**: Reselect for expensive computations
- **Virtual Scrolling**: Large dataset handling
- **localStorage Caching**: Persistent sessions

### Backend

- **Connection Pooling**: PostgreSQL connections
- **Rate Limiting**: Prevent abuse
- **Caching**: In-memory caching for frequent queries
- **Async/Await**: Non-blocking I/O

### AI Integration

- **Gemini 2.5 Flash**: Fast, efficient model
- **Structured Output**: Type-safe JSON responses
- **Batch Processing**: Multiple analyses in parallel
- **Error Handling**: Graceful fallbacks to mock data

## Deployment Modes

### 1. Local Development

- Frontend: `npm run dev` (Vite dev server)
- Backend: `cd backend && npm run dev` (tsx watch)
- Database: `docker-compose up -d` (PostgreSQL)

### 2. Docker Development

- Full stack: `./scripts/deploy.sh`
- All services containerized
- Hot reload enabled

### 3. Production

- Built frontend: `npm run build` → Nginx
- Compiled backend: `npm run build` → Node.js
- Managed PostgreSQL: AWS RDS, DigitalOcean, etc.
- HTTPS with SSL certificates
- CDN for static assets

## Future Enhancements

### Planned Features

- **Collaborative Workspaces**: Multi-user sessions
- **Dataset Persistence**: Save datasets to database
- **Real-time Collaboration**: WebSocket support
- **Advanced ML Models**: Custom model training
- **API Webhooks**: External integrations
- **Mobile App**: React Native version
- **Data Connectors**: Direct database/API connections
- **Scheduled Reports**: Automated report generation
- **Role-Based Access Control**: Fine-grained permissions

## Documentation Index

- [Setup Guide](../SETUP.md) - Complete development setup
- [Docker Guide](../DOCKER.md) - Docker deployment
- [Gemini Setup](../GEMINI_SETUP.md) - AI configuration
- [Security Policy](../SECURITY.md) - Security measures
- [API Documentation](./API_DOCUMENTATION.md) - API reference
- [Developer Guide](./DEVELOPER_GUIDE.md) - Development workflows
- [Features Guide](./FEATURES.md) - Detailed feature documentation

---

**Version**: 1.0
**Last Updated**: 2025-12-19
**Maintained By**: Vision Smart AI Team
