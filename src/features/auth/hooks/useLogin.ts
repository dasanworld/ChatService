"use client";

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { apiClient } from '@/lib/remote/api-client';
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
        const supabase = getSupabaseBrowserClient();

        const result = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        // Refresh user context
        await refresh();

        // Handle invite token if provided
        if (inviteToken) {
          // Redirect to the chat room using the invite token
          router.replace(`/chat/${inviteToken}`);
        } else {
          // Use redirect param from URL if available, otherwise go to dashboard
          const redirectedFrom = searchParams.get("redirectedFrom") ?? "/dashboard";
          router.replace(redirectedFrom);
        }

        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : '로그인에 실패했습니다';
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