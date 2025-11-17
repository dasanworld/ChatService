/**
 * Room Domain Type - Matches backend RoomWithCount schema
 */
export interface Room {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  participant_count: number;
}

/**
 * RoomList State Machine
 */
export type RoomListStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface RoomListState {
  rooms: Room[];
  status: RoomListStatus;
  error: string | null;
}

/**
 * RoomList Action Types
 */
export type RoomListAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Room[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_ROOM'; payload: Room }
  | { type: 'REMOVE_ROOM'; payload: string }
  | { type: 'RESET_ERROR' };

/**
 * UI State for Modals and Toasts
 */
export interface ModalState {
  createRoom: boolean;
  leaveRoom: boolean;
  confirmDelete: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface UIState {
  modals: ModalState;
  toasts: Toast[];
}

/**
 * UI Action Types
 */
export type UIAction =
  | { type: 'OPEN_MODAL'; payload: keyof ModalState }
  | { type: 'CLOSE_MODAL'; payload: keyof ModalState }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_TOASTS' };
