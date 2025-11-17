/**
 * Read receipt feature error codes
 */
export const readReceiptErrorCodes = {
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  NOT_ROOM_PARTICIPANT: 'NOT_ROOM_PARTICIPANT',
  READ_RECEIPT_FAILED: 'READ_RECEIPT_FAILED',
  FETCH_READ_STATUS_FAILED: 'FETCH_READ_STATUS_FAILED',
  INVALID_REQUEST: 'INVALID_REQUEST',
} as const;

export type ReadReceiptErrorCode = (typeof readReceiptErrorCodes)[keyof typeof readReceiptErrorCodes];
