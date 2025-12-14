import jwt from 'jsonwebtoken';
import pool from '../config/database';
import crypto from 'crypto';

// JWT Secret - MUST be set in production
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}

// Use a secure random secret in development if not set
const SECRET = JWT_SECRET || crypto.randomBytes(64).toString('hex');

// JWT Configuration
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h'; // Shorter expiration (1 hour instead of 7 days)
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';

export interface TokenPayload {
  userId: number;
  email: string;
  tokenVersion?: number; // For token rotation
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, {
    expiresIn: JWT_EXPIRATION as string,
    algorithm: 'HS256',
    issuer: 'vision-smart-ai',
    audience: 'vision-smart-ai-client',
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, {
    expiresIn: JWT_REFRESH_EXPIRATION as string,
    algorithm: 'HS256',
    issuer: 'vision-smart-ai',
    audience: 'vision-smart-ai-client',
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET, {
    algorithms: ['HS256'],
    issuer: 'vision-smart-ai',
    audience: 'vision-smart-ai-client',
  }) as TokenPayload;
}

export async function blacklistToken(token: string, userId: number): Promise<void> {
  try {
    const decoded = jwt.decode(token) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000);

    await pool.query(
      'INSERT INTO token_blacklist (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, userId, expiresAt]
    );
  } catch (error) {
    console.error('Error blacklisting token:', error);
    throw new Error('Failed to blacklist token');
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM token_blacklist WHERE token = $1',
    [token]
  );

  return result.rows.length > 0;
}

export async function cleanupExpiredTokens(): Promise<void> {
  await pool.query(
    'DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP'
  );
}
