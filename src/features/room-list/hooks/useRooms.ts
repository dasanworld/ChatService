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
      
      // Check if response has data property (success response)
      const responseData = response.data?.data || response.data;
      
      // Parse and validate the response
      const parsed = GetRoomsResponseSchema.parse(responseData);
      return parsed as GetRoomsResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
  });
};
