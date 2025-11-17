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

    try {
      // Try to get Authorization header first
      const authHeader = c.req.header('authorization');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        logger.info('🔑 Using Bearer token authentication');
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error) {
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
          logger.info('✅ User authenticated via Bearer token:', user.id);
          c.set('user', user);
          await next();
          return;
        }
      }

      // Fallback to cookie-based auth
      logger.info('🍪 Trying cookie-based authentication');
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        logger.error('❌ Cookie auth error:', error.message);
      }

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

      logger.info('✅ User authenticated via cookies:', user.id);
      c.set('user', user);
      await next();
    } catch (err) {
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
