'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { apiClient } from '@/lib/remote/api-client';
import type { MessageReadStatus } from '../backend/schema';

interface UseReadReceiptsReturn {
  readStatuses: Map<string, MessageReadStatus>;
  markAsRead: (messageId: string) => Promise<void>;
}

const READ_RECEIPT_POLL_INTERVAL_MS = 5000; // 5 seconds

/**
 * useReadReceipts - Track and display message read receipts
 *
 * Usage:
 * const { readStatuses, markAsRead } = useReadReceipts(roomId);
 *
 * Then use readStatuses.get(messageId) to get read status for a message
 */
export const useReadReceipts = (roomId: string | null): UseReadReceiptsReturn => {
  const [readStatuses, setReadStatuses] = useState<Map<string, MessageReadStatus>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibleMessageIdsRef = useRef<Set<string>>(new Set());

  /**
   * Fetch read status for all messages in the room
   */
  const fetchReadStatus = useCallback(async () => {
    if (!roomId || visibleMessageIdsRef.current.size === 0) return;

    try {
      const response = await apiClient.get(
        `/api/rooms/${roomId}/read-status`,
      );

      const { message_statuses } = response.data.data;

      // Convert to map for quick lookup
      const statusMap = new Map<string, MessageReadStatus>();
      (message_statuses || []).forEach((status: MessageReadStatus) => {
        statusMap.set(status.message_id, status);
      });

      setReadStatuses(statusMap);
    } catch (error) {
      // Silently fail for polling
      console.debug('Failed to fetch read status');
    }
  }, [roomId]);

  /**
   * Mark a message as read
   */
  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!roomId) return;

      try {
        await apiClient.post(`/api/messages/${messageId}/read`, {});

        // Immediately update local state with optimistic update
        setReadStatuses((prev) => {
          const newMap = new Map(prev);
          const status = newMap.get(messageId);
          if (status) {
            newMap.set(messageId, {
              ...status,
              read_count: status.read_count + 1,
            });
          }
          return newMap;
        });
      } catch (error) {
        // Silently fail
        console.debug('Failed to mark message as read');
      }
    },
    [roomId],
  );

  /**
   * Track which messages are visible using Intersection Observer
   */
  useEffect(() => {
    if (!roomId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const messageId = entry.target.getAttribute('data-message-id');
          if (!messageId) return;

          if (entry.isIntersecting) {
            // Message is visible - mark as read
            visibleMessageIdsRef.current.add(messageId);
            markAsRead(messageId);
          } else {
            // Message is not visible anymore
            visibleMessageIdsRef.current.delete(messageId);
          }
        });
      },
      {
        threshold: 0.5, // At least 50% of message must be visible
      },
    );

    // Observe all message elements
    const messageElements = document.querySelectorAll('[data-message-id]');
    messageElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [roomId, markAsRead]);

  /**
   * Set up polling for read status updates
   */
  useEffect(() => {
    if (!roomId) return;

    // Fetch immediately
    fetchReadStatus();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchReadStatus();
    }, READ_RECEIPT_POLL_INTERVAL_MS);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [roomId, fetchReadStatus]);

  return {
    readStatuses,
    markAsRead,
  };
};
