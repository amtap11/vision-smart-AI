import { z } from 'zod';

/**
 * Password policy configuration
 */
export const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
};

/**
 * Common/weak passwords to reject
 * In production, use a comprehensive list or an API like Have I Been Pwned
 */
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567890',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
]);

/**
 * Password validation errors
 */
export interface PasswordValidationError {
  field: string;
  message: string;
}

/**
 * Validate password against security policy
 */
export function validatePassword(password: string): PasswordValidationError[] {
  const errors: PasswordValidationError[] = [];

  // Length check
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${PASSWORD_POLICY.minLength} characters long`,
    });
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push({
      field: 'password',
      message: `Password must not exceed ${PASSWORD_POLICY.maxLength} characters`,
    });
  }

  // Uppercase check
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
    });
  }

  // Lowercase check
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter',
    });
  }

  // Number check
  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one number',
    });
  }

  // Special character check
  if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one special character',
    });
  }

  // Common password check
  if (PASSWORD_POLICY.preventCommonPasswords && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push({
      field: 'password',
      message: 'This password is too common. Please choose a stronger password',
    });
  }

  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password should not contain repeated characters',
    });
  }

  return errors;
}

/**
 * Zod schema for password validation
 */
export const passwordSchema = z.string()
  .min(PASSWORD_POLICY.minLength, `Password must be at least ${PASSWORD_POLICY.minLength} characters`)
  .max(PASSWORD_POLICY.maxLength, `Password must not exceed ${PASSWORD_POLICY.maxLength} characters`)
  .refine(
    (password) => validatePassword(password).length === 0,
    (password) => ({
      message: validatePassword(password)[0]?.message || 'Password does not meet security requirements',
    })
  );

/**
 * Calculate password strength (0-4)
 * 0 = Very Weak, 1 = Weak, 2 = Fair, 3 = Strong, 4 = Very Strong
 */
export function calculatePasswordStrength(password: string): number {
  let strength = 0;

  // Length bonus
  if (password.length >= 12) strength++;
  if (password.length >= 16) strength++;

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

  // Penalty for common patterns
  if (/(.)\1{2,}/.test(password)) strength--;
  if (COMMON_PASSWORDS.has(password.toLowerCase())) strength = 0;

  return Math.max(0, Math.min(4, strength));
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(password: string): string {
  const strength = calculatePasswordStrength(password);
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return labels[strength];
}
