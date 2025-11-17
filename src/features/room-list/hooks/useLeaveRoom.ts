import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';

/**
 * useLeaveRoom - Leave a room using React Query mutation
 */
export const useLeaveRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      const response = await apiClient.delete(`/api/rooms/${roomId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate rooms query to refetch without left room
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error) => {
      // Error handling can be done by caller using error from mutation result
      extractApiErrorMessage(error, '방 나가기에 실패했습니다');
    },
  });
};
