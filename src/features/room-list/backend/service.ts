import type { SupabaseClient } from '@supabase/supabase-js';
import type { HandlerResult } from '@/backend/http/response';
import { success, failure } from '@/backend/http/response';
import { roomListErrorCodes } from './error';
import type {
  Room,
  RoomWithCount,
  CreateRoomResponse,
  GetRoomsResponse,
} from './schema';
import type { RoomListErrorCode } from './error';

/**
 * Get all rooms for a specific user (where user is a participant or creator)
 */
export const getRoomsByUserId = async (
  client: SupabaseClient,
  userId: string,
): Promise<HandlerResult<GetRoomsResponse, RoomListErrorCode, unknown>> => {
  try {
    // Get all rooms where user is a participant
    const { data: participantRooms, error: participantError } = await client
      .from('room_participants')
      .select('room_id')
      .eq('user_id', userId);

    if (participantError) {
      return failure(
        500,
        roomListErrorCodes.FETCH_ROOMS_FAILED,
        participantError.message,
      );
    }

    if (!participantRooms || participantRooms.length === 0) {
      return success({ rooms: [], total: 0 });
    }

    const roomIds = participantRooms.map((p) => p.room_id);

    // Get room details for all participant rooms
    const { data: rooms, error: roomsError } = await client
      .from('rooms')
      .select('id, name, created_by, created_at, updated_at')
      .in('id', roomIds)
      .order('updated_at', { ascending: false });

    if (roomsError) {
      return failure(
        500,
        roomListErrorCodes.FETCH_ROOMS_FAILED,
        roomsError.message,
      );
    }

    // Get participant count for each room
    const roomsWithCount: RoomWithCount[] = [];

    for (const room of rooms || []) {
      const { count, error: countError } = await client
        .from('room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

      if (countError) {
        return failure(
          500,
          roomListErrorCodes.FETCH_ROOMS_FAILED,
          countError.message,
        );
      }

      roomsWithCount.push({
        id: room.id,
        name: room.name,
        created_by: room.created_by,
        created_at: room.created_at,
        updated_at: room.updated_at,
        participant_count: count ?? 0,
      });
    }

    return success({ rooms: roomsWithCount, total: roomsWithCount.length });
  } catch (error) {
    return failure(
      500,
      roomListErrorCodes.FETCH_ROOMS_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Create a new room
 */
export const createRoom = async (
  client: SupabaseClient,
  userId: string,
  roomName: string,
): Promise<HandlerResult<CreateRoomResponse, RoomListErrorCode, unknown>> => {
  try {
    // Validate room name
    if (!roomName || roomName.trim().length === 0) {
      return failure(
        400,
        roomListErrorCodes.INVALID_ROOM_NAME,
        '방 이름을 입력해주세요',
      );
    }

    if (roomName.length > 100) {
      return failure(
        400,
        roomListErrorCodes.INVALID_ROOM_NAME,
        '방 이름은 100자 이내여야 합니다',
      );
    }

    // Create room
    const { data: room, error: createError } = await client
      .from('rooms')
      .insert([{ name: roomName.trim(), created_by: userId }])
      .select('id, name, created_by, created_at')
      .single();

    if (createError) {
      return failure(
        500,
        roomListErrorCodes.CREATE_ROOM_FAILED,
        createError.message,
      );
    }

    if (!room) {
      return failure(
        500,
        roomListErrorCodes.CREATE_ROOM_FAILED,
        'Room creation returned empty response',
      );
    }

    // Add creator as a room participant
    const { error: participantError } = await client
      .from('room_participants')
      .insert([{ room_id: room.id, user_id: userId }]);

    if (participantError) {
      return failure(
        500,
        roomListErrorCodes.CREATE_ROOM_FAILED,
        participantError.message,
      );
    }

    return success({
      id: room.id,
      name: room.name,
      created_by: room.created_by,
      created_at: room.created_at,
    });
  } catch (error) {
    return failure(
      500,
      roomListErrorCodes.CREATE_ROOM_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Leave a room (remove user from room_participants)
 */
export const leaveRoom = async (
  client: SupabaseClient,
  userId: string,
  roomId: string,
): Promise<HandlerResult<{ success: true }, RoomListErrorCode, unknown>> => {
  try {
    // Check if user is a participant
    const { data: participant, error: checkError } = await client
      .from('room_participants')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      return failure(
        500,
        roomListErrorCodes.LEAVE_ROOM_FAILED,
        checkError.message,
      );
    }

    if (!participant) {
      return failure(
        404,
        roomListErrorCodes.NOT_PARTICIPANT,
        '방의 참여자가 아닙니다',
      );
    }

    // Remove user from room_participants
    const { error: deleteError } = await client
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (deleteError) {
      return failure(
        500,
        roomListErrorCodes.LEAVE_ROOM_FAILED,
        deleteError.message,
      );
    }

    return success({ success: true });
  } catch (error) {
    return failure(
      500,
      roomListErrorCodes.LEAVE_ROOM_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};
