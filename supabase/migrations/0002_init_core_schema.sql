-- Migration: initialize core schema for chat service
-- Creates profiles, rooms, and room_participants tables

-- Enable pgcrypto extension for UUID generation
create extension if not exists "pgcrypto";

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade, -- Supabase Auth user ID
  email text unique not null,
  nickname text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create rooms table
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create room_participants table
create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text default 'member', -- member, admin, owner
  joined_at timestamptz not null default now(),
  unique(room_id, user_id)
);

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add triggers to update updated_at
create trigger handle_profiles_updated_at 
  before update on public.profiles
  for each row 
  execute function public.handle_updated_at();

create trigger handle_rooms_updated_at 
  before update on public.rooms
  for each row 
  execute function public.handle_updated_at();

create trigger handle_room_participants_updated_at 
  before update on public.room_participants
  for each row 
  execute function public.handle_updated_at();

-- Disable RLS for all tables (as per requirements)
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_participants DISABLE ROW LEVEL SECURITY;

-- Create a trigger function to automatically create a profile when a new user signs up
create or replace function public.create_profile_on_signup() 
returns trigger as $$
begin
  insert into public.profiles (id, email, nickname)
  values (new.id, new.email, 'user_' || substring(new.id::text, 1, 8)); -- default nickname
  return new;
end;
$$ language plpgsql;

-- Create trigger for auth.users
create trigger on_auth_user_created 
  after insert on auth.users
  for each row 
  execute function public.create_profile_on_signup();