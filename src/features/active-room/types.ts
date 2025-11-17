/**
 * Active Room State Management Types
 * Manages messages, polling, and UI state for current chat room
 */

import type { MessageWithUser } from '@/features/message/backend/schema';

export type { MessageWithUser };

export type PollingStatus = 'idle' | 'live' | 'catchup' | 'error';

export interface ActiveRoomState {
  roomId: string | null;
  messages: MessageWithUser[];
  pendingMessages: Map<string, MessageWithUser>; // client_message_id -> Message
  lastSyncVersion: number;
  pollingStatus: PollingStatus;
  pollingError: string | null;
  likedMessageIds: Set<string>;
  hiddenMessageIds: Set<string>; // Messages hidden by current user
  replyTarget: MessageWithUser | null;
  hasMoreHistory: boolean;
  isLoadingHistory: boolean;
  isSnapshotLoaded: boolean; // Track if initial snapshot has been loaded
}

export type ActiveRoomAction =
  // Room initialization
  | { type: 'ROOM_SET'; payload: string } // roomId
  | { type: 'ROOM_CLEAR' }
  // Snapshot (initial load)
  | { type: 'SNAPSHOT_RECEIVED'; payload: { messages: MessageWithUser[]; version: number; hasMore: boolean } }
  // Polling
  | { type: 'POLLING_START' }
  | { type: 'POLLING_SUCCESS'; payload: { messages: MessageWithUser[]; version: number } }
  | { type: 'POLLING_CATCHUP' }
  | { type: 'POLLING_ERROR'; payload: string }
  // Message operations
  | { type: 'MESSAGE_ADD_PENDING'; payload: { clientMessageId: string; message: MessageWithUser } }
  | { type: 'MESSAGE_REMOVE_PENDING'; payload: string } // clientMessageId
  | { type: 'MESSAGE_REPLACE_PENDING'; payload: { clientMessageId: string; message: MessageWithUser } }
  | { type: 'MESSAGE_ADD'; payload: MessageWithUser }
  | { type: 'MESSAGE_UPDATE'; payload: MessageWithUser }
  | { type: 'MESSAGE_DELETE'; payload: string } // messageId
  | { type: 'MESSAGE_HIDE'; payload: string } // messageId
  | { type: 'MESSAGE_UNHIDE'; payload: string } // messageId
  // History
  | { type: 'HISTORY_START' }
  | { type: 'HISTORY_RECEIVED'; payload: { messages: MessageWithUser[]; hasMore: boolean } }
  // Likes
  | { type: 'MESSAGE_LIKE_TOGGLE'; payload: string } // messageId
  | { type: 'LIKED_MESSAGES_LOADED'; payload: string[] } // Load initial liked messages
  // Reply target
  | { type: 'REPLY_TARGET_SET'; payload: MessageWithUser }
  | { type: 'REPLY_TARGET_CLEAR' }
  // Reset
  | { type: 'RESET' };

/**
 * Represents a message in the UI (might be pending or actual)
 */
export interface UIMessage extends MessageWithUser {
  isPending?: boolean;
  isFailed?: boolean;
  isHidden?: boolean;
}

/**
 * Represents a polling event from Long Polling
 */
export interface PollingEventData {
  type: 'message_created' | 'message_updated' | 'message_deleted';
  message?: MessageWithUser;
  messageId?: string;
  version: number;
}
