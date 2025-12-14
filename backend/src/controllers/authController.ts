import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { generateToken, blacklistToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { passwordSchema } from '../utils/passwordPolicy';
import { sanitizeEmail, sanitizeString } from '../utils/sanitization';
import { logAuthEvent, AuditEventType } from '../utils/auditLogger';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Sanitize inputs
    const email = sanitizeEmail(validatedData.email);
    const name = sanitizeString(validatedData.name);

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      await logAuthEvent(AuditEventType.REGISTRATION, req, undefined, false, 'Email already exists');
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    // Create user
    const user = await UserModel.create({
      email,
      name,
      password: validatedData.password,
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Log successful registration
    await logAuthEvent(AuditEventType.REGISTRATION, req, user.id, true);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      await logAuthEvent(AuditEventType.REGISTRATION, req, undefined, false, 'Validation failed');
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    console.error('Registration error:', error);
    await logAuthEvent(AuditEventType.REGISTRATION, req, undefined, false, 'Internal error');
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Sanitize email
    const email = sanitizeEmail(validatedData.email);

    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      await logAuthEvent(AuditEventType.LOGIN_FAILURE, req, undefined, false, 'User not found');
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isPasswordValid = await UserModel.verifyPassword(
      user,
      validatedData.password
    );
    if (!isPasswordValid) {
      await logAuthEvent(AuditEventType.LOGIN_FAILURE, req, user.id, false, 'Invalid password');
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Log successful login
    await logAuthEvent(AuditEventType.LOGIN_SUCCESS, req, user.id, true);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      await logAuthEvent(AuditEventType.LOGIN_FAILURE, req, undefined, false, 'Validation failed');
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    console.error('Login error:', error);
    await logAuthEvent(AuditEventType.LOGIN_FAILURE, req, undefined, false, 'Internal error');
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(400).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const userId = req.user!.userId;

    await blacklistToken(token, userId);

    // Log successful logout
    await logAuthEvent(AuditEventType.LOGOUT, req, userId, true);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    const userId = req.user?.userId;
    console.error('Logout error:', error);
    await logAuthEvent(AuditEventType.LOGOUT, req, userId, false, 'Logout failed');
    res.status(500).json({ error: 'Logout failed' });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await UserModel.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
}
