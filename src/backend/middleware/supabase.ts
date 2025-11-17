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

    const serviceRoleKey = config.supabase.serviceRoleKey;
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
    }

    // Parse cookies for SSR auth support
    const cookieHeader = c.req.header('cookie') || '';
    const cookies = cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [name, ...rest] = cookie.split('=');
        return { name, value: rest.join('=') };
      });

    const client = createServerClient(
      config.supabase.url,
      serviceRoleKey,
      {
        cookies: {
          getAll: () => cookies,
          setAll: () => {
            // No-op on server
          },
        },
      }
    );

    c.set(contextKeys.supabase, client);

    await next();
  });
