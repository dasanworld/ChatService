import { Hono } from 'hono';
import { errorBoundary } from '@/backend/middleware/error';
import { withAppContext } from '@/backend/middleware/context';
import { withSupabase } from '@/backend/middleware/supabase';
import { withAuth } from '@/backend/middleware/auth';
import { registerExampleRoutes } from '@/features/example/backend/route';
import { registerAuthRoutes } from '@/features/auth/backend/route';
import { registerInviteRoutes } from '@/features/invite/backend/route';
import { registerRoomListRoutes } from '@/features/room-list/backend/route';
import { registerMessageRoutes } from '@/features/message/backend/route';
import { registerRealtimeRoutes } from '@/features/realtime/backend/route';
import { registerReadReceiptRoutes } from '@/features/read-receipt/backend/route';
import type { AppEnv } from '@/backend/hono/context';

let singletonApp: Hono<AppEnv> | null = null;

export const createHonoApp = () => {
  if (singletonApp && process.env.NODE_ENV === 'production') {
    return singletonApp;
  }

  const app = new Hono<AppEnv>();

  app.use('*', errorBoundary());
  app.use('*', withAppContext());
  app.use('*', withSupabase());

  // Auth routes don't need authentication middleware
  registerAuthRoutes(app);
  registerExampleRoutes(app);

  // Protected routes - middleware applied directly in route handlers
  registerRoomListRoutes(app);

  app.use('/api/messages*', withAuth());
  registerMessageRoutes(app);

  app.use('/api/realtime*', withAuth());
  registerRealtimeRoutes(app);

  app.use('/api/read-receipts*', withAuth());
  registerReadReceiptRoutes(app);

  registerInviteRoutes(app);

  if (process.env.NODE_ENV === 'production') {
    singletonApp = app;
  }

  return app;
};
