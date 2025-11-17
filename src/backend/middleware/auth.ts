import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '@/backend/hono/context';

/**
 * Authentication middleware
 * Extracts user from Supabase session (supports both cookies and Authorization header)
 */
export const withAuth = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const supabase = c.get('supabase');
    const logger = c.get('logger');

    console.log('[AUTH MIDDLEWARE] Starting authentication');

    try {
      // Try to get Authorization header first
      const authHeader = c.req.header('authorization');
      console.log('[AUTH MIDDLEWARE] Authorization header:', authHeader ? 'Present' : 'Not present');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('[AUTH MIDDLEWARE] Using Bearer token authentication, token length:', token.length);
        logger.info('🔑 Using Bearer token authentication');
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error) {
          console.error('[AUTH MIDDLEWARE] Bearer token error:', error.message);
          logger.error('❌ Bearer token auth error:', error.message);
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
          console.log('[AUTH MIDDLEWARE] ✅ User authenticated via Bearer token:', user.id);
          logger.info('✅ User authenticated via Bearer token:', user.id);
          c.set('user', user);
          await next();
          return;
        }
      }

      // Fallback to cookie-based auth
      console.log('[AUTH MIDDLEWARE] Trying cookie-based authentication');
      logger.info('🍪 Trying cookie-based authentication');
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('[AUTH MIDDLEWARE] Cookie auth error:', error.message);
        logger.error('❌ Cookie auth error:', error.message);
      }

      if (error || !user) {
        console.log('[AUTH MIDDLEWARE] ❌ Authentication failed');
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

      console.log('[AUTH MIDDLEWARE] ✅ User authenticated via cookies:', user.id);
      logger.info('✅ User authenticated via cookies:', user.id);
      c.set('user', user);
      await next();
    } catch (err) {
      console.error('[AUTH MIDDLEWARE] 💥 Exception:', err);
      logger.error('💥 Auth middleware error:', err);
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
