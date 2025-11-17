'use client';

import { useState, useCallback } from 'react';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { useActiveRoom } from '../context/ActiveRoomContext';

/**
 * useLikeMessage - Hook for toggling like on a message
 */
export const useLikeMessage = () => {
  const { toggleLike } = useActiveRoom();
  const [isLiking, setIsLiking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const likeMessage = useCallback(
    async (messageId: string) => {
      if (isLiking) return;

      try {
        setIsLiking(true);
        setError(null);

        // Optimistic update
        toggleLike(messageId);

        // API call
        const response = await apiClient.post(`/api/messages/${messageId}/like`);
        const { liked, likeCount } = response.data;

        // Sync with server response (in case optimistic update was wrong)
        // This ensures UI matches server state
        // Note: like count will be synced via long polling or next snapshot
      } catch (err) {
        // Revert optimistic update on error
        toggleLike(messageId);

        const message = extractApiErrorMessage(err, '좋아요 처리 실패');
        setError(message);
        throw err;
      } finally {
        setIsLiking(false);
      }
    },
    [isLiking, toggleLike],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    likeMessage,
    isLiking,
    error,
    clearError,
  };
};
