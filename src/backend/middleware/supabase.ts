import { createMiddleware } from 'hono/factory';
import { createServerClient } from '@supabase/ssr';
import {
  contextKeys,
  type AppEnv,
} from '@/backend/hono/context';

export const withSupabase = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const config = c.get(
      contextKeys.config,
    ) as AppEnv['Variables']['config'] | undefined;
    const logger = c.get(contextKeys.logger);

    if (!config) {
      throw new Error('Application configuration is not available.');
    }

    // Get anon key from environment
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
    }

    // Parse cookies from request headers
    const cookieHeader = c.req.header('cookie') || '';
    
    logger.info('Cookie header:', cookieHeader ? 'present' : 'missing');

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const trimmed = cookie.trim();
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex);
        const value = trimmed.substring(equalIndex + 1);
        acc.push({ name: key, value: value }); // Don't decode yet, let Supabase handle it
      }
      return acc;
    }, [] as Array<{ name: string; value: string }>);

    logger.info('Parsed cookies count:', cookies.length);
    logger.info('Auth cookie present:', cookies.some(c => c.name.includes('auth-token')));

    // Create Supabase client with SSR support
    const client = createServerClient(
      config.supabase.url,
      anonKey,
      {
        cookies: {
          getAll: () => {
            return cookies;
          },
          setAll: () => {
            // No-op for now - Hono handles response cookies differently
          },
        },
      }
    );

    c.set(contextKeys.supabase, client);

    await next();
  });
