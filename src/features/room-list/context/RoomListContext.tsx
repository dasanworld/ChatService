'use client';

import React, {
  createContext,
  useContext,
  useReducer,
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

  return (
    <RoomListContext.Provider value={{ state, dispatch }}>
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

  const { state, dispatch } = context;

  return {
    // State
    rooms: state.rooms,
    status: state.status,
    error: state.error,
    isLoading: state.status === 'loading',
    isEmpty: state.rooms.length === 0,

    // Actions
    fetchStart: () => dispatch({ type: 'FETCH_START' }),
    fetchSuccess: (rooms: Room[]) =>
      dispatch({ type: 'FETCH_SUCCESS', payload: rooms }),
    fetchError: (error: string) =>
      dispatch({ type: 'FETCH_ERROR', payload: error }),
    addRoom: (room: Room) =>
      dispatch({ type: 'ADD_ROOM', payload: room }),
    removeRoom: (roomId: string) =>
      dispatch({ type: 'REMOVE_ROOM', payload: roomId }),
    resetError: () => dispatch({ type: 'RESET_ERROR' }),
  };
};
