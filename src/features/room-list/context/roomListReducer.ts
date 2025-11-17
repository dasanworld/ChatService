import type { RoomListState, RoomListAction } from '../types';

export const initialRoomListState: RoomListState = {
  rooms: [],
  status: 'idle',
  error: null,
};

export const roomListReducer = (
  state: RoomListState,
  action: RoomListAction,
): RoomListState => {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        status: 'loading',
        error: null,
      };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        rooms: action.payload,
        status: 'loaded',
        error: null,
      };

    case 'FETCH_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.payload,
      };

    case 'ADD_ROOM':
      // Add new room to the beginning of the list
      return {
        ...state,
        rooms: [action.payload, ...state.rooms],
      };

    case 'REMOVE_ROOM':
      // Remove room by ID
      return {
        ...state,
        rooms: state.rooms.filter((room) => room.id !== action.payload),
      };

    case 'RESET_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};
