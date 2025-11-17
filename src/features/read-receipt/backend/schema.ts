import { z } from 'zod';

// User who read a message
export const ReadByUserSchema = z.object({
  user_id: z.string().uuid(),
  nickname: z.string(),
  read_at: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
});

export type ReadByUser = z.infer<typeof ReadByUserSchema>;

// Read status for a single message
export const MessageReadStatusSchema = z.object({
  message_id: z.string().uuid(),
  read_by: z.array(ReadByUserSchema),
  read_count: z.number().int().min(0),
});

export type MessageReadStatus = z.infer<typeof MessageReadStatusSchema>;

// Response when marking message as read
export const MarkReadResponseSchema = z.object({
  success: z.boolean(),
});

export type MarkReadResponse = z.infer<typeof MarkReadResponseSchema>;

// Response with single message read status
export const ReadStatusResponseSchema = z.object({
  read_by: z.array(ReadByUserSchema),
});

export type ReadStatusResponse = z.infer<typeof ReadStatusResponseSchema>;

// Response with multiple message read statuses
export const RoomReadStatusResponseSchema = z.object({
  message_statuses: z.array(MessageReadStatusSchema),
});

export type RoomReadStatusResponse = z.infer<typeof RoomReadStatusResponseSchema>;
