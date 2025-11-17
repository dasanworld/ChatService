import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@/backend/hono/context';
import { respond } from '@/backend/http/response';
import { getRoomsByUserId, createRoom, leaveRoom } from './service';
import {
  CreateRoomRequestSchema,
  LeaveRoomRequestSchema,
} from './schema';

export const registerRoomListRoutes = (app: Hono<AppEnv>) => {
  // GET /api/rooms - Get all rooms for current user
  app.get('/api/rooms', async (c) => {
    const supabase = c.get('supabase');

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

    const result = await getRoomsByUserId(supabase, user.id);
    return respond(c, result);
  });

  // POST /api/rooms - Create a new room
  app.post(
    '/api/rooms',
    zValidator('json', CreateRoomRequestSchema),
    async (c) => {
      const supabase = c.get('supabase');

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

      const { name } = c.req.valid('json');
      const result = await createRoom(supabase, user.id, name);
      return respond(c, result);
    },
  );

  // DELETE /api/rooms/:roomId - Leave a room
  app.delete('/api/rooms/:roomId', async (c) => {
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

    const result = await leaveRoom(supabase, user.id, roomId);
    return respond(c, result);
  });
};
