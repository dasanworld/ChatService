import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
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

    // Use service role key to avoid RLS-related 500s in API handlers
    const client = createClient(
      config.supabase.url,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    c.set(contextKeys.supabase, client);

    await next();
  });
