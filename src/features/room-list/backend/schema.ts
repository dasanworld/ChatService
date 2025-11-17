import { z } from 'zod';

// Room base schema
export const RoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  created_by: z.string().uuid(),
  created_at: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  updated_at: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
});

export type Room = z.infer<typeof RoomSchema>;

// Room with participant count
export const RoomWithCountSchema = RoomSchema.extend({
  participant_count: z.number().int().min(0),
});

export type RoomWithCount = z.infer<typeof RoomWithCountSchema>;

// Create room request
export const CreateRoomRequestSchema = z.object({
  name: z.string().min(1, '방 이름을 입력해주세요').max(100, '방 이름은 100자 이내여야 합니다'),
});

export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>;

// Create room response
export const CreateRoomResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  created_by: z.string().uuid(),
  created_at: z.string(),
});

export type CreateRoomResponse = z.infer<typeof CreateRoomResponseSchema>;

// Get rooms response
export const GetRoomsResponseSchema = z.object({
  rooms: z.array(RoomWithCountSchema),
  total: z.number().int().min(0),
});

export type GetRoomsResponse = z.infer<typeof GetRoomsResponseSchema>;

// Leave room request
export const LeaveRoomRequestSchema = z.object({
  roomId: z.string().uuid(),
});

export type LeaveRoomRequest = z.infer<typeof LeaveRoomRequestSchema>;
