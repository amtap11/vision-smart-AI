import { Router } from 'express';
import { analyzeData } from '../controllers/geminiController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/analyze', authenticate, analyzeData);

export default router;
