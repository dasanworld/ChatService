import type { SupabaseClient } from '@supabase/supabase-js';
import type { HandlerResult } from '@/backend/http/response';
import { success, failure } from '@/backend/http/response';
import { readReceiptErrorCodes } from './error';
import type { MarkReadResponse, ReadStatusResponse, RoomReadStatusResponse } from './schema';
import type { ReadReceiptErrorCode } from './error';

/**
 * Mark a message as read by the current user
 */
export const markMessageAsRead = async (
  client: SupabaseClient,
  messageId: string,
  userId: string,
): Promise<HandlerResult<MarkReadResponse, ReadReceiptErrorCode, unknown>> => {
  try {
    // Check if message exists
    const { data: message, error: messageError } = await client
      .from('messages')
      .select('id, room_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return failure(404, readReceiptErrorCodes.MESSAGE_NOT_FOUND, '메시지를 찾을 수 없습니다');
    }

    // Check if user is a participant of the room
    const { data: participant, error: participantError } = await client
      .from('room_participants')
      .select('room_id')
      .eq('room_id', message.room_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (participantError || !participant) {
      return failure(403, readReceiptErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    // Insert or update read receipt
    const { error } = await client
      .from('message_read_receipts')
      .upsert(
        {
          message_id: messageId,
          user_id: userId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: 'message_id,user_id',
        },
      );

    if (error) {
      return failure(500, readReceiptErrorCodes.READ_RECEIPT_FAILED, error.message);
    }

    return success({
      success: true,
    });
  } catch (error) {
    return failure(
      500,
      readReceiptErrorCodes.READ_RECEIPT_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Get read status for a single message
 */
export const getMessageReadStatus = async (
  client: SupabaseClient,
  messageId: string,
  userId: string,
): Promise<HandlerResult<ReadStatusResponse, ReadReceiptErrorCode, unknown>> => {
  try {
    // Check if message exists
    const { data: message, error: messageError } = await client
      .from('messages')
      .select('id, room_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return failure(404, readReceiptErrorCodes.MESSAGE_NOT_FOUND, '메시지를 찾을 수 없습니다');
    }

    // Check if user is a participant of the room
    const { data: participant, error: participantError } = await client
      .from('room_participants')
      .select('room_id')
      .eq('room_id', message.room_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (participantError || !participant) {
      return failure(403, readReceiptErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    // Get read receipts for this message
    const { data: receipts, error: receiptsError } = await client
      .from('message_read_receipts')
      .select(
        `user_id,
         read_at,
         user:user_id(user_metadata)`,
      )
      .eq('message_id', messageId)
      .order('read_at', { ascending: true });

    if (receiptsError) {
      return failure(500, readReceiptErrorCodes.FETCH_READ_STATUS_FAILED, receiptsError.message);
    }

    // Extract users with nicknames from user metadata
    const readBy = (receipts || [])
      .map((item: any) => ({
        user_id: item.user_id,
        nickname: item.user?.user_metadata?.nickname || 'Unknown',
        read_at: item.read_at,
      }))
      .filter((u) => u.user_id);

    return success({
      read_by: readBy,
    });
  } catch (error) {
    return failure(
      500,
      readReceiptErrorCodes.FETCH_READ_STATUS_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Get read status for all messages in a room
 */
export const getRoomReadStatus = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
): Promise<HandlerResult<RoomReadStatusResponse, ReadReceiptErrorCode, unknown>> => {
  try {
    // Check if user is a participant of the room
    const { data: participant, error: participantError } = await client
      .from('room_participants')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle();

    if (participantError || !participant) {
      return failure(403, readReceiptErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    // Get all messages in the room
    const { data: messages, error: messagesError } = await client
      .from('messages')
      .select('id')
      .eq('room_id', roomId);

    if (messagesError) {
      return failure(500, readReceiptErrorCodes.FETCH_READ_STATUS_FAILED, messagesError.message);
    }

    if (!messages || messages.length === 0) {
      return success({
        message_statuses: [],
      });
    }

    const messageIds = messages.map((m) => m.id);

    // Get all read receipts for these messages
    const { data: receipts, error: receiptsError } = await client
      .from('message_read_receipts')
      .select(
        `message_id,
         user_id,
         read_at,
         user:user_id(user_metadata)`,
      )
      .in('message_id', messageIds);

    if (receiptsError) {
      return failure(500, readReceiptErrorCodes.FETCH_READ_STATUS_FAILED, receiptsError.message);
    }

    // Group by message_id
    const statusMap = new Map<
      string,
      Array<{ user_id: string; nickname: string; read_at: string }>
    >();

    (receipts || []).forEach((item: any) => {
      const key = item.message_id;
      if (!statusMap.has(key)) {
        statusMap.set(key, []);
      }
      statusMap.get(key)!.push({
        user_id: item.user_id,
        nickname: item.user?.user_metadata?.nickname || 'Unknown',
        read_at: item.read_at,
      });
    });

    // Build message statuses
    const messageStatuses = messageIds.map((messageId) => ({
      message_id: messageId,
      read_by: statusMap.get(messageId) || [],
      read_count: statusMap.get(messageId)?.length || 0,
    }));

    return success({
      message_statuses: messageStatuses,
    });
  } catch (error) {
    return failure(
      500,
      readReceiptErrorCodes.FETCH_READ_STATUS_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};
