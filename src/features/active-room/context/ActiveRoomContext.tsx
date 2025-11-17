'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
} from 'react';
import type { ActiveRoomState, MessageWithUser } from '../types';
import {
  initialActiveRoomState,
  activeRoomReducer,
} from './activeRoomReducer';

interface ActiveRoomContextType {
  state: ActiveRoomState;
  dispatch: React.Dispatch<any>;
}

const ActiveRoomContext = createContext<ActiveRoomContextType | undefined>(
  undefined,
);

interface ActiveRoomProviderProps {
  children: ReactNode;
}

export const ActiveRoomProvider: React.FC<ActiveRoomProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(
    activeRoomReducer,
    initialActiveRoomState,
  );

  return (
    <ActiveRoomContext.Provider value={{ state, dispatch }}>
      {children}
    </ActiveRoomContext.Provider>
  );
};

/**
 * useActiveRoom hook - Access active room state and dispatch actions
 */
export const useActiveRoom = () => {
  const context = useContext(ActiveRoomContext);

  if (!context) {
    throw new Error('useActiveRoom must be used within ActiveRoomProvider');
  }

  const { state, dispatch } = context;

  // Room actions
  const setRoom = useCallback(
    (roomId: string) => {
      dispatch({ type: 'ROOM_SET', payload: roomId });
    },
    [dispatch],
  );

  const clearRoom = useCallback(() => {
    dispatch({ type: 'ROOM_CLEAR' });
  }, [dispatch]);

  // Snapshot actions
  const receiveSnapshot = useCallback(
    (messages: MessageWithUser[], version: number, hasMore: boolean) => {
      dispatch({
        type: 'SNAPSHOT_RECEIVED',
        payload: { messages, version, hasMore },
      });
    },
    [dispatch],
  );

  // Polling actions
  const pollingStart = useCallback(() => {
    dispatch({ type: 'POLLING_START' });
  }, [dispatch]);

  const pollingSuccess = useCallback(
    (messages: MessageWithUser[], version: number) => {
      dispatch({
        type: 'POLLING_SUCCESS',
        payload: { messages, version },
      });
    },
    [dispatch],
  );

  const setPollingError = useCallback(
    (error: string) => {
      dispatch({ type: 'POLLING_ERROR', payload: error });
    },
    [dispatch],
  );

  // Load liked messages
  const loadLikedMessages = useCallback(
    (messageIds: string[]) => {
      dispatch({ type: 'LIKED_MESSAGES_LOADED', payload: messageIds });
    },
    [dispatch],
  );

  // Message actions
  const addPendingMessage = useCallback(
    (clientMessageId: string, message: MessageWithUser) => {
      dispatch({
        type: 'MESSAGE_ADD_PENDING',
        payload: { clientMessageId, message },
      });
    },
    [dispatch],
  );

  const removePendingMessage = useCallback(
    (clientMessageId: string) => {
      dispatch({ type: 'MESSAGE_REMOVE_PENDING', payload: clientMessageId });
    },
    [dispatch],
  );

  const replacePendingMessage = useCallback(
    (clientMessageId: string, message: MessageWithUser) => {
      dispatch({
        type: 'MESSAGE_REPLACE_PENDING',
        payload: { clientMessageId, message },
      });
    },
    [dispatch],
  );

  const addMessage = useCallback(
    (message: MessageWithUser) => {
      dispatch({ type: 'MESSAGE_ADD', payload: message });
    },
    [dispatch],
  );

  const updateMessage = useCallback(
    (message: MessageWithUser) => {
      dispatch({ type: 'MESSAGE_UPDATE', payload: message });
    },
    [dispatch],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      dispatch({ type: 'MESSAGE_DELETE', payload: messageId });
    },
    [dispatch],
  );

  const hideMessage = useCallback(
    (messageId: string) => {
      dispatch({ type: 'MESSAGE_HIDE', payload: messageId });
    },
    [dispatch],
  );

  const unhideMessage = useCallback(
    (messageId: string) => {
      dispatch({ type: 'MESSAGE_UNHIDE', payload: messageId });
    },
    [dispatch],
  );

  // History actions
  const loadHistory = useCallback(
    (messages: MessageWithUser[], hasMore: boolean) => {
      dispatch({
        type: 'HISTORY_RECEIVED',
        payload: { messages, hasMore },
      });
    },
    [dispatch],
  );

  // Like actions
  const toggleLike = useCallback(
    (messageId: string) => {
      dispatch({ type: 'MESSAGE_LIKE_TOGGLE', payload: messageId });
    },
    [dispatch],
  );

  // Reply target actions
  const setReplyTarget = useCallback(
    (message: MessageWithUser) => {
      dispatch({ type: 'REPLY_TARGET_SET', payload: message });
    },
    [dispatch],
  );

  const clearReplyTarget = useCallback(() => {
    dispatch({ type: 'REPLY_TARGET_CLEAR' });
  }, [dispatch]);

  // Reset
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  return {
    // State
    roomId: state.roomId,
    messages: state.messages,
    pendingMessages: state.pendingMessages,
    lastSyncVersion: state.lastSyncVersion,
    pollingStatus: state.pollingStatus,
    pollingError: state.pollingError,
    likedMessageIds: state.likedMessageIds,
    hiddenMessageIds: state.hiddenMessageIds,
    replyTarget: state.replyTarget,
    hasMoreHistory: state.hasMoreHistory,
    isLoadingHistory: state.isLoadingHistory,
    isSnapshotLoaded: state.isSnapshotLoaded,

    // Computed
    isLive: state.pollingStatus === 'live',
    isCatchup: state.pollingStatus === 'catchup',
    hasError: state.pollingStatus === 'error',
    visibleMessages: state.messages.filter(
      (msg) => !state.hiddenMessageIds.has(msg.id),
    ),

    // Actions
    setRoom,
    clearRoom,
    receiveSnapshot,
    pollingStart,
    pollingSuccess,
    setPollingError,
    loadLikedMessages,
    addPendingMessage,
    removePendingMessage,
    replacePendingMessage,
    addMessage,
    updateMessage,
    deleteMessage,
    hideMessage,
    unhideMessage,
    loadHistory,
    toggleLike,
    setReplyTarget,
    clearReplyTarget,
    reset,
  };
};
