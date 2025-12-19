# Vision Smart AI - Developer Guide

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Component Development](#component-development)
- [State Management](#state-management)
- [Adding New Features](#adding-new-features)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **npm**: 9+ (comes with Node.js)
- **Docker**: 20.10+ (for PostgreSQL)
- **Docker Compose**: 2.0+
- **Git**: 2.30+
- **Code Editor**: VS Code recommended

### VS Code Extensions (Recommended)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/vision-smart-ai.git
   cd vision-smart-ai
   ```

2. **Install dependencies**:
   ```bash
   # Frontend
   npm install

   # Backend
   cd backend
   npm install
   cd ..
   ```

3. **Start PostgreSQL**:
   ```bash
   docker-compose up -d
   ```

4. **Configure environment variables**:
   ```bash
   # Frontend
   cp .env.local.example .env.local
   # Edit .env.local and add your GEMINI_API_KEY

   # Backend
   cd backend
   cp .env.example .env
   # Edit backend/.env with DATABASE_URL, GEMINI_API_KEY, JWT_SECRET
   cd ..
   ```

5. **Run database migrations**:
   ```bash
   cd backend
   npm run db:migrate
   cd ..
   ```

6. **Start development servers**:
   ```bash
   # Terminal 1 - Frontend
   npm run dev

   # Terminal 2 - Backend
   cd backend
   npm run dev
   ```

7. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## Development Workflow

### Daily Development

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
npm install
cd backend && npm install && cd ..

# 3. Start services
docker-compose up -d  # PostgreSQL
npm run dev           # Frontend (Terminal 1)
cd backend && npm run dev  # Backend (Terminal 2)

# 4. Make changes, test, commit
git add .
git commit -m "feat: description of changes"
git push origin feature-branch
```

### Git Workflow

We follow **Git Flow** with the following branches:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Production hotfixes

**Creating a feature branch**:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
# Make changes
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
# Create pull request on GitHub
```

### Commit Message Convention

We use **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, tooling, dependencies

**Examples**:
```bash
git commit -m "feat(auth): add password reset functionality"
git commit -m "fix(dashboard): correct chart rendering issue"
git commit -m "docs(api): update endpoint documentation"
```

## Project Structure

```
vision-smart-AI/
├── backend/                    # Backend Express server
│   ├── src/
│   │   ├── config/            # Database, environment config
│   │   │   ├── database.ts    # PostgreSQL connection
│   │   │   └── migrate.ts     # Database migrations
│   │   ├── controllers/       # Request handlers
│   │   │   ├── authController.ts
│   │   │   └── geminiController.ts
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.ts        # JWT verification
│   │   │   ├── csrf.ts        # CSRF protection
│   │   │   ├── rateLimiting.ts
│   │   │   └── securityHeaders.ts
│   │   ├── models/            # Database models
│   │   │   └── User.ts
│   │   ├── routes/            # API routes
│   │   │   ├── authRoutes.ts
│   │   │   └── geminiRoutes.ts
│   │   ├── scripts/           # Utility scripts
│   │   │   ├── addUser.ts
│   │   │   ├── checkUser.ts
│   │   │   ├── resetPassword.ts
│   │   │   └── verifyPassword.ts
│   │   ├── utils/             # Helper functions
│   │   │   ├── auditLogger.ts
│   │   │   ├── jwt.ts
│   │   │   ├── passwordPolicy.ts
│   │   │   └── sanitization.ts
│   │   └── server.ts          # Express app entry point
│   ├── .env.example           # Environment template
│   ├── package.json
│   └── tsconfig.json
├── components/                 # React components
│   ├── AIDiagnostics.tsx      # AI diagnostic analysis
│   ├── Dashboard.tsx          # Main dashboard (legacy)
│   ├── DataQuality.tsx        # Data quality view
│   ├── DataStudio.tsx         # Data transformation
│   ├── FileUpload.tsx         # CSV upload
│   ├── GoalSetting.tsx        # Goal selection
│   ├── Introspection.tsx      # Introspection mode
│   ├── LandingPage.tsx        # Marketing page
│   ├── Layout.tsx             # App layout
│   ├── LiveDashboard.tsx      # Dynamic dashboard
│   ├── Login.tsx              # Authentication
│   ├── ModeSelection.tsx      # Feature hub
│   ├── MultiFileAnalysis.tsx # Advanced analytics
│   ├── ReportGen.tsx          # Report generation
│   ├── SmartAnalysisWrapper.tsx
│   ├── TreeVisualizer.tsx     # Tree visualization
│   └── UploadOverlay.tsx      # Upload modal
├── services/                   # Frontend services
│   ├── apiClient.ts           # Backend API client
│   ├── dataService.ts         # Data processing
│   └── geminiService.ts       # AI integration
├── docs/                       # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── APPLICATION_OVERVIEW.md
│   ├── DEVELOPER_GUIDE.md (this file)
│   ├── FEATURES.md
│   ├── INCIDENT_RESPONSE_PLAN.md
│   └── SECURITY_CHECKLIST.md
├── scripts/                    # DevOps scripts
│   ├── build.sh               # Build Docker images
│   ├── deploy.sh              # Deploy with Docker
│   └── push.sh                # Push to registry
├── App.tsx                     # Main React app
├── index.tsx                   # React entry point
├── types.ts                    # TypeScript types
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript config
├── package.json               # Frontend dependencies
├── docker-compose.yml         # Multi-container setup
├── Dockerfile                 # Frontend Docker image
└── README.md                  # Main documentation
```

## Coding Standards

### TypeScript

- **Always use TypeScript** - No `.js` files
- **Define types** for all data structures
- **Use interfaces** over `type` for object shapes
- **Avoid `any`** - Use `unknown` if type is truly unknown
- **Enable strict mode** in `tsconfig.json`

**Good**:
```typescript
interface UserData {
  id: number;
  email: string;
  name: string;
}

function getUser(id: number): Promise<UserData> {
  // Implementation
}
```

**Bad**:
```typescript
function getUser(id: any): any {
  // Avoid this
}
```

### React Components

- **Use functional components** with hooks
- **Use TypeScript** for props and state
- **Name components** with PascalCase
- **One component per file** (unless related small components)
- **Props interface** should be named `ComponentNameProps`

**Example**:
```typescript
interface DashboardProps {
  data: Dataset[];
  onChartClick: (chartId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onChartClick }) => {
  const [loading, setLoading] = useState(false);

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

export default Dashboard;
```

### State Management

- **useState** for component-local state
- **useEffect** for side effects
- **useCallback** for memoized functions
- **useMemo** for expensive computations
- **localStorage** for persistence (not sensitive data)
- **No global state library** (Redux, Zustand) - use React Context if needed

### File Naming

- **Components**: `PascalCase.tsx` (e.g., `DataStudio.tsx`)
- **Services**: `camelCase.ts` (e.g., `geminiService.ts`)
- **Utils**: `camelCase.ts` (e.g., `sanitization.ts`)
- **Types**: `types.ts` or `ComponentName.types.ts`

### Code Formatting

We use **Prettier** with these settings:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

## Component Development

### Creating a New Component

1. **Create the file** in `components/`:
   ```bash
   touch components/MyNewComponent.tsx
   ```

2. **Basic structure**:
   ```typescript
   import React, { useState, useEffect } from 'react';

   interface MyNewComponentProps {
     title: string;
     data: any[];
     onAction: (id: string) => void;
   }

   const MyNewComponent: React.FC<MyNewComponentProps> = ({
     title,
     data,
     onAction
   }) => {
     const [isLoading, setIsLoading] = useState(false);

     useEffect(() => {
       // Side effects
     }, []);

     return (
       <div className="container">
         <h2>{title}</h2>
         {/* Component content */}
       </div>
     );
   };

   export default MyNewComponent;
   ```

3. **Import in App.tsx**:
   ```typescript
   import MyNewComponent from './components/MyNewComponent';
   ```

### Component Best Practices

- **Keep components small** - Max 300 lines
- **Extract logic** to custom hooks or services
- **Use prop destructuring**
- **Memoize expensive calculations** with `useMemo`
- **Avoid inline functions** in JSX (use `useCallback`)

## State Management

### App-Level State (App.tsx)

Located in `App.tsx`, manages:
- User authentication (`user`, `setUser`)
- Datasets (`datasets`, `setDatasets`)
- Active dataset (`activeDatasetId`)
- Report items (`reportItems`)
- Navigation (`appStage`)

**Example**:
```typescript
const [datasets, setDatasets] = useState<Dataset[]>([]);
const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
```

### Local Storage Persistence

Save state to localStorage for session persistence:

```typescript
// Save
useEffect(() => {
  localStorage.setItem('vision_datasets_full', JSON.stringify(datasets));
}, [datasets]);

// Load
useEffect(() => {
  const saved = localStorage.getItem('vision_datasets_full');
  if (saved) {
    setDatasets(JSON.parse(saved));
  }
}, []);
```

### Passing State Down

Use **props drilling** or **callbacks**:

```typescript
// App.tsx
<DataStudio
  datasets={datasets}
  activeDatasetId={activeDatasetId}
  onDatasetUpdate={(newData) => {
    // Update state
  }}
/>
```

## Adding New Features

### Feature Checklist

- [ ] Define TypeScript types in `types.ts`
- [ ] Create component in `components/`
- [ ] Add service logic if needed in `services/`
- [ ] Update `App.tsx` with state and routing
- [ ] Test locally
- [ ] Add documentation
- [ ] Create pull request

### Example: Adding a New Analysis Feature

1. **Define types** (`types.ts`):
   ```typescript
   export interface CorrelationAnalysis {
     column1: string;
     column2: string;
     coefficient: number;
     pValue: number;
   }
   ```

2. **Create service** (`services/analysisService.ts`):
   ```typescript
   export function calculateCorrelation(
     data: PatientRecord[],
     col1: string,
     col2: string
   ): CorrelationAnalysis {
     // Implementation
   }
   ```

3. **Create component** (`components/CorrelationView.tsx`):
   ```typescript
   import { CorrelationAnalysis } from '../types';
   import { calculateCorrelation } from '../services/analysisService';

   const CorrelationView: React.FC<Props> = () => {
     // Component logic
   };
   ```

4. **Add to App.tsx**:
   ```typescript
   import CorrelationView from './components/CorrelationView';

   // In render:
   {appStage === AppStage.CORRELATION && (
     <CorrelationView data={activeDataset.data} />
   )}
   ```

## Testing

### Manual Testing Checklist

Before committing:
- [ ] Frontend builds without errors: `npm run build`
- [ ] Backend compiles: `cd backend && npm run build`
- [ ] No TypeScript errors
- [ ] Test in browser (Chrome, Firefox, Safari)
- [ ] Test all user flows
- [ ] Check console for errors
- [ ] Test with different datasets

### Testing User Flows

1. **Authentication**:
   - Register new user
   - Login with credentials
   - Access protected features
   - Logout

2. **Data Upload**:
   - Upload CSV file
   - Check data quality report
   - Switch between datasets

3. **Smart Analysis**:
   - Generate introspection questions
   - Answer questions
   - Get goal suggestions
   - Create dashboard

4. **Report Generation**:
   - Add items to report
   - Generate HTML report
   - Export report

## Debugging

### Frontend Debugging

**Browser DevTools**:
- **Console**: Check for errors and logs
- **Network**: Inspect API calls
- **Application > Local Storage**: View cached data
- **React DevTools**: Inspect component hierarchy

**Common Issues**:
```typescript
// Enable verbose logging
localStorage.setItem('debug', 'true');

// Check state
console.log('Current state:', { datasets, activeDatasetId });

// Check API responses
console.log('API response:', response);
```

### Backend Debugging

**Server logs**:
```bash
cd backend
npm run dev
# Check console output for errors
```

**Database queries**:
```typescript
// Add logging to queries
console.log('Executing query:', query);
const result = await pool.query(query);
console.log('Result:', result.rows);
```

**API testing**:
```bash
# Test endpoints with curl
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Common Tasks

### Add a New API Endpoint

1. **Define route** (`backend/src/routes/newRoute.ts`):
   ```typescript
   import { Router } from 'express';
   import { myHandler } from '../controllers/myController';
   import { authenticate } from '../middleware/auth';

   const router = Router();
   router.post('/my-endpoint', authenticate, myHandler);
   export default router;
   ```

2. **Create controller** (`backend/src/controllers/myController.ts`):
   ```typescript
   import { Response } from 'express';
   import { AuthRequest } from '../middleware/auth';

   export async function myHandler(req: AuthRequest, res: Response) {
     try {
       // Implementation
       res.json({ success: true });
     } catch (error) {
       res.status(500).json({ error: 'Failed' });
     }
   }
   ```

3. **Register route** (`backend/src/server.ts`):
   ```typescript
   import newRoutes from './routes/newRoute';
   app.use('/api/new', newRoutes);
   ```

### Add a New Database Table

1. **Create migration** (`backend/src/config/migrate.ts`):
   ```typescript
   const createTableQuery = `
     CREATE TABLE IF NOT EXISTS my_table (
       id SERIAL PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
   `;
   await client.query(createTableQuery);
   ```

2. **Create model** (`backend/src/models/MyModel.ts`):
   ```typescript
   import { pool } from '../config/database';

   export class MyModel {
     static async create(data: any) {
       const query = 'INSERT INTO my_table (name) VALUES ($1) RETURNING *';
       const result = await pool.query(query, [data.name]);
       return result.rows[0];
     }
   }
   ```

### Add Gemini AI Feature

1. **Update `geminiService.ts`**:
   ```typescript
   export async function myNewAIFeature(data: any[]): Promise<MyResult> {
     const prompt = `Analyze this data: ${JSON.stringify(data)}`;

     const schema = {
       type: Type.OBJECT,
       properties: {
         insights: { type: Type.ARRAY, items: { type: Type.STRING } }
       }
     };

     return await callGemini(prompt, schema);
   }
   ```

2. **Use in component**:
   ```typescript
   import { myNewAIFeature } from '../services/geminiService';

   const result = await myNewAIFeature(data);
   console.log(result.insights);
   ```

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port 3000 or 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Or change port in .env
PORT=3002
```

### Issue: Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Issue: TypeScript Errors After Pull

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Issue: Gemini API Not Working

1. Check API key in `.env.local` and `backend/.env`
2. Verify API key is valid at https://makersuite.google.com/app/apikey
3. Check rate limits
4. Check console for error messages

### Issue: Build Fails

```bash
# Clear cache
rm -rf dist
rm -rf .vite

# Rebuild
npm run build
```

---

## Additional Resources

- [Setup Guide](../SETUP.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Features Guide](./FEATURES.md)
- [Security Policy](../SECURITY.md)

---

**Happy Coding! 🚀**

**Version**: 1.0
**Last Updated**: 2025-12-19
