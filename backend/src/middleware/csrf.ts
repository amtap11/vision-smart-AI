import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// CSRF token storage (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; createdAt: number }>();

// Token expiration time (1 hour)
const TOKEN_EXPIRATION = 60 * 60 * 1000;

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (now - value.createdAt > TOKEN_EXPIRATION) {
      csrfTokens.delete(key);
    }
  }
}, 15 * 60 * 1000); // Clean up every 15 minutes

/**
 * Generate a CSRF token for the current session
 */
export function generateCsrfToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, { token, createdAt: Date.now() });
  return token;
}

/**
 * Verify CSRF token from request
 */
export function verifyCsrfToken(sessionId: string, token: string): boolean {
  const storedToken = csrfTokens.get(sessionId);

  if (!storedToken) {
    return false;
  }

  // Check if token is expired
  if (Date.now() - storedToken.createdAt > TOKEN_EXPIRATION) {
    csrfTokens.delete(sessionId);
    return false;
  }

  return storedToken.token === token;
}

/**
 * CSRF protection middleware for state-changing operations
 * Applies to POST, PUT, PATCH, DELETE requests
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Get CSRF token from header
  const csrfToken = req.headers['x-csrf-token'] as string;

  // Get session ID from authorization token or session
  const authHeader = req.headers.authorization;
  const sessionId = authHeader ? authHeader.substring(7) : '';

  if (!sessionId) {
    res.status(403).json({
      error: 'CSRF validation failed',
      message: 'No session found',
    });
    return;
  }

  if (!csrfToken) {
    res.status(403).json({
      error: 'CSRF validation failed',
      message: 'CSRF token is required',
    });
    return;
  }

  if (!verifyCsrfToken(sessionId, csrfToken)) {
    res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Invalid or expired CSRF token',
    });
    return;
  }

  next();
}

/**
 * Endpoint to get a CSRF token
 */
export function getCsrfToken(req: Request, res: Response): void {
  const authHeader = req.headers.authorization;
  const sessionId = authHeader ? authHeader.substring(7) : crypto.randomBytes(16).toString('hex');

  const token = generateCsrfToken(sessionId);

  res.json({ csrfToken: token });
}
