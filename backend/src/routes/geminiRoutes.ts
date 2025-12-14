import { Router } from 'express';
import { analyzeData } from '../controllers/geminiController';
import { authenticate } from '../middleware/auth';
import { aiOperationsLimiter } from '../middleware/rateLimiting';

const router = Router();

// AI operations with aggressive rate limiting
router.post('/analyze', authenticate, aiOperationsLimiter, analyzeData);

export default router;
