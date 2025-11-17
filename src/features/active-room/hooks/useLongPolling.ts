'use client';

import { useEffect, useRef, useCallback } from 'react';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { useActiveRoom } from '../context/ActiveRoomContext';
import { useNetwork } from '@/features/network/context/NetworkContext';
import type { LongPollingResponse } from '@/features/message/backend/schema';

const POLLING_TIMEOUT = 30000; // 30 seconds

/**
 * useLongPolling - Handles real-time message synchronization via Long Polling
 *
 * Flow:
 * 1. Fetch snapshot (initial messages) when room changes
 * 2. Start polling for new events
 * 3. Handle online/offline transitions
 * 4. Exponential backoff on errors
 */
export const useLongPolling = (roomId: string | null) => {
  const {
    receiveSnapshot,
    pollingStart,
    pollingSuccess,
    setPollingError,
    lastSyncVersion,
    loadLikedMessages,
    isSnapshotLoaded,
  } = useActiveRoom();

  const { isOnline, syncStart, syncSuccess, syncError, backoffDelay } = useNetwork();

  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const snapshotFetchedRef = useRef(false);

  /**
   * Fetch initial room snapshot
   */
  const fetchSnapshot = useCallback(async () => {
    if (!roomId || snapshotFetchedRef.current) return;

    try {
      syncStart();
      pollingStart();

      const response = await apiClient.get(`/api/rooms/${roomId}`);
      const { messages, version, hasMore } = response.data;

      receiveSnapshot(messages, version, hasMore);
      snapshotFetchedRef.current = true;
      syncSuccess();

      // Fetch liked messages
      try {
        const likesResponse = await apiClient.get(`/api/rooms/${roomId}/likes`);
        const { likedMessageIds } = likesResponse.data;
        loadLikedMessages(likedMessageIds || []);
      } catch (err) {
        console.error('Failed to load liked messages:', err);
      }
    } catch (error) {
      const message = extractApiErrorMessage(error, 'Snapshot 로드 실패');
      setPollingError(message);
      syncError(message);
    }
  }, [
    roomId,
    receiveSnapshot,
    pollingStart,
    setPollingError,
    syncStart,
    syncSuccess,
    syncError,
    loadLikedMessages,
  ]);

  /**
   * Perform Long Polling request
   */
  const poll = useCallback(async () => {
    if (!roomId || !snapshotFetchedRef.current || !isOnline) return;

    try {
      syncStart();
      pollingStart();

      const response = await apiClient.get<LongPollingResponse>(
        `/api/rooms/${roomId}/messages/longpoll`,
        {
          params: { sinceVersion: lastSyncVersion },
          timeout: POLLING_TIMEOUT,
        },
      );

      const { events, version } = response.data;

      // Filter and extract messages from events
      const newMessages = events
        .filter((event) => event.message)
        .map((event) => event.message!);

      if (newMessages.length > 0 || version > lastSyncVersion) {
        pollingSuccess(newMessages, version);
      }

      syncSuccess();

      // Schedule next polling
      scheduleNextPoll();
    } catch (error) {
      const message = extractApiErrorMessage(error, 'Long Polling 오류');
      setPollingError(message);
      syncError(message);

      // Retry with backoff
      scheduleRetry();
    }
  }, [
    roomId,
    lastSyncVersion,
    isOnline,
    pollingStart,
    pollingSuccess,
    setPollingError,
    syncStart,
    syncSuccess,
    syncError,
  ]);

  /**
   * Schedule next polling with retry backoff
   */
  const scheduleNextPoll = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }

    // Short delay before next poll
    pollingTimeoutRef.current = setTimeout(() => {
      poll();
    }, 1000);
  }, [poll]);

  /**
   * Schedule retry with exponential backoff
   */
  const scheduleRetry = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }

    pollingTimeoutRef.current = setTimeout(() => {
      poll();
    }, backoffDelay);
  }, [poll, backoffDelay]);

  // Fetch snapshot on mount, room change, or when state reset (isSnapshotLoaded=false)
  useEffect(() => {
    if (!roomId) {
      snapshotFetchedRef.current = false;
      return;
    }

    // Reset local flag when higher-level state is cleared (e.g., refresh)
    if (!isSnapshotLoaded) {
      snapshotFetchedRef.current = false;
    }

    if (!snapshotFetchedRef.current) {
      fetchSnapshot();
    }
  }, [roomId, fetchSnapshot, isSnapshotLoaded]);

  // Start polling after snapshot is fetched
  useEffect(() => {
    if (snapshotFetchedRef.current && isOnline) {
      scheduleNextPoll();
    }

    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [isOnline, scheduleNextPoll]);

  // Handle offline/online transitions
  useEffect(() => {
    if (!isOnline && pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      setPollingError('네트워크 연결이 끊어졌습니다');
    } else if (isOnline && snapshotFetchedRef.current) {
      // Resume polling
      scheduleNextPoll();
    }
  }, [isOnline, setPollingError, scheduleNextPoll]);

  return {
    isSnapshotFetched: snapshotFetchedRef.current,
  };
};
