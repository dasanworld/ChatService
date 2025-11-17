/**
 * Network State Management Types
 * Handles global network connectivity and sync status
 */

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface NetworkState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncAttempt: number | null; // Timestamp
  retryCount: number;
  backoffDelay: number; // ms
  error: string | null;
}

export type NetworkAction =
  | { type: 'NETWORK_ONLINE' }
  | { type: 'NETWORK_OFFLINE' }
  | { type: 'SYNC_START' }
  | { type: 'SYNC_SUCCESS' }
  | { type: 'SYNC_ERROR'; payload: string }
  | { type: 'RETRY_INCREASE' }
  | { type: 'RETRY_RESET' }
  | { type: 'CLEAR_ERROR' };

/**
 * Exponential backoff calculation
 * Base: 1000ms, Max: 30000ms, Factor: 1.5
 */
export const calculateBackoffDelay = (retryCount: number): number => {
  const baseDelay = 1000;
  const maxDelay = 30000;
  const factor = 1.5;

  const delay = Math.min(
    baseDelay * Math.pow(factor, retryCount),
    maxDelay,
  );

  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(100, Math.round(delay + jitter));
};
