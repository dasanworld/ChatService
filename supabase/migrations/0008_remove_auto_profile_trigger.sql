-- Migration: Remove automatic profile creation trigger
-- Reason: Manual profile creation in signup service allows custom nickname
-- This prevents duplicate profile creation conflicts

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.create_profile_on_signup();

-- Ensure profiles table has all required columns
-- Add email column if it doesn't exist (for compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text unique not null;
  END IF;
END $$;
