import type { SupabaseClient } from '@supabase/supabase-js';
import type { HandlerResult } from '@/backend/http/response';
import { success, failure } from '@/backend/http/response';
import { messageErrorCodes } from './error';
import type { RoomSnapshot, MessageWithUser, LongPollingResponse, MessageHistory } from './schema';
import type { MessageErrorCode } from './error';

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
 * Get messages with user info
 */
const getMessagesWithUser = async (
  client: SupabaseClient,
  messageIds: string[],
): Promise<MessageWithUser[] | null> => {
  if (messageIds.length === 0) return [];

  // Fetch messages first
  const { data: messages, error: messagesError } = await client
    .from('messages')
    .select('id, room_id, user_id, content, reply_to_message_id, like_count, is_deleted, client_message_id, created_at, updated_at')
    .in('id', messageIds);

  if (messagesError || !messages) return null;

  // Fetch users separately
  const userIds = [...new Set(messages.map(m => m.user_id))];
  const { data: users, error: usersError } = await client
    .from('auth.users')
    .select('id, user_metadata')
    .in('id', userIds);

  if (usersError) return null;

  // Map user metadata to expected format
  const userMap = new Map(
    (users || []).map(u => [
      u.id,
      {
        id: u.id,
        nickname: (u.user_metadata?.nickname as string) || 'Unknown',
        avatar_url: (u.user_metadata?.avatar_url as string) || null,
      },
    ])
  );

  // Combine messages with user info
  return messages.map(msg => ({
    ...msg,
    user: userMap.get(msg.user_id) || { id: msg.user_id, nickname: 'Unknown', avatar_url: null },
  })) as MessageWithUser[];
};

/**
 * Get room snapshot (initial state for new connection)
 * Returns the 50 most recent messages
 */
export const getRoomSnapshot = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
): Promise<HandlerResult<RoomSnapshot, MessageErrorCode, unknown>> => {
  try {
    // Check if user is a participant
    const isParticipant = await isRoomParticipant(client, roomId, userId);
    if (!isParticipant) {
      return failure(403, messageErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    // Get the latest version from room_events
    const { data: latestEvent, error: versionError } = await client
      .from('room_events')
      .select('version')
      .eq('room_id', roomId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentVersion = latestEvent?.version ?? 0;

    // Get messages for this room
    const { data: messages, error: messagesError } = await client
      .from('messages')
      .select('id, room_id, user_id, content, reply_to_message_id, like_count, is_deleted, client_message_id, created_at, updated_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (messagesError) {
      return failure(500, messageErrorCodes.FETCH_SNAPSHOT_FAILED, messagesError.message);
    }

    // Fetch users separately
    const userIds = [...new Set((messages || []).map(m => m.user_id))];
    const { data: users, error: usersError } = await client
      .from('auth.users')
      .select('id, user_metadata')
      .in('id', userIds);

    if (usersError) {
      return failure(500, messageErrorCodes.FETCH_SNAPSHOT_FAILED, usersError.message);
    }

    // Map user metadata to expected format
    const userMap = new Map(
      (users || []).map(u => [
        u.id,
        {
          id: u.id,
          nickname: (u.user_metadata?.nickname as string) || 'Unknown',
          avatar_url: (u.user_metadata?.avatar_url as string) || null,
        },
      ])
    );

    // Combine messages with user info and reverse to show chronological order (oldest first)
    const messagesWithUsers = (messages || []).map(msg => ({
      ...msg,
      user: userMap.get(msg.user_id) || { id: msg.user_id, nickname: 'Unknown', avatar_url: null },
    })) as MessageWithUser[];
    const reversedMessages = messagesWithUsers.reverse();

    return success({
      room_id: roomId,
      version: currentVersion,
      messages: reversedMessages,
      total: reversedMessages.length,
      hasMore: (messages?.length ?? 0) === 50, // If we got 50, there might be more
    });
  } catch (error) {
    return failure(
      500,
      messageErrorCodes.FETCH_SNAPSHOT_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Create a new message
 */
export const createMessage = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
  content: string,
  clientMessageId?: string,
  replyToMessageId?: string,
): Promise<HandlerResult<MessageWithUser, MessageErrorCode, unknown>> => {
  try {
    // Validate content
    if (!content.trim()) {
      return failure(400, messageErrorCodes.INVALID_MESSAGE_CONTENT, '메시지 내용이 비어있습니다');
    }

    if (content.length > 5000) {
      return failure(400, messageErrorCodes.CONTENT_TOO_LONG, '메시지는 5000자 이내여야 합니다');
    }

    // Check if user is a participant
    const isParticipant = await isRoomParticipant(client, roomId, userId);
    if (!isParticipant) {
      return failure(403, messageErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    // Create message
    const { data: message, error: createError } = await client
      .from('messages')
      .insert([
        {
          room_id: roomId,
          user_id: userId,
          content: content.trim(),
          client_message_id: clientMessageId || null,
          reply_to_message_id: replyToMessageId || null,
        },
      ])
      .select(
        `id, room_id, user_id, content, reply_to_message_id, like_count, is_deleted, client_message_id, created_at, updated_at`,
      )
      .single();

    if (createError || !message) {
      return failure(500, messageErrorCodes.MESSAGE_CREATE_FAILED, createError?.message || 'Failed to create message');
    }

    // Get user info
    const { data: user, error: userError } = await client
      .from('profiles')
      .select('id, nickname, avatar_url')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return failure(500, messageErrorCodes.MESSAGE_CREATE_FAILED, 'Failed to fetch user info');
    }

    // Add event to room_events for Long Polling
    const { data: event } = await client
      .from('room_events')
      .insert([
        {
          room_id: roomId,
          event_type: 'message_created',
          payload: {
            message_id: message.id,
            user_id: userId,
            content: message.content,
            created_at: message.created_at,
          },
        },
      ])
      .select('version')
      .single();

    return success({
      ...message,
      user: {
        id: user.id,
        nickname: user.nickname || 'Unknown',
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    return failure(
      500,
      messageErrorCodes.MESSAGE_CREATE_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Get updates via Long Polling
 * Returns events since the given version
 */
export const getLongPollingUpdates = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
  sinceVersion: number,
): Promise<HandlerResult<LongPollingResponse, MessageErrorCode, unknown>> => {
  try {
    // Check if user is a participant
    const isParticipant = await isRoomParticipant(client, roomId, userId);
    if (!isParticipant) {
      return failure(403, messageErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    // Get events since version
    const { data: events, error: eventsError } = await client
      .from('room_events')
      .select('version, event_type, payload')
      .eq('room_id', roomId)
      .gt('version', sinceVersion)
      .order('version', { ascending: true })
      .limit(100);

    if (eventsError) {
      return failure(500, messageErrorCodes.POLLING_FAILED, eventsError.message);
    }

    if (!events || events.length === 0) {
      // No new events, return current version
      const { data: latestEvent } = await client
        .from('room_events')
        .select('version')
        .eq('room_id', roomId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      return success({
        version: latestEvent?.version ?? sinceVersion,
        events: [],
      });
    }

    // Get latest version
    const latestVersion = events[events.length - 1].version;

    // Fetch message details for message_created events
    const messageIds = events
      .filter((e) => e.event_type === 'message_created')
      .map((e) => e.payload.message_id)
      .filter(Boolean);

    let messagesMap: Record<string, MessageWithUser> = {};
    if (messageIds.length > 0) {
      const messagesWithUser = await getMessagesWithUser(client, messageIds);
      if (messagesWithUser) {
        messagesMap = Object.fromEntries(messagesWithUser.map((m) => [m.id, m]));
      }
    }

    // Build response events
    const responseEvents = events.map((e) => {
      if (e.event_type === 'message_created') {
        const message = messagesMap[e.payload.message_id];
        return {
          type: 'message_created',
          message,
          version: e.version,
        };
      }

      return {
        type: e.event_type,
        version: e.version,
      };
    });

    return success({
      version: latestVersion,
      events: responseEvents as any,
    });
  } catch (error) {
    return failure(
      500,
      messageErrorCodes.POLLING_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Get message history (pagination for loading older messages)
 */
export const getMessageHistory = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
  beforeMessageId?: string,
  limit: number = 50,
): Promise<HandlerResult<MessageHistory, MessageErrorCode, unknown>> => {
  try {
    // Check if user is a participant
    const isParticipant = await isRoomParticipant(client, roomId, userId);
    if (!isParticipant) {
      return failure(403, messageErrorCodes.NOT_ROOM_PARTICIPANT, '방의 참여자가 아닙니다');
    }

    let query = client
      .from('messages')
      .select('id, room_id, user_id, content, reply_to_message_id, like_count, is_deleted, client_message_id, created_at, updated_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    // If beforeMessageId provided, fetch older messages
    if (beforeMessageId) {
      const { data: beforeMessage } = await client
        .from('messages')
        .select('created_at')
        .eq('id', beforeMessageId)
        .single();

      if (beforeMessage) {
        query = query.lt('created_at', beforeMessage.created_at);
      }
    }

    const { data: messages, error: messagesError } = await query.limit(limit + 1);

    if (messagesError) {
      return failure(500, messageErrorCodes.FETCH_HISTORY_FAILED, messagesError.message);
    }

    const hasMore = (messages?.length ?? 0) > limit;
    const result = hasMore ? messages!.slice(0, limit) : messages || [];

    // Fetch users separately
    const userIds = [...new Set(result.map(m => m.user_id))];
    const { data: users, error: usersError } = await client
      .from('auth.users')
      .select('id, user_metadata')
      .in('id', userIds);

    if (usersError) {
      return failure(500, messageErrorCodes.FETCH_HISTORY_FAILED, usersError.message);
    }

    // Map user metadata to expected format
    const userMap = new Map(
      (users || []).map(u => [
        u.id,
        {
          id: u.id,
          nickname: (u.user_metadata?.nickname as string) || 'Unknown',
          avatar_url: (u.user_metadata?.avatar_url as string) || null,
        },
      ])
    );

    // Combine messages with user info
    const messagesWithUsers = result.map(msg => ({
      ...msg,
      user: userMap.get(msg.user_id) || { id: msg.user_id, nickname: 'Unknown', avatar_url: null },
    })) as MessageWithUser[];

    // Reverse to show chronological order
    messagesWithUsers.reverse();

    return success({
      messages: messagesWithUsers,
      total: messagesWithUsers.length,
      hasMore,
    });
  } catch (error) {
    return failure(
      500,
      messageErrorCodes.FETCH_HISTORY_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

/**
 * Delete a message (soft delete for user or hard delete for all)
 */
export const deleteMessage = async (
  client: SupabaseClient,
  messageId: string,
  userId: string,
  deleteForAll: boolean = false,
): Promise<HandlerResult<{ success: true }, MessageErrorCode, unknown>> => {
  try {
    const { data: message, error: fetchError } = await client
      .from('messages')
      .select('id, user_id, room_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return failure(404, messageErrorCodes.MESSAGE_NOT_FOUND, '메시지를 찾을 수 없습니다');
    }

    // Check authorization
    if (!deleteForAll && message.user_id !== userId) {
      return failure(403, messageErrorCodes.FORBIDDEN, '자신의 메시지만 삭제할 수 있습니다');
    }

    if (deleteForAll && message.user_id !== userId) {
      return failure(403, messageErrorCodes.FORBIDDEN, '메시지 소유자만 모두에게 삭제 가능합니다');
    }

    if (deleteForAll) {
      // Hard delete: mark as deleted
      const { error: updateError } = await client
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (updateError) {
        return failure(500, messageErrorCodes.MESSAGE_DELETE_FAILED, updateError.message);
      }
    } else {
      // Soft delete: add to hidden_messages
      const { error: hideError } = await client
        .from('hidden_messages')
        .insert([{ message_id: messageId, user_id: userId }]);

      if (hideError) {
        return failure(500, messageErrorCodes.MESSAGE_DELETE_FAILED, hideError.message);
      }
    }

    return success({ success: true });
  } catch (error) {
    return failure(
      500,
      messageErrorCodes.MESSAGE_DELETE_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};
