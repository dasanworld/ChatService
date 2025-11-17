import type { ActiveRoomState, ActiveRoomAction, MessageWithUser } from '../types';

export const initialActiveRoomState: ActiveRoomState = {
  roomId: null,
  messages: [],
  pendingMessages: new Map(),
  lastSyncVersion: 0,
  pollingStatus: 'idle',
  pollingError: null,
  likedMessageIds: new Set(),
  hiddenMessageIds: new Set(),
  replyTarget: null,
  hasMoreHistory: false,
  isLoadingHistory: false,
  isSnapshotLoaded: false,
};

export const activeRoomReducer = (
  state: ActiveRoomState,
  action: ActiveRoomAction,
): ActiveRoomState => {
  switch (action.type) {
    case 'ROOM_SET':
      return {
        ...initialActiveRoomState,
        roomId: action.payload,
      };

    case 'ROOM_CLEAR':
      return initialActiveRoomState;

    case 'SNAPSHOT_RECEIVED':
      return {
        ...state,
        messages: action.payload.messages,
        lastSyncVersion: action.payload.version,
        hasMoreHistory: action.payload.hasMore,
        pollingStatus: 'live',
        pollingError: null,
        isSnapshotLoaded: true,
      };

    case 'POLLING_START':
      return {
        ...state,
        pollingStatus: 'live',
      };

    case 'POLLING_SUCCESS': {
      const newMessages = [...state.messages];

      // Add new messages from polling
      for (const msg of action.payload.messages) {
        // Check if message already exists
        const existingIndex = newMessages.findIndex((m) => m.id === msg.id);
        if (existingIndex >= 0) {
          // Update existing message
          newMessages[existingIndex] = msg;
        } else {
          // Add new message
          newMessages.push(msg);
        }
      }

      return {
        ...state,
        messages: newMessages,
        lastSyncVersion: action.payload.version,
        pollingStatus: 'live',
        pollingError: null,
      };
    }

    case 'POLLING_CATCHUP':
      return {
        ...state,
        pollingStatus: 'catchup',
      };

    case 'POLLING_ERROR':
      return {
        ...state,
        pollingStatus: 'error',
        pollingError: action.payload,
      };

    case 'MESSAGE_ADD_PENDING': {
      const newPending = new Map(state.pendingMessages);
      newPending.set(action.payload.clientMessageId, action.payload.message);
      return {
        ...state,
        pendingMessages: newPending,
      };
    }

    case 'MESSAGE_REMOVE_PENDING': {
      const newPending = new Map(state.pendingMessages);
      newPending.delete(action.payload);
      return {
        ...state,
        pendingMessages: newPending,
      };
    }

    case 'MESSAGE_REPLACE_PENDING': {
      const newMessages = state.messages.map((msg) => {
        if (msg.client_message_id === action.payload.clientMessageId) {
          return action.payload.message;
        }
        return msg;
      });

      const newPending = new Map(state.pendingMessages);
      newPending.delete(action.payload.clientMessageId);

      return {
        ...state,
        messages: newMessages,
        pendingMessages: newPending,
      };
    }

    case 'MESSAGE_ADD': {
      const newMessages = [...state.messages];
      const existingIndex = newMessages.findIndex((m) => m.id === action.payload.id);

      if (existingIndex >= 0) {
        // Message already exists, update it
        newMessages[existingIndex] = action.payload;
      } else {
        // New message, append it
        newMessages.push(action.payload);
      }

      return {
        ...state,
        messages: newMessages,
      };
    }

    case 'MESSAGE_UPDATE': {
      const newMessages = state.messages.map((msg) => {
        if (msg.id === action.payload.id) {
          return action.payload;
        }
        return msg;
      });

      return {
        ...state,
        messages: newMessages,
      };
    }

    case 'MESSAGE_DELETE': {
      const newMessages = state.messages.map((msg) => {
        if (msg.id === action.payload) {
          return { ...msg, is_deleted: true };
        }
        return msg;
      });

      return {
        ...state,
        messages: newMessages,
      };
    }

    case 'MESSAGE_HIDE': {
      const newHidden = new Set(state.hiddenMessageIds);
      newHidden.add(action.payload);
      return {
        ...state,
        hiddenMessageIds: newHidden,
      };
    }

    case 'MESSAGE_UNHIDE': {
      const newHidden = new Set(state.hiddenMessageIds);
      newHidden.delete(action.payload);
      return {
        ...state,
        hiddenMessageIds: newHidden,
      };
    }

    case 'HISTORY_START':
      return {
        ...state,
        isLoadingHistory: true,
      };

    case 'HISTORY_RECEIVED': {
      // Prepend older messages
      const newMessages = [...action.payload.messages, ...state.messages];
      return {
        ...state,
        messages: newMessages,
        hasMoreHistory: action.payload.hasMore,
        isLoadingHistory: false,
      };
    }

    case 'MESSAGE_LIKE_TOGGLE': {
      const newLiked = new Set(state.likedMessageIds);
      if (newLiked.has(action.payload)) {
        newLiked.delete(action.payload);
      } else {
        newLiked.add(action.payload);
      }

      return {
        ...state,
        likedMessageIds: newLiked,
      };
    }

    case 'REPLY_TARGET_SET':
      return {
        ...state,
        replyTarget: action.payload,
      };

    case 'REPLY_TARGET_CLEAR':
      return {
        ...state,
        replyTarget: null,
      };

    case 'RESET':
      return initialActiveRoomState;

    default:
      return state;
  }
};
