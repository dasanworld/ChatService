import type { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { respond } from '@/backend/http/response';
import type { AppEnv } from '@/backend/hono/context';
import { SignupRequestSchema, LoginRequestSchema } from './schema';
import { createUserProfile, authenticateUser, logoutUser } from './service';

export const registerAuthRoutes = (app: Hono<AppEnv>) => {
  app.post(
    '/api/auth/signup',
    zValidator('json', SignupRequestSchema) as any,
    async (c) => {
      const body = await c.req.json();
      const supabase = c.get('supabase');

      const result = await createUserProfile(supabase, {
        email: body.email,
        password: body.password,
        nickname: body.nickname,
        inviteToken: body.inviteToken, // Pass invite token if provided
      });

      return respond(c, result);
    }
  );

  app.post(
    '/api/auth/login',
    zValidator('json', LoginRequestSchema) as any,
    async (c) => {
      const body = await c.req.json();
      const supabase = c.get('supabase');

      const result = await authenticateUser(supabase, {
        email: body.email,
        password: body.password,
      });

      return respond(c, result);
    }
  );

  app.post(
    '/api/auth/logout',
    async (c) => {
      const supabase = c.get('supabase');

      const result = await logoutUser(supabase);

      return respond(c, result);
    }
  );
};
