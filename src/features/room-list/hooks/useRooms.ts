import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { GetRoomsResponseSchema, type GetRoomsResponse } from '../lib/dto';

/**
 * useRooms - Fetch all rooms for current user using React Query
 */
export const useRooms = () => {
  return useQuery<GetRoomsResponse>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await apiClient.get('/api/rooms');
      const parsed = GetRoomsResponseSchema.parse(response.data.data);
      return parsed as GetRoomsResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};
