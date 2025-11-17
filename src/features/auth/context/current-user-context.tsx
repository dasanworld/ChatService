"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { match, P } from "ts-pattern";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type {
  CurrentUserContextValue,
  CurrentUserSnapshot,
} from "../types";

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

type CurrentUserProviderProps = {
  children: ReactNode;
  initialState: CurrentUserSnapshot;
};

export const CurrentUserProvider = ({
  children,
  initialState,
}: CurrentUserProviderProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [snapshot, setSnapshot] = useState<CurrentUserSnapshot>(initialState);

  const refresh = useCallback(async () => {
    setSnapshot((prev) => ({ status: "loading", user: prev.user }));
    const supabase = getSupabaseBrowserClient();

    try {
      const result = await supabase.auth.getUser();

      const nextSnapshot = match(result)
        .with({ data: { user: P.nonNullable } }, ({ data }) => ({
          status: "authenticated" as const,
          user: {
            id: data.user.id,
            email: data.user.email,
            appMetadata: data.user.app_metadata ?? {},
            userMetadata: data.user.user_metadata ?? {},
          },
        }))
        .otherwise(() => ({ status: "unauthenticated" as const, user: null }));

      setSnapshot(nextSnapshot);
      queryClient.setQueryData(["currentUser"], nextSnapshot);
    } catch (error) {
      const fallbackSnapshot: CurrentUserSnapshot = {
        status: "unauthenticated",
        user: null,
      };
      setSnapshot(fallbackSnapshot);
      queryClient.setQueryData(["currentUser"], fallbackSnapshot);
    }
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      // Clear client-side session first
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();

      // Call API to clear server-side session
      await apiClient.post('/api/auth/logout');

      // Update state
      const fallbackSnapshot: CurrentUserSnapshot = {
        status: "unauthenticated",
        user: null,
      };
      setSnapshot(fallbackSnapshot);
      queryClient.setQueryData(["currentUser"], fallbackSnapshot);

      // Redirect to login
      router.push('/login');
    } catch (error) {
      const message = extractApiErrorMessage(error, '로그아웃에 실패했습니다');
      console.error('Logout failed:', message);
      // Even if logout fails on server, redirect to login
      router.push('/login');
    }
  }, [router, queryClient]);

  const value = useMemo<CurrentUserContextValue>(() => {
    return {
      ...snapshot,
      refresh,
      logout,
      isAuthenticated: snapshot.status === "authenticated",
      isLoading: snapshot.status === "loading",
    };
  }, [refresh, logout, snapshot]);

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
};

export const useCurrentUserContext = () => {
  const value = useContext(CurrentUserContext);

  if (!value) {
    throw new Error("CurrentUserProvider가 트리 상단에 필요합니다.");
  }

  return value;
};
