import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import geminiRoutes from './routes/geminiRoutes';
import { cleanupExpiredTokens } from './utils/jwt';
import { cleanupOldAuditLogs } from './utils/auditLogger';
import { securityHeadersMiddleware, additionalSecurityHeaders } from './middleware/securityHeaders';
import { generalLimiter } from './middleware/rateLimiting';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Trust proxy - important for rate limiting and IP detection
app.set('trust proxy', 1);

// Security headers
app.use(securityHeadersMiddleware);
app.use(additionalSecurityHeaders);

// CORS configuration
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
}));

// Global rate limiting
app.use('/api/', generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gemini', geminiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Cleanup expired tokens every hour
setInterval(() => {
  cleanupExpiredTokens().catch(console.error);
}, 60 * 60 * 1000);

// Cleanup old audit logs daily (keeps 90 days)
setInterval(() => {
  cleanupOldAuditLogs(90).catch(console.error);
}, 24 * 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${FRONTEND_URL}`);
});

export default app;
