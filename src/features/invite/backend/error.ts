export const inviteErrorCodes = {
  INVALID_TOKEN: 'INVALID_INVITE_TOKEN',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ALREADY_PARTICIPANT: 'ALREADY_PARTICIPANT',
  JOIN_ERROR: 'JOIN_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export type InviteErrorCode = (typeof inviteErrorCodes)[keyof typeof inviteErrorCodes];
