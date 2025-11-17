import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@/backend/hono/context';
import { respond } from '@/backend/http/response';
import {
  getRoomSnapshot,
  createMessage,
  getLongPollingUpdates,
  getMessageHistory,
  deleteMessage,
} from './service';
import {
  CreateMessageRequestSchema,
} from './schema';

export const registerMessageRoutes = (app: Hono<AppEnv>) => {
  // GET /api/rooms/:roomId - Get room snapshot (initial messages)
  app.get('/api/rooms/:roomId', async (c) => {
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

    const result = await getRoomSnapshot(supabase, roomId, user.id);
    return respond(c, result);
  });

  // POST /api/rooms/:roomId/messages - Create a new message
  app.post(
    '/api/rooms/:roomId/messages',
    zValidator('json', CreateMessageRequestSchema),
    async (c) => {
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

      const { content, client_message_id, reply_to_message_id } = c.req.valid('json');
      const result = await createMessage(
        supabase,
        roomId,
        user.id,
        content,
        client_message_id,
        reply_to_message_id,
      );
      return respond(c, result);
    },
  );

  // GET /api/rooms/:roomId/messages/longpoll - Long Polling for real-time updates
  app.get('/api/rooms/:roomId/messages/longpoll', async (c) => {
    const supabase = c.get('supabase');
    const roomId = c.req.param('roomId');
    const sinceVersion = parseInt(c.req.query('sinceVersion') || '0', 10);

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

    const result = await getLongPollingUpdates(supabase, roomId, user.id, sinceVersion);
    return respond(c, result);
  });

  // GET /api/rooms/:roomId/messages/history - Load message history (pagination)
  app.get('/api/rooms/:roomId/messages/history', async (c) => {
    const supabase = c.get('supabase');
    const roomId = c.req.param('roomId');
    const beforeMessageId = c.req.query('beforeMessageId');
    const limit = parseInt(c.req.query('limit') || '50', 10);

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

    const result = await getMessageHistory(
      supabase,
      roomId,
      user.id,
      beforeMessageId,
      Math.min(limit, 100), // Cap at 100
    );
    return respond(c, result);
  });

  // DELETE /api/messages/:messageId - Delete a message
  app.delete('/api/messages/:messageId', async (c) => {
    const supabase = c.get('supabase');
    const messageId = c.req.param('messageId');
    const deleteForAll = c.req.query('deleteForAll') === 'true';

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

    const result = await deleteMessage(supabase, messageId, user.id, deleteForAll);
    return respond(c, result);
  });
};
