import pool from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreateInput {
  email: string;
  password: string;
  name: string;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  created_at: Date;
}

export class UserModel {
  static async create(input: UserCreateInput): Promise<UserResponse> {
    const { email, password, name } = input;

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, email, name, created_at`,
      [email, password_hash, name]
    );

    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<UserResponse | null> {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  static async updatePassword(userId: number, newPassword: string): Promise<void> {
    const password_hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [password_hash, userId]
    );
  }
}
