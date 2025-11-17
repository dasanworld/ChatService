'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

export type InviteState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'unauthenticated'; roomName: string; roomId: string }
  | { status: 'joining' }
  | { status: 'success'; roomId: string };

export const useInvite = (token: string) => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useCurrentUser();
  const [state, setState] = useState<InviteState>({ status: 'loading' });

  const verifyAndJoin = useCallback(async () => {
    if (authLoading) return;

    // Step 1: Verify token
    setState({ status: 'loading' });
    try {
      const verifyResponse = await apiClient.get(`/api/invites/${token}`);

      const inviteInfo = verifyResponse.data.data;

      // Step 2: Check authentication
      if (!isAuthenticated) {
        // Save token to sessionStorage for signup/login to use
        sessionStorage.setItem('invite_token', token);
        setState({
          status: 'unauthenticated',
          roomName: inviteInfo.roomName,
          roomId: inviteInfo.roomId,
        });
        return;
      }

      // Step 3: Join room
      setState({ status: 'joining' });
      const joinResponse = await apiClient.post(`/api/invites/${token}/join`);

      if (joinResponse.status === 200) {
        // Step 4: Redirect to room
        sessionStorage.removeItem('invite_token');
        setState({ status: 'success', roomId: token });
        router.replace(`/chat/${token}`);
      }
    } catch (error) {
      const message = extractApiErrorMessage(error, '유효하지 않은 초대 링크입니다');
      setState({ status: 'error', message });
    }
  }, [token, isAuthenticated, authLoading, router]);

  useEffect(() => {
    verifyAndJoin();
  }, [verifyAndJoin]);

  return { state, retry: verifyAndJoin };
};
