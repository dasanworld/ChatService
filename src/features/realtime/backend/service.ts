import type { SupabaseClient } from '@supabase/supabase-js';
import type { HandlerResult } from '@/backend/http/response';
import { success, failure } from '@/backend/http/response';
import { realtimeErrorCodes } from './error';
import type { TypingIndicatorResponse, UserPresenceResponse, SuccessResponse } from './schema';
import type { RealtimeErrorCode } from './error';

/**
 * Check if user is a participant of the room
 */
const isRoomParticipant = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
): Promise<boolean> => {
  const { data, error } = await client
    .from('room_participants')
    .select('room_id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  return !error && !!data;
};

/**
 * Get users currently typing in a room (excluding current user)
 */
export const getTypingUsers = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
): Promise<HandlerResult<TypingIndicatorResponse, RealtimeErrorCode, unknown>> => {
  try {
    // Check if user is a participant
    const isParticipant = await isRoomParticipant(client, roomId, userId);
    if (!isParticipant) {
      return failure(403, realtimeErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    // Get typing users (exclude current user, only non-expired)
    const { data: typingIndicators, error } = await client
      .from('typing_indicator')
      .select(
        `user_id,
         user:user_id(user_metadata)`,
      )
      .eq('room_id', roomId)
      .neq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      return failure(500, realtimeErrorCodes.TYPING_FETCH_FAILED, error.message);
    }

    // Extract users with nicknames from user metadata
    const typingUsers = (typingIndicators || [])
      .map((item: any) => ({
        user_id: item.user_id,
        nickname: item.user?.user_metadata?.nickname || 'Unknown',
      }))
      .filter((u) => u.user_id); // Filter out invalid entries

    return success({
      typing_users: typingUsers,
    });
  } catch (error) {
    return failure(
      500,
      realtimeErrorCodes.TYPING_FETCH_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Update typing status for a user in a room
 * Expires after 3 seconds (client should call every 2-3 seconds while typing)
 */
export const updateTypingStatus = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
  isTyping: boolean,
): Promise<HandlerResult<SuccessResponse, RealtimeErrorCode, unknown>> => {
  try {
    // Check if user is a participant
    const isParticipant = await isRoomParticipant(client, roomId, userId);
    if (!isParticipant) {
      return failure(403, realtimeErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    if (isTyping) {
      // Set expiration time to 3 seconds from now
      const expiresAt = new Date(Date.now() + 3000).toISOString();

      // Insert or update typing indicator
      const { error } = await client
        .from('typing_indicator')
        .upsert(
          {
            room_id: roomId,
            user_id: userId,
            expires_at: expiresAt,
          },
          {
            onConflict: 'room_id,user_id',
          },
        );

      if (error) {
        return failure(500, realtimeErrorCodes.TYPING_UPDATE_FAILED, error.message);
      }
    } else {
      // Remove typing indicator
      const { error } = await client
        .from('typing_indicator')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        return failure(500, realtimeErrorCodes.TYPING_UPDATE_FAILED, error.message);
      }
    }

    return success({
      success: true,
    });
  } catch (error) {
    return failure(
      500,
      realtimeErrorCodes.TYPING_UPDATE_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Get online users in a room
 */
export const getPresence = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
): Promise<HandlerResult<UserPresenceResponse, RealtimeErrorCode, unknown>> => {
  try {
    // Check if user is a participant
    const isParticipant = await isRoomParticipant(client, roomId, userId);
    if (!isParticipant) {
      return failure(403, realtimeErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    // Get all presence records for this room
    const { data: presenceRecords, error } = await client
      .from('user_presence')
      .select(
        `user_id,
         is_online,
         last_seen,
         user:user_id(user_metadata)`,
      )
      .eq('room_id', roomId);

    if (error) {
      return failure(500, realtimeErrorCodes.PRESENCE_FETCH_FAILED, error.message);
    }

    // Extract users with nicknames from user metadata
    const onlineUsers = (presenceRecords || [])
      .filter((p: any) => p.is_online) // Only online users
      .map((item: any) => ({
        user_id: item.user_id,
        nickname: item.user?.user_metadata?.nickname || 'Unknown',
        is_online: item.is_online,
        last_seen: item.last_seen,
      }))
      .filter((u) => u.user_id); // Filter out invalid entries

    return success({
      online_users: onlineUsers,
    });
  } catch (error) {
    return failure(
      500,
      realtimeErrorCodes.PRESENCE_FETCH_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Update user presence status
 * Called periodically (every 30 seconds) to keep user marked as online
 */
export const updatePresence = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
  isOnline: boolean,
): Promise<HandlerResult<SuccessResponse, RealtimeErrorCode, unknown>> => {
  try {
    // Check if user is a participant
    const isParticipant = await isRoomParticipant(client, roomId, userId);
    if (!isParticipant) {
      return failure(403, realtimeErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    // Upsert presence record
    const { error } = await client
      .from('user_presence')
      .upsert(
        {
          room_id: roomId,
          user_id: userId,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: 'room_id,user_id',
        },
      );

    if (error) {
      return failure(500, realtimeErrorCodes.PRESENCE_UPDATE_FAILED, error.message);
    }

    return success({
      success: true,
    });
  } catch (error) {
    return failure(
      500,
      realtimeErrorCodes.PRESENCE_UPDATE_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};
