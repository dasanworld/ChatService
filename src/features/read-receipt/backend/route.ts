import { Hono } from 'hono';
import type { AppEnv } from '@/backend/hono/context';
import { respond } from '@/backend/http/response';
import {
  markMessageAsRead,
  getMessageReadStatus,
  getRoomReadStatus,
} from './service';

export const registerReadReceiptRoutes = (app: Hono<AppEnv>) => {
  // Mark message as read
  app.post('/api/messages/:messageId/read', async (c) => {
    const supabase = c.get('supabase');
    const messageId = c.req.param('messageId');

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

    const result = await markMessageAsRead(supabase, messageId, user.id);
    return respond(c, result);
  });

  // Get read status for a single message
  app.get('/api/messages/:messageId/read-status', async (c) => {
    const supabase = c.get('supabase');
    const messageId = c.req.param('messageId');

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

    const result = await getMessageReadStatus(supabase, messageId, user.id);
    return respond(c, result);
  });

  // Get read status for all messages in a room
  app.get('/api/rooms/:roomId/read-status', async (c) => {
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

    const result = await getRoomReadStatus(supabase, roomId, user.id);
    return respond(c, result);
  });
};
