'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import type { TypingUser } from '../backend/schema';

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  handleTyping: () => void;
}

const TYPING_DEBOUNCE_MS = 3000; // 3 seconds
const TYPING_POLL_INTERVAL_MS = 2000; // 2 seconds

/**
 * useTypingIndicator - Track and display typing indicators
 *
 * Usage:
 * const { typingUsers, handleTyping } = useTypingIndicator(roomId);
 *
 * Then call handleTyping() on input onChange
 */
export const useTypingIndicator = (roomId: string | null): UseTypingIndicatorReturn => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  /**
   * Fetch typing users from server
   */
  const fetchTypingUsers = useCallback(async () => {
    if (!roomId) return;

    try {
      const response = await apiClient.get(
        `/api/rooms/${roomId}/typing`,
      );

      const { typing_users } = response.data;
      setTypingUsers(typing_users || []);
    } catch (error) {
      // Silently fail for polling
      console.debug('Failed to fetch typing users');
    }
  }, [roomId]);

  /**
   * Notify server that user is typing
   */
  const notifyTyping = useCallback(async (isTyping: boolean) => {
    if (!roomId) return;

    try {
      await apiClient.post(`/api/rooms/${roomId}/typing`, {
        is_typing: isTyping,
      });
    } catch (error) {
      // Silently fail
      console.debug('Failed to update typing status');
    }
  }, [roomId]);

  /**
   * Handle typing event with debouncing
   */
  const handleTyping = useCallback(() => {
    if (!roomId) return;

    // Mark as typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      notifyTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to mark as not typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      notifyTyping(false);
    }, TYPING_DEBOUNCE_MS);
  }, [roomId, notifyTyping]);

  /**
   * Start polling for typing users on component mount
   */
  useEffect(() => {
    if (!roomId) return;

    // Fetch immediately
    fetchTypingUsers();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchTypingUsers();
    }, TYPING_POLL_INTERVAL_MS);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [roomId, fetchTypingUsers]);

  /**
   * Cleanup on unmount - notify server that user stopped typing
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTypingRef.current) {
        notifyTyping(false);
      }
    };
  }, [notifyTyping]);

  return {
    typingUsers,
    handleTyping,
  };
};
