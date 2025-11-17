'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

type RoomListErrorProps = {
  error: Error;
  onRetry?: () => void;
};

export const RoomListError = ({ error, onRetry }: RoomListErrorProps) => {
  const router = useRouter();
  const { isAuthenticated } = useCurrentUser();
  const [hasRedirected, setHasRedirected] = useState(false);

  // Check if it's an authentication error
  const isAuthError = 
    error.message.includes('401') || 
    error.message.includes('Unauthorized') ||
    error.message.includes('authentication');

  // If auth error detected and user is not authenticated, redirect to login
  useEffect(() => {
    if (isAuthError && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push('/login');
    }
  }, [isAuthError, isAuthenticated, hasRedirected, router]);

  // Don't show error UI if redirecting
  if (isAuthError && !isAuthenticated) {
    return null;
  }

  // If user is authenticated but getting 401, it's likely a session sync issue
  // Show a simple error without auto-retry to avoid infinite loop
  if (isAuthError && isAuthenticated) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <AlertCircle className="h-6 w-6 text-amber-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-amber-900">
          인증 오류가 발생했습니다
        </h3>
        <p className="mb-6 text-sm text-amber-700">
          페이지를 새로고침하거나 다시 로그인해주세요.
        </p>
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="ml-2">새로고침</span>
          </Button>
          <Button
            onClick={() => router.push('/login')}
            className="bg-amber-600 hover:bg-amber-700"
          >
            다시 로그인
          </Button>
        </div>
      </div>
    );
  }

  // Show retry UI for other errors
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <AlertCircle className="h-6 w-6 text-slate-600" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">
        일시적인 문제가 발생했습니다
      </h3>
      <p className="mb-6 text-sm text-slate-600">
        잠시 후 다시 시도해주세요.
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="ml-2">다시 시도</span>
        </Button>
      )}
    </div>
  );
};
