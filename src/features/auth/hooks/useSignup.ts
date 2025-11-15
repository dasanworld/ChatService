"use client";

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, extractApiErrorMessage, isAxiosError } from '@/lib/remote/api-client';
import { useCurrentUser } from './useCurrentUser';
import type { SignupFormData } from '../schemas/signup';

export const useSignup = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signup = useCallback(
    async (data: SignupFormData) => {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        await apiClient.post('/api/auth/signup', {
          email: data.email,
          password: data.password,
          nickname: data.nickname,
        });

        // Refresh user context
        await refresh();

        // Handle invite token if exists
        const inviteToken = searchParams.get('invite');
        if (inviteToken) {
          router.replace(`/invite/${inviteToken}`);
        } else {
          router.replace('/dashboard');
        }

        return { ok: true };
      } catch (error) {
        if (isAxiosError(error)) {
          setErrorMessage(extractApiErrorMessage(error, '회원가입에 실패했습니다'));
        } else {
          setErrorMessage('회원가입 처리 중 오류가 발생했습니다');
        }
        return { ok: false };
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh, router, searchParams]
  );

  return {
    signup,
    isSubmitting,
    errorMessage,
  };
};
