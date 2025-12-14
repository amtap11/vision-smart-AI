// API Client for backend communication
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
  token: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (error) {
      throw new Error('Network error: Unable to connect to the server. Please ensure the backend is running.');
    }

    // Check if response has content before parsing JSON
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    let data: any;
    if (text && contentType && contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }
    } else if (text) {
      // If there's text but it's not JSON, use it as the error message
      throw new Error(text || 'Request failed');
    } else {
      // Empty response
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  // Authentication endpoints
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    this.setToken(response.token);
    return response;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    this.setToken(response.token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/api/auth/me');
  }

  // Gemini API endpoints
  async analyzeWithGemini(
    prompt: string, 
    context?: Record<string, any>,
    options?: {
      responseMimeType?: string;
      responseSchema?: any;
      model?: string;
    }
  ): Promise<{
    success: boolean;
    result: string;
    model: string;
  }> {
    return this.request('/api/gemini/analyze', {
      method: 'POST',
      body: JSON.stringify({ 
        prompt, 
        context,
        model: options?.model,
        responseMimeType: options?.responseMimeType,
        responseSchema: options?.responseSchema
      }),
    });
  }
}

export const apiClient = new ApiClient();
