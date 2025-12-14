import pool from '../config/database';
import { Request } from 'express';

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  REGISTRATION = 'REGISTRATION',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',

  // Authorization events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',

  // Data access events
  DATA_READ = 'DATA_READ',
  DATA_CREATE = 'DATA_CREATE',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',

  // Security events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',

  // System events
  API_ERROR = 'API_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

/**
 * Log a security audit event to the database
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        event_type, user_id, ip_address, user_agent,
        resource, action, details, success, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [
        entry.eventType,
        entry.userId || null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.resource || null,
        entry.action || null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.success,
        entry.errorMessage || null,
      ]
    );
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the application
  }
}

/**
 * Helper function to extract request metadata
 */
export function extractRequestMetadata(req: Request) {
  return {
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  eventType: AuditEventType,
  req: Request,
  userId?: number,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  const metadata = extractRequestMetadata(req);

  await logAuditEvent({
    eventType,
    userId,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    success,
    errorMessage,
  });
}

/**
 * Log data access events
 */
export async function logDataAccess(
  eventType: AuditEventType,
  req: Request,
  userId: number,
  resource: string,
  action: string,
  details?: Record<string, any>
): Promise<void> {
  const metadata = extractRequestMetadata(req);

  await logAuditEvent({
    eventType,
    userId,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    resource,
    action,
    details,
    success: true,
  });
}

/**
 * Log security violations
 */
export async function logSecurityEvent(
  eventType: AuditEventType,
  req: Request,
  userId?: number,
  details?: Record<string, any>
): Promise<void> {
  const metadata = extractRequestMetadata(req);

  await logAuditEvent({
    eventType,
    userId,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    details,
    success: false,
  });
}

/**
 * Clean up old audit logs (run periodically)
 * Keeps logs for 90 days by default
 */
export async function cleanupOldAuditLogs(retentionDays: number = 90): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM audit_logs
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'`
    );
  } catch (error) {
    console.error('Failed to clean up old audit logs:', error);
  }
}
