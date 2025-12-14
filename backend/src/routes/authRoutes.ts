import { Router } from 'express';
import { register, login, logout, getCurrentUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter, registrationLimiter } from '../middleware/rateLimiting';
import { getCsrfToken } from '../middleware/csrf';

const router = Router();

// CSRF token endpoint
router.get('/csrf-token', getCsrfToken);

// Auth endpoints with specific rate limiting
router.post('/register', registrationLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
