import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@/backend/hono/context';
import { respond } from '@/backend/http/response';
import { getTypingUsers, updateTypingStatus, getPresence, updatePresence } from './service';
import { TypingIndicatorRequestSchema, UserPresenceRequestSchema } from './schema';

export const registerRealtimeRoutes = (app: Hono<AppEnv>) => {
  // Get typing users in a room
  app.get('/api/rooms/:roomId/typing', async (c) => {
    const supabase = c.get('supabase');
    const roomId = c.req.param('roomId');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return respond(c, {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          statusCode: 401,
          message: 'Unauthorized',
        },
      } as any);
    }

    const result = await getTypingUsers(supabase, roomId, user.id);
    return respond(c, result);
  });

  // Update typing status
  app.post(
    '/api/rooms/:roomId/typing',
    zValidator('json', TypingIndicatorRequestSchema),
    async (c) => {
      const supabase = c.get('supabase');
      const roomId = c.req.param('roomId');
      const { is_typing } = c.req.valid('json');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return respond(c, {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            statusCode: 401,
            message: 'Unauthorized',
          },
        } as any);
      }

      const result = await updateTypingStatus(supabase, roomId, user.id, is_typing);
      return respond(c, result);
    },
  );

  // Get online users in a room
  app.get('/api/rooms/:roomId/presence', async (c) => {
    const supabase = c.get('supabase');
    const roomId = c.req.param('roomId');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return respond(c, {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          statusCode: 401,
          message: 'Unauthorized',
        },
      } as any);
    }

    const result = await getPresence(supabase, roomId, user.id);
    return respond(c, result);
  });

  // Update presence status
  app.post(
    '/api/rooms/:roomId/presence',
    zValidator('json', UserPresenceRequestSchema),
    async (c) => {
      const supabase = c.get('supabase');
      const roomId = c.req.param('roomId');
      const { is_online } = c.req.valid('json');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return respond(c, {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            statusCode: 401,
            message: 'Unauthorized',
          },
        } as any);
      }

      const result = await updatePresence(supabase, roomId, user.id, is_online);
      return respond(c, result);
    },
  );
};
