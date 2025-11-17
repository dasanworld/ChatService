import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';
import { inviteErrorCodes, type InviteErrorCode } from './error';

export type InviteInfo = {
  roomId: string;
  roomName: string;
  participantCount: number;
  valid: true;
};

export const verifyInviteToken = async (
  client: SupabaseClient,
  token: string,
): Promise<HandlerResult<InviteInfo, InviteErrorCode, unknown>> => {
  try {
    // Token is actually room_id (simple approach)
    const { data: room, error: roomError } = await client
      .from('rooms')
      .select('id, name')
      .eq('id', token)
      .maybeSingle();

    if (roomError) {
      return failure(
        500,
        inviteErrorCodes.JOIN_ERROR,
        roomError.message || '방 정보를 조회할 수 없습니다',
      );
    }

    if (!room) {
      return failure(404, inviteErrorCodes.ROOM_NOT_FOUND, 'Room not found');
    }

    // Get participant count
    const { count, error: countError } = await client
      .from('room_participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id);

    if (countError) {
      return failure(
        500,
        inviteErrorCodes.JOIN_ERROR,
        countError.message || '참여자 수를 조회할 수 없습니다',
      );
    }

    return success({
      roomId: room.id,
      roomName: room.name,
      participantCount: count ?? 0,
      valid: true,
    });
  } catch (error) {
    return failure(
      500,
      inviteErrorCodes.JOIN_ERROR,
      error instanceof Error && error.message
        ? error.message
        : 'Invite verification failed',
    );
  }
};

export const addUserToRoom = async (
  client: SupabaseClient,
  userId: string,
  roomId: string,
): Promise<HandlerResult<{ success: true }, InviteErrorCode, unknown>> => {
  // Check if already participant
  const { data: existing, error: checkError } = await client
    .from('room_participants')
    .select('room_id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) {
    return failure(500, inviteErrorCodes.JOIN_ERROR, checkError.message);
  }

  if (existing) {
    // Already a participant, return success
    return success({ success: true });
  }

  // Add as participant
  const { error: insertError } = await client
    .from('room_participants')
    .insert({
      room_id: roomId,
      user_id: userId,
    });

  if (insertError) {
    return failure(500, inviteErrorCodes.JOIN_ERROR, insertError.message);
  }

  return success({ success: true });
};
