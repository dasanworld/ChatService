/**
 * Realtime feature error codes
 */
export const realtimeErrorCodes = {
  NOT_ROOM_PARTICIPANT: 'NOT_ROOM_PARTICIPANT',
  TYPING_UPDATE_FAILED: 'TYPING_UPDATE_FAILED',
  PRESENCE_UPDATE_FAILED: 'PRESENCE_UPDATE_FAILED',
  TYPING_FETCH_FAILED: 'TYPING_FETCH_FAILED',
  PRESENCE_FETCH_FAILED: 'PRESENCE_FETCH_FAILED',
  INVALID_REQUEST: 'INVALID_REQUEST',
} as const;

export type RealtimeErrorCode = (typeof realtimeErrorCodes)[keyof typeof realtimeErrorCodes];
