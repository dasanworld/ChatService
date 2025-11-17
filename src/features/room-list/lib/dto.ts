/**
 * DTO re-exports from backend schema
 * Used for React Query hooks and API client type safety
 */

export {
  RoomSchema,
  RoomWithCountSchema,
  CreateRoomRequestSchema,
  CreateRoomResponseSchema,
  GetRoomsResponseSchema,
  LeaveRoomRequestSchema,
  type Room,
  type RoomWithCount,
  type CreateRoomRequest,
  type CreateRoomResponse,
  type GetRoomsResponse,
  type LeaveRoomRequest,
} from '@/features/room-list/backend/schema';
