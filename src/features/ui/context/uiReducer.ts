import type { UIState, UIAction, Toast } from '../types';

export const initialUIState: UIState = {
  modals: {
    createRoom: false,
    leaveRoom: false,
    confirmDelete: false,
    chatRoom: false,
  },
  toasts: [],
  currentChatRoomId: null,
};

export const uiReducer = (
  state: UIState,
  action: UIAction,
): UIState => {
  switch (action.type) {
    case 'OPEN_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload]: true,
        },
      };

    case 'CLOSE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload]: false,
        },
      };

    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.payload),
      };

    case 'CLEAR_TOASTS':
      return {
        ...state,
        toasts: [],
      };

    case 'SET_CHAT_ROOM':
      return {
        ...state,
        currentChatRoomId: action.payload,
      };

    default:
      return state;
  }
};
