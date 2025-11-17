import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@/backend/hono/context';
import { getUser } from '@/backend/hono/context';
import { respond } from '@/backend/http/response';
import { withAuth } from '@/backend/middleware/auth';
import { getRoomsByUserId, createRoom, leaveRoom } from './service';
import {
  CreateRoomRequestSchema,
  LeaveRoomRequestSchema,
} from './schema';

export const registerRoomListRoutes = (app: Hono<AppEnv>) => {
  // GET /api/rooms - Get all rooms for current user
  app.get('/api/rooms', withAuth(), async (c) => {
    const supabase = c.get('supabase');
    const user = getUser(c);

    if (!user) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            statusCode: 401,
            message: 'Unauthorized',
          },
        },
        401
      );
    }

    const result = await getRoomsByUserId(supabase, user.id);
    return respond(c, result);
  });

  // POST /api/rooms - Create a new room
  app.post(
    '/api/rooms',
    withAuth(),
    zValidator('json', CreateRoomRequestSchema),
    async (c) => {
      const supabase = c.get('supabase');
      const user = getUser(c);

      if (!user) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'UNAUTHORIZED',
              statusCode: 401,
              message: 'Unauthorized',
            },
          },
          401
        );
      }

      const { name } = c.req.valid('json');
      const result = await createRoom(supabase, user.id, name);
      return respond(c, result);
    },
  );

  // DELETE /api/rooms/:roomId - Leave a room
  app.delete('/api/rooms/:roomId', withAuth(), async (c) => {
    const supabase = c.get('supabase');
    const user = getUser(c);
    const roomId = c.req.param('roomId');

    if (!user) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            statusCode: 401,
            message: 'Unauthorized',
          },
        },
          401
      );
    }

    const result = await leaveRoom(supabase, user.id, roomId);
    return respond(c, result);
  });
};
