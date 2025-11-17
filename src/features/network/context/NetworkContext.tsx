'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import type { NetworkState } from '../types';
import {
  initialNetworkState,
  networkReducer,
} from './networkReducer';

interface NetworkContextType {
  state: NetworkState;
  dispatch: React.Dispatch<any>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(
  undefined,
);

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(
    networkReducer,
    initialNetworkState,
  );

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'NETWORK_ONLINE' });
    };

    const handleOffline = () => {
      dispatch({ type: 'NETWORK_OFFLINE' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ state, dispatch }}>
      {children}
    </NetworkContext.Provider>
  );
};

/**
 * useNetwork hook - Access network state and dispatch actions
 */
export const useNetwork = () => {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }

  const { state, dispatch } = context;

  const syncStart = useCallback(() => {
    dispatch({ type: 'SYNC_START' });
  }, [dispatch]);

  const syncSuccess = useCallback(() => {
    dispatch({ type: 'SYNC_SUCCESS' });
  }, [dispatch]);

  const syncError = useCallback((error: string) => {
    dispatch({ type: 'SYNC_ERROR', payload: error });
  }, [dispatch]);

  const retryIncrease = useCallback(() => {
    dispatch({ type: 'RETRY_INCREASE' });
  }, [dispatch]);

  const retryReset = useCallback(() => {
    dispatch({ type: 'RETRY_RESET' });
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, [dispatch]);

  return {
    // State
    isOnline: state.isOnline,
    syncStatus: state.syncStatus,
    retryCount: state.retryCount,
    backoffDelay: state.backoffDelay,
    error: state.error,
    lastSyncAttempt: state.lastSyncAttempt,
    isSyncing: state.syncStatus === 'syncing',
    hasError: state.syncStatus === 'error',

    // Actions
    syncStart,
    syncSuccess,
    syncError,
    retryIncrease,
    retryReset,
    clearError,
  };
};
