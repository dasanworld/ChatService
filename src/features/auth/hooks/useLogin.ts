"use client";

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, extractApiErrorMessage, isAxiosError } from '@/lib/remote/api-client';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useCurrentUser } from './useCurrentUser';
import type { LoginFormData } from '../schemas/login';

export const useLogin = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const login = useCallback(
    async (data: LoginFormData, inviteToken?: string) => {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        // First, authenticate with Supabase client directly
        const supabase = getSupabaseBrowserClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (authError) {
          throw authError;
        }

        // Call backend API to sync session
        await apiClient.post('/api/auth/login', {
          email: data.email,
          password: data.password,
        });

        // Refresh user context
        await refresh();

        // Handle redirect with priority: inviteToken > redirectedFrom > dashboard
        if (inviteToken) {
          router.replace(`/invite/${inviteToken}`);
        } else {
          const redirectedFrom = searchParams.get('redirectedFrom');
          if (redirectedFrom) {
            router.replace(redirectedFrom);
          } else {
            router.replace('/dashboard');
          }
        }

        return { ok: true };
      } catch (error) {
        const message = extractApiErrorMessage(error, '로그인에 실패했습니다');
        setErrorMessage(message);
        return { ok: false };
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh, router, searchParams]
  );

  return {
    login,
    isSubmitting,
    errorMessage,
  };
};