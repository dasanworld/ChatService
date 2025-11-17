import type { NetworkState, NetworkAction } from '../types';
import { calculateBackoffDelay } from '../types';

export const initialNetworkState: NetworkState = {
  // Avoid reading navigator during SSR to keep HTML consistent
  isOnline: true,
  syncStatus: 'idle',
  lastSyncAttempt: null,
  retryCount: 0,
  backoffDelay: 0,
  error: null,
};

export const networkReducer = (
  state: NetworkState,
  action: NetworkAction,
): NetworkState => {
  switch (action.type) {
    case 'NETWORK_ONLINE':
      return {
        ...state,
        isOnline: true,
        error: null,
        retryCount: 0,
        backoffDelay: 0,
      };

    case 'NETWORK_OFFLINE':
      return {
        ...state,
        isOnline: false,
        syncStatus: 'error',
        error: '네트워크 연결이 끊어졌습니다',
      };

    case 'SYNC_START':
      return {
        ...state,
        syncStatus: 'syncing',
        lastSyncAttempt: Date.now(),
        error: null,
      };

    case 'SYNC_SUCCESS':
      return {
        ...state,
        syncStatus: 'idle',
        retryCount: 0,
        backoffDelay: 0,
        error: null,
      };

    case 'SYNC_ERROR':
      const newRetryCount = state.retryCount + 1;
      const newBackoffDelay = calculateBackoffDelay(newRetryCount);
      return {
        ...state,
        syncStatus: 'error',
        error: action.payload,
        retryCount: newRetryCount,
        backoffDelay: newBackoffDelay,
      };

    case 'RETRY_INCREASE':
      const increasedRetryCount = state.retryCount + 1;
      const increasedDelay = calculateBackoffDelay(increasedRetryCount);
      return {
        ...state,
        retryCount: increasedRetryCount,
        backoffDelay: increasedDelay,
      };

    case 'RETRY_RESET':
      return {
        ...state,
        retryCount: 0,
        backoffDelay: 0,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};
