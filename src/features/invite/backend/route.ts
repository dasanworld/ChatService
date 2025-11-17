import type { Hono } from 'hono';
import { respond } from '@/backend/http/response';
import type { AppEnv } from '@/backend/hono/context';
import { verifyInviteToken, addUserToRoom } from './service';

export const registerInviteRoutes = (app: Hono<AppEnv>) => {
  // GET /api/invites/:token - Verify invite token
  app.get('/api/invites/:token', async (c) => {
    const token = c.req.param('token');
    const supabase = c.get('supabase');

    const result = await verifyInviteToken(supabase, token);
    return respond(c, result);
  });

  // POST /api/invites/:token/join - Join room with invite
  app.post('/api/invites/:token/join', async (c) => {
    const token = c.req.param('token');
    const supabase = c.get('supabase');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return respond(c, {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          statusCode: 401,
          message: 'Unauthorized',
        },
      } as any);
    }

    const result = await addUserToRoom(supabase, user.id, token);
    return respond(c, result);
  });
};
