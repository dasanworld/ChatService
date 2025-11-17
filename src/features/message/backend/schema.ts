import { z } from 'zod';

// Message base schema
export const MessageSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
  reply_to_message_id: z.string().uuid().nullable().optional(),
  like_count: z.number().int().min(0),
  is_deleted: z.boolean(),
  client_message_id: z.string().nullable().optional(),
  created_at: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  updated_at: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
});

export type Message = z.infer<typeof MessageSchema>;

// Message with user info
export const MessageWithUserSchema = MessageSchema.extend({
  user: z.object({
    id: z.string().uuid(),
    nickname: z.string(),
    avatar_url: z.string().nullable().optional(),
  }),
});

export type MessageWithUser = z.infer<typeof MessageWithUserSchema>;

// Create message request
export const CreateMessageRequestSchema = z.object({
  content: z.string().min(1, '메시지를 입력해주세요').max(5000, '메시지는 5000자 이내여야 합니다'),
  reply_to_message_id: z.string().uuid().optional(),
  client_message_id: z.string().optional(), // For optimistic UI matching
});

export type CreateMessageRequest = z.infer<typeof CreateMessageRequestSchema>;

// Create message response
export const CreateMessageResponseSchema = MessageWithUserSchema.pick({
  id: true,
  room_id: true,
  user_id: true,
  content: true,
  reply_to_message_id: true,
  like_count: true,
  is_deleted: true,
  client_message_id: true,
  created_at: true,
}).extend({
  user: z.object({
    nickname: z.string(),
  }),
});

export type CreateMessageResponse = z.infer<typeof CreateMessageResponseSchema>;

// Room snapshot (initial state)
export const RoomSnapshotSchema = z.object({
  room_id: z.string().uuid(),
  version: z.number().int().min(0), // Current version for Long Polling
  messages: z.array(MessageWithUserSchema),
  total: z.number().int().min(0),
  hasMore: z.boolean(), // Whether there are older messages
});

export type RoomSnapshot = z.infer<typeof RoomSnapshotSchema>;

// Long Polling event
export const LongPollingEventSchema = z.object({
  type: z.enum(['message_created', 'message_updated', 'message_deleted']),
  message: MessageWithUserSchema.optional(),
  message_id: z.string().uuid().optional(),
  version: z.number().int(),
});

export type LongPollingEvent = z.infer<typeof LongPollingEventSchema>;

// Long Polling response
export const LongPollingResponseSchema = z.object({
  version: z.number().int(),
  events: z.array(LongPollingEventSchema),
  hasMore: z.boolean().optional(),
});

export type LongPollingResponse = z.infer<typeof LongPollingResponseSchema>;

// Message history (pagination)
export const MessageHistorySchema = z.object({
  messages: z.array(MessageWithUserSchema),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
  before_version: z.number().int().optional(), // For pagination
});

export type MessageHistory = z.infer<typeof MessageHistorySchema>;

// Like message request
export const LikeMessageRequestSchema = z.object({
  message_id: z.string().uuid(),
  liked: z.boolean(), // true to like, false to unlike
});

export type LikeMessageRequest = z.infer<typeof LikeMessageRequestSchema>;

// Delete message request
export const DeleteMessageRequestSchema = z.object({
  message_id: z.string().uuid(),
  deleteForAll: z.boolean().default(false), // false = soft delete for me only
});

export type DeleteMessageRequest = z.infer<typeof DeleteMessageRequestSchema>;
