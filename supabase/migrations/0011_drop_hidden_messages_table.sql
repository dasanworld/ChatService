-- Migration: Drop hidden_messages table
-- Reason: Simplified message deletion using is_deleted flag only
-- No longer need per-user soft delete tracking

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS public.idx_hidden_messages_user_id;
DROP INDEX IF EXISTS public.idx_hidden_messages_message_id;

-- Drop the table
DROP TABLE IF EXISTS public.hidden_messages;

COMMIT;
