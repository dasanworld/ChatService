-- Ensures core tables exist with updated_at triggers and RLS disabled during MVP.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

CREATE SCHEMA IF NOT EXISTS _shared_triggers;

CREATE OR REPLACE FUNCTION _shared_triggers.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nickname TEXT NOT NULL CHECK (char_length(trim(nickname)) > 0),
  avatar_url TEXT,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Caches Supabase auth user metadata for ChatService.';

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  created_by UUID NOT NULL REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.rooms IS 'Chat rooms metadata (MVP scope).';

CREATE TABLE IF NOT EXISTS public.room_participants (
  room_id UUID NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'owner')),
  joined_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

COMMENT ON TABLE public.room_participants IS 'Membership mappings for rooms and notification rights.';

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to_message_id UUID REFERENCES public.messages (id) ON DELETE SET NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.messages IS 'Stores room messages for MVP + future extensions.';

CREATE INDEX IF NOT EXISTS idx_room_participants_user ON public.room_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_created_at ON public.messages (room_id, created_at);

-- RLS DISABLE: API uses service_role key during MVP, so RLS stays off until endpoints mature.
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
-- RLS DISABLE: API uses service_role key during MVP, so RLS stays off until endpoints mature.
ALTER TABLE IF EXISTS public.rooms DISABLE ROW LEVEL SECURITY;
-- RLS DISABLE: API uses service_role key during MVP, so RLS stays off until endpoints mature.
ALTER TABLE IF EXISTS public.room_participants DISABLE ROW LEVEL SECURITY;
-- RLS DISABLE: API uses service_role key during MVP, so RLS stays off until endpoints mature.
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;

COMMIT;

DO $$
DECLARE
  target_table TEXT;
  trigger_name TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['profiles', 'rooms', 'room_participants', 'messages'] LOOP
    trigger_name := format('set_updated_at_%s', target_table);
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = trigger_name
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I
           BEFORE UPDATE ON public.%I
           FOR EACH ROW
           EXECUTE FUNCTION _shared_triggers.set_updated_at();',
        trigger_name,
        target_table
      );
    END IF;
  END LOOP;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Failed attaching updated_at triggers: %', SQLERRM;
    RAISE;
END
$$;
