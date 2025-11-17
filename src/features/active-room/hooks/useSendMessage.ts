'use client';

import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { useActiveRoom } from '../context/ActiveRoomContext';
import type { MessageWithUser } from '@/features/message/backend/schema';

interface SendMessageOptions {
  replyToMessageId?: string;
}

/**
 * useSendMessage - Handles message sending with Optimistic UI
 *
 * Flow:
 * 1. Generate client_message_id for optimistic UI matching
 * 2. Create pending message and add to UI immediately
 * 3. Send message to server
 * 4. On success: replace pending with actual message
 * 5. On error: remove pending message
 */
export const useSendMessage = (roomId: string | null) => {
  const {
    addPendingMessage,
    removePendingMessage,
    replacePendingMessage,
    replyTarget,
    clearReplyTarget,
  } = useActiveRoom();

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string, options: SendMessageOptions = {}) => {
      if (!roomId) return;

      if (!content.trim()) {
        setError('메시지를 입력해주세요');
        return;
      }

      if (content.length > 5000) {
        setError('메시지는 5000자 이내여야 합니다');
        return;
      }

      try {
        setIsSending(true);
        setError(null);

        // Generate client message ID for Optimistic UI
        const clientMessageId = uuidv4();

        // Create optimistic message (will be updated with real data after server response)
        const optimisticMessage: MessageWithUser = {
          id: clientMessageId, // Temporary ID
          room_id: roomId,
          user_id: 'pending', // Will be replaced
          content,
          reply_to_message_id: options.replyToMessageId,
          like_count: 0,
          is_deleted: false,
          client_message_id: clientMessageId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: {
            id: 'pending',
            nickname: '나',
            avatar_url: null,
          },
        };

        // Show message immediately (Optimistic UI)
        addPendingMessage(clientMessageId, optimisticMessage);

        // Send to server
        const response = await apiClient.post(
          `/api/rooms/${roomId}/messages`,
          {
            content,
            client_message_id: clientMessageId,
            reply_to_message_id: options.replyToMessageId,
          },
        );

        const actualMessage: MessageWithUser = response.data.data;

        // Replace pending message with actual message from server
        replacePendingMessage(clientMessageId, actualMessage);

        // Clear reply target if set
        if (replyTarget) {
          clearReplyTarget();
        }

        return actualMessage;
      } catch (err) {
        const message = extractApiErrorMessage(err, '메시지 전송 실패');
        setError(message);

        // Remove pending message on error
        const clientMessageId = error ? undefined : uuidv4();
        if (clientMessageId) {
          removePendingMessage(clientMessageId);
        }

        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [
      roomId,
      addPendingMessage,
      removePendingMessage,
      replacePendingMessage,
      replyTarget,
      clearReplyTarget,
      error,
    ],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendMessage,
    isSending,
    error,
    clearError,
  };
};
