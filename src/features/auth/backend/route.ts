import type { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { respond } from '@/backend/http/response';
import type { AppEnv } from '@/backend/hono/context';
import { SignupRequestSchema } from './schema';
import { createUserProfile } from './service';

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
};
