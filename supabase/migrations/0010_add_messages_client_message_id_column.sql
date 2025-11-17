-- Migration: Ensure messages table exposes client_message_id column for optimistic UI reconciliation
-- Reason: some self-hosted databases created messages without this optional column

BEGIN;

ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS client_message_id TEXT;

COMMIT;
