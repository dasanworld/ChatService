import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateUser } from '../service';
import { authErrorCodes } from '../error';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('authenticateUser', () => {
  let mockSupabaseClient: SupabaseClient;

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        signInWithPassword: vi.fn(),
      },
    } as any;
  });

  it('should authenticate successfully with valid credentials', async () => {
    const mockSession = {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      expires_at: 1234567890,
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    (mockSupabaseClient.auth.signInWithPassword as any).mockResolvedValue({
      data: {
        user: mockUser,
        session: mockSession,
      },
      error: null,
    });

    const result = await authenticateUser(mockSupabaseClient, {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userId).toBe('user-123');
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.session.accessToken).toBe('mock_access_token');
      expect(result.data.session.refreshToken).toBe('mock_refresh_token');
      expect(result.data.session.expiresAt).toBe(1234567890);
    }
  });

  it('should fail with invalid credentials', async () => {
    (mockSupabaseClient.auth.signInWithPassword as any).mockResolvedValue({
      data: null,
      error: {
        message: 'Invalid login credentials',
      },
    });

    const result = await authenticateUser(mockSupabaseClient, {
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(authErrorCodes.INVALID_CREDENTIALS);
      expect(result.error.statusCode).toBe(401);
    }
  });

  it('should handle Supabase errors', async () => {
    (mockSupabaseClient.auth.signInWithPassword as any).mockResolvedValue({
      data: null,
      error: {
        message: 'Database connection error',
      },
    });

    const result = await authenticateUser(mockSupabaseClient, {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(authErrorCodes.SIGNUP_FAILED);
      expect(result.error.statusCode).toBe(500);
    }
  });

  it('should handle missing user or session data', async () => {
    (mockSupabaseClient.auth.signInWithPassword as any).mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: null,
    });

    const result = await authenticateUser(mockSupabaseClient, {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(authErrorCodes.SIGNUP_FAILED);
    }
  });

  it('should handle missing expires_at gracefully', async () => {
    const mockSession = {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      expires_at: null,
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    (mockSupabaseClient.auth.signInWithPassword as any).mockResolvedValue({
      data: {
        user: mockUser,
        session: mockSession,
      },
      error: null,
    });

    const result = await authenticateUser(mockSupabaseClient, {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.session.expiresAt).toBe(0);
    }
  });
});
