'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { apiClient } from '@/lib/remote/api-client';
import type { UserPresence } from '../backend/schema';

interface UsePresenceReturn {
  onlineUsers: UserPresence[];
}

const PRESENCE_UPDATE_INTERVAL_MS = 30000; // 30 seconds
const PRESENCE_POLL_INTERVAL_MS = 5000; // 5 seconds

/**
 * usePresence - Track and display online status of users in a room
 *
 * Usage:
 * const { onlineUsers } = usePresence(roomId);
 *
 * Will automatically:
 * - Update server that user is online every 30 seconds
 * - Poll for list of online users every 5 seconds
 */
export const usePresence = (roomId: string | null): UsePresenceReturn => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const presenceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presencePollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch online users from server
   */
  const fetchPresence = useCallback(async () => {
    if (!roomId) return;

    try {
      const response = await apiClient.get(
        `/api/rooms/${roomId}/presence`,
      );

      const { online_users } = response.data;
      setOnlineUsers(online_users || []);
    } catch (error) {
      // Silently fail for polling
    }
  }, [roomId]);

  /**
   * Update presence status on server
   */
  const updatePresence = useCallback(async (isOnline: boolean) => {
    if (!roomId) return;

    try {
      await apiClient.post(`/api/rooms/${roomId}/presence`, {
        is_online: isOnline,
      });
    } catch (error) {
      // Silently fail
    }
  }, [roomId]);

  /**
   * Set up presence tracking on mount
   */
  useEffect(() => {
    if (!roomId) return;

    // Update presence immediately on mount
    updatePresence(true);
    fetchPresence();

    // Set up interval for updating presence
    presenceUpdateIntervalRef.current = setInterval(() => {
      updatePresence(true);
    }, PRESENCE_UPDATE_INTERVAL_MS);

    // Set up interval for polling presence
    presencePollIntervalRef.current = setInterval(() => {
      fetchPresence();
    }, PRESENCE_POLL_INTERVAL_MS);

    return () => {
      if (presenceUpdateIntervalRef.current) {
        clearInterval(presenceUpdateIntervalRef.current);
      }

      if (presencePollIntervalRef.current) {
        clearInterval(presencePollIntervalRef.current);
      }
    };
  }, [roomId, updatePresence, fetchPresence]);

  /**
   * Cleanup on unmount - mark as offline
   */
  useEffect(() => {
    return () => {
      // Optional: mark as offline on unmount
      // updatePresence(false);
      // For now, we'll let the client stay marked as online until timeout
    };
  }, []);

  return {
    onlineUsers,
  };
};
