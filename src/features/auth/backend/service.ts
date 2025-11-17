import type { Database } from '@/lib/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';
import { authErrorCodes, type AuthErrorCode } from './error';
import type { SignupResponse } from './schema';

export type SignupPayload = {
  email: string;
  password: string;
  nickname: string;
  inviteToken?: string; // Optional invite token for joining a room
};

export const createUserProfile = async (
  client: SupabaseClient,
  payload: SignupPayload,
): Promise<HandlerResult<SignupResponse, AuthErrorCode, unknown>> => {
  // 1. Check nickname uniqueness
  const { data: existingProfile, error: checkError } = await client
    .from('profiles')
    .select('id')
    .eq('nickname', payload.nickname)
    .maybeSingle();

  if (checkError) {
    return failure(500, authErrorCodes.SIGNUP_FAILED, checkError.message);
  }

  if (existingProfile) {
    return failure(409, authErrorCodes.NICKNAME_ALREADY_EXISTS, 'Nickname already exists');
  }

  // 2. Create auth user
  const { data: authData, error: authError } = await client.auth.signUp({
    email: payload.email,
    password: payload.password,
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      return failure(409, authErrorCodes.EMAIL_ALREADY_EXISTS, 'Email already exists');
    }
    if (authError.message.includes('Password') || authError.message.includes('password')) {
      return failure(400, authErrorCodes.WEAK_PASSWORD, authError.message);
    }
    return failure(500, authErrorCodes.SIGNUP_FAILED, authError.message);
  }

  if (!authData.user) {
    return failure(500, authErrorCodes.SIGNUP_FAILED, 'User creation failed');
  }

  // 3. Create profile
  const { error: profileError } = await client
    .from('profiles')
    .insert({
      id: authData.user.id,
      nickname: payload.nickname,
      email: payload.email,
    });

  if (profileError) {
    // TODO: Implement rollback - delete auth user
    // For now, log the error and return failure
    console.error('Profile creation failed, auth user orphaned:', authData.user.id);
    return failure(500, authErrorCodes.PROFILE_CREATION_FAILED, profileError.message);
  }

  // 4. If invite token is provided, add user to the room
  if (payload.inviteToken) {
    const { error: roomError } = await client
      .from('room_participants')
      .insert({
        room_id: payload.inviteToken,
        user_id: authData.user.id,
      });

    if (roomError) {
      console.error('Failed to add user to room:', roomError);
      // Note: We don't fail the signup if room join fails - just log it
    }
  }

  return success({
    userId: authData.user.id,
    email: authData.user.email ?? payload.email,
    nickname: payload.nickname,
  });
};
