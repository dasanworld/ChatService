'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import type { RoomListState, RoomListAction, Room } from '../types';
import {
  initialRoomListState,
  roomListReducer,
} from './roomListReducer';

interface RoomListContextType {
  state: RoomListState;
  dispatch: React.Dispatch<RoomListAction>;
  // Memoized action creators
  fetchStart: () => void;
  fetchSuccess: (rooms: Room[]) => void;
  fetchError: (error: string) => void;
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  resetError: () => void;
}

const RoomListContext = createContext<RoomListContextType | undefined>(
  undefined,
);

interface RoomListProviderProps {
  children: ReactNode;
}

export const RoomListProvider: React.FC<RoomListProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(
    roomListReducer,
    initialRoomListState,
  );

  // Memoize action creators to prevent infinite loops
  const fetchStart = useCallback(() => {
    dispatch({ type: 'FETCH_START' });
  }, []);

  const fetchSuccess = useCallback((rooms: Room[]) => {
    dispatch({ type: 'FETCH_SUCCESS', payload: rooms });
  }, []);

  const fetchError = useCallback((error: string) => {
    dispatch({ type: 'FETCH_ERROR', payload: error });
  }, []);

  const addRoom = useCallback((room: Room) => {
    dispatch({ type: 'ADD_ROOM', payload: room });
  }, []);

  const removeRoom = useCallback((roomId: string) => {
    dispatch({ type: 'REMOVE_ROOM', payload: roomId });
  }, []);

  const resetError = useCallback(() => {
    dispatch({ type: 'RESET_ERROR' });
  }, []);

  // Memoize context value
  const value = useMemo<RoomListContextType>(() => ({
    state,
    dispatch,
    fetchStart,
    fetchSuccess,
    fetchError,
    addRoom,
    removeRoom,
    resetError,
  }), [state, fetchStart, fetchSuccess, fetchError, addRoom, removeRoom, resetError]);

  return (
    <RoomListContext.Provider value={value}>
      {children}
    </RoomListContext.Provider>
  );
};

/**
 * useRoomList hook - Access room list state and dispatch actions
 */
export const useRoomList = () => {
  const context = useContext(RoomListContext);

  if (!context) {
    throw new Error(
      'useRoomList must be used within RoomListProvider',
    );
  }

  const { state, fetchStart, fetchSuccess, fetchError, addRoom, removeRoom, resetError } = context;

  return {
    // State
    rooms: state.rooms,
    status: state.status,
    error: state.error,
    isLoading: state.status === 'loading',
    isEmpty: state.rooms.length === 0,

    // Memoized actions
    fetchStart,
    fetchSuccess,
    fetchError,
    addRoom,
    removeRoom,
    resetError,
  };
};
