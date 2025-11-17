'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
} from 'react';
import type { UIState, UIAction, Toast } from '../types';
import { initialUIState, uiReducer } from './uiReducer';

interface UIContextType {
  state: UIState;
  dispatch: React.Dispatch<UIAction>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

interface UIProviderProps {
  children: ReactNode;
}

export const UIProvider: React.FC<UIProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(uiReducer, initialUIState);

  return (
    <UIContext.Provider value={{ state, dispatch }}>
      {children}
    </UIContext.Provider>
  );
};

/**
 * useUI hook - Access UI state and dispatch actions
 */
export const useUI = () => {
  const context = useContext(UIContext);

  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }

  const { state, dispatch } = context;

  // Modal actions
  const openModal = useCallback(
    (modalName: keyof typeof state.modals) => {
      dispatch({ type: 'OPEN_MODAL', payload: modalName });
    },
    [dispatch],
  );

  const closeModal = useCallback(
    (modalName: keyof typeof state.modals) => {
      dispatch({ type: 'CLOSE_MODAL', payload: modalName });
    },
    [dispatch],
  );

  // Toast actions
  const showToast = useCallback(
    (
      type: Toast['type'],
      message: string,
      duration?: number,
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, type, message };

      dispatch({ type: 'ADD_TOAST', payload: toast });

      // Auto-remove toast after duration
      if (duration) {
        setTimeout(() => {
          dispatch({ type: 'REMOVE_TOAST', payload: id });
        }, duration);
      }

      return id;
    },
    [dispatch],
  );

  const hideToast = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    },
    [dispatch],
  );

  const clearToasts = useCallback(() => {
    dispatch({ type: 'CLEAR_TOASTS' });
  }, [dispatch]);

  // Chat room actions
  const openChatRoom = useCallback(
    (roomId: string) => {
      dispatch({ type: 'SET_CHAT_ROOM', payload: roomId });
      dispatch({ type: 'OPEN_MODAL', payload: 'chatRoom' });
    },
    [dispatch],
  );

  const closeChatRoom = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL', payload: 'chatRoom' });
    dispatch({ type: 'SET_CHAT_ROOM', payload: null });
  }, [dispatch]);

  return {
    // State
    modals: state.modals,
    toasts: state.toasts,
    currentChatRoomId: state.currentChatRoomId,

    // Modal actions
    openModal,
    closeModal,
    isModalOpen: (modalName: keyof typeof state.modals) =>
      state.modals[modalName],

    // Toast actions
    showToast,
    hideToast,
    clearToasts,

    // Chat room actions
    openChatRoom,
    closeChatRoom,
  };
};
