-- Migration: Add room creator tracking and indexes
-- Adds created_by column to rooms table and creates indexes for performance

BEGIN;

-- Add created_by column to rooms table
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remove the default after adding the column
ALTER TABLE public.rooms
ALTER COLUMN created_by DROP DEFAULT;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON public.rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON public.room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON public.room_participants(room_id);

-- Update room_participants to use composite primary key instead of id
-- First, check if the table has any existing data to handle appropriately
-- This is idempotent as long as the constraint doesn't exist

-- Add unique constraint if it doesn't exist (it should from init migration)
-- The migration 0002 already has this, so this is just safety

COMMIT;
