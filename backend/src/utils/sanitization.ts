import validator from 'validator';

/**
 * Sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Escape HTML special characters
  return validator.escape(input);
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  return validator.normalizeEmail(email.trim().toLowerCase()) || '';
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  if (!validator.isURL(trimmedUrl, { protocols: ['http', 'https'], require_protocol: true })) {
    return null;
  }

  return trimmedUrl;
}

/**
 * Sanitize object by removing null bytes and control characters
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remove null bytes and control characters except newlines and tabs
      sanitized[key] = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validate that input doesn't contain SQL injection patterns
 * Note: This is a defense-in-depth measure. Always use parameterized queries!
 */
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\#|\/\*|\*\/|;)/,
    /(\bOR\b|\bAND\b).*[=<>]/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bEXEC\b|\bEXECUTE\b)/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validate that input doesn't contain NoSQL injection patterns
 */
export function detectNoSqlInjection(input: any): boolean {
  if (typeof input === 'object' && input !== null) {
    const inputStr = JSON.stringify(input);
    return /(\$where|\$ne|\$gt|\$lt|\$regex)/i.test(inputStr);
  }

  if (typeof input === 'string') {
    return /(\$where|\$ne|\$gt|\$lt|\$regex)/i.test(input);
  }

  return false;
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return '';
  }

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Limit to alphanumeric, hyphens, underscores, and dots
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure it doesn't start with a dot
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized;
  }

  return sanitized;
}

/**
 * Validate file extension against whitelist
 */
export function isValidFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();

  if (!extension) {
    return false;
  }

  return allowedExtensions.includes(extension);
}

/**
 * Validate file MIME type against whitelist
 */
export function isValidMimeType(mimeType: string, allowedMimeTypes: string[]): boolean {
  return allowedMimeTypes.includes(mimeType.toLowerCase());
}

/**
 * Check if input contains potentially dangerous characters
 */
export function containsDangerousCharacters(input: string): boolean {
  // Check for null bytes, excessive special characters, etc.
  const dangerousPatterns = [
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/, // Control characters
    /[<>]/g, // HTML tags (if count > threshold)
  ];

  return dangerousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Truncate string to maximum length
 */
export function truncateString(input: string, maxLength: number): string {
  if (typeof input !== 'string') {
    return '';
  }

  if (input.length <= maxLength) {
    return input;
  }

  return input.substring(0, maxLength);
}
