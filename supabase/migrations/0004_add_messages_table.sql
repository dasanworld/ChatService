-- Migration: Add messages and room_events tables for chat functionality
-- Creates messages, room_events, and hidden_messages tables with Long Polling support

BEGIN;

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  like_count INT NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  client_message_id TEXT, -- For optimistic UI matching
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create room_events table for Long Polling (version tracking)
CREATE TABLE IF NOT EXISTS public.room_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  version BIGSERIAL NOT NULL, -- Monotonic version for sync tracking
  event_type TEXT NOT NULL, -- 'message_created', 'message_updated', 'message_deleted', etc.
  payload JSONB NOT NULL, -- Flexible event data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, version)
);

-- Create hidden_messages table (soft delete tracking)
CREATE TABLE IF NOT EXISTS public.hidden_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id) -- One user can hide each message once
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_events_room_id ON public.room_events(room_id);
CREATE INDEX IF NOT EXISTS idx_room_events_version ON public.room_events(room_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_hidden_messages_user_id ON public.hidden_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_messages_message_id ON public.hidden_messages(message_id);

-- Add triggers to update updated_at
CREATE TRIGGER handle_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Disable RLS for all new tables (as per requirements)
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hidden_messages DISABLE ROW LEVEL SECURITY;

COMMIT;
