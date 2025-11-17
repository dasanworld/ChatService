"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, extractApiErrorMessage, isAxiosError } from '@/lib/remote/api-client';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useCurrentUser } from './useCurrentUser';
import type { SignupFormData } from '../schemas/signup';

export const useSignup = () => {
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signup = useCallback(
    async (data: SignupFormData, inviteToken?: string) => {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        // Call backend API for signup
        await apiClient.post('/api/auth/signup', {
          email: data.email,
          password: data.password,
          nickname: data.nickname,
          inviteToken, // Pass the invite token to the backend
        });

        // After signup, authenticate with Supabase client
        const supabase = getSupabaseBrowserClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (authError) {
          throw authError;
        }

        // Refresh user context
        await refresh();

        // Handle invite token if provided
        if (inviteToken) {
          // Redirect to the chat room using the invite token
          router.replace(`/chat/${inviteToken}`);
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
    [refresh, router]
  );

  return {
    signup,
    isSubmitting,
    errorMessage,
  };
};
