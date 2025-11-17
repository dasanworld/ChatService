import type { Hono } from 'hono';
import { respond } from '@/backend/http/response';
import type { AppEnv } from '@/backend/hono/context';
import { verifyInviteToken, addUserToRoom } from './service';
import { getUser } from '@/backend/hono/context';

export const registerInviteRoutes = (app: Hono<AppEnv>) => {
  // GET /api/invites/:token - Verify invite token
  app.get('/api/invites/:token', async (c) => {
    const token = c.req.param('token');
    const supabase = c.get('supabase');
    const logger = c.get('logger');

    logger.info('[invite] verify token start', token);

    const result = await verifyInviteToken(supabase, token);

    if (result.ok) {
      logger.info('[invite] verify success', { token, roomId: result.data.roomId });
    } else {
      logger.warn('[invite] verify failed', { token, code: result.error.code, message: result.error.message });
    }

    return respond(c, result);
  });

  // POST /api/invites/:token/join - Join room with invite
  app.post('/api/invites/:token/join', async (c) => {
    const token = c.req.param('token');
    const supabase = c.get('supabase');
    const logger = c.get('logger');
    const authHeader = c.req.header('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const { data: userData, error: userError } = bearer
      ? await supabase.auth.getUser(bearer)
      : await supabase.auth.getUser();

    const userId = userData?.user?.id;

    if (userError || !userId) {
      logger.warn('[invite] join unauthorized', { token, reason: userError?.message });
      return respond(c, {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          statusCode: 401,
          message: 'Unauthorized',
        },
      } as any);
    }

    const result = await addUserToRoom(supabase, userId, token);

    if (result.ok) {
      logger.info('[invite] join success', { token, userId });
    } else {
      logger.warn('[invite] join failed', { token, userId, code: result.error.code, message: result.error.message });
    }

    return respond(c, result);
  });
};
