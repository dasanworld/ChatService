import { z } from 'zod';

// User info for typing indicator
export const TypingUserSchema = z.object({
  user_id: z.string().uuid(),
  nickname: z.string(),
});

export type TypingUser = z.infer<typeof TypingUserSchema>;

// Typing indicator response
export const TypingIndicatorResponseSchema = z.object({
  typing_users: z.array(TypingUserSchema),
});

export type TypingIndicatorResponse = z.infer<typeof TypingIndicatorResponseSchema>;

// Typing indicator request
export const TypingIndicatorRequestSchema = z.object({
  is_typing: z.boolean().default(true),
});

export type TypingIndicatorRequest = z.infer<typeof TypingIndicatorRequestSchema>;

// User presence info
export const UserPresenceSchema = z.object({
  user_id: z.string().uuid(),
  nickname: z.string(),
  is_online: z.boolean(),
  last_seen: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
});

export type UserPresence = z.infer<typeof UserPresenceSchema>;

// User presence response
export const UserPresenceResponseSchema = z.object({
  online_users: z.array(UserPresenceSchema),
});

export type UserPresenceResponse = z.infer<typeof UserPresenceResponseSchema>;

// User presence request
export const UserPresenceRequestSchema = z.object({
  is_online: z.boolean().default(true),
});

export type UserPresenceRequest = z.infer<typeof UserPresenceRequestSchema>;

// Success response
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
