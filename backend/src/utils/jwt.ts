import jwt from 'jsonwebtoken';
import pool from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

export interface TokenPayload {
  userId: number;
  email: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
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
