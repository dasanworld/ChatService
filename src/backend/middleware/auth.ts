import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '@/backend/hono/context';

/**
 * Authentication middleware
 * Extracts user from Supabase session (supports both cookies and Authorization header)
 */
export const withAuth = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const supabase = c.get('supabase');

    try {
      // Try to get Authorization header first
      const authHeader = c.req.header('authorization');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'UNAUTHORIZED',
                statusCode: 401,
                message: 'Authentication required',
                debug: `Bearer token error: ${error.message}`,
              },
            },
            401
          );
        }
      
        if (user) {
          c.set('user', user);
          await next();
          return;
        }
      }

      // Fallback to cookie-based auth (SSR supabase client has request cookies)
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'UNAUTHORIZED',
              statusCode: 401,
              message: 'Authentication required',
              debug: error ? `Cookie error: ${error.message}` : 'No user found',
            },
          },
          401
        );
      }

      c.set('user', user);
      await next();
    } catch (err) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            statusCode: 401,
            message: 'Authentication failed',
            debug: err instanceof Error ? err.message : 'Unknown error',
          },
        },
        401
      );
    }
  });
