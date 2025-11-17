-- Migration: Ensure messages table exposes like_count column for realtime likes
-- Reason: prevent FETCH_SNAPSHOT_FAILED caused by missing column in legacy databases

BEGIN;

ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.messages
  ALTER COLUMN like_count SET DEFAULT 0;

UPDATE public.messages
SET like_count = 0
WHERE like_count IS NULL;

COMMIT;
