'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';

interface JoinRoomResult {
  roomId: string;
  roomName: string;
  participantCount: number;
}

/**
 * useJoinRoom - Join a room by invite code/roomId
 */
export const useJoinRoom = () => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 초대 코드 파싱 (URL에서 room_id 추출)
   * - "abc123" → "abc123"
   * - "https://domain/invite/abc123" → "abc123"
   */
  const parseInviteCode = useCallback((input: string): string => {
    const trimmed = input.trim();

    // URL인 경우
    if (trimmed.startsWith('http')) {
      try {
        const url = new URL(trimmed);
        const roomId = url.pathname.split('/').pop();
        return roomId || trimmed;
      } catch {
        return trimmed;
      }
    }

    // 직접 room_id인 경우
    return trimmed;
  }, []);

  /**
   * 초대 코드 검증
   */
  const verifyInvite = useCallback(
    async (inviteCode: string): Promise<JoinRoomResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const roomId = parseInviteCode(inviteCode);

        if (!roomId) {
          setError('유효하지 않은 초대 코드입니다.');
          return null;
        }

        const response = await apiClient.get(`/api/invites/${roomId}`);

        // 대응: 서버가 {ok, data} 형태가 아니더라도 room 정보를 바로 반환할 수 있음
        const payload = response.data as any;
        if (payload?.ok === false) {
          const errorMessage =
            payload.error?.message || '초대 코드를 찾을 수 없습니다.';
          setError(errorMessage);
          return null;
        }

        // ok 필드가 없으면 그대로 room 정보를 사용
        return payload.data ?? payload;
      } catch (err) {
        const message = extractApiErrorMessage(
          err,
          '초대 코드 검증에 실패했습니다.'
        );
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [parseInviteCode]
  );

  /**
   * Room에 참여
   */
  const joinRoom = useCallback(
    async (roomId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post(`/api/invites/${roomId}/join`);

        // 대응: 서버가 {ok, data} 형태가 아닐 수도 있음
        const payload = response.data as any;
        if (payload?.ok === false) {
          const errorMessage =
            payload.error?.message || '채팅방 참여에 실패했습니다.';
          setError(errorMessage);
          return false;
        }

        // 방 목록 새로고침
        queryClient.invalidateQueries({ queryKey: ['rooms'] });

        return true;
      } catch (err) {
        const message = extractApiErrorMessage(
          err,
          '채팅방 참여에 실패했습니다.'
        );
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient]
  );

  /**
   * 한 번에 검증 후 참여
   */
  const verifyAndJoin = useCallback(
    async (inviteCode: string): Promise<JoinRoomResult | null> => {
      const result = await verifyInvite(inviteCode);

      if (!result) {
        return null;
      }

      const success = await joinRoom(result.roomId);

      if (!success) {
        return null;
      }

      return result;
    },
    [verifyInvite, joinRoom]
  );

  return {
    isLoading,
    error,
    setError,
    parseInviteCode,
    verifyInvite,
    joinRoom,
    verifyAndJoin,
  };
};
