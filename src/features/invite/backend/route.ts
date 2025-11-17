import type { Hono } from 'hono';
import { respond } from '@/backend/http/response';
import type { AppEnv } from '@/backend/hono/context';
import { verifyInviteToken, addUserToRoom } from './service';

const getAuthUser = async (supabase: any, authHeader?: string) => {
  const bearer =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : undefined;
  const { data, error } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();
  return { user: data?.user, error };
};

export const registerInviteRoutes = (app: Hono<AppEnv>) => {
  const handleJoin = async (c: any) => {
    const token = c.req.param('token');
    const supabase = c.get('supabase');
    const logger = c.get('logger');
    const authHeader = c.req.header('authorization');
    const { user, error } = await getAuthUser(supabase, authHeader);

    if (error || !user) {
      logger.warn('[invite] join unauthorized', { token, reason: error?.message || 'no user' });
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

    if (result.ok) {
      logger.info('[invite] join success', { token, userId: user.id });
    } else {
      logger.warn('[invite] join failed', { token, userId: user.id, code: result.error.code, message: result.error.message });
    }

    return respond(c, result);
  };

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
  app.post('/api/invites/:token/join', handleJoin);
  // Allow GET for convenience when testing in browser
  app.get('/api/invites/:token/join', handleJoin);
};
