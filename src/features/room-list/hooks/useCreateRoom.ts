import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { CreateRoomResponseSchema } from '../lib/dto';
import type { CreateRoomRequest } from '../lib/dto';

/**
 * useCreateRoom - Create a new room using React Query mutation
 */
export const useCreateRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateRoomRequest) => {
      const response = await apiClient.post('/api/rooms', request);
      const parsed = CreateRoomResponseSchema.parse(response.data);
      return parsed;
    },
    onSuccess: (newRoom) => {
      // Invalidate rooms query to refetch with new room
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error) => {
      // Error handling can be done by caller using error from mutation result
      extractApiErrorMessage(error, '방 생성에 실패했습니다');
    },
  });
};
