/**
 * UI Modal State
 */
export interface ModalState {
  createRoom: boolean;
  leaveRoom: boolean;
  confirmDelete: boolean;
  chatRoom: boolean;
}

/**
 * Toast Notification
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

/**
 * UI Global State
 */
export interface UIState {
  modals: ModalState;
  toasts: Toast[];
  currentChatRoomId: string | null;
}

/**
 * UI Action Types
 */
export type UIAction =
  | { type: 'OPEN_MODAL'; payload: keyof ModalState }
  | { type: 'CLOSE_MODAL'; payload: keyof ModalState }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_TOASTS' }
  | { type: 'SET_CHAT_ROOM'; payload: string | null };
